"use client";

import { FormEvent, useCallback, useEffect, useState, useTransition } from "react";

import { BottomSheet } from "@/components/ui/bottom-sheet";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ErrorCode } from "@/lib/constants/error-codes";
import { canMutateCallup } from "@/lib/format/callup-display";
import type { CallupStatus } from "@/lib/constants/callup";
import { useCallupPlayersRealtime } from "@/lib/realtime/use-callup-players-realtime";

export type PlayerDto = {
  id: string;
  name: string;
  hasPayment: boolean;
  isWaitList: boolean;
  userId: string | null;
  createdAt: string;
};

type CallupDetail = {
  id: string;
  status: CallupStatus;
  spotsQuantity: number;
  rosterCount: number;
  waitlistCount: number;
  waitList: boolean;
  subscribeEligibility: {
    canJoinRoster: boolean;
    canJoinWaitlist: boolean;
  };
  players: PlayerDto[];
};

type PlayerRosterProps = {
  callupId: string;
  sessionUserId: string | null;
  isOwner: boolean;
  onChanged?: () => void;
};

type ProblemBody = { detail?: string; code?: string };

type WaitlistPrompt =
  | { kind: "guest"; guestName: string; message: string }
  | { kind: "self"; message: string };

const ROW_GRID =
  "grid grid-cols-[1.25rem_minmax(0,1fr)_2rem] items-center gap-x-2 px-3 py-2";

/**
 * Public roster: anon Inscribir (guest), logged-in Inscribirme + Promoverme (US-009).
 */
