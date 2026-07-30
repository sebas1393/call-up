"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { fetchMe, googleAuthHref } from "@/components/auth/me-api";
import { AdminRoster } from "@/components/callup/admin-roster";
import type { CallupStatus } from "@/lib/constants/callup";
import {
  formatMatchAtEs,
  statusLabelEs,
  statusPillClass,
} from "@/lib/format/callup-display";

type CallupDetail = {
  id: string;
  callerId: string;
  status: CallupStatus;
  matchAt: string;
  courtType: string;
  spotsQuantity: number;
  rosterCount: number;
  waitlistCount: number;
  paymentKey: string;
  court: { id: string; name: string; address: string };
};

type AdminCallupViewProps = {
  callupId: string;
};

/**
 * Owner-only Administrar screen shell (US-005).
 */
export function AdminCallupView({ callupId }: AdminCallupViewProps) {
  const router = useRouter();
  const [detail, setDetail] = useState<CallupDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const hasDetailRef = useRef(false);

  const load = useCallback(async () => {
    const isInitial = !hasDetailRef.current;
    if (isInitial) {
      setLoading(true);
    }
    setError(null);

    const me = await fetchMe();
    if (!me.ok) {
      if (me.status === 401) {
        window.location.href = googleAuthHref(
          "caller",
          `/callups/${callupId}`,
        );
        return;
      }
      setError(me.detail);
      setLoading(false);
      return;
    }
    if (!me.data.profileComplete) {
      router.replace("/complete-profile");
      return;
    }
    if (!me.data.userName) {
      router.replace("/complete-caller-username");
      return;
    }

    const res = await fetch(`/api/v1/callups/${callupId}`, {
      credentials: "include",
      cache: "no-store",
    });
    if (res.status === 404) {
      setError("No se encontró la convocatoria.");
      setLoading(false);
      return;
    }
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { detail?: string };
      setError(body.detail ?? "No se pudo cargar la convocatoria.");
      setLoading(false);
      return;
    }

    const json = (await res.json()) as { data: CallupDetail };
    if (json.data.callerId !== me.data.id) {
      setError("No tienes permiso para administrar esta convocatoria.");
      setLoading(false);
      return;
    }

    hasDetailRef.current = true;
    setDetail(json.data);
    setLoading(false);
  }, [callupId, router]);

  useEffect(() => {
    void load();
  }, [load]);

  async function copyKey() {
    if (!detail) return;
    try {
      await navigator.clipboard.writeText(detail.paymentKey);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setError("No se pudo copiar la llave.");
    }
  }

  if (loading && !detail) {
    return (
      <p className="text-sm text-[var(--kortumo-navy)]/60">Cargando…</p>
    );
  }

  if (!detail) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-[var(--kortumo-red)]" role="alert">
          {error ?? "Sin datos."}
        </p>
        <Link
          href="/caller"
          className="inline-flex h-11 items-center justify-center rounded-md border border-[var(--kortumo-navy)]/20 px-4 text-sm font-semibold text-[var(--kortumo-navy)]"
        >
          Volver al panel
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--kortumo-navy)]/50">
            Administrar
          </p>
          <h1 className="mt-1 font-[family-name:var(--font-montserrat)] text-xl font-bold text-[var(--kortumo-navy)]">
            {formatMatchAtEs(detail.matchAt)}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-[var(--kortumo-navy)]/80">
            <span
              className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${statusPillClass(detail.status)}`}
            >
              {statusLabelEs(detail.status)}
            </span>
            <span>
              {detail.rosterCount}/{detail.spotsQuantity}
            </span>
            <span>· {detail.courtType}</span>
          </div>
        </div>
        <Link
          href="/caller"
          className="inline-flex h-10 items-center rounded-md border border-[var(--kortumo-navy)]/20 px-4 text-sm font-semibold text-[var(--kortumo-navy)]"
        >
          Cerrar
        </Link>
      </div>

      {error ? (
        <p className="text-sm text-[var(--kortumo-red)]" role="alert">
          {error}
        </p>
      ) : null}

      <div className="space-y-1 text-sm text-[var(--kortumo-navy)]/80">
        <p>
          <span className="font-medium text-[var(--kortumo-navy)]">Cancha:</span>{" "}
          {detail.court.name}
          {detail.court.address ? ` / ${detail.court.address}` : null}
        </p>
        <p className="flex flex-wrap items-center gap-2">
          <span>
            <span className="font-medium text-[var(--kortumo-navy)]">Llave:</span>{" "}
            {detail.paymentKey}
          </span>
          <button
            type="button"
            onClick={() => void copyKey()}
            className="text-xs font-semibold text-[var(--kortumo-blue-soft)]"
          >
            {copied ? "Copiado" : "Copiar"}
          </button>
        </p>
      </div>

      <AdminRoster callupId={callupId} onChanged={() => void load()} />
    </div>
  );
}
