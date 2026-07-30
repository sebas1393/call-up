"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { FollowButton } from "@/components/channel/follow-button";
import { PlayerRoster } from "@/components/callup/player-roster";
import { fetchMe, googleAuthHref, type MeProfile } from "@/components/auth/me-api";
import { LogoK } from "@/components/brand/logo-k";
import type { CallupStatus } from "@/lib/constants/callup";
import {
  formatMatchAtEs,
  statusLabelEs,
  statusPillClass,
} from "@/lib/format/callup-display";
import { useCallupPlayersRealtime } from "@/lib/realtime/use-callup-players-realtime";

type PublicSummary = {
  id: string;
  matchAt: string;
  status: CallupStatus;
  spotsQuantity: number;
  rosterCount: number;
  waitlistCount: number;
  courtName: string;
  courtAddress: string;
  paymentKey: string;
  subscribeEligibility: {
    canJoinRoster: boolean;
    canJoinWaitlist: boolean;
  };
};

type ListResponse = {
  userName: string;
  items: PublicSummary[];
  pageIndex: number;
  pageSize: number;
  totalCount: number;
};

type PublicChannelViewProps = {
  userName: string;
};

/**
 * Public caller channel `/{username}` — list + Seguir + expand roster (US-008/009/011).
 */
export function PublicChannelView({ userName }: PublicChannelViewProps) {
  const [me, setMe] = useState<MeProfile | null | undefined>(undefined);
  const [pageIndex, setPageIndex] = useState(0);
  const [data, setData] = useState<ListResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copyFlash, setCopyFlash] = useState<string | null>(null);

  const slug = userName.trim().toLowerCase();
  const isOwnChannel = Boolean(me?.userName && me.userName === slug);

  const load = useCallback(
    async (page: number) => {
      setLoading(true);
      setError(null);
      const res = await fetch(
        `/api/v1/callers/${encodeURIComponent(slug)}/callups?pageIndex=${page}&pageSize=10`,
        { credentials: "include" },
      );
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { detail?: string };
        setError(body.detail ?? "No se encontraron convocatorias.");
        setData(null);
        setLoading(false);
        return;
      }
      const json = (await res.json()) as { data: ListResponse };
      setData(json.data);
      setLoading(false);
    },
    [slug],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const result = await fetchMe();
      if (cancelled) return;
      if (result.ok) {
        if (!result.data.profileComplete) {
          window.location.href = `/complete-profile`;
          return;
        }
        setMe(result.data);
      } else {
        setMe(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    void load(pageIndex);
  }, [load, pageIndex]);

  useCallupPlayersRealtime({
    callupIds: data?.items.map((i) => i.id) ?? [],
    enabled: Boolean(data && data.items.length > 0),
    onChange: () => {
      void load(pageIndex);
    },
  });

  async function copyKey(key: string, id: string) {
    try {
      await navigator.clipboard.writeText(key);
      setCopyFlash(id);
      window.setTimeout(() => setCopyFlash(null), 1500);
    } catch {
      setError("No se pudo copiar la llave.");
    }
  }

  const totalPages = data
    ? Math.max(1, Math.ceil(data.totalCount / data.pageSize))
    : 1;

  return (
    <div className="flex min-h-full flex-1 flex-col bg-[var(--kortumo-white)]">
      <header className="flex items-center justify-between gap-3 border-b border-[var(--kortumo-navy)]/10 bg-white px-4 py-3 sm:px-6">
        <Link href="/" className="shrink-0">
          <LogoK size={36} withWordmark className="text-[var(--kortumo-navy)]" />
        </Link>
        {me ? (
          <Link
            href={me.userName ? "/caller" : "/complete-caller-username"}
            className="truncate text-sm font-medium text-[var(--kortumo-navy)]"
          >
            {me.name}
          </Link>
        ) : me === null ? (
          <Link
            href={googleAuthHref("player", `/${slug}`)}
            className="text-sm font-semibold text-[var(--kortumo-red)]"
          >
            Entrar
          </Link>
        ) : (
          <span className="text-sm text-[var(--kortumo-navy)]/40">…</span>
        )}
      </header>

      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-5 px-4 py-6 sm:px-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--kortumo-navy)]/50">
              Canal
            </p>
            <h1 className="font-[family-name:var(--font-montserrat)] text-2xl font-bold text-[var(--kortumo-navy)]">
              /{slug}
            </h1>
            <p className="mt-1 text-sm text-[var(--kortumo-navy)]/70">
              Convocatorias
            </p>
          </div>
          <FollowButton userName={slug} isOwnChannel={isOwnChannel} />
        </div>

        {loading && !data ? (
          <p className="text-sm text-[var(--kortumo-navy)]/60">Cargando…</p>
        ) : null}

        {error && !data ? (
          <p className="text-sm text-[var(--kortumo-red)]" role="alert">
            {error}
          </p>
        ) : null}

        {data && data.items.length === 0 ? (
          <p className="rounded-md border border-dashed border-[var(--kortumo-navy)]/20 px-4 py-10 text-center text-sm text-[var(--kortumo-navy)]/70">
            Este caller aún no tiene convocatorias.
          </p>
        ) : null}

        {data && data.items.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {error ? (
              <li>
                <p className="text-sm text-[var(--kortumo-red)]" role="alert">
                  {error}
                </p>
              </li>
            ) : null}
            {data.items.map((item) => {
              const open = expandedId === item.id;
              const canJoin =
                item.subscribeEligibility.canJoinRoster ||
                item.subscribeEligibility.canJoinWaitlist;
              return (
                <li
                  key={item.id}
                  className="overflow-hidden rounded-md border border-[var(--kortumo-navy)]/10 bg-white"
                >
                  <button
                    type="button"
                    onClick={() => setExpandedId(open ? null : item.id)}
                    className="flex w-full items-start gap-2 px-3 py-3 text-left"
                    aria-expanded={open}
                  >
                    <span
                      className="mt-0.5 text-[var(--kortumo-navy)]/50"
                      aria-hidden
                    >
                      {open ? "▼" : "▶"}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-[family-name:var(--font-montserrat)] text-sm font-semibold text-[var(--kortumo-navy)]">
                        {formatMatchAtEs(item.matchAt)}
                      </span>
                      <span className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                        <span
                          className={`rounded px-2 py-0.5 font-medium ${statusPillClass(item.status)}`}
                        >
                          {statusLabelEs(item.status)}
                        </span>
                        <span className="text-[var(--kortumo-navy)]/70">
                          {item.rosterCount} / {item.spotsQuantity}
                          {item.waitlistCount > 0
                            ? ` · espera ${item.waitlistCount}`
                            : ""}
                        </span>
                        {!open && canJoin ? (
                          <span className="font-medium text-[var(--kortumo-teal)]">
                            Inscribir
                          </span>
                        ) : null}
                      </span>
                    </span>
                  </button>

                  {open ? (
                    <div className="space-y-3 border-t border-[var(--kortumo-navy)]/8 px-3 pb-3 pt-2">
                      <p className="text-sm text-[var(--kortumo-navy)]/80">
                        <span className="font-medium">Cancha:</span>{" "}
                        {item.courtName}
                        {item.courtAddress ? ` / ${item.courtAddress}` : ""}
                      </p>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-medium text-[var(--kortumo-navy)]">
                          Llave:
                        </span>
                        <code className="rounded bg-[var(--kortumo-navy)]/5 px-1.5 py-0.5 text-[var(--kortumo-navy)]">
                          {item.paymentKey}
                        </code>
                        <button
                          type="button"
                          onClick={() => copyKey(item.paymentKey, item.id)}
                          className="text-xs font-medium text-[var(--kortumo-blue-soft)] underline-offset-2 hover:underline"
                        >
                          {copyFlash === item.id ? "Copiado" : "Copiar"}
                        </button>
                      </div>

                      <PlayerRoster
                        callupId={item.id}
                        sessionUserId={me?.id ?? null}
                        isOwner={isOwnChannel}
                        onChanged={() => void load(pageIndex)}
                      />
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : null}

        {data && data.totalCount > data.pageSize ? (
          <div className="flex items-center justify-between gap-3 pt-2">
            <button
              type="button"
              disabled={pageIndex <= 0 || loading}
              onClick={() => setPageIndex((p) => Math.max(0, p - 1))}
              className="text-sm font-medium text-[var(--kortumo-navy)] disabled:opacity-40"
            >
              Anterior
            </button>
            <span className="text-xs text-[var(--kortumo-navy)]/60">
              {pageIndex + 1} / {totalPages}
            </span>
            <button
              type="button"
              disabled={pageIndex + 1 >= totalPages || loading}
              onClick={() => setPageIndex((p) => p + 1)}
              className="text-sm font-medium text-[var(--kortumo-navy)] disabled:opacity-40"
            >
              Siguiente
            </button>
          </div>
        ) : null}
      </main>
    </div>
  );
}
