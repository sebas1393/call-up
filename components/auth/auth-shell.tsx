import Link from "next/link";
import type { ReactNode } from "react";

import { LogoK } from "@/components/brand/logo-k";

type AuthShellProps = {
  title: string;
  description?: string;
  children: ReactNode;
};

/**
 * Shared chrome for post-auth completion screens (Kortumo).
 */
export function AuthShell({ title, description, children }: AuthShellProps) {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-[var(--kortumo-navy)] px-5 py-8 text-white sm:px-8">
      <Link href="/" className="self-start">
        <LogoK size={44} withWordmark className="text-white" />
      </Link>
      <div className="mx-auto mt-12 w-full max-w-md">
        <h1 className="font-[family-name:var(--font-montserrat)] text-2xl font-bold tracking-tight">
          {title}
        </h1>
        {description ? (
          <p className="mt-2 text-sm leading-relaxed text-white/80">
            {description}
          </p>
        ) : null}
        <div className="mt-8">{children}</div>
      </div>
    </div>
  );
}
