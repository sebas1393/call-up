/**
 * Profile / auth application helpers (US-002, US-010).
 */

export type UserRow = {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  user_name: string | null;
  avatar_url: string | null;
};

export type ProfileDto = {
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

/**
 * Formats CO mobile digits for profile UI: `3102222222` → `+57 310 222 2222`.
 * Returns null when phone is missing/invalid length (public screens must not use this).
 *
 * @param phoneDigits - Exactly 10 digits, or null
 */
export function formatPhoneDisplay(
  phoneDigits: string | null | undefined,
): string | null {
  if (!phoneDigits || !/^[0-9]{10}$/.test(phoneDigits)) {
    return null;
  }
  return `+57 ${phoneDigits.slice(0, 3)} ${phoneDigits.slice(3, 6)} ${phoneDigits.slice(6)}`;
}

/**
 * Maps a DB user row to the public `GET /me` DTO (camelCase).
 */
export function toProfileDto(row: UserRow): ProfileDto {
  const phone = row.phone;
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    phone,
    phoneDisplay: formatPhoneDisplay(phone),
    userName: row.user_name,
    avatarUrl: row.avatar_url,
    profileComplete: Boolean(row.name && row.email && row.phone),
    isCaller: row.user_name != null,
  };
}

export type PostAuthRedirectInput = {
  intent: "caller" | "player" | null;
  profileComplete: boolean;
  hasUserName: boolean;
  redirectTo?: string | null;
};

/**
 * Chooses post-OAuth redirect path from intent + profile state (spec auth/callback).
 */
export function resolvePostAuthRedirect(input: PostAuthRedirectInput): string {
  if (!input.profileComplete) {
    return "/complete-profile";
  }
  if (input.intent === "caller" && !input.hasUserName) {
    return "/complete-caller-username";
  }
  if (input.redirectTo && input.redirectTo.startsWith("/")) {
    return input.redirectTo;
  }
  if (input.intent === "caller") {
    return "/caller";
  }
  if (input.intent === "player") {
    return "/player";
  }
  return "/";
}

export type SetUsernameDecision =
  | { ok: true; userName: string; link: string }
  | {
      ok: false;
      status: 409;
      code: "USERNAME_IMMUTABLE" | "USERNAME_TAKEN";
      detail: string;
    };

/**
 * Pure decision for set-once username (DB uniqueness checked by caller).
 *
 * @param currentUserName - Existing slug or null
 * @param requestedUserName - Validated lowercase slug
 * @param takenByOther - Whether another user already owns the slug
 */
export function decideSetUsername(
  currentUserName: string | null,
  requestedUserName: string,
  takenByOther: boolean,
): SetUsernameDecision {
  if (currentUserName != null) {
    return {
      ok: false,
      status: 409,
      code: "USERNAME_IMMUTABLE",
      detail: "El usuario del caller ya fue configurado y no se puede cambiar.",
    };
  }
  if (takenByOther) {
    return {
      ok: false,
      status: 409,
      code: "USERNAME_TAKEN",
      detail: "Ese nombre de usuario ya está en uso.",
    };
  }
  return {
    ok: true,
    userName: requestedUserName,
    link: `/${requestedUserName}`,
  };
}
