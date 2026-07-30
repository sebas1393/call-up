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
    /*
     * All paths except static assets / images.
     * Auth refresh must run on pages + API so expired JWTs are renewed.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|js|ico)$).*)",
  ],
};
