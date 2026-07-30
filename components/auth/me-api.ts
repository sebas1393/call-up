/**
 * Client helpers for /api/v1/me* (auth completion screens).
 */

export type MeProfile = {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  phoneDisplay: string | null;
  userName: string | null;
  avatarUrl: string | null;
  profileComplete: boolean;
  isCaller: boolean;
};

export type ProblemBody = {
  detail?: string;
  code?: string;
  status?: number;
};

export async function fetchMe(): Promise<
  | { ok: true; data: MeProfile }
  | { ok: false; status: number; detail: string }
> {
  const res = await fetch("/api/v1/me", {
    credentials: "include",
    cache: "no-store",
  });
  if (res.status === 401) {
    return { ok: false, status: 401, detail: "Debes iniciar sesión." };
  }
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as ProblemBody;
    return {
      ok: false,
      status: res.status,
      detail: body.detail ?? "Oops, algo salió mal",
    };
  }
  const json = (await res.json()) as { data: MeProfile };
  return { ok: true, data: json.data };
}

export function googleAuthHref(intent: "caller" | "player", redirectTo?: string) {
  const params = new URLSearchParams({ intent });
  if (redirectTo) params.set("redirectTo", redirectTo);
  return `/api/v1/auth/google?${params.toString()}`;
}
