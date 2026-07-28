"use client";

import { FormEvent, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { AuthShell } from "@/components/auth/auth-shell";
import { fetchMe, googleAuthHref, type MeProfile } from "@/components/auth/me-api";
import { patchMeBodySchema } from "@/lib/validators/profile";

/**
 * Completes name + phone (10 CO digits) via PATCH /api/v1/me.
 */
export function CompleteProfileForm({
  nextPath = "/complete-caller-username",
}: {
  nextPath?: string;
}) {
  const router = useRouter();
  const [profile, setProfile] = useState<MeProfile | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
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
          window.location.href = googleAuthHref("caller", "/complete-profile");
          return;
        }
        setError(result.detail);
        setLoading(false);
        return;
      }
      if (result.data.profileComplete) {
        router.replace(
          result.data.userName ? "/caller" : "/complete-caller-username",
        );
        return;
      }
      setProfile(result.data);
      setName(result.data.name ?? "");
      setPhone(result.data.phone ?? "");
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const parsed = patchMeBodySchema.safeParse({ name, phone });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Datos inválidos.");
      return;
    }

    startTransition(async () => {
      const res = await fetch("/api/v1/me", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as {
          detail?: string;
        };
        setError(body.detail ?? "No se pudo guardar el perfil.");
        return;
      }
      const json = (await res.json()) as { data: MeProfile };
      if (json.data.userName) {
        router.push("/caller");
      } else {
        router.push(nextPath);
      }
    });
  }

  if (loading) {
    return (
      <AuthShell title="Completa tu perfil">
        <p className="text-sm text-white/70">Cargando…</p>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Completa tu perfil"
      description="Necesitamos tu nombre y un celular colombiano de 10 dígitos para continuar."
    >
      {profile?.email ? (
        <p className="mb-4 text-xs text-white/60">{profile.email}</p>
      ) : null}
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="name" className="text-sm font-medium">
            Nombre
          </label>
          <input
            id="name"
            name="name"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-12 rounded-md border border-white/25 bg-white/10 px-4 text-base text-white placeholder:text-white/40 focus:border-[var(--kortumo-blue-soft)] focus:outline-none"
            placeholder="Juan Bueno"
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="phone" className="text-sm font-medium">
            Celular
          </label>
          <input
            id="phone"
            name="phone"
            inputMode="numeric"
            autoComplete="tel"
            maxLength={10}
            value={phone}
            onChange={(e) =>
              setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))
            }
            className="h-12 rounded-md border border-white/25 bg-white/10 px-4 text-base text-white placeholder:text-white/40 focus:border-[var(--kortumo-blue-soft)] focus:outline-none"
            placeholder="3102222222"
            required
          />
          <p className="text-xs text-white/55">Exactamente 10 dígitos (Colombia).</p>
        </div>
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
          {pending ? "Guardando…" : "Continuar"}
        </button>
      </form>
    </AuthShell>
  );
}
