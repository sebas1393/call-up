import { ErrorCode } from "@/lib/constants/error-codes";
import { jsonData, jsonProblem } from "@/lib/api/http";
import { countPlayers } from "@/lib/services/callups";
import {
  applyClaimNotifyContract,
  decideAfterRosterInsert,
  decideSubscribe,
  emitSubscribeIfNeeded,
  formatPlayerDisplayName,
  assertChurnMutationAllowed,
  mapPlayerRowToDto,
} from "@/lib/services/players";
import {
  eligibilityFromContext,
  PLAYER_SELECT,
  requireCallupPlayersContext,
  syncCallupStatus,
} from "@/lib/services/player-routes";
import { subscribeBodySchema } from "@/lib/validators/players";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * POST /api/v1/callups/{id}/players/subscribe
 * Claim is silent (no channel notify). New row → subscribe notify (stub until T12).
 */
export async function POST(request: Request, context: RouteContext) {
  const { id: callupId } = await context.params;
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const parsed = subscribeBodySchema.safeParse(body ?? {});
  if (!parsed.success) {
    return jsonProblem({
      status: 400,
      title: "Bad Request",
      detail: parsed.error.issues[0]?.message ?? "Cuerpo inválido.",
      code: ErrorCode.VALIDATION_ERROR,
    });
  }

  const alreadySubscribed = ctx.players.some((p) => p.user_id === ctx.userId);
  const decision = decideSubscribe({
    subscriberName: ctx.displayName,
    existingPlayers: ctx.players.map((p) => ({
      id: p.id,
      name: p.name,
      userId: p.user_id,
    })),
    alreadySubscribed,
    acceptWaitlist: parsed.data.acceptWaitlist,
    eligibility: eligibilityFromContext(ctx),
  });

  if (!decision.ok) {
    return jsonProblem({
      status: decision.status,
      title: "Conflict",
      detail: decision.detail,
      code: decision.code,
    });
  }

  // Notify hook stub — Task 12 wires real recipients/push.
  const notify = undefined;

  if (decision.kind === "claim") {
    applyClaimNotifyContract(notify);
    const { data: claimed, error } = await ctx.supabase
      .from("players")
      .update({ user_id: ctx.userId })
      .eq("id", decision.playerId)
      .eq("callup_id", callupId)
      .is("user_id", null)
      .select(PLAYER_SELECT)
      .single();

    if (error || !claimed) {
      return jsonProblem({
        status: 409,
        title: "Conflict",
        detail: "No se pudo reclamar el cupo de invitado.",
        code: ErrorCode.VALIDATION_ERROR,
      });
    }

    return jsonData(mapPlayerRowToDto(claimed), { status: 201 });
  }

  const displayName = formatPlayerDisplayName(ctx.displayName);
  const { data: created, error: insertError } = await ctx.supabase
    .from("players")
    .insert({
      callup_id: callupId,
      name: displayName,
      user_id: ctx.userId,
      has_payment: false,
      is_wait_list: decision.isWaitList,
    })
    .select(PLAYER_SELECT)
    .single();

  if (insertError || !created) {
    if (insertError?.code === "23505") {
      return jsonProblem({
        status: 409,
        title: "Conflict",
        detail: "Ya estás inscrito en esta convocatoria.",
        code: ErrorCode.VALIDATION_ERROR,
      });
    }
    return jsonProblem({
      status: 500,
      title: "Internal Server Error",
      detail: "Oops, algo salió mal",
    });
  }

  if (!decision.isWaitList) {
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
      await ctx.supabase.from("players").delete().eq("id", created.id);
      return jsonProblem({
        status: race.status,
        title: "Conflict",
        detail: race.detail,
        code: race.code,
      });
    }
  }

  emitSubscribeIfNeeded(notify, decision.notifyChannel);

  const { data: allPlayers } = await ctx.supabase
    .from("players")
    .select("is_wait_list")
    .eq("callup_id", callupId);
  const counts = countPlayers(allPlayers ?? []);
  await syncCallupStatus(
    ctx.supabase,
    ctx.callup,
    counts.rosterCount,
    counts.waitlistCount,
  );

  return jsonData(mapPlayerRowToDto(created), { status: 201 });
}
