"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { fetchMe } from "@/components/auth/me-api";

/**
 * US-007: visible share link for the caller's public channel (`/{userName}`).
 */
export function CallerShareLink() {
  const [userName, setUserName] = useState<string | null>(null);
  const [origin, setOrigin] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setOrigin(window.location.origin);
    let cancelled = false;
    (async () => {
      const result = await fetchMe();
      if (cancelled || !result.ok || !result.data.userName) return;
      setUserName(result.data.userName);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!userName) {
    return null;
  }

  const path = `/${userName}`;
  const fullUrl = origin ? `${origin}${path}` : path;

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore — button remains usable
    }
  }

  return (
    <div className="mb-5 rounded-md border border-[var(--kortumo-navy)]/10 bg-[var(--kortumo-navy)]/[0.03] px-3 py-3">
      <p className="text-xs font-medium uppercase tracking-wide text-[var(--kortumo-navy)]/55">
        Tu enlace
      </p>
      <p className="mt-1 break-all font-[family-name:var(--font-montserrat)] text-sm font-semibold text-[var(--kortumo-navy)]">
        {fullUrl}
      </p>
      <p className="mt-0.5 text-xs text-[var(--kortumo-navy)]/55">
        Comparte este link con tus jugadores ({path}).
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onCopy}
          className="inline-flex h-9 items-center rounded-md bg-[var(--kortumo-navy)] px-3 text-xs font-semibold text-white"
        >
          {copied ? "Copiado" : "Copiar"}
        </button>
        <Link
          href={path}
          className="inline-flex h-9 items-center rounded-md border border-[var(--kortumo-navy)]/20 px-3 text-xs font-semibold text-[var(--kortumo-navy)]"
        >
          Abrir
        </Link>
      </div>
    </div>
  );
}
