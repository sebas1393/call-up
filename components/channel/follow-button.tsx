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
 * Channel follow control — labels **Seguir** / **No Seguir** (US-011).
 * After successful Seguir (201), requests notification permission + push subscribe.
 */
export function FollowButton({ userName, isOwnChannel = false }: FollowButtonProps) {
  const [state, setState] = useState<FollowState>("loading");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/v1/callers/${encodeURIComponent(userName)}/follow`);
      if (res.status === 401) {
        setState("idle");
        setMessage("Inicia sesión para seguir este canal.");
        return;
      }
      if (!res.ok) {
        setState("error");
        setMessage("No se pudo cargar el estado de seguimiento.");
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
    if (isOwnChannel) {
      setState("idle");
      setMessage("No puedes seguir tu propio canal.");
      return;
    }
    void refresh();
  }, [isOwnChannel, refresh]);

  const onFollow = () => {
    if (isOwnChannel) return;
    setMessage(null);
    startTransition(async () => {
      try {
        const res = await fetch(
          `/api/v1/callers/${encodeURIComponent(userName)}/follow`,
          { method: "POST" },
        );

        if (res.status === 403) {
          setMessage("No puedes seguir tu propio canal.");
          setState("idle");
          return;
        }
        if (res.status === 401) {
          setMessage("Inicia sesión para seguir este canal.");
          return;
        }
        if (!res.ok) {
          setMessage("No se pudo seguir el canal.");
          return;
        }

        setState("following");

        // Spec §11: after Seguir success, request permission + register push.
        // Follow stays valid if permission is denied.
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
          { method: "DELETE" },
        );
        if (!res.ok && res.status !== 204) {
          setMessage("No se pudo dejar de seguir.");
          return;
        }
        setState("idle");
      } catch {
        setMessage("Oops, algo salió mal");
      }
    });
  };

  if (isOwnChannel) {
    return (
      <p className="text-sm text-zinc-600" role="status">
        No puedes seguir tu propio canal.
      </p>
    );
  }

  const busy = pending || state === "loading";
  const following = state === "following";

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        disabled={busy}
        onClick={following ? onUnfollow : onFollow}
        className="inline-flex h-11 items-center justify-center rounded-md bg-[var(--kortumo-navy)] px-4 text-sm font-medium text-white transition-opacity hover:bg-[var(--kortumo-blue-soft)] disabled:opacity-60"
        aria-busy={busy}
      >
        {busy ? "…" : following ? "No Seguir" : "Seguir"}
      </button>
      {message ? (
        <p className="text-sm text-zinc-600" role="status">
          {message}
        </p>
      ) : null}
    </div>
  );
}
