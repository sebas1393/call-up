"use client";

import { FormEvent, useCallback, useEffect, useState, useTransition } from "react";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ErrorCode } from "@/lib/constants/error-codes";
import { canMutateCallup } from "@/lib/format/callup-display";
import type { CallupStatus } from "@/lib/constants/callup";

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
  onAuthRequired: () => void;
  onChanged?: () => void;
};

type ProblemBody = { detail?: string; code?: string };

/**
 * Roster / waitlist for a callup: subscribe, guests, payment, promote (US-009).
 */
export function PlayerRoster({
  callupId,
  sessionUserId,
  isOwner,
  onAuthRequired,
  onChanged,
}: PlayerRosterProps) {
  const [detail, setDetail] = useState<CallupDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, startTransition] = useTransition();
  const [waitlistPrompt, setWaitlistPrompt] = useState<
    null | { kind: "subscribe" | "guest"; guestName?: string; message: string }
  >(null);
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

  function refresh() {
    void load();
    onChanged?.();
  }

  async function postSubscribe(acceptWaitlist: boolean) {
    const res = await fetch(`/api/v1/callups/${callupId}/players/subscribe`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ acceptWaitlist }),
    });
    if (res.status === 401) {
      onAuthRequired();
      return;
    }
    const body = (await res.json().catch(() => ({}))) as ProblemBody & {
      data?: unknown;
    };
    if (
      res.status === 409 &&
      body.code === ErrorCode.WAITLIST_CONFIRM_REQUIRED
    ) {
      setWaitlistPrompt({
        kind: "subscribe",
        message:
          body.detail ??
          "Lista llena, ¿deseas suscribirte a la lista de espera?",
      });
      return;
    }
    if (!res.ok) {
      setError(body.detail ?? "No se pudo suscribir.");
      return;
    }
    setWaitlistPrompt(null);
    refresh();
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
    if (res.status === 401) {
      onAuthRequired();
      return;
    }
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
      setError(body.detail ?? "No se pudo crear el jugador.");
      return;
    }
    setWaitlistPrompt(null);
    setGuestOpen(false);
    setGuestName("");
    refresh();
  }

  function onSubscribe() {
    if (!sessionUserId) {
      onAuthRequired();
      return;
    }
    startTransition(async () => {
      await postSubscribe(false);
    });
  }

  function onUnsubscribe() {
    startTransition(async () => {
      const res = await fetch(
        `/api/v1/callups/${callupId}/players/me/unsubscribe`,
        { method: "POST", credentials: "include" },
      );
      if (res.status === 401) {
        onAuthRequired();
        return;
      }
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as ProblemBody;
        setError(body.detail ?? "No se pudo cancelar la inscripción.");
        return;
      }
      refresh();
    });
  }

  function onGuestSubmit(e: FormEvent) {
    e.preventDefault();
    const name = guestName.trim();
    if (!name) {
      setError("El nombre del jugador es obligatorio.");
      return;
    }
    if (!sessionUserId) {
      onAuthRequired();
      return;
    }
    startTransition(async () => {
      await postGuest(name, false);
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
      if (res.status === 401) {
        onAuthRequired();
        return;
      }
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
      if (res.status === 401) {
        onAuthRequired();
        return;
      }
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as ProblemBody;
        setError(body.detail ?? "No se pudo promover.");
        return;
      }
      refresh();
    });
  }

  if (loading && !detail) {
    return <p className="text-sm text-[var(--kortumo-navy)]/60">Cargando jugadores…</p>;
  }

  if (!detail) {
    return (
      <p className="text-sm text-[var(--kortumo-red)]" role="alert">
        {error ?? "Sin datos."}
      </p>
    );
  }

  const myRow = sessionUserId
    ? detail.players.find((p) => p.userId === sessionUserId)
    : undefined;
  const mutable = canMutateCallup(detail.status);
  const canSubscribe =
    mutable &&
    !myRow &&
    (detail.subscribeEligibility.canJoinRoster ||
      detail.subscribeEligibility.canJoinWaitlist);
  const canAddGuest =
    mutable &&
    (detail.subscribeEligibility.canJoinRoster ||
      detail.subscribeEligibility.canJoinWaitlist);
  const rosterFree = detail.rosterCount < detail.spotsQuantity;

  const roster = detail.players.filter((p) => !p.isWaitList);
  const waitlist = detail.players.filter((p) => p.isWaitList);

  return (
    <div className="space-y-3">
      {error ? (
        <p className="text-sm text-[var(--kortumo-red)]" role="alert">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-[var(--kortumo-navy)]">
          Jugadores
        </h3>
        <div className="flex flex-wrap gap-2">
          {canAddGuest ? (
            <button
              type="button"
              onClick={() => {
                if (!sessionUserId) {
                  onAuthRequired();
                  return;
                }
                setGuestOpen((o) => !o);
              }}
              className="h-8 rounded-md border border-[var(--kortumo-navy)]/20 px-2.5 text-xs font-semibold text-[var(--kortumo-navy)]"
            >
              + Crear Jugador
            </button>
          ) : null}
          {canSubscribe ? (
            <button
              type="button"
              disabled={pending}
              onClick={onSubscribe}
              className="h-8 rounded-md bg-[var(--kortumo-red)] px-2.5 text-xs font-semibold text-white disabled:opacity-60"
            >
              Suscribirme
            </button>
          ) : null}
          {myRow && mutable ? (
            <button
              type="button"
              disabled={pending}
              onClick={onUnsubscribe}
              className="h-8 rounded-md border border-[var(--kortumo-red)]/40 px-2.5 text-xs font-semibold text-[var(--kortumo-red)] disabled:opacity-60"
            >
              Cancelar inscripción
            </button>
          ) : null}
        </div>
      </div>

      {guestOpen ? (
        <form
          onSubmit={onGuestSubmit}
          className="flex flex-col gap-2 rounded-md border border-[var(--kortumo-navy)]/15 p-3"
        >
          <label
            htmlFor={`guest-${callupId}`}
            className="text-xs font-medium text-[var(--kortumo-navy)]"
          >
            Nombre del jugador
          </label>
          <input
            id={`guest-${callupId}`}
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
            className="h-10 rounded-md border border-[var(--kortumo-navy)]/20 px-3 text-sm text-[var(--kortumo-navy)] focus:border-[var(--kortumo-blue-soft)] focus:outline-none"
            placeholder="Pepe"
            required
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setGuestOpen(false)}
              className="h-9 flex-1 rounded-md border border-[var(--kortumo-navy)]/20 text-xs font-medium"
            >
              Cerrar
            </button>
            <button
              type="submit"
              disabled={pending}
              className="h-9 flex-1 rounded-md bg-[var(--kortumo-navy)] text-xs font-semibold text-white disabled:opacity-60"
            >
              Crear
            </button>
          </div>
        </form>
      ) : null}

      <PlayerTable
        title="Nómina"
        players={roster}
        sessionUserId={sessionUserId}
        isOwner={isOwner}
        callupStatus={detail.status}
        showPromote={false}
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
          showPromote={rosterFree && mutable}
          pending={pending}
          onTogglePayment={togglePayment}
          onPromote={onPromote}
        />
      ) : null}

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
            if (prompt.kind === "subscribe") {
              await postSubscribe(true);
            } else if (prompt.guestName) {
              await postGuest(prompt.guestName, true);
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
  showPromote,
  pending,
  onTogglePayment,
  onPromote,
}: {
  title: string;
  players: PlayerDto[];
  sessionUserId: string | null;
  isOwner: boolean;
  callupStatus: CallupStatus;
  showPromote: boolean;
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
    <div>
      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-[var(--kortumo-navy)]/55">
        {title}
      </p>
      {players.length === 0 ? (
        <p className="text-xs text-[var(--kortumo-navy)]/50">Nadie aún.</p>
      ) : (
        <ul className="divide-y divide-[var(--kortumo-navy)]/10 rounded-md border border-[var(--kortumo-navy)]/10">
          {players.map((p, i) => {
            const canPay =
              paymentAllowed &&
              (isOwner || (sessionUserId != null && p.userId === sessionUserId));
            const canPromote =
              showPromote &&
              p.isWaitList &&
              (isOwner || (sessionUserId != null && p.userId === sessionUserId));
            return (
              <li
                key={p.id}
                className="flex items-center gap-2 px-3 py-2 text-sm text-[var(--kortumo-navy)]"
              >
                <span className="w-5 shrink-0 text-xs text-[var(--kortumo-navy)]/45">
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1 truncate font-medium">
                  {p.name}
                  {sessionUserId && p.userId === sessionUserId ? (
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
                    className="text-xs font-semibold text-[var(--kortumo-blue-soft)] disabled:opacity-60"
                  >
                    Promover
                  </button>
                ) : null}
                <button
                  type="button"
                  disabled={!canPay || pending}
                  onClick={() => onTogglePayment(p)}
                  className="text-base disabled:opacity-40"
                  aria-label={p.hasPayment ? "Marcar sin pago" : "Marcar pago"}
                  title="Pago"
                >
                  {p.hasPayment ? "✅" : "❎"}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
