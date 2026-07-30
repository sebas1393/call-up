import { ErrorCode } from "@/lib/constants/error-codes";
import { jsonData, jsonProblem, unauthorized } from "@/lib/api/http";
import { createSupabaseServerClient } from "@/lib/db/supabase-server";
import { formatMatchAtEs } from "@/lib/format/callup-display";
import { fanOutChannelNotify } from "@/lib/notify/fan-out";
import {
  assertMatchAtNotPast,
  computeWaitListThreshold,
  initialCallupStatus,
} from "@/lib/services/callups";
import { ensureCallerCourtLink } from "@/lib/services/courts";
import { createCallupBodySchema } from "@/lib/validators/callup";

/**
 * Ensures session user is a caller (has userName). Returns ids or error Response.
 */
async function requireCaller(): Promise<
  | {
      userId: string;
      displayName: string;
      userName: string;
      supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
    }
  | Response
> {
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
    .select("user_name, name")
    .eq("id", user.id)
    .maybeSingle();

  if (!me?.user_name) {
    return jsonProblem({
      status: 403,
      title: "Forbidden",
      detail: "Debes configurar tu usuario de caller para gestionar convocatorias.",
      code: ErrorCode.FORBIDDEN,
    });
  }

  return {
    userId: user.id,
    displayName: me.name ?? "Caller",
    userName: me.user_name,
    supabase,
  };
}

/**
 * POST /api/v1/callups — create callup (threshold snapshot, optional subscribeMyself).
 */
export async function POST(request: Request) {
  const caller = await requireCaller();
  if (caller instanceof Response) return caller;
  const { userId, displayName, userName, supabase } = caller;

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

  const parsed = createCallupBodySchema.safeParse(body);
  if (!parsed.success) {
    return jsonProblem({
      status: 400,
      title: "Bad Request",
      detail: parsed.error.issues[0]?.message ?? "Datos de convocatoria inválidos.",
      code: ErrorCode.VALIDATION_ERROR,
    });
  }

  const matchCheck = assertMatchAtNotPast(parsed.data.matchAt);
  if (!matchCheck.ok) {
    return jsonProblem({
      status: matchCheck.status,
      title: "Bad Request",
      detail: matchCheck.detail,
      code: matchCheck.code,
    });
  }

  const { data: court, error: courtError } = await supabase
    .from("courts")
    .select("id")
    .eq("id", parsed.data.courtId)
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

  const linked = await ensureCallerCourtLink(
    supabase,
    userId,
    parsed.data.courtId,
  );
  if (!linked.ok) {
    return jsonProblem({
      status: 500,
      title: "Internal Server Error",
      detail: "Oops, algo salió mal",
    });
  }

  const waitListThreshold = computeWaitListThreshold(parsed.data.spotsQuantity);
  const rosterCount = parsed.data.subscribeMyself ? 1 : 0;
  const status = initialCallupStatus({
    spotsQuantity: parsed.data.spotsQuantity,
    rosterCount,
    waitList: parsed.data.waitList,
    waitListThreshold,
    waitlistCount: 0,
  });

  const { data: callup, error } = await supabase
    .from("callups")
    .insert({
      caller: userId,
      court_id: parsed.data.courtId,
      court_type: parsed.data.courtType,
      match_at: parsed.data.matchAt,
      spots_quantity: parsed.data.spotsQuantity,
      wait_list: parsed.data.waitList,
      wait_list_threshold: waitListThreshold,
      payment_key: parsed.data.paymentKey,
      status,
    })
    .select("id")
    .single();

  if (error || !callup) {
    return jsonProblem({
      status: 500,
      title: "Internal Server Error",
      detail: "Oops, algo salió mal",
    });
  }

  if (parsed.data.subscribeMyself) {
    const { error: playerError } = await supabase.from("players").insert({
      callup_id: callup.id,
      name: displayName,
      user_id: userId,
      has_payment: false,
      is_wait_list: false,
    });

    if (playerError) {
      return jsonProblem({
        status: 500,
        title: "Internal Server Error",
        detail: "Oops, algo salió mal",
      });
    }
  }

  const when = formatMatchAtEs(parsed.data.matchAt);
  await fanOutChannelNotify({
    event: "new_callup",
    callupOwnerId: userId,
    callerUserName: userName,
    callupId: callup.id,
    statusAfter: status,
    filledCapacity: status === "Full",
    title: "Nueva convocatoria",
    body: `${userName} abrió un partido el ${when}`,
  });

  return jsonData({ id: callup.id }, { status: 201 });
}
