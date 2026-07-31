"use client";

import { FormEvent, useEffect, useRef, useState, useSyncExternalStore, useTransition } from "react";
import { createPortal } from "react-dom";

import {
  COURT_ADDRESS_MAX_LENGTH,
  COURT_NAME_MAX_LENGTH,
} from "@/lib/constants/callup";

export type CourtOption = {
  id: string;
  name: string;
  address: string;
};

type CreateCourtModalProps = {
  open: boolean;
  onClose: () => void;
  onCreated: (court: CourtOption) => void;
};

function subscribeNoop() {
  return () => {};
}

/**
 * US-003b: create court modal (nombre + dirección).
 * Portaled to document.body so it is not nested inside CallupForm's <form>.
 */
export function CreateCourtModal({
  open,
  onClose,
  onCreated,
}: CreateCourtModalProps) {
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const mounted = useSyncExternalStore(subscribeNoop, () => true, () => false);
  const nameRef = useRef<HTMLInputElement>(null);
  const [wasOpen, setWasOpen] = useState(open);

  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setName("");
      setAddress("");
      setError(null);
    }
  }

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => nameRef.current?.focus(), 50);
    return () => window.clearTimeout(t);
  }, [open]);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    e.stopPropagation();
    setError(null);
    const trimmedName = name.trim();
    const trimmedAddress = address.trim();
    if (!trimmedName || !trimmedAddress) {
      setError("Nombre y dirección son obligatorios.");
      return;
    }

    startTransition(async () => {
      const res = await fetch("/api/v1/courts", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmedName, address: trimmedAddress }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { detail?: string };
        setError(body.detail ?? "No se pudo crear la cancha.");
        return;
      }
      const json = (await res.json()) as {
        data: { id: string; name: string; address: string };
      };
      onCreated({
        id: json.data.id,
        name: json.data.name,
        address: json.data.address,
      });
      onClose();
    });
  }

  if (!open || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-court-title"
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Cerrar"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-md rounded-lg bg-white p-5 shadow-lg">
        <h2
          id="create-court-title"
          className="font-[family-name:var(--font-montserrat)] text-lg font-bold text-[var(--kortumo-navy)]"
        >
          Crear cancha
        </h2>
        <form onSubmit={onSubmit} className="mt-4 flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="court-name"
              className="text-sm font-medium text-[var(--kortumo-navy)]"
            >
              Nombre de la cancha
            </label>
            <input
              ref={nameRef}
              id="court-name"
              maxLength={COURT_NAME_MAX_LENGTH}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-11 rounded-md border border-[var(--kortumo-navy)]/20 px-3 text-base text-[var(--kortumo-navy)] focus:border-[var(--kortumo-blue-soft)] focus:outline-none"
              placeholder="VECIGOL"
              required
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="court-address"
              className="text-sm font-medium text-[var(--kortumo-navy)]"
            >
              Dirección
            </label>
            <input
              id="court-address"
              maxLength={COURT_ADDRESS_MAX_LENGTH}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="h-11 rounded-md border border-[var(--kortumo-navy)]/20 px-3 text-base text-[var(--kortumo-navy)] focus:border-[var(--kortumo-blue-soft)] focus:outline-none"
              placeholder="Clle 20 # xxx"
              required
            />
          </div>
          {error ? (
            <p className="text-sm text-[var(--kortumo-red)]" role="alert">
              {error}
            </p>
          ) : null}
          <div className="mt-1 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="h-11 flex-1 rounded-md border border-[var(--kortumo-navy)]/20 text-sm font-medium text-[var(--kortumo-navy)]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={pending}
              className="h-11 flex-1 rounded-md bg-[var(--kortumo-red)] text-sm font-semibold text-white disabled:opacity-60"
            >
              {pending ? "Creando…" : "Crear"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}
