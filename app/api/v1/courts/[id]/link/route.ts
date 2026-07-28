import { ErrorCode } from "@/lib/constants/error-codes";
import { jsonProblem, unauthorized } from "@/lib/api/http";
import { createSupabaseServerClient } from "@/lib/db/supabase-server";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * POST /api/v1/courts/{id}/link — ensure caller_courts on select (idempotent 204).
 */
export async function POST(_request: Request, context: RouteContext) {
  const { id: courtId } = await context.params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return unauthorized();
  }

  const { data: me } = await supabase
    .from("users")
    .select("user_name")
    .eq("id", user.id)
    .maybeSingle();

  if (!me?.user_name) {
    return jsonProblem({
      status: 403,
      title: "Forbidden",
      detail: "Debes configurar tu usuario de caller para vincular canchas.",
      code: ErrorCode.FORBIDDEN,
    });
  }

  const { data: court, error: courtError } = await supabase
    .from("courts")
    .select("id")
    .eq("id", courtId)
    .maybeSingle();

  if (courtError) {
    return jsonProblem({
      status: 500,
      title: "Internal Server Error",
      detail: "Oops, algo salió mal",
    });
  }

  if (!court) {
    return jsonProblem({
      status: 404,
      title: "Not Found",
      detail: "No se encontró la cancha.",
      code: ErrorCode.NOT_FOUND,
    });
  }

  const { error } = await supabase.from("caller_courts").upsert(
    { caller_user_id: user.id, court_id: courtId },
    { onConflict: "caller_user_id,court_id" },
  );

  if (error) {
    return jsonProblem({
      status: 500,
      title: "Internal Server Error",
      detail: "Oops, algo salió mal",
    });
  }

  return new Response(null, { status: 204 });
}
