"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

import { BottomSheet } from "@/components/ui/bottom-sheet";
import {
  captureBeforeInstallPrompt,
  clearDeferredInstallPrompt,
  dismissInstallPrompt,
  getDeferredInstallPrompt,
  isAndroidLike,
  isInstallPromptDismissed,
  isIosLike,
  isStandaloneDisplay,
} from "@/lib/pwa/install-app";

type InstallAppPromptProps = {
  /** Visual variant for landing hero (on navy) vs light surfaces. */
  variant?: "onDark" | "onLight";
  className?: string;
};

function subscribeNoop() {
  return () => {};
}

function shouldShowInstallCta(): boolean {
  if (typeof window === "undefined") return false;
  if (isStandaloneDisplay() || isInstallPromptDismissed()) return false;
  return true;
}

/**
 * Install / Add to Home Screen CTA (spec §11.8).
 * Chromium: deferred beforeinstallprompt. Platform-specific manual instructions otherwise.
 */
export function InstallAppPrompt({
  variant = "onLight",
  className = "",
}: InstallAppPromptProps) {
  const eligible = useSyncExternalStore(
    subscribeNoop,
    shouldShowInstallCta,
    () => false,
  );
  const [dismissed, setDismissed] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    captureBeforeInstallPrompt();
  }, []);

  const hide = useCallback(() => {
    dismissInstallPrompt();
    setDismissed(true);
    setSheetOpen(false);
  }, []);

  async function onInstallClick() {
    const promptEvent = getDeferredInstallPrompt();
    if (promptEvent) {
      setPending(true);
      try {
        await promptEvent.prompt();
        await promptEvent.userChoice;
        clearDeferredInstallPrompt();
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

  if (!eligible || dismissed) return null;

  const ios = isIosLike();
  const android = isAndroidLike();

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
        title="Agregar Kall-UP a inicio"
        onClose={() => setSheetOpen(false)}
      >
        {ios ? (
          <>
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
            <p className="mt-3 text-xs leading-relaxed text-[var(--kortumo-navy)]/60">
              En iPhone, los avisos en segundo plano requieren este paso después
              de seguir un canal.
            </p>
          </>
        ) : android ? (
          <>
            <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed text-[var(--kortumo-navy)]/85">
              <li>
                Abre el menú <strong>⋮</strong> de Chrome (arriba a la derecha).
              </li>
              <li>
                Elige <strong>Instalar app</strong> o{" "}
                <strong>Agregar a la pantalla de inicio</strong>.
              </li>
              <li>
                Confirma la instalación.
              </li>
            </ol>
            <p className="mt-3 text-xs leading-relaxed text-[var(--kortumo-navy)]/60">
              Si no ves la opción, abre Kall-UP en Chrome (no en el navegador
              interno de otra app) y vuelve a intentar.
            </p>
          </>
        ) : (
          <>
            <ol className="list-decimal space-y-2 pl-5 text-sm leading-relaxed text-[var(--kortumo-navy)]/85">
              <li>Abre el menú del navegador (⋮ o ≡).</li>
              <li>
                Elige <strong>Instalar</strong> /{" "}
                <strong>Agregar a la pantalla de inicio</strong>.
              </li>
              <li>Confirma.</li>
            </ol>
            <p className="mt-3 text-xs leading-relaxed text-[var(--kortumo-navy)]/60">
              En Chrome de escritorio también puedes usar el icono de instalar
              en la barra de direcciones.
            </p>
          </>
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
