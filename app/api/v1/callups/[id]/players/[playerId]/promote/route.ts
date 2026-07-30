import { ErrorCode } from "@/lib/constants/error-codes";
import { jsonData, jsonProblem } from "@/lib/api/http";
import { formatMatchAtEs } from "@/lib/format/callup-display";
import { fanOutChannelNotify, loadCallerUserName } from "@/lib/notify/fan-out";
import { countPlayers } from "@/lib/services/callups";
import {
  assertChurnMutationAllowed,
  assertPromoteAllowed,
  decideAfterRosterInsert,
  decidePromote,
  mapPlayerRowToDto,
} from "@/lib/services/players";
import {
  PLAYER_SELECT,
  requireCallupPlayersContext,
  syncCallupStatus,
} from "@/lib/services/player-routes";

type RouteContext = { params: Promise<{ id: string; playerId: string }> };

/**
 * POST /api/v1/callups/{id}/players/{playerId}/promote
 * Sets isWaitList=false, hasPayment=false. Self last-spot race → FIFO / SPOT_TAKEN_FIFO.
 */
export async function POST(_request: Request, context: RouteContext) {
  const { id: callupId, playerId } = await context.params;
  const ctx = await requireCallupPlayersContext(callupId);
  if (ctx instanceof Response) return ctx;

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

  const auth = assertPromoteAllowed({
    actorUserId: ctx.userId,
    callupCallerId: ctx.callup.caller,
    playerUserId: target.user_id,
    isWaitList: target.is_wait_list,
  });
  if (!auth.ok) {
    return jsonProblem({
      status: auth.status,
      title: "Forbidden",
      detail: auth.detail,
      code: auth.code,
    });
  }

  const fifoCandidates = ctx.players
    .filter((p) => p.is_wait_list && p.user_id != null)
    .map((p) => ({ id: p.id, createdAt: p.created_at }));

  const decision = decidePromote({
    mode: auth.mode,
    playerId,
    rosterCount: ctx.rosterCount,
    spotsQuantity: ctx.callup.spots_quantity,
    fifoCandidates,
  });

  if (!decision.ok) {
    return jsonProblem({
      status: decision.status,
      title: "Conflict",
      detail: decision.detail,
      code: decision.code,
    });
  }

  const { data: updated, error } = await ctx.supabase
    .from("players")
    .update({
      is_wait_list: decision.fields.isWaitList,
      has_payment: decision.fields.hasPayment,
    })
    .eq("id", playerId)
    .eq("is_wait_list", true)
    .select(PLAYER_SELECT)
    .single();

  if (error || !updated) {
    return jsonProblem({
      status: 409,
      title: "Conflict",
      detail: "No se pudo promover al jugador.",
      code: ErrorCode.SPOT_TAKEN_FIFO,
    });
  }

  const { data: rosterRows } = await ctx.supabase
    .from("players")
    .select("id")
    .eq("callup_id", callupId)
    .eq("is_wait_list", false);

  const race = decideAfterRosterInsert(
    rosterRows?.length ?? 0,
    ctx.callup.spots_quantity,
  );
  if (!race.ok) {
    await ctx.supabase
      .from("players")
      .update({ is_wait_list: true, has_payment: target.has_payment })
      .eq("id", playerId);
    return jsonProblem({
      status: race.status,
      title: "Conflict",
      detail: race.detail,
      code: race.code,
    });
  }

  const { data: allPlayers } = await ctx.supabase
    .from("players")
    .select("is_wait_list")
    .eq("callup_id", callupId);
  const counts = countPlayers(allPlayers ?? []);
  const statusAfter = await syncCallupStatus(
    ctx.supabase,
    ctx.callup,
    counts.rosterCount,
    counts.waitlistCount,
  );

  const callerUserName = await loadCallerUserName(ctx.callup.caller);
  if (callerUserName) {
    const when = formatMatchAtEs(ctx.callup.match_at);
    await fanOutChannelNotify({
      event: "promote",
      callupOwnerId: ctx.callup.caller,
      callerUserName,
      callupId,
      statusAfter,
      title: "Promovido a nómina",
      body: `${updated.name} pasó a la nómina · ${when}`,
    });
  }

  return jsonData(mapPlayerRowToDto(updated));
}
