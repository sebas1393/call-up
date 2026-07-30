"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { fetchMe, googleAuthHref } from "@/components/auth/me-api";
import { InstallAppPrompt } from "@/components/pwa/install-app-prompt";

/**
 * US-001/002: ready callers on `/` → `/caller`; CTA checks session before Google.
 */
export function HomeCallerGate() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const me = await fetchMe();
      if (cancelled) return;
      if (
        me.ok &&
        me.data.profileComplete &&
        me.data.userName
      ) {
        router.replace("/caller");
        return;
      }
      if (me.ok && !me.data.profileComplete) {
        router.replace("/complete-profile");
        return;
      }
      if (me.ok && me.data.profileComplete && !me.data.userName) {
        // Player-only or caller mid-setup — only force username if they were
        // in caller flow; stay on landing for player-only sessions.
        setChecking(false);
        return;
      }
      setChecking(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  function onCallerCta() {
    startTransition(async () => {
      const me = await fetchMe();
      if (me.ok) {
        if (!me.data.profileComplete) {
          router.replace("/complete-profile");
          return;
        }
        if (!me.data.userName) {
          router.replace("/complete-caller-username");
          return;
        }
        router.replace("/caller");
        return;
      }
      window.location.href = googleAuthHref("caller", "/caller");
    });
  }

  if (checking) {
    return (
      <p className="animate-[kortumo-rise_0.8s_ease-out_0.32s_both] text-sm text-white/70">
        Cargando…
      </p>
    );
  }

  return (
    <>
      <div className="animate-[kortumo-rise_0.8s_ease-out_0.32s_both] flex w-full max-w-md flex-col gap-3 sm:flex-row sm:items-stretch">
        <button
          type="button"
          disabled={pending}
          onClick={onCallerCta}
          className="inline-flex min-h-14 w-full flex-1 items-center justify-center rounded-md bg-[var(--kortumo-red)] px-5 py-3.5 text-center text-sm font-semibold leading-snug text-white transition-transform duration-200 hover:scale-[1.02] hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:opacity-70 sm:px-6"
        >
          {pending ? "…" : "Creador de Convocatoria (Caller)"}
        </button>
        <Link
          href="/player"
          className="inline-flex min-h-14 w-full flex-1 items-center justify-center rounded-md border-2 border-white/80 bg-transparent px-5 py-3.5 text-center text-sm font-semibold leading-snug text-white transition-colors duration-200 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:px-6"
        >
          Soy jugador
        </Link>
      </div>
      <InstallAppPrompt
        variant="onDark"
        className="animate-[kortumo-rise_0.8s_ease-out_0.4s_both]"
      />
    </>
  );
}
