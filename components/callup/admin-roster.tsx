"use client";

import { FormEvent, useCallback, useEffect, useState, useTransition } from "react";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ErrorCode } from "@/lib/constants/error-codes";
import type { CallupStatus } from "@/lib/constants/callup";
import { canMutateCallup } from "@/lib/format/callup-display";
import { useCallupPlayersRealtime } from "@/lib/realtime/use-callup-players-realtime";

export type AdminPlayerDto = {
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
  players: AdminPlayerDto[];
};

type AdminRosterProps = {
  callupId: string;
  onChanged?: () => void;
};

type ProblemBody = { detail?: string; code?: string };

/**
 * Owner roster: Inscribir, edit name, delete, payment, promote (US-005).
 */
export function AdminRoster({ callupId, onChanged }: AdminRosterProps) {
  const [detail, setDetail] = useState<CallupDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, startTransition] = useTransition();
  const [waitlistPrompt, setWaitlistPrompt] = useState<
    null | { guestName: string; message: string }
  >(null);
  const [guestOpen, setGuestOpen] = useState(false);
  const [guestName, setGuestName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<AdminPlayerDto | null>(null);

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

  function togglePayment(player: AdminPlayerDto) {
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

  function onPromote(player: AdminPlayerDto) {
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

  function startEdit(player: AdminPlayerDto) {
    setEditingId(player.id);
    setEditName(player.name);
    setError(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditName("");
  }

  function saveEdit(playerId: string) {
    const name = editName.trim();
    if (!name) {
      setError("El nombre del jugador es obligatorio.");
      return;
    }
    startTransition(async () => {
      const res = await fetch(
        `/api/v1/callups/${callupId}/players/${playerId}`,
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name }),
        },
      );
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as ProblemBody;
        setError(body.detail ?? "No se pudo guardar el nombre.");
        return;
      }
      setEditingId(null);
      setEditName("");
      refresh();
    });
  }

  function confirmDelete() {
    const target = deleteTarget;
    if (!target) return;
    startTransition(async () => {
      const res = await fetch(
        `/api/v1/callups/${callupId}/players/${target.id}`,
        { method: "DELETE", credentials: "include" },
      );
      if (!res.ok && res.status !== 204) {
        const body = (await res.json().catch(() => ({}))) as ProblemBody;
        setError(body.detail ?? "No se pudo eliminar.");
        setDeleteTarget(null);
        return;
      }
      setDeleteTarget(null);
      if (editingId === target.id) cancelEdit();
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
  const canInscribir =
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
          Jugadores ({detail.rosterCount}/{detail.spotsQuantity})
        </h3>
        {canInscribir ? (
          <button
            type="button"
            onClick={() => setGuestOpen((o) => !o)}
            className="h-8 rounded-md bg-[var(--kortumo-red)] px-2.5 text-xs font-semibold text-white"
          >
            + Inscribir
          </button>
        ) : null}
      </div>

      {guestOpen ? (
        <form
          onSubmit={onGuestSubmit}
          className="flex flex-col gap-2 rounded-md border border-[var(--kortumo-navy)]/15 p-3"
        >
          <label
            htmlFor={`admin-guest-${callupId}`}
            className="text-xs font-medium text-[var(--kortumo-navy)]"
          >
            Nombre del jugador
          </label>
          <input
            id={`admin-guest-${callupId}`}
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
              Cancelar
            </button>
            <button
              type="submit"
              disabled={pending}
              className="h-9 flex-1 rounded-md bg-[var(--kortumo-navy)] text-xs font-semibold text-white disabled:opacity-60"
            >
              Inscribir
            </button>
          </div>
        </form>
      ) : null}

      <AdminPlayerTable
        title="Nómina"
        players={roster}
        callupStatus={detail.status}
        mutable={mutable}
        showPromote={false}
        pending={pending}
        editingId={editingId}
        editName={editName}
        onEditNameChange={setEditName}
        onStartEdit={startEdit}
        onCancelEdit={cancelEdit}
        onSaveEdit={saveEdit}
        onRequestDelete={setDeleteTarget}
        onTogglePayment={togglePayment}
        onPromote={onPromote}
      />

      {waitlist.length > 0 || detail.waitList ? (
        <AdminPlayerTable
          title="Lista de espera"
          players={waitlist}
          callupStatus={detail.status}
          mutable={mutable}
          showPromote={rosterFree && mutable}
          pending={pending}
          editingId={editingId}
          editName={editName}
          onEditNameChange={setEditName}
          onStartEdit={startEdit}
          onCancelEdit={cancelEdit}
          onSaveEdit={saveEdit}
          onRequestDelete={setDeleteTarget}
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
            await postGuest(prompt.guestName, true);
          });
        }}
      />

      <ConfirmDialog
        open={deleteTarget != null}
        title="Eliminar jugador"
        message={
          deleteTarget
            ? `¿Quitar a ${deleteTarget.name} de la convocatoria?`
            : ""
        }
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        pending={pending}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
      />
    </div>
  );
}

