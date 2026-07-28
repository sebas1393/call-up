import Link from "next/link";

import { LogoK } from "@/components/brand/logo-k";
import {
  KORTUMO_PRODUCT_NAME,
  KORTUMO_PRODUCT_SUBTITLE,
  KORTUMO_TAGLINES,
} from "@/lib/brand/kortumo";

/**
 * US-001 landing — brand-first hero (Kortumo), role CTAs, coming-soon below fold.
 */
export default function HomePage() {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <section className="relative flex min-h-[100dvh] flex-col overflow-hidden">
        {/* Full-bleed hero plane */}
        <div
          className="absolute inset-0 bg-[var(--kortumo-navy)]"
          aria-hidden
        >
          <div
            className="absolute inset-0 bg-cover bg-center opacity-45"
            style={{
              backgroundImage: "url(/brand/reference/hero-stadium.jpg)",
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(165deg, rgba(0,51,102,0.92) 0%, rgba(0,51,102,0.55) 45%, rgba(51,153,153,0.35) 100%)",
            }}
          />
          <div
            className="absolute inset-0 opacity-[0.12]"
            style={{
              backgroundImage:
                "radial-gradient(circle at 20% 20%, #6699ff 0%, transparent 40%), radial-gradient(circle at 80% 80%, #cc3333 0%, transparent 35%)",
            }}
          />
        </div>

        <div className="relative z-10 flex flex-1 flex-col px-5 pb-10 pt-8 sm:px-8 sm:pb-14 sm:pt-10">
          <header className="animate-[kortumo-fade-in_0.7s_ease-out_both]">
            <LogoK size={56} withWordmark priority className="text-white" />
            <p className="mt-2 text-sm font-light tracking-wide text-[var(--kortumo-blue-soft)]">
              {KORTUMO_PRODUCT_SUBTITLE}
            </p>
          </header>

          <div className="mt-auto flex max-w-xl flex-col gap-6 pt-16 sm:pt-20">
            <h1 className="animate-[kortumo-rise_0.8s_ease-out_0.12s_both] font-[family-name:var(--font-montserrat)] text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl">
              Convocatorias en vivo, sin el caos del chat
            </h1>
            <p className="animate-[kortumo-rise_0.8s_ease-out_0.22s_both] max-w-md text-base leading-relaxed text-white/85 sm:text-lg">
              Organiza el partido, comparte tu enlace y mira quién se apunta en
              tiempo real. {KORTUMO_TAGLINES[0]}. {KORTUMO_TAGLINES[2]}.
            </p>

            <div className="animate-[kortumo-rise_0.8s_ease-out_0.32s_both] flex w-full max-w-md flex-col gap-3 sm:flex-row">
              <Link
                href="/api/v1/auth/google?intent=caller&redirectTo=/caller"
                className="inline-flex h-12 flex-1 items-center justify-center rounded-md bg-[var(--kortumo-red)] px-5 text-center text-sm font-semibold text-white transition-transform duration-200 hover:scale-[1.02] hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                Soy caller
              </Link>
              <Link
                href="/player"
                className="inline-flex h-12 flex-1 items-center justify-center rounded-md border-2 border-white/80 bg-transparent px-5 text-center text-sm font-semibold text-white transition-colors duration-200 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                Soy jugador
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section
        className="border-t border-[var(--kortumo-navy)]/10 bg-[var(--kortumo-white)] px-5 py-12 sm:px-8"
        aria-labelledby="coming-soon-heading"
      >
        <h2
          id="coming-soon-heading"
          className="font-[family-name:var(--font-montserrat)] text-lg font-semibold text-[var(--kortumo-navy)]"
        >
          Próximamente
        </h2>
        <p className="mt-2 max-w-lg text-sm leading-relaxed text-[var(--kortumo-navy)]/75">
          Reportes, estadísticas y resultados de partidos — en una próxima
          versión de {KORTUMO_PRODUCT_NAME}.
        </p>
      </section>
    </div>
  );
}
