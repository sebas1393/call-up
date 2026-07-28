import { ErrorCode } from "@/lib/constants/error-codes";
import { jsonData, jsonProblem } from "@/lib/api/http";
import { countPlayers } from "@/lib/services/callups";
import {
  assertChurnMutationAllowed,
  decideAfterRosterInsert,
  decideGuestCreate,
  emitSubscribeIfNeeded,
  mapPlayerRowToDto,
} from "@/lib/services/players";
import {
  eligibilityFromContext,
  PLAYER_SELECT,
  requireCallupPlayersContext,
  syncCallupStatus,
} from "@/lib/services/player-routes";
import { createGuestBodySchema } from "@/lib/validators/players";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * POST /api/v1/callups/{id}/players/guests — Crear Jugador.
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
    return jsonProblem({
      status: 400,
      title: "Bad Request",
      detail: "Cuerpo JSON inválido.",
      code: ErrorCode.VALIDATION_ERROR,
    });
  }

  const parsed = createGuestBodySchema.safeParse(body);
  if (!parsed.success) {
    return jsonProblem({
      status: 400,
      title: "Bad Request",
      detail: parsed.error.issues[0]?.message ?? "Datos de invitado inválidos.",
      code: ErrorCode.VALIDATION_ERROR,
    });
  }

  const existingGuestNames = ctx.players
    .filter((p) => p.user_id == null)
    .map((p) => p.name);

  const decision = decideGuestCreate({
    guestName: parsed.data.guestName,
    acceptWaitlist: parsed.data.acceptWaitlist,
    requestedHasPayment: parsed.data.hasPayment,
    actorIsOwner: ctx.userId === ctx.callup.caller,
    existingGuestNames,
    eligibility: eligibilityFromContext(ctx),
  });

  if (!decision.ok) {
    return jsonProblem({
      status: decision.status,
      title: decision.status === 400 ? "Bad Request" : "Conflict",
      detail: decision.detail,
      code: decision.code,
    });
  }

  const { data: created, error } = await ctx.supabase
    .from("players")
    .insert({
      callup_id: callupId,
      name: decision.displayName,
      user_id: null,
      has_payment: decision.hasPayment,
      is_wait_list: decision.isWaitList,
    })
    .select(PLAYER_SELECT)
    .single();

  if (error || !created) {
    if (error?.code === "23505") {
      return jsonProblem({
        status: 409,
        title: "Conflict",
        detail: "Ya existe un invitado con ese nombre en la convocatoria.",
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

  emitSubscribeIfNeeded(undefined, decision.notifyChannel);

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
