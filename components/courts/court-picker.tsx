"use client";

import { useEffect, useState, useTransition } from "react";

import {
  CreateCourtModal,
  type CourtOption,
} from "@/components/courts/create-court-modal";
import { COURT_SEARCH_MIN_LENGTH } from "@/lib/constants/callup";

type CourtPickerProps = {
  value: CourtOption | null;
  onChange: (court: CourtOption | null) => void;
};

/**
 * Court search (min 3) + select→link + create modal. No mine list (US-003b).
 */
export function CourtPicker({ value, onChange }: CourtPickerProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CourtOption[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [linkPending, startLink] = useTransition();

  useEffect(() => {
    const q = query.trim();
    if (q.length < COURT_SEARCH_MIN_LENGTH) {
      setResults([]);
      setSearchError(null);
      setSearching(false);
      return;
    }

    let cancelled = false;
    setSearching(true);
    const timer = window.setTimeout(async () => {
      const res = await fetch(
        `/api/v1/courts?search=${encodeURIComponent(q)}`,
        { credentials: "include" },
      );
      if (cancelled) return;
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { detail?: string };
        setSearchError(body.detail ?? "No se pudo buscar.");
        setResults([]);
        setSearching(false);
        return;
      }
      const json = (await res.json()) as {
        data: { items: CourtOption[] };
      };
      setResults(json.data.items);
      setSearchError(null);
      setSearching(false);
    }, 300);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query]);

  function selectCourt(court: CourtOption) {
    startLink(async () => {
      const res = await fetch(`/api/v1/courts/${court.id}/link`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok && res.status !== 204) {
        const body = (await res.json().catch(() => ({}))) as { detail?: string };
        setSearchError(body.detail ?? "No se pudo vincular la cancha.");
        return;
      }
      onChange(court);
      setQuery("");
      setResults([]);
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <label
        htmlFor="court-search"
        className="text-sm font-medium text-[var(--kortumo-navy)]"
      >
        Cancha
      </label>

      {value ? (
        <div className="flex items-start justify-between gap-2 rounded-md border border-[var(--kortumo-teal)]/40 bg-[var(--kortumo-teal)]/5 px-3 py-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[var(--kortumo-navy)]">
              {value.name}
            </p>
            <p className="truncate text-xs text-[var(--kortumo-navy)]/65">
              {value.address}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onChange(null)}
            className="shrink-0 text-xs font-medium text-[var(--kortumo-red)]"
          >
            Cambiar
          </button>
        </div>
      ) : null}

      {!value && (
        <>
          <div className="flex gap-2">
            <input
              id="court-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-11 min-w-0 flex-1 rounded-md border border-[var(--kortumo-navy)]/20 px-3 text-base text-[var(--kortumo-navy)] placeholder:text-[var(--kortumo-navy)]/40 focus:border-[var(--kortumo-blue-soft)] focus:outline-none"
              placeholder="Buscar nombre o dirección…"
              autoComplete="off"
            />
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="h-11 shrink-0 rounded-md border border-[var(--kortumo-navy)]/25 px-3 text-sm font-semibold text-[var(--kortumo-navy)]"
            >
              + Crear cancha
            </button>
          </div>
          <p className="text-xs text-[var(--kortumo-navy)]/55">
            Mínimo {COURT_SEARCH_MIN_LENGTH} caracteres. Al elegir, se vincula a
            tu cuenta.
          </p>
          {searching ? (
            <p className="text-xs text-[var(--kortumo-navy)]/50">Buscando…</p>
          ) : null}
          {searchError ? (
            <p className="text-sm text-[var(--kortumo-red)]" role="alert">
              {searchError}
            </p>
          ) : null}
          {results.length > 0 ? (
            <ul className="max-h-48 overflow-auto rounded-md border border-[var(--kortumo-navy)]/15">
              {results.map((c) => (
                <li key={c.id} className="border-b border-[var(--kortumo-navy)]/10 last:border-0">
                  <button
                    type="button"
                    disabled={linkPending}
                    onClick={() => selectCourt(c)}
                    className="flex w-full flex-col items-start px-3 py-2.5 text-left hover:bg-[var(--kortumo-navy)]/5 disabled:opacity-60"
                  >
                    <span className="text-sm font-medium text-[var(--kortumo-navy)]">
                      {c.name}
                    </span>
                    <span className="text-xs text-[var(--kortumo-navy)]/60">
                      {c.address}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          {!searching &&
          query.trim().length >= COURT_SEARCH_MIN_LENGTH &&
          results.length === 0 &&
          !searchError ? (
            <p className="text-xs text-[var(--kortumo-navy)]/55">
              Sin resultados. Podés crear la cancha.
            </p>
          ) : null}
        </>
      )}

      <CreateCourtModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={(court) => {
          onChange(court);
          setQuery("");
          setResults([]);
        }}
      />
    </div>
  );
}
