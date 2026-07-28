"use client";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  pending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

/**
 * Simple confirm dialog (waitlist / destructive actions). Portaled via fixed overlay.
 */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Sí",
  cancelLabel = "No",
  pending = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      <div className="w-full max-w-sm rounded-md bg-white p-5 shadow-lg">
        <h2
          id="confirm-dialog-title"
          className="font-[family-name:var(--font-montserrat)] text-lg font-bold text-[var(--kortumo-navy)]"
        >
          {title}
        </h2>
        <p className="mt-2 text-sm text-[var(--kortumo-navy)]/75">{message}</p>
        <div className="mt-5 flex gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={onCancel}
            className="h-11 flex-1 rounded-md border border-[var(--kortumo-navy)]/20 text-sm font-semibold text-[var(--kortumo-navy)]"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={onConfirm}
            className="h-11 flex-1 rounded-md bg-[var(--kortumo-red)] text-sm font-semibold text-white disabled:opacity-60"
          >
            {pending ? "…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
