"use client";

import { useEffect, useId, type ReactNode } from "react";
import { createPortal } from "react-dom";

type BottomSheetProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
};

/**
 * Mobile-safe bottom sheet: fixed overlay, content capped to viewport width.
 */
export function BottomSheet({
  open,
  title,
  onClose,
  children,
}: BottomSheetProps) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        aria-label="Cerrar"
        onClick={onClose}
      />
      <div className="relative z-10 box-border w-full max-w-lg rounded-t-lg bg-white p-4 shadow-lg sm:mx-4 sm:rounded-lg">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2
            id={titleId}
            className="min-w-0 truncate font-[family-name:var(--font-montserrat)] text-lg font-bold text-[var(--kortumo-navy)]"
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-md px-2 py-1 text-sm font-semibold text-[var(--kortumo-navy)]/70"
          >
            Cerrar
          </button>
        </div>
        <div className="box-border w-full max-w-full min-w-0">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
