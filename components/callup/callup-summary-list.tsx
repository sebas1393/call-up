"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, useTransition } from "react";

import type { CallupStatus } from "@/lib/constants/callup";
import {
  canMutateCallup,
  formatMatchAtEs,
  statusLabelEs,
  statusPillClass,
} from "@/lib/format/callup-display";
import { useCallupPlayersRealtime } from "@/lib/realtime/use-callup-players-realtime";

export type CallupSummaryItem = {
  id: string;
  matchAt: string;
  status: CallupStatus;
  spotsQuantity: number;
  rosterCount: number;
  waitlistCount: number;
  courtName: string;
  paymentKey: string;
  subscribeEligibility: {
    canJoinRoster: boolean;
    canJoinWaitlist: boolean;
  };
};

type MineResponse = {
  items: CallupSummaryItem[];
  pageIndex: number;
  pageSize: number;
  totalCount: number;
};

/**
 * Paginated expandable callup list for caller dashboard (US-004).
 */
export function CallupSummaryList() {
  const [pageIndex, setPageIndex] = useState(0);
  const [data, setData] = useState<MineResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [copyFlash, setCopyFlash] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const load = useCallback(async (page: number, opts?: { soft?: boolean }) => {
    if (!opts?.soft) {
      setLoading(true);
    }
    setError(null);
    const res = await fetch(
      `/api/v1/callups/mine?pageIndex=${page}&pageSize=10`,
      { credentials: "include", cache: "no-store" },
    );
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { detail?: string };
      setError(body.detail ?? "No se pudieron cargar las convocatorias.");
      setLoading(false);
      return;
    }
    const json = (await res.json()) as { data: MineResponse };
    setData(json.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load(pageIndex);
  }, [load, pageIndex]);

  useCallupPlayersRealtime({
    callupIds: data?.items.map((i) => i.id) ?? [],
    enabled: Boolean(data && data.items.length > 0),
    onChange: () => {
      void load(pageIndex, { soft: true });
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

  function confirmCancel(id: string) {
    startTransition(async () => {
      const res = await fetch(`/api/v1/callups/${id}/cancel`, {
        method: "POST",
        credentials: "include",
      });
      setCancelId(null);
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { detail?: string };
        setError(body.detail ?? "No se pudo cancelar.");
        return;
      }
      await load(pageIndex);
    });
  }

  const totalPages = data
    ? Math.max(1, Math.ceil(data.totalCount / data.pageSize))
    : 1;

  if (loading && !data) {
    return <p className="text-sm text-[var(--kortumo-navy)]/60">Cargando…</p>;
  }

  if (error && !data) {
    return (
      <p className="text-sm text-[var(--kortumo-red)]" role="alert">
        {error}
      </p>
    );
  }

  if (!data || data.items.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-[var(--kortumo-navy)]/20 px-4 py-10 text-center">
        <p className="text-sm text-[var(--kortumo-navy)]/70">
          Aún no tienes convocatorias.
        </p>
        <Link
          href="/caller/callups/new"
          className="mt-4 inline-flex h-11 items-center justify-center rounded-md bg-[var(--kortumo-red)] px-4 text-sm font-semibold text-white"
        >
          Crear
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {error ? (
        <p className="text-sm text-[var(--kortumo-red)]" role="alert">
          {error}
        </p>
      ) : null}

      <ul className="flex flex-col gap-2">
        {data.items.map((item) => {
          const open = expandedId === item.id;
          const mutable = canMutateCallup(item.status);
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
                <span className="mt-0.5 text-[var(--kortumo-navy)]/50" aria-hidden>
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
                  </span>
                </span>
              </button>

              {open ? (
                <div className="space-y-3 border-t border-[var(--kortumo-navy)]/8 px-3 pb-3 pt-2">
                  <p className="text-sm text-[var(--kortumo-navy)]/80">
                    <span className="font-medium">Cancha:</span>{" "}
                    {item.courtName || "—"}
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
                      aria-label="Copiar llave"
                    >
                      {copyFlash === item.id ? "Copiado" : "Copiar"}
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1">
                    <Link
                      href={`/callups/${item.id}`}
                      className="inline-flex h-9 items-center rounded-md border border-[var(--kortumo-navy)]/20 px-3 text-xs font-semibold text-[var(--kortumo-navy)]"
                    >
                      Administrar
                    </Link>
                    {mutable ? (
                      <>
                        <Link
                          href={`/callups/${item.id}/edit`}
                          className="inline-flex h-9 items-center rounded-md border border-[var(--kortumo-navy)]/20 px-3 text-xs font-semibold text-[var(--kortumo-navy)]"
                        >
                          Modificar
                        </Link>
                        <button
                          type="button"
                          onClick={() => setCancelId(item.id)}
                          className="inline-flex h-9 items-center rounded-md px-3 text-xs font-semibold text-[var(--kortumo-red)]"
                        >
                          Cancelar
                        </button>
                      </>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>

      {data.totalCount > data.pageSize ? (
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

      {cancelId ? (
        <div
          className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cancel-title"
        >
          <div className="w-full max-w-sm rounded-md bg-white p-5 shadow-lg">
            <h2
              id="cancel-title"
              className="font-[family-name:var(--font-montserrat)] text-lg font-bold text-[var(--kortumo-navy)]"
            >
              ¿Cancelar convocatoria?
            </h2>
            <p className="mt-2 text-sm text-[var(--kortumo-navy)]/75">
              Esta acción es irreversible. La convocatoria quedará como
              Cancelada.
            </p>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                disabled={pending}
                onClick={() => setCancelId(null)}
                className="h-11 flex-1 rounded-md border border-[var(--kortumo-navy)]/20 text-sm font-semibold text-[var(--kortumo-navy)]"
              >
                No
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() => confirmCancel(cancelId)}
                className="h-11 flex-1 rounded-md bg-[var(--kortumo-red)] text-sm font-semibold text-white disabled:opacity-60"
              >
                {pending ? "…" : "Sí, cancelar"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
