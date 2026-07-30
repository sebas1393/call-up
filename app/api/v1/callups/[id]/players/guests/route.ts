import { ErrorCode } from "@/lib/constants/error-codes";
import { jsonData, jsonProblem } from "@/lib/api/http";
import { createSupabaseServerClient } from "@/lib/db/supabase-server";
import { createSupabaseServiceClient } from "@/lib/db/supabase-service";
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
  loadCallupWithPlayers,
  PLAYER_SELECT,
  syncCallupStatus,
} from "@/lib/services/player-routes";
import { createGuestBodySchema } from "@/lib/validators/players";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * POST /api/v1/callups/{id}/players/guests — Inscribir (guest).
 * Anon allowed (US-008/009 MVP); writes via service role when no session.
 */
export async function POST(request: Request, context: RouteContext) {
  const { id: callupId } = await context.params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const loaded = await loadCallupWithPlayers(supabase, callupId);
  if (loaded instanceof Response) return loaded;

  const { rosterCount, waitlistCount } = countPlayers(loaded.players);
  const writeClient = user ? supabase : createSupabaseServiceClient();

  const churn = assertChurnMutationAllowed(loaded.callup.status);
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

  const existingGuestNames = loaded.players
    .filter((p) => p.user_id == null)
    .map((p) => p.name);

  const actorIsOwner = Boolean(user && user.id === loaded.callup.caller);

  // Logged-in non-owner Inscribir links the row to their session so they can
  // self-promote from waitlist (US-009). Owner-created guests stay user_id null.
  if (user && !actorIsOwner) {
    const alreadyOnCallup = loaded.players.some((p) => p.user_id === user.id);
    if (alreadyOnCallup) {
      return jsonProblem({
        status: 409,
        title: "Conflict",
        detail: "Ya estás inscrito en esta convocatoria.",
        code: ErrorCode.VALIDATION_ERROR,
      });
    }
  }

  const decision = decideGuestCreate({
    guestName: parsed.data.guestName,
    acceptWaitlist: parsed.data.acceptWaitlist,
    requestedHasPayment: parsed.data.hasPayment,
    actorIsOwner,
    existingGuestNames,
    eligibility: eligibilityFromContext({
      callup: loaded.callup,
      rosterCount,
      waitlistCount,
    }),
  });

  if (!decision.ok) {
    return jsonProblem({
      status: decision.status,
      title: decision.status === 400 ? "Bad Request" : "Conflict",
      detail: decision.detail,
      code: decision.code,
    });
  }

  const linkedUserId =
    user && !actorIsOwner ? user.id : null;

  const { data: created, error } = await writeClient
    .from("players")
    .insert({
      callup_id: callupId,
      name: decision.displayName,
      user_id: linkedUserId,
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
    const { data: rosterRows } = await writeClient
      .from("players")
      .select("id")
      .eq("callup_id", callupId)
      .eq("is_wait_list", false);

    const race = decideAfterRosterInsert(
      rosterRows?.length ?? 0,
      loaded.callup.spots_quantity,
    );
    if (!race.ok) {
      await writeClient.from("players").delete().eq("id", created.id);
      return jsonProblem({
        status: race.status,
        title: "Conflict",
        detail: race.detail,
        code: race.code,
      });
    }
  }

  emitSubscribeIfNeeded(undefined, decision.notifyChannel);

  const { data: allPlayers } = await writeClient
    .from("players")
    .select("is_wait_list")
    .eq("callup_id", callupId);
  const counts = countPlayers(allPlayers ?? []);
  await syncCallupStatus(
    writeClient,
    loaded.callup,
    counts.rosterCount,
    counts.waitlistCount,
  );

  return jsonData(mapPlayerRowToDto(created), { status: 201 });
}
