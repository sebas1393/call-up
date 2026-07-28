import { ErrorCode } from "@/lib/constants/error-codes";
import { jsonProblem } from "@/lib/api/http";
import { createSupabaseServerClient } from "@/lib/db/supabase-server";

/**
 * POST /api/v1/auth/logout — clear session. Client redirects to home.
 */
export async function POST() {
  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signOut();

    if (error) {
      return jsonProblem({
        status: 500,
        title: "Internal Server Error",
        detail: "Oops, algo salió mal",
        code: ErrorCode.UNAUTHORIZED,
      });
    }

    return new Response(null, { status: 204 });
  } catch {
    return jsonProblem({
      status: 500,
      title: "Internal Server Error",
      detail: "Oops, algo salió mal",
    });
  }
}
