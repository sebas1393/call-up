import { type NextRequest } from "next/server";

import { updateSession } from "@/lib/db/update-session";

/**
 * Next.js 16 Proxy — refresh Supabase Auth session cookies before routes run.
 */
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    // Root must be explicit — some matcher patterns skip `/` (PWA start_url).
    "/",
    /*
     * All other paths except static assets / images.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|js|ico)$).*)",
  ],
};
