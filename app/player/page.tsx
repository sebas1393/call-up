"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { LogoK } from "@/components/brand/logo-k";
import {
  USERNAME_MAX_LENGTH,
  USERNAME_MIN_LENGTH,
  USERNAME_PATTERN,
} from "@/lib/constants/callup";

/**
 * US-008 entry: ask for caller username slug, then open `/{username}` (no Google gate).
 */
export default function PlayerEntryPage() {
  const router = useRouter();
  const [userName, setUserName] = useState("");
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const slug = userName.trim().toLowerCase();
    if (
      slug.length < USERNAME_MIN_LENGTH ||
      slug.length > USERNAME_MAX_LENGTH ||
      !USERNAME_PATTERN.test(slug)
    ) {
      setError(
        `Usa solo el usuario del caller (${USERNAME_MIN_LENGTH}–${USERNAME_MAX_LENGTH} caracteres: a-z, 0-9, guion). Ej. juanbueno`,
      );
      return;
    }
    if (/\s/.test(userName) || slug.includes("http") || slug.includes("/")) {
      setError("Solo el usuario, sin espacios ni enlace completo.");
      return;
    }
    setError(null);
    router.push(`/${slug}`);
  }

  return (
    <div className="flex min-h-full flex-1 flex-col bg-[var(--kortumo-navy)] px-5 py-10 text-white sm:px-8">
      <Link href="/" className="self-start">
        <LogoK size={44} withWordmark className="text-white" />
      </Link>

      <form
        onSubmit={onSubmit}
        className="mx-auto mt-16 flex w-full max-w-md flex-col gap-4"
      >
        <h1 className="font-[family-name:var(--font-montserrat)] text-2xl font-bold tracking-tight">
          Usuario del caller
        </h1>
        <p className="text-sm text-white/80">
          Ej. <span className="text-[var(--kortumo-blue-soft)]">juanbueno</span>{" "}
          — solo el usuario, sin espacios ni enlace completo. Podés inscribirte
          como invitado sin iniciar sesión.
        </p>
        <label className="sr-only" htmlFor="caller-username">
          Usuario del caller
        </label>
        <input
          id="caller-username"
          name="userName"
          autoComplete="username"
          placeholder="juanbueno"
          value={userName}
          onChange={(e) => setUserName(e.target.value)}
          className="h-12 rounded-md border border-white/25 bg-white/10 px-4 text-base text-white placeholder:text-white/45 focus:border-[var(--kortumo-blue-soft)] focus:outline-none"
        />
        {error ? (
          <p className="text-sm text-[var(--kortumo-red)]" role="alert">
            {error}
          </p>
        ) : null}
        <button
          type="submit"
          className="h-12 rounded-md bg-[var(--kortumo-red)] text-sm font-semibold text-white transition-[filter] hover:brightness-110"
        >
          Ver convocatorias
        </button>
        <Link
          href="/"
          className="text-center text-sm text-[var(--kortumo-blue-soft)] underline-offset-2 hover:underline"
        >
          Volver al inicio
        </Link>
      </form>
    </div>
  );
}
