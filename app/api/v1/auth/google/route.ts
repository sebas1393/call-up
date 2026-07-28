import { NextRequest } from "next/server";

import { ErrorCode } from "@/lib/constants/error-codes";
import { jsonProblem, unauthorized } from "@/lib/api/http";
import { createSupabaseServerClient } from "@/lib/db/supabase-server";
import { getSupabasePublicEnv } from "@/lib/db/env";

/**
 * GET /api/v1/auth/google — start Google OAuth (redirect to Supabase/Google).
 * Query: redirectTo?, intent=caller|player
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const redirectTo = searchParams.get("redirectTo") ?? undefined;
  const intent = searchParams.get("intent");

  const callback = new URL("/api/v1/auth/callback", origin);
  if (redirectTo) callback.searchParams.set("redirectTo", redirectTo);
  if (intent === "caller" || intent === "player") {
    callback.searchParams.set("intent", intent);
  }

  try {
    getSupabasePublicEnv();
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: callback.toString(),
        queryParams: {
          access_type: "offline",
          prompt: "consent",
        },
      },
    });

    if (error || !data.url) {
      return jsonProblem({
        status: 500,
        title: "Internal Server Error",
        detail: "Oops, algo salió mal",
        code: ErrorCode.VALIDATION_ERROR,
      });
    }

    return Response.redirect(data.url, 302);
  } catch {
    return jsonProblem({
      status: 500,
      title: "Internal Server Error",
      detail: "Oops, algo salió mal",
    });
  }
}