export function PlayerRoster({
  callupId,
  sessionUserId,
  isOwner,
  onChanged,
}: PlayerRosterProps) {
  const [detail, setDetail] = useState<CallupDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, startTransition] = useTransition();
  const [waitlistPrompt, setWaitlistPrompt] = useState<WaitlistPrompt | null>(
    null,
  );
  const [guestOpen, setGuestOpen] = useState(false);
  const [guestName, setGuestName] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/v1/callups/${callupId}`, {
      credentials: "include",
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as ProblemBody;
      setError(body.detail ?? "No se pudo cargar la convocatoria.");
      setLoading(false);
      return;
    }
    const json = (await res.json()) as { data: CallupDetail };
    setDetail(json.data);
    setLoading(false);
  }, [callupId]);

  useEffect(() => {
    void load();
  }, [load]);

  useCallupPlayersRealtime({
    callupIds: [callupId],
    onChange: () => {
      void load();
      onChanged?.();
    },
  });

  function refresh() {
    void load();
    onChanged?.();
  }

  async function postGuest(name: string, acceptWaitlist: boolean) {
    const res = await fetch(`/api/v1/callups/${callupId}/players/guests`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        guestName: name,
        acceptWaitlist,
        hasPayment: false,
      }),
    });
    const body = (await res.json().catch(() => ({}))) as ProblemBody;
    if (
      res.status === 409 &&
      body.code === ErrorCode.WAITLIST_CONFIRM_REQUIRED
    ) {
      setWaitlistPrompt({
        kind: "guest",
        guestName: name,
        message:
          body.detail ??
          "Lista llena, ¿deseas suscribirte a la lista de espera?",
      });
      return;
    }
    if (!res.ok) {
      setError(body.detail ?? "No se pudo inscribir.");
      return;
    }
    setWaitlistPrompt(null);
    setGuestOpen(false);
    setGuestName("");
    refresh();
  }

  async function postSubscribe(acceptWaitlist: boolean) {
    const res = await fetch(`/api/v1/callups/${callupId}/players/subscribe`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ acceptWaitlist }),
    });
    const body = (await res.json().catch(() => ({}))) as ProblemBody;
    if (
      res.status === 409 &&
      body.code === ErrorCode.WAITLIST_CONFIRM_REQUIRED
    ) {
      setWaitlistPrompt({
        kind: "self",
        message:
          body.detail ??
          "Lista llena, ¿deseas suscribirte a la lista de espera?",
      });
      return;
    }
    if (!res.ok) {
      setError(body.detail ?? "No se pudo inscribir.");
      return;
    }
    setWaitlistPrompt(null);
    refresh();
  }

  function onGuestSubmit(e: FormEvent) {
    e.preventDefault();
    const name = guestName.trim();
    if (!name) {
      setError("El nombre del jugador es obligatorio.");
      return;
    }
    startTransition(async () => {
      await postGuest(name, false);
    });
  }

  function onInscribirme() {
    startTransition(async () => {
      await postSubscribe(false);
    });
  }

  function togglePayment(player: PlayerDto) {
    startTransition(async () => {
      const res = await fetch(
        `/api/v1/callups/${callupId}/players/${player.id}/payment`,
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ hasPayment: !player.hasPayment }),
        },
      );
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as ProblemBody;
        setError(body.detail ?? "No se pudo actualizar el pago.");
        return;
      }
      refresh();
    });
  }

  function onPromote(player: PlayerDto) {
    startTransition(async () => {
      const res = await fetch(
        `/api/v1/callups/${callupId}/players/${player.id}/promote`,
        { method: "POST", credentials: "include" },
      );
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as ProblemBody;
        setError(body.detail ?? "No se pudo promover.");
        return;
      }
      refresh();
    });
  }

  if (loading && !detail) {
    return (
      <p className="text-sm text-[var(--kortumo-navy)]/60">Cargando jugadores…</p>
    );
  }

  if (!detail) {
    return (
      <p className="text-sm text-[var(--kortumo-red)]" role="alert">
        {error ?? "Sin datos."}
      </p>
    );
  }

  const mutable = canMutateCallup(detail.status);
  const eligibilityOk =
    mutable &&
    (detail.subscribeEligibility.canJoinRoster ||
      detail.subscribeEligibility.canJoinWaitlist);
  const rosterFree = detail.rosterCount < detail.spotsQuantity;

  const alreadyEnrolled = Boolean(
    sessionUserId &&
      detail.players.some((p) => p.userId === sessionUserId),
  );

  const showGuestInscribir = !sessionUserId && eligibilityOk;
  const showInscribirme = Boolean(sessionUserId) && !alreadyEnrolled && eligibilityOk;

  const roster = detail.players.filter((p) => !p.isWaitList);
  const waitlist = detail.players.filter((p) => p.isWaitList);

  return (
    <div className="box-border w-full max-w-full min-w-0 space-y-3 overflow-x-hidden">
      {error ? (
        <p className="text-sm text-[var(--kortumo-red)]" role="alert">
          {error}
        </p>
      ) : null}

      <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-[var(--kortumo-navy)]">
          Jugadores
        </h3>
        {showGuestInscribir ? (
          <button
            type="button"
            onClick={() => {
              setGuestName("");
              setGuestOpen(true);
            }}
            className="h-8 shrink-0 rounded-md bg-[var(--kortumo-red)] px-2.5 text-xs font-semibold text-white"
          >
            + Inscribir
          </button>
        ) : null}
        {showInscribirme ? (
          <button
            type="button"
            disabled={pending}
            onClick={onInscribirme}
            className="h-8 shrink-0 rounded-md bg-[var(--kortumo-red)] px-2.5 text-xs font-semibold text-white disabled:opacity-60"
          >
            Inscribirme
          </button>
        ) : null}
      </div>

      <PlayerTable
        title="Nómina"
        players={roster}
        sessionUserId={sessionUserId}
        isOwner={isOwner}
        callupStatus={detail.status}
        rosterFree={false}
        mutable={mutable}
        pending={pending}
        onTogglePayment={togglePayment}
        onPromote={onPromote}
      />

      {waitlist.length > 0 || detail.waitList ? (
        <PlayerTable
          title="Lista de espera"
          players={waitlist}
          sessionUserId={sessionUserId}
          isOwner={isOwner}
          callupStatus={detail.status}
          rosterFree={rosterFree}
          mutable={mutable}
          pending={pending}
          onTogglePayment={togglePayment}
          onPromote={onPromote}
        />
      ) : null}

      <BottomSheet
        open={guestOpen}
        title="Inscribir jugador"
        onClose={() => {
          setGuestOpen(false);
          setWaitlistPrompt(null);
        }}
      >
        <form
          onSubmit={onGuestSubmit}
          className="box-border flex w-full max-w-full min-w-0 flex-col gap-3"
        >
          <label
            htmlFor={`guest-${callupId}`}
            className="text-sm font-medium text-[var(--kortumo-navy)]"
          >
            Nombre del jugador
          </label>
          <input
            id={`guest-${callupId}`}
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
            className="box-border h-11 w-full max-w-full min-w-0 rounded-md border border-[var(--kortumo-navy)]/20 px-3 text-base text-[var(--kortumo-navy)] focus:border-[var(--kortumo-blue-soft)] focus:outline-none"
            placeholder="Pepe"
            required
            autoFocus
          />
          <div className="flex w-full min-w-0 gap-2">
            <button
              type="button"
              onClick={() => {
                setGuestOpen(false);
                setWaitlistPrompt(null);
              }}
              className="h-11 min-w-0 flex-1 rounded-md border border-[var(--kortumo-navy)]/20 text-sm font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={pending}
              className="h-11 min-w-0 flex-1 rounded-md bg-[var(--kortumo-navy)] text-sm font-semibold text-white disabled:opacity-60"
            >
              Inscribir
            </button>
          </div>
        </form>
      </BottomSheet>

      <ConfirmDialog
        open={waitlistPrompt != null}
        title="Lista de espera"
        message={
          waitlistPrompt?.message ??
          "Lista llena, ¿deseas suscribirte a la lista de espera?"
        }
        confirmLabel="Sí"
        cancelLabel="No"
        pending={pending}
        onCancel={() => setWaitlistPrompt(null)}
        onConfirm={() => {
          const prompt = waitlistPrompt;
          if (!prompt) return;
          startTransition(async () => {
            if (prompt.kind === "guest") {
              await postGuest(prompt.guestName, true);
            } else {
              await postSubscribe(true);
            }
          });
        }}
      />
    </div>
  );
}

function PlayerTable({
  title,
  players,
  sessionUserId,
  isOwner,
  callupStatus,
  rosterFree,
  mutable,
  pending,
  onTogglePayment,
  onPromote,
}: {
  title: string;
  players: PlayerDto[];
  sessionUserId: string | null;
  isOwner: boolean;
  callupStatus: CallupStatus;
  rosterFree: boolean;
  mutable: boolean;
  pending: boolean;
  onTogglePayment: (p: PlayerDto) => void;
  onPromote: (p: PlayerDto) => void;
}) {
  const paymentAllowed =
    callupStatus !== "cancelled" &&
    (callupStatus === "Closed" ||
      callupStatus === "Open" ||
      callupStatus === "Full");

  return (
    <div className="box-border w-full max-w-full min-w-0">
      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-[var(--kortumo-navy)]/55">
        {title}
      </p>
      {players.length === 0 ? (
        <p className="text-xs text-[var(--kortumo-navy)]/50">Nadie aún.</p>
      ) : (
        <div className="box-border w-full max-w-full min-w-0 overflow-hidden rounded-md border border-[var(--kortumo-navy)]/10">
          <div
            className={`${ROW_GRID} border-b border-[var(--kortumo-navy)]/10 bg-[var(--kortumo-navy)]/[0.04] text-sm`}
            role="row"
          >
            <span className="block" aria-hidden>
              &nbsp;
            </span>
            <span className="text-left text-xs font-semibold uppercase tracking-wide text-[var(--kortumo-navy)]/65">
              Nombre
            </span>
            <span className="justify-self-center" title="Ya pagó" aria-label="Ya pagó">
              💵
            </span>
          </div>
          <ul className="divide-y divide-[var(--kortumo-navy)]/10">
            {players.map((p, i) => {
              const canPay = paymentAllowed && isOwner;
              const isSelf = Boolean(
                sessionUserId && p.userId === sessionUserId,
              );
              const canPromote =
                p.isWaitList &&
                mutable &&
                rosterFree &&
                (isOwner || isSelf);
              return (
                <li
                  key={p.id}
                  className={`${ROW_GRID} text-sm text-[var(--kortumo-navy)]`}
                >
                  <span className="text-xs text-[var(--kortumo-navy)]/45">
                    {i + 1}
                  </span>
                  <div className="min-w-0">
                    <span className="block truncate font-medium" title={p.name}>
                      {p.name}
                      {isSelf ? (
                        <span className="ml-1 text-xs font-normal text-[var(--kortumo-teal)]">
                          (tú)
                        </span>
                      ) : null}
                    </span>
                    {canPromote ? (
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => onPromote(p)}
                        className="mt-0.5 text-xs font-semibold text-[var(--kortumo-blue-soft)] disabled:opacity-60"
                      >
                        {isSelf && !isOwner ? "Promoverme" : "Promover"}
                      </button>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    disabled={!canPay || pending}
                    onClick={() => onTogglePayment(p)}
                    className="justify-self-center text-base leading-none disabled:opacity-40"
                    aria-label={
                      p.hasPayment ? "Marcar sin pago" : "Marcar pago"
                    }
                    title="Ya pagó"
                  >
                    {p.hasPayment ? (
                      <span className="text-[var(--kortumo-teal)]" aria-hidden>
                        ✓
                      </span>
                    ) : (
                      <span
                        className="font-bold text-[var(--kortumo-red)]"
                        aria-hidden
                      >
                        ✕
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
