"use client";

import { useCallback, useEffect, useState } from "react";

import { BottomSheet } from "@/components/ui/bottom-sheet";
import {
  dismissInstallPrompt,
  isInstallPromptDismissed,
  isIosLike,
  isStandaloneDisplay,
  type BeforeInstallPromptEvent,
} from "@/lib/pwa/install-app";

type InstallAppPromptProps = {
  /** Visual variant for landing hero (on navy) vs light surfaces. */
  variant?: "onDark" | "onLight";
  className?: string;
};

function shouldShowInstallCta(): boolean {
  if (typeof window === "undefined") return false;
  if (isStandaloneDisplay() || isInstallPromptDismissed()) return false;
  return true;
}

/**
 * Install / Add to Home Screen CTA (spec §11.8).
 * Chromium: deferred beforeinstallprompt. iOS: Share instructions sheet.
 */
export function InstallAppPrompt({
  variant = "onLight",
  className = "",
}: InstallAppPromptProps) {
  const [visible, setVisible] = useState(false);
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null,
  );
  const [sheetOpen, setSheetOpen] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    // Client-only: avoid SSR/hydration mismatch for installability.
    if (!shouldShowInstallCta()) return;
    setVisible(true);

    function onBeforeInstall(e: Event) {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
    };
  }, []);

  const hide = useCallback(() => {
    dismissInstallPrompt();
    setVisible(false);
    setSheetOpen(false);
  }, []);

  async function onInstallClick() {
    if (deferred) {
      setPending(true);
      try {
        await deferred.prompt();
        await deferred.userChoice;
        setDeferred(null);
        hide();
      } catch {
        /* user cancelled or browser error — keep CTA */
      } finally {
        setPending(false);
      }
      return;
    }

    setSheetOpen(true);
  }

  if (!visible) return null;

  const showIosHint = !deferred && isIosLike();

  const btnClass =
    variant === "onDark"
      ? "text-sm font-medium text-white/80 underline-offset-2 hover:text-white hover:underline disabled:opacity-60"
      : "inline-flex h-9 items-center rounded-md border border-[var(--kortumo-navy)]/20 px-3 text-xs font-semibold text-[var(--kortumo-navy)] hover:bg-[var(--kortumo-navy)]/5 disabled:opacity-60";

  const dismissClass =
    variant === "onDark"
      ? "text-xs text-white/50 hover:text-white/80"
      : "text-xs text-[var(--kortumo-navy)]/45 hover:text-[var(--kortumo-navy)]/70";

  return (
    <>
      <div
        className={`flex flex-wrap items-center gap-x-3 gap-y-1 ${className}`}
      >
        <button
          type="button"
          disabled={pending}
          onClick={() => void onInstallClick()}
          className={btnClass}
        >
          {pending ? "Instalando…" : "Instalar app"}
        </button>
        <button type="button" onClick={hide} className={dismissClass}>
          Ahora no
        </button>
      </div>

      <BottomSheet
        open={sheetOpen}
        title="Agregar Kortumo a inicio"
        onClose={() => setSheetOpen(false)}
      >
        <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed text-[var(--kortumo-navy)]/85">
          <li>
            Toca <strong>Compartir</strong> (□↑) en la barra de Safari.
          </li>
          <li>
            Elige <strong>Agregar a pantalla de inicio</strong>.
          </li>
          <li>
            Confirma <strong>Agregar</strong>.
          </li>
        </ol>
        {showIosHint ? (
          <p className="mt-3 text-xs leading-relaxed text-[var(--kortumo-navy)]/60">
            En iPhone, los avisos en segundo plano requieren este paso después
            de seguir un canal.
          </p>
        ) : (
          <p className="mt-3 text-xs leading-relaxed text-[var(--kortumo-navy)]/60">
            Si tu navegador no ofrece instalación directa, usa el menú del
            navegador para agregar esta página a la pantalla de inicio.
          </p>
        )}
        <button
          type="button"
          onClick={() => setSheetOpen(false)}
          className="mt-4 inline-flex h-11 w-full items-center justify-center rounded-md bg-[var(--kortumo-navy)] text-sm font-semibold text-white"
        >
          Entendido
        </button>
      </BottomSheet>
    </>
  );
}