function AdminPlayerTable({
  title,
  players,
  callupStatus,
  mutable,
  showPromote,
  pending,
  editingId,
  editName,
  onEditNameChange,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onRequestDelete,
  onTogglePayment,
  onPromote,
}: {
  title: string;
  players: AdminPlayerDto[];
  callupStatus: CallupStatus;
  mutable: boolean;
  showPromote: boolean;
  pending: boolean;
  editingId: string | null;
  editName: string;
  onEditNameChange: (v: string) => void;
  onStartEdit: (p: AdminPlayerDto) => void;
  onCancelEdit: () => void;
  onSaveEdit: (playerId: string) => void;
  onRequestDelete: (p: AdminPlayerDto) => void;
  onTogglePayment: (p: AdminPlayerDto) => void;
  onPromote: (p: AdminPlayerDto) => void;
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
        <div className="overflow-hidden rounded-md border border-[var(--kortumo-navy)]/10">
          <div
            className="grid grid-cols-[1.25rem_1fr_auto_auto] items-center gap-2 border-b border-[var(--kortumo-navy)]/10 bg-[var(--kortumo-navy)]/[0.04] px-3 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--kortumo-navy)]/65"
            role="row"
          >
            <span className="sr-only">#</span>
            <span>Nombre</span>
            <span className="text-right">Ya pagó</span>
            <span className="sr-only">Acciones</span>
          </div>
          <ul className="divide-y divide-[var(--kortumo-navy)]/10">
            {players.map((p, i) => {
              const isEditing = editingId === p.id;
              const canPromote = showPromote && p.isWaitList;
              return (
                <li
                  key={p.id}
                  className="grid grid-cols-[1.25rem_1fr_auto_auto] items-center gap-2 px-3 py-2 text-sm text-[var(--kortumo-navy)]"
                >
                  <span className="text-xs text-[var(--kortumo-navy)]/45">
                    {i + 1}
                  </span>
                  <div className="min-w-0">
                    {isEditing ? (
                      <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center">
                        <input
                          value={editName}
                          onChange={(e) => onEditNameChange(e.target.value)}
                          className="h-8 w-full min-w-0 rounded border border-[var(--kortumo-navy)]/20 px-2 text-sm focus:border-[var(--kortumo-blue-soft)] focus:outline-none"
                          aria-label="Editar nombre"
                          autoFocus
                        />
                        <div className="flex shrink-0 gap-1">
                          <button
                            type="button"
                            disabled={pending}
                            onClick={() => onSaveEdit(p.id)}
                            className="h-8 rounded bg-[var(--kortumo-navy)] px-2 text-xs font-semibold text-white disabled:opacity-60"
                          >
                            Guardar
                          </button>
                          <button
                            type="button"
                            disabled={pending}
                            onClick={onCancelEdit}
                            className="h-8 rounded border border-[var(--kortumo-navy)]/20 px-2 text-xs font-medium"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <span className="block truncate font-medium">
                        {p.name}
                        {canPromote ? (
                          <button
                            type="button"
                            disabled={pending}
                            onClick={() => onPromote(p)}
                            className="ml-2 text-xs font-semibold text-[var(--kortumo-blue-soft)] disabled:opacity-60"
                          >
                            Promover
                          </button>
                        ) : null}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    disabled={!paymentAllowed || pending}
                    onClick={() => onTogglePayment(p)}
                    className="justify-self-end text-base leading-none disabled:opacity-40"
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
                  <div className="flex items-center gap-1 justify-self-end">
                    {mutable && !isEditing ? (
                      <>
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => onStartEdit(p)}
                          className="rounded p-1 text-[var(--kortumo-navy)]/70 hover:bg-[var(--kortumo-navy)]/5 disabled:opacity-60"
                          aria-label={`Editar ${p.name}`}
                          title="Editar"
                        >
                          <PencilIcon />
                        </button>
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => onRequestDelete(p)}
                          className="rounded p-1 text-[var(--kortumo-red)] hover:bg-[var(--kortumo-red)]/10 disabled:opacity-60"
                          aria-label={`Eliminar ${p.name}`}
                          title="Eliminar"
                        >
                          <TrashIcon />
                        </button>
                      </>
                    ) : (
                      <span className="w-14" aria-hidden />
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

function PencilIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
