"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { fetchMe, type MeProfile } from "@/components/auth/me-api";
import { LogoK } from "@/components/brand/logo-k";

/**
 * Caller header: brand, name/avatar, sign-out (US-002).
 */
export function CallerHeader() {
  const router = useRouter();
  const [me, setMe] = useState<MeProfile | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const result = await fetchMe();
      if (cancelled) return;
      if (!result.ok) {
        if (result.status === 401) {
          // US-001: no session → home (role CTAs), not forced Google.
          router.replace("/");
        }
        return;
      }
      if (!result.data.profileComplete) {
        router.replace("/complete-profile");
        return;
      }
      if (!result.data.userName) {
        router.replace("/complete-caller-username");
        return;
      }
      setMe(result.data);
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!menuRef.current?.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  async function onLogout() {
    await fetch("/api/v1/auth/logout", { method: "POST", credentials: "include" });
    router.push("/");
  }

  return (
    <header className="flex items-center justify-between gap-3 border-b border-[var(--kortumo-navy)]/10 bg-white px-4 py-3 sm:px-6">
      <Link href="/caller" className="shrink-0">
        <LogoK size={36} withWordmark className="text-[var(--kortumo-navy)]" />
      </Link>
      {me ? (
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            className="flex max-w-[12rem] items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-[var(--kortumo-navy)]/5"
            aria-expanded={menuOpen}
            aria-haspopup="menu"
          >
            {me.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={me.avatarUrl}
                alt=""
                width={32}
                height={32}
                className="h-8 w-8 rounded-full object-cover"
              />
            ) : (
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--kortumo-navy)] text-xs font-semibold text-white">
                {me.name.slice(0, 1).toUpperCase()}
              </span>
            )}
            <span className="truncate text-sm font-medium text-[var(--kortumo-navy)]">
              {me.name}
            </span>
          </button>
          {menuOpen ? (
            <div
              role="menu"
              className="absolute right-0 z-20 mt-1 min-w-[10rem] rounded-md border border-[var(--kortumo-navy)]/10 bg-white py-1 shadow-md"
            >
              {me.userName ? (
                <div className="border-b border-[var(--kortumo-navy)]/10 px-3 py-2">
                  <p className="text-xs text-[var(--kortumo-navy)]/60">
                    /{me.userName}
                  </p>
                  <Link
                    href={`/${me.userName}`}
                    role="menuitem"
                    className="mt-1 block text-xs font-medium text-[var(--kortumo-blue-soft)] hover:underline"
                    onClick={() => setMenuOpen(false)}
                  >
                    Ver canal público
                  </Link>
                </div>
              ) : null}
              <button
                type="button"
                role="menuitem"
                onClick={onLogout}
                className="block w-full px-3 py-2 text-left text-sm text-[var(--kortumo-red)] hover:bg-[var(--kortumo-red)]/5"
              >
                Cerrar sesión
              </button>
            </div>
          ) : null}
        </div>
      ) : (
        <span className="text-sm text-[var(--kortumo-navy)]/50">…</span>
      )}
    </header>
  );
}
