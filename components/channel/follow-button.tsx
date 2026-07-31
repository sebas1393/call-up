"use client";

import { useCallback, useEffect, useState, useTransition } from "react";

import { subscribePushAndRegister } from "@/lib/pwa/subscribe-push";

type FollowButtonProps = {
  userName: string;
  /** When true, hide/disable (own channel — API also rejects self-follow). */
  isOwnChannel?: boolean;
};

type FollowState = "loading" | "idle" | "following" | "error";

/**
 * Channel follow — quiet text control (US-011), not a primary button.
 * After successful follow, requests notification permission + push subscribe.
 */
export function FollowButton({ userName, isOwnChannel = false }: FollowButtonProps) {
  const [state, setState] = useState<FollowState>("loading");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/v1/callers/${encodeURIComponent(userName)}/follow`,
        { credentials: "include", cache: "no-store" },
      );
      if (res.status === 401) {
        setState("idle");
        setMessage(null);
        return;
      }
      if (!res.ok) {
        setState("error");
        setMessage("No se pudo cargar el seguimiento.");
        return;
      }
      const json = (await res.json()) as { data?: { following?: boolean } };
      setState(json.data?.following ? "following" : "idle");
      setMessage(null);
    } catch {
      setState("error");
      setMessage("Oops, algo salió mal");
    }
  }, [userName]);

  useEffect(() => {
    if (isOwnChannel) return;
    void Promise.resolve().then(() => refresh());
  }, [isOwnChannel, refresh]);

  useEffect(() => {
    if (isOwnChannel || state !== "following") return;
    if (typeof Notification === "undefined") return;
    if (Notification.permission !== "granted") return;
    void subscribePushAndRegister();
  }, [isOwnChannel, state]);

  const onFollow = () => {
    if (isOwnChannel) return;
    setMessage(null);
    startTransition(async () => {
      try {
        const res = await fetch(
          `/api/v1/callers/${encodeURIComponent(userName)}/follow`,
          { method: "POST", credentials: "include" },
        );

        if (res.status === 403) {
          setMessage("No puedes seguir tu propio canal.");
          setState("idle");
          return;
        }
        if (res.status === 401) {
          setMessage("Inicia sesión para suscribirte al canal.");
          return;
        }
        if (!res.ok) {
          setMessage("No se pudo suscribir al canal.");
          return;
        }

        setState("following");

        if (res.status === 201 || res.status === 200) {
          const push = await subscribePushAndRegister();
          if (!push.ok) {
            setMessage(push.detail);
          } else {
            setMessage(null);
          }
        }
      } catch {
        setMessage("Oops, algo salió mal");
      }
    });
  };

  const onUnfollow = () => {
    setMessage(null);
    startTransition(async () => {
      try {
        const res = await fetch(
          `/api/v1/callers/${encodeURIComponent(userName)}/follow`,
          { method: "DELETE", credentials: "include" },
        );
        if (!res.ok && res.status !== 204) {
          setMessage("No se pudo cancelar la suscripción.");
          return;
        }
        setState("idle");
      } catch {
        setMessage("Oops, algo salió mal");
      }
    });
  };

  if (isOwnChannel) {
    return null;
  }

  const busy = pending || state === "loading";
  const following = state === "following";

  return (
    <div className="max-w-md space-y-1">
      {following ? (
        <p className="text-xs leading-snug text-[var(--kortumo-navy)]/65">
          Suscrito a{" "}
          <span className="font-medium text-[var(--kortumo-navy)]/80">
            /{userName}
          </span>
          .{" "}
          <button
            type="button"
            disabled={busy}
            onClick={onUnfollow}
            className="font-medium text-[var(--kortumo-blue-soft)] underline-offset-2 hover:underline disabled:opacity-60"
            aria-busy={busy}
          >
            {busy ? "…" : "Dejar de seguir"}
          </button>
        </p>
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={onFollow}
          className="text-left text-xs leading-snug text-[var(--kortumo-blue-soft)] underline-offset-2 hover:underline disabled:opacity-60"
          aria-busy={busy}
        >
          {busy
            ? "…"
            : `Suscríbete al canal de ${userName} para recibir actualizaciones de las convocatorias`}
        </button>
      )}
      {message ? (
        <p className="text-[11px] leading-snug text-[var(--kortumo-navy)]/55" role="status">
          {message}
        </p>
      ) : null}
    </div>
  );
}
