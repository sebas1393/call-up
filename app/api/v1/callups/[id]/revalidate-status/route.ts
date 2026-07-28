import { ErrorCode } from "@/lib/constants/error-codes";
import { jsonData, jsonProblem } from "@/lib/api/http";
import { createSupabaseServiceClient } from "@/lib/db/supabase-service";
import { countPlayers, type CallupRow, type PlayerRow } from "@/lib/services/callups";
import { revalidateCallupStatus } from "@/lib/rules/callup-status";
import {
  CALLUP_SELECT,
  PLAYER_SELECT,
  requireSession,
} from "@/lib/services/player-routes";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * PATCH /api/v1/callups/{id}/revalidate-status
 * Session required; service_role CAS so first writer wins the status update.
 */
export async function PATCH(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const session = await requireSession();
  if (session instanceof Response) return session;

  // Auth gate via session; lock/update via service role (spec §10).
  let service;
  try {
    service = createSupabaseServiceClient();
  } catch {
    return jsonProblem({
      status: 500,
      title: "Internal Server Error",
      detail: "Oops, algo salió mal",
    });
  }

  const { data: row, error } = await service
    .from("callups")
    .select(`${CALLUP_SELECT}, players ( ${PLAYER_SELECT} )`)
    .eq("id", id)
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

  const players = (row.players ?? []) as PlayerRow[];
  const { rosterCount, waitlistCount } = countPlayers(players);

  const result = revalidateCallupStatus({
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

  if (!result.changed) {
    return jsonData({
      id: callup.id,
      status: result.status,
      changed: false,
    });
  }

  // Compare-and-swap: only first writer with matching previous status wins.
  const { data: updated, error: updateError } = await service
    .from("callups")
    .update({ status: result.status })
    .eq("id", id)
    .eq("status", callup.status)
    .select("id, status")
    .maybeSingle();

  if (updateError) {
    return jsonProblem({
      status: 500,
      title: "Internal Server Error",
      detail: "Oops, algo salió mal",
    });
  }

  if (!updated) {
    // Lost the race — return whatever is currently stored.
    const { data: current } = await service
      .from("callups")
      .select("id, status")
      .eq("id", id)
      .maybeSingle();

    return jsonData({
      id,
      status: current?.status ?? result.status,
      changed: false,
    });
  }

  return jsonData({
    id: updated.id,
    status: updated.status,
    changed: true,
  });
}
