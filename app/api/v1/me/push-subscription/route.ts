import { ErrorCode } from "@/lib/constants/error-codes";
import { jsonProblem, unauthorized } from "@/lib/api/http";
import { createSupabaseServerClient } from "@/lib/db/supabase-server";
import {
  deletePushSubscriptionBodySchema,
  pushSubscriptionBodySchema,
} from "@/lib/validators/push";

/**
 * POST /api/v1/me/push-subscription — upsert by endpoint (204).
 */
export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return unauthorized();
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonProblem({
      status: 400,
      title: "Bad Request",
      detail: "Cuerpo JSON inválido.",
      code: ErrorCode.VALIDATION_ERROR,
    });
  }

  const parsed = pushSubscriptionBodySchema.safeParse(body);
  if (!parsed.success) {
    return jsonProblem({
      status: 400,
      title: "Bad Request",
      detail:
        parsed.error.issues[0]?.message ?? "Suscripción push inválida.",
      code: ErrorCode.VALIDATION_ERROR,
    });
  }

  const { endpoint, keys } = parsed.data;
  const now = new Date().toISOString();

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: user.id,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
      updated_at: now,
    },
    { onConflict: "endpoint" },
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

/**
 * DELETE /api/v1/me/push-subscription — remove by endpoint (idempotent 204).
 */
export async function DELETE(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return unauthorized();
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonProblem({
      status: 400,
      title: "Bad Request",
      detail: "Cuerpo JSON inválido.",
      code: ErrorCode.VALIDATION_ERROR,
    });
  }

  const parsed = deletePushSubscriptionBodySchema.safeParse(body);
  if (!parsed.success) {
    return jsonProblem({
      status: 400,
      title: "Bad Request",
      detail: parsed.error.issues[0]?.message ?? "Endpoint inválido.",
      code: ErrorCode.VALIDATION_ERROR,
    });
  }

  await supabase
    .from("push_subscriptions")
    .delete()
    .eq("user_id", user.id)
    .eq("endpoint", parsed.data.endpoint);

  return new Response(null, { status: 204 });
}
