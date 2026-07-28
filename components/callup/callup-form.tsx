"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { CourtPicker, type CourtOption } from "@/components/courts";
import {
  DEFAULT_SPOTS_BY_COURT_TYPE,
  type CourtType,
} from "@/lib/constants/callup";
import {
  bogotaLocalInputToIso,
  isoToBogotaLocalInput,
  nowBogotaLocalInput,
} from "@/lib/format/match-at-input";
import {
  createCallupBodySchema,
  updateCallupBodySchema,
} from "@/lib/validators/callup";

const fieldClass =
  "h-11 rounded-md border border-[var(--kortumo-navy)]/20 px-3 text-base text-[var(--kortumo-navy)] placeholder:text-[var(--kortumo-navy)]/40 focus:border-[var(--kortumo-blue-soft)] focus:outline-none";

type CallupDetail = {
  id: string;
  status: string;
  matchAt: string;
  courtType: CourtType;
  spotsQuantity: number;
  waitList: boolean;
  paymentKey: string;
  court: { id: string; name: string; address: string };
  rosterCount: number;
};

type CallupFormProps =
  | { mode: "create" }
  | { mode: "edit"; callupId: string };

/**
 * Create (US-003a) / edit (US-006) callup form. Threshold is server-only (not shown).
 */
export function CallupForm(props: CallupFormProps) {
  const router = useRouter();
  const [court, setCourt] = useState<CourtOption | null>(null);
  const [courtType, setCourtType] = useState<CourtType>("F5");
  const [spotsQuantity, setSpotsQuantity] = useState<number>(
    DEFAULT_SPOTS_BY_COURT_TYPE.F5,
  );
  const [waitList, setWaitList] = useState(true);
  const [matchLocal, setMatchLocal] = useState("");
  const [paymentKey, setPaymentKey] = useState("");
  const [subscribeMyself, setSubscribeMyself] = useState(false);
  const [rosterCount, setRosterCount] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(props.mode === "edit");
  const [pending, startTransition] = useTransition();
  const minMatch = nowBogotaLocalInput();

  const editId = props.mode === "edit" ? props.callupId : null;

  useEffect(() => {
    if (!editId) return;
    let cancelled = false;
    (async () => {
      const res = await fetch(`/api/v1/callups/${editId}`, {
        credentials: "include",
      });
      if (cancelled) return;
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { detail?: string };
        setLoadError(body.detail ?? "No se pudo cargar la convocatoria.");
        setLoading(false);
        return;
      }
      const json = (await res.json()) as { data: CallupDetail };
      const d = json.data;
      if (d.status === "cancelled" || d.status === "Closed") {
        setLoadError(
          "Esta convocatoria no se puede modificar (cerrada o cancelada).",
        );
        setLoading(false);
        return;
      }
      setCourt(d.court);
      setCourtType(d.courtType);
      setSpotsQuantity(d.spotsQuantity);
      setWaitList(d.waitList);
      setMatchLocal(isoToBogotaLocalInput(d.matchAt));
      setPaymentKey(d.paymentKey);
      setRosterCount(d.rosterCount);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [editId]);

  function onCourtTypeChange(next: CourtType) {
    setCourtType(next);
    setSpotsQuantity(DEFAULT_SPOTS_BY_COURT_TYPE[next]);
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!court) {
      setError("Seleccioná una cancha.");
      return;
    }

    let matchAt: string;
    try {
      matchAt = bogotaLocalInputToIso(matchLocal);
    } catch {
      setError("Fecha del cotejo inválida.");
      return;
    }

    if (props.mode === "create") {
      const parsed = createCallupBodySchema.safeParse({
        courtId: court.id,
        courtType,
        spotsQuantity,
        waitList,
        matchAt,
        paymentKey,
        subscribeMyself,
      });
      if (!parsed.success) {
        setError(parsed.error.issues[0]?.message ?? "Datos inválidos.");
        return;
      }

      startTransition(async () => {
        const res = await fetch("/api/v1/callups", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(parsed.data),
        });
        if (!res.ok) {
          const body = (await res.json().catch(() => ({}))) as {
            detail?: string;
          };
          setError(body.detail ?? "No se pudo crear la convocatoria.");
          return;
        }
        router.push("/caller");
      });
      return;
    }

    const parsed = updateCallupBodySchema.safeParse({
      courtId: court.id,
      courtType,
      spotsQuantity,
      matchAt,
      paymentKey,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Datos inválidos.");
      return;
    }
    if (spotsQuantity < rosterCount) {
      setError(
        `Las plazas no pueden ser menores al plantel inscrito (${rosterCount}).`,
      );
      return;
    }

    startTransition(async () => {
      const res = await fetch(`/api/v1/callups/${props.callupId}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { detail?: string };
        setError(body.detail ?? "No se pudo guardar.");
        return;
      }
      router.push("/caller");
    });
  }

  const title = props.mode === "create" ? "Crear convocatoria" : "Modificar convocatoria";

  if (loading) {
    return (
      <p className="text-sm text-[var(--kortumo-navy)]/60">Cargando…</p>
    );
  }

  if (loadError) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm text-[var(--kortumo-red)]" role="alert">
          {loadError}
        </p>
        <Link
          href="/caller"
          className="text-sm font-medium text-[var(--kortumo-navy)] underline"
        >
          Volver
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <h1 className="font-[family-name:var(--font-montserrat)] text-xl font-bold text-[var(--kortumo-navy)]">
        {title}
      </h1>

      <CourtPicker value={court} onChange={setCourt} />

      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-[var(--kortumo-navy)]">
          Tipo de cancha
        </span>
        <div className="flex gap-2">
          {(["F5", "F6"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => onCourtTypeChange(t)}
              className={`h-11 flex-1 rounded-md text-sm font-semibold ${
                courtType === t
                  ? "bg-[var(--kortumo-navy)] text-white"
                  : "border border-[var(--kortumo-navy)]/20 text-[var(--kortumo-navy)]"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="spots"
          className="text-sm font-medium text-[var(--kortumo-navy)]"
        >
          Plazas
        </label>
        <input
          id="spots"
          type="number"
          min={props.mode === "edit" ? Math.max(1, rosterCount) : 1}
          max={30}
          value={spotsQuantity}
          onChange={(e) => setSpotsQuantity(Number(e.target.value) || 1)}
          className={fieldClass}
          required
        />
        {props.mode === "edit" && rosterCount > 0 ? (
          <p className="text-xs text-[var(--kortumo-navy)]/55">
            Mínimo {rosterCount} (jugadores en plantel).
          </p>
        ) : null}
      </div>

      {props.mode === "create" ? (
        <label className="flex items-center gap-3 text-sm text-[var(--kortumo-navy)]">
          <input
            type="checkbox"
            checked={waitList}
            onChange={(e) => setWaitList(e.target.checked)}
            className="h-4 w-4 accent-[var(--kortumo-navy)]"
          />
          ¿Aceptar lista de espera?
        </label>
      ) : (
        <p className="text-sm text-[var(--kortumo-navy)]">
          Lista de espera:{" "}
          <span className="font-semibold">{waitList ? "Sí" : "No"}</span>
          <span className="block text-xs font-normal text-[var(--kortumo-navy)]/55">
            No se puede cambiar después de crear.
          </span>
        </p>
      )}

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="matchAt"
          className="text-sm font-medium text-[var(--kortumo-navy)]"
        >
          Fecha del cotejo
        </label>
        <input
          id="matchAt"
          type="datetime-local"
          min={minMatch}
          value={matchLocal}
          onChange={(e) => setMatchLocal(e.target.value)}
          className={fieldClass}
          required
        />
        <p className="text-xs text-[var(--kortumo-navy)]/55">
          Horario Colombia (America/Bogotá).
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="paymentKey"
          className="text-sm font-medium text-[var(--kortumo-navy)]"
        >
          Llave
        </label>
        <input
          id="paymentKey"
          value={paymentKey}
          onChange={(e) => setPaymentKey(e.target.value.replace(/\s/g, ""))}
          maxLength={50}
          className={fieldClass}
          placeholder="@llave123"
          required
          autoComplete="off"
        />
        <p className="text-xs text-[var(--kortumo-navy)]/55">
          Sin espacios. Nequi, celular o email (máx. 50).
        </p>
      </div>

      {props.mode === "create" ? (
        <label className="flex items-center gap-3 text-sm text-[var(--kortumo-navy)]">
          <input
            type="checkbox"
            checked={subscribeMyself}
            onChange={(e) => setSubscribeMyself(e.target.checked)}
            className="h-4 w-4 accent-[var(--kortumo-navy)]"
          />
          Suscribirme a la convocatoria
        </label>
      ) : null}

      {error ? (
        <p className="text-sm text-[var(--kortumo-red)]" role="alert">
          {error}
        </p>
      ) : null}

      <div className="flex gap-2 pt-1">
        <Link
          href="/caller"
          className="inline-flex h-11 flex-1 items-center justify-center rounded-md border border-[var(--kortumo-navy)]/20 text-sm font-medium text-[var(--kortumo-navy)]"
        >
          Cancelar
        </Link>
        <button
          type="submit"
          disabled={pending}
          className="h-11 flex-1 rounded-md bg-[var(--kortumo-red)] text-sm font-semibold text-white disabled:opacity-60"
        >
          {pending
            ? "Guardando…"
            : props.mode === "create"
              ? "Crear"
              : "Guardar"}
        </button>
      </div>
    </form>
  );
}
