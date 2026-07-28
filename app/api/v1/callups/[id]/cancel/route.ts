import { ErrorCode } from "@/lib/constants/error-codes";
import { jsonData, jsonProblem } from "@/lib/api/http";
import { assertCallupOwner, assertCallupEditable } from "@/lib/services/callups";
import {
  loadCallupWithPlayers,
  requireSession,
} from "@/lib/services/player-routes";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * POST /api/v1/callups/{id}/cancel — logical cancel (irreversible).
 */
export async function POST(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const session = await requireSession();
  if (session instanceof Response) return session;

  const loaded = await loadCallupWithPlayers(session.supabase, id);
  if (loaded instanceof Response) return loaded;

  const owner = assertCallupOwner(loaded.callup.caller, session.userId);
  if (!owner.ok) {
    return jsonProblem({
      status: owner.status,
      title: "Forbidden",
      detail: owner.detail,
      code: owner.code,
    });
  }

  if (loaded.callup.status === "cancelled") {
    return jsonData({ id, status: "cancelled" as const });
  }

  // Closed is read-only — cannot cancel a past match.
  const editable = assertCallupEditable(loaded.callup.status);
  if (!editable.ok) {
    return jsonProblem({
      status: editable.status,
      title: "Conflict",
      detail: editable.detail,
      code: editable.code,
    });
  }

  const { data: updated, error } = await session.supabase
    .from("callups")
    .update({ status: "cancelled" })
    .eq("id", id)
    .neq("status", "cancelled")
    .select("id, status")
    .maybeSingle();

  if (error) {
    return jsonProblem({
      status: 500,
      title: "Internal Server Error",
      detail: "Oops, algo salió mal",
    });
  }

  if (!updated) {
    const { data: current } = await session.supabase
      .from("callups")
      .select("id, status")
      .eq("id", id)
      .maybeSingle();
    if (current?.status === "cancelled") {
      return jsonData({ id, status: "cancelled" as const });
    }
    return jsonProblem({
      status: 409,
      title: "Conflict",
      detail: "No se pudo cancelar la convocatoria.",
      code: ErrorCode.CALLUP_READ_ONLY,
    });
  }

  return jsonData({ id: updated.id, status: "cancelled" as const });
}
