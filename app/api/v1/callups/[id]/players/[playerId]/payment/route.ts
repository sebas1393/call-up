import { ErrorCode } from "@/lib/constants/error-codes";
import { jsonData, jsonProblem } from "@/lib/api/http";
import {
  assertPaymentAllowed,
  assertPaymentMutationAllowed,
  mapPlayerRowToDto,
} from "@/lib/services/players";
import {
  PLAYER_SELECT,
  requireCallupPlayersContext,
} from "@/lib/services/player-routes";
import { patchPaymentBodySchema } from "@/lib/validators/players";

type RouteContext = { params: Promise<{ id: string; playerId: string }> };

/**
 * PATCH /api/v1/callups/{id}/players/{playerId}/payment
 * Guest → owner only; registered → self or owner. Allowed on Closed; blocked on cancelled.
 */
export async function PATCH(request: Request, context: RouteContext) {
  const { id: callupId, playerId } = await context.params;
  const ctx = await requireCallupPlayersContext(callupId);
  if (ctx instanceof Response) return ctx;

  const statusOk = assertPaymentMutationAllowed(ctx.callup.status);
  if (!statusOk.ok) {
    return jsonProblem({
      status: statusOk.status,
      title: "Conflict",
      detail: statusOk.detail,
      code: statusOk.code,
    });
  }

  const target = ctx.players.find((p) => p.id === playerId);
  if (!target) {
    return jsonProblem({
      status: 404,
      title: "Not Found",
      detail: "No se encontró el jugador.",
      code: ErrorCode.NOT_FOUND,
    });
  }

  const auth = assertPaymentAllowed({
    actorUserId: ctx.userId,
    callupCallerId: ctx.callup.caller,
    playerUserId: target.user_id,
  });
  if (!auth.ok) {
    return jsonProblem({
      status: auth.status,
      title: "Forbidden",
      detail: auth.detail,
      code: auth.code,
    });
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

  const parsed = patchPaymentBodySchema.safeParse(body);
  if (!parsed.success) {
    return jsonProblem({
      status: 400,
      title: "Bad Request",
      detail: parsed.error.issues[0]?.message ?? "Datos de pago inválidos.",
      code: ErrorCode.VALIDATION_ERROR,
    });
  }

  const { data: updated, error } = await ctx.supabase
    .from("players")
    .update({ has_payment: parsed.data.hasPayment })
    .eq("id", playerId)
    .select(PLAYER_SELECT)
    .single();

  if (error || !updated) {
    return jsonProblem({
      status: 500,
      title: "Internal Server Error",
      detail: "Oops, algo salió mal",
    });
  }

  // payment → caller-only notify stubbed until Task 12.
  return jsonData(mapPlayerRowToDto(updated));
}
