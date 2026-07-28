import { ErrorCode } from "@/lib/constants/error-codes";
import { jsonData, jsonProblem } from "@/lib/api/http";
import { assertCallupOwner, countPlayers } from "@/lib/services/callups";
import {
  assertChurnMutationAllowed,
  formatPlayerDisplayName,
  mapPlayerRowToDto,
  playerNamesMatch,
} from "@/lib/services/players";
import {
  PLAYER_SELECT,
  requireCallupPlayersContext,
  syncCallupStatus,
} from "@/lib/services/player-routes";
import { patchPlayerNameBodySchema } from "@/lib/validators/players";

type RouteContext = { params: Promise<{ id: string; playerId: string }> };

/**
 * PATCH /api/v1/callups/{id}/players/{playerId} — owner edits name.
 */
export async function PATCH(request: Request, context: RouteContext) {
  const { id: callupId, playerId } = await context.params;
  const ctx = await requireCallupPlayersContext(callupId);
  if (ctx instanceof Response) return ctx;

  const owner = assertCallupOwner(ctx.callup.caller, ctx.userId);
  if (!owner.ok) {
    return jsonProblem({
      status: owner.status,
      title: "Forbidden",
      detail: owner.detail,
      code: owner.code,
    });
  }

  const churn = assertChurnMutationAllowed(ctx.callup.status);
  if (!churn.ok) {
    return jsonProblem({
      status: churn.status,
      title: "Conflict",
      detail: churn.detail,
      code: churn.code,
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

  const parsed = patchPlayerNameBodySchema.safeParse(body);
  if (!parsed.success) {
    return jsonProblem({
      status: 400,
      title: "Bad Request",
      detail: parsed.error.issues[0]?.message ?? "Nombre inválido.",
      code: ErrorCode.VALIDATION_ERROR,
    });
  }

  const name = formatPlayerDisplayName(parsed.data.name);

  if (target.user_id == null) {
    const clash = ctx.players.some(
      (p) =>
        p.id !== playerId &&
        p.user_id == null &&
        playerNamesMatch(p.name, name),
    );
    if (clash) {
      return jsonProblem({
        status: 409,
        title: "Conflict",
        detail: "Ya existe un invitado con ese nombre en la convocatoria.",
        code: ErrorCode.VALIDATION_ERROR,
      });
    }
  }

  const { data: updated, error } = await ctx.supabase
    .from("players")
    .update({ name })
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

  return jsonData(mapPlayerRowToDto(updated));
}

/**
 * DELETE /api/v1/callups/{id}/players/{playerId} — owner removes a row.
 */
export async function DELETE(_request: Request, context: RouteContext) {
  const { id: callupId, playerId } = await context.params;
  const ctx = await requireCallupPlayersContext(callupId);
  if (ctx instanceof Response) return ctx;

  const owner = assertCallupOwner(ctx.callup.caller, ctx.userId);
  if (!owner.ok) {
    return jsonProblem({
      status: owner.status,
      title: "Forbidden",
      detail: owner.detail,
      code: owner.code,
    });
  }

  const churn = assertChurnMutationAllowed(ctx.callup.status);
  if (!churn.ok) {
    return jsonProblem({
      status: churn.status,
      title: "Conflict",
      detail: churn.detail,
      code: churn.code,
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

  const { error } = await ctx.supabase.from("players").delete().eq("id", playerId);

  if (error) {
    return jsonProblem({
      status: 500,
      title: "Internal Server Error",
      detail: "Oops, algo salió mal",
    });
  }

  const remaining = ctx.players.filter((p) => p.id !== playerId);
  const counts = countPlayers(remaining);
  await syncCallupStatus(
    ctx.supabase,
    ctx.callup,
    counts.rosterCount,
    counts.waitlistCount,
  );

  return new Response(null, { status: 204 });
}
