import { CallerHeader } from "@/components/caller/caller-header";
import { AdminCallupView } from "@/components/callup/admin-callup-view";

type PageProps = { params: Promise<{ id: string }> };

/**
 * Administrar convocatoria (US-005) — owner-only manage screen.
 */
export default async function AdminCallupPage({ params }: PageProps) {
  const { id } = await params;
  return (
    <div className="flex min-h-full flex-1 flex-col bg-[var(--kortumo-white)]">
      <CallerHeader />
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 py-6 sm:px-6">
        <AdminCallupView callupId={id} />
      </main>
    </div>
  );
}
