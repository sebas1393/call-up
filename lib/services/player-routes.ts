import type { SupabaseClient } from "@supabase/supabase-js";

import type { CallupStatus } from "@/lib/constants/callup";
import { ErrorCode } from "@/lib/constants/error-codes";
import { jsonProblem, unauthorized } from "@/lib/api/http";
import { createSupabaseServerClient } from "@/lib/db/supabase-server";
import {
  countPlayers,
  sortPlayersByEnrollment,
  type CallupRow,
  type PlayerRow,
} from "@/lib/services/callups";
import { revalidateCallupStatus } from "@/lib/rules/callup-status";

export const CALLUP_SELECT =
  "id, caller, court_id, court_type, match_at, spots_quantity, wait_list, wait_list_threshold, payment_key, status, created_at" as const;

export const PLAYER_SELECT =
  "id, callup_id, name, has_payment, is_wait_list, user_id, created_at" as const;

export type AuthedSupabase = Awaited<
  ReturnType<typeof createSupabaseServerClient>
>;

export type CallupPlayersContext = {
  supabase: AuthedSupabase;
  userId: string;
  displayName: string;
  callup: CallupRow;
  players: PlayerRow[];
  rosterCount: number;
  waitlistCount: number;
};

export async function requireSession(): Promise<
  | { supabase: AuthedSupabase; userId: string; displayName: string }
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
    .select("name")
    .eq("id", user.id)
    .maybeSingle();

  return {
    supabase,
    userId: user.id,
    displayName: me?.name?.trim() ? me.name : "Jugador",
  };
}

export async function loadCallupWithPlayers(
  supabase: SupabaseClient,
  callupId: string,
): Promise<{ callup: CallupRow; players: PlayerRow[] } | Response> {
  const { data: row, error } = await supabase
    .from("callups")
    .select(`${CALLUP_SELECT}, players ( ${PLAYER_SELECT} )`)
    .eq("id", callupId)
    .order("created_at", { referencedTable: "players", ascending: true })
    .maybeSingle();

  if (error) {
    return jsonProblem({
      status: 500,
      title: "Internal Server Error",
      detail: "Oops, algo salió mal",
    });
  }

  if (!row) {
    return jsonProblem({
      status: 404,
      title: "Not Found",
      detail: "No se encontró la convocatoria.",
      code: ErrorCode.NOT_FOUND,
    });
  }

  const callup: CallupRow = {
    id: row.id,
    caller: row.caller,
    court_id: row.court_id,
    court_type: row.court_type,
    match_at: row.match_at,
    spots_quantity: row.spots_quantity,
    wait_list: row.wait_list,
    wait_list_threshold: row.wait_list_threshold,
    payment_key: row.payment_key,
    status: row.status,
    created_at: row.created_at,
  };

  return {
    callup,
    players: sortPlayersByEnrollment((row.players ?? []) as PlayerRow[]),
  };
}

export async function requireCallupPlayersContext(
  callupId: string,
): Promise<CallupPlayersContext | Response> {
  const session = await requireSession();
  if (session instanceof Response) return session;

  const loaded = await loadCallupWithPlayers(session.supabase, callupId);
  if (loaded instanceof Response) return loaded;

  const { rosterCount, waitlistCount } = countPlayers(loaded.players);
  return {
    ...session,
    callup: loaded.callup,
    players: loaded.players,
    rosterCount,
    waitlistCount,
  };
}

/**
 * Recomputes Open/Full/Closed after roster/waitlist mutations (never clears cancelled).
 * @returns Status after sync (for notify noise window).
 */
export async function syncCallupStatus(
  supabase: SupabaseClient,
  callup: CallupRow,
  rosterCount: number,
  waitlistCount: number,
): Promise<CallupStatus> {
  const next = revalidateCallupStatus({
    currentStatus: callup.status,
    matchAt: callup.match_at,
    capacity: {
      spotsQuantity: callup.spots_quantity,
      rosterCount,
      waitList: callup.wait_list,
      waitListThreshold: callup.wait_list_threshold,
      waitlistCount,
    },
  });
  if (next.changed) {
    await supabase
      .from("callups")
      .update({ status: next.status })
      .eq("id", callup.id);
  }
  return next.status;
}

export function eligibilityFromContext(ctx: {
  callup: CallupRow;
  rosterCount: number;
  waitlistCount: number;
}) {
  return {
    spotsQuantity: ctx.callup.spots_quantity,
    rosterCount: ctx.rosterCount,
    waitList: ctx.callup.wait_list,
    waitListThreshold: ctx.callup.wait_list_threshold,
    waitlistCount: ctx.waitlistCount,
    status: ctx.callup.status,
  };
}
