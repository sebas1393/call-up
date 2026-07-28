import { CallerHeader } from "@/components/caller/caller-header";
import { CallupForm } from "@/components/callup/callup-form";

/**
 * Create callup form (US-003a / US-003b).
 */
export default function NewCallupPage() {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-[var(--kortumo-white)]">
      <CallerHeader />
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 py-6 sm:px-6">
        <CallupForm mode="create" />
      </main>
    </div>
  );
}
