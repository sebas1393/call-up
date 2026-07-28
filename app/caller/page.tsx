import Link from "next/link";

import { CallerHeader } from "@/components/caller/caller-header";
import { CallupSummaryList } from "@/components/callup/callup-summary-list";

/**
 * Caller dashboard — mine callups (US-004).
 */
export default function CallerDashboardPage() {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-[var(--kortumo-white)]">
      <CallerHeader />
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 py-6 sm:px-6">
        <div className="mb-5 flex items-center justify-between gap-3">
          <h1 className="font-[family-name:var(--font-montserrat)] text-xl font-bold text-[var(--kortumo-navy)]">
            Convocatorias
          </h1>
          <Link
            href="/caller/callups/new"
            className="inline-flex h-10 items-center justify-center rounded-md bg-[var(--kortumo-red)] px-4 text-sm font-semibold text-white transition-[filter] hover:brightness-110"
          >
            + Crear
          </Link>
        </div>
        <CallupSummaryList />
      </main>
    </div>
  );
}
