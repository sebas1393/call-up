"use client";

import { FormEvent, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { AuthShell } from "@/components/auth/auth-shell";
import { fetchMe, googleAuthHref, type MeProfile } from "@/components/auth/me-api";
import {
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
} from "@/lib/constants/callup";
import { usernameBodySchema } from "@/lib/validators/profile";

/**
 * Sets caller slug once via POST /api/v1/me/username; previews /{userName}.
 */
export function CompleteUsernameForm() {
  const router = useRouter();
  const [userName, setUserName] = useState("");
  const [link, setLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const result = await fetchMe();
      if (cancelled) return;
      if (!result.ok) {
        if (result.status === 401) {
          window.location.href = googleAuthHref(
            "caller",
            "/complete-caller-username",
          );
          return;
        }
        setError(result.detail);
        setLoading(false);
        return;
      }
      const me: MeProfile = result.data;
      if (!me.profileComplete) {
        router.replace("/complete-profile");
        return;
      }
      if (me.userName) {
        router.replace("/caller");
        return;
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const preview =
    userName.trim().length >= USERNAME_MIN_LENGTH
      ? `/${userName.trim().toLowerCase()}`
      : null;

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLink(null);
    const parsed = usernameBodySchema.safeParse({ userName });
    if (!parsed.success) {
      setError(
        parsed.error.issues[0]?.message ??
          `Usuario inválido (${USERNAME_MIN_LENGTH}–${USERNAME_MAX_LENGTH}: a-z, 0-9, guion).`,
      );
      return;
    }

    startTransition(async () => {
      const res = await fetch("/api/v1/me/username", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const body = (await res.json().catch(() => ({}))) as {
        detail?: string;
        data?: { userName: string; link: string };
      };
      if (!res.ok) {
        setError(body.detail ?? "No se pudo guardar el usuario.");
        return;
      }
      if (body.data?.link) {
        setLink(body.data.link);
      }
      router.push("/caller");
    });
  }

  if (loading) {
    return (
      <AuthShell title="Usuario del caller">
        <p className="text-sm text-white/70">Cargando…</p>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Elige tu usuario"
      description="Solo una vez. Será el enlace que compartes con tus jugadores (sin espacios)."
    >
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="userName" className="text-sm font-medium">
            Usuario del caller
          </label>
          <input
            id="userName"
            name="userName"
            autoComplete="username"
            value={userName}
            onChange={(e) =>
              setUserName(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))
            }
            maxLength={USERNAME_MAX_LENGTH}
            placeholder="juanbueno"
            className="h-12 rounded-md border border-white/25 bg-white/10 px-4 text-base text-white placeholder:text-white/40 focus:border-[var(--kortumo-blue-soft)] focus:outline-none"
            required
          />
          <p className="text-xs text-white/55">
            {USERNAME_MIN_LENGTH}–{USERNAME_MAX_LENGTH} caracteres: a-z, 0-9 y
            guiones.
          </p>
        </div>
        {preview ? (
          <p className="rounded-md bg-white/10 px-3 py-2 text-sm text-[var(--kortumo-blue-soft)]">
            Tu enlace: <span className="font-semibold text-white">{preview}</span>
          </p>
        ) : null}
        {link ? (
          <p className="text-sm text-[var(--kortumo-teal)]" role="status">
            Listo: {link}
          </p>
        ) : null}
        {error ? (
          <p className="text-sm text-[#ffb3b3]" role="alert">
            {error}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={pending}
          className="h-12 rounded-md bg-[var(--kortumo-red)] text-sm font-semibold text-white transition-[filter] hover:brightness-110 disabled:opacity-60"
        >
          {pending ? "Guardando…" : "Crear enlace"}
        </button>
      </form>
    </AuthShell>
  );
}
