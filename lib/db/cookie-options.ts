/**
 * Shared auth cookie options — persist across PWA close/reopen until logout.
 * `secure` only in production so localhost still works over http.
 */
export const supabaseCookieOptions = {
  path: "/",
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  // Browser max (~400 days); aligns with @supabase/ssr default.
  maxAge: 400 * 24 * 60 * 60,
};
