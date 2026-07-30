import { ErrorCode } from "@/lib/constants/error-codes";
import { jsonProblem } from "@/lib/api/http";
import { formatMatchAtEs } from "@/lib/format/callup-display";
import { fanOutChannelNotify, loadCallerUserName } from "@/lib/notify/fan-out";
import { countPlayers } from "@/lib/services/callups";
import { assertChurnMutationAllowed } from "@/lib/services/players";
import {
  requireCallupPlayersContext,
  syncCallupStatus,
} from "@/lib/services/player-routes";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * POST /api/v1/callups/{id}/players/me/unsubscribe
 */
export async function POST(_request: Request, context: RouteContext) {
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

  const mine = ctx.players.find((p) => p.user_id === ctx.userId);
  if (!mine) {
    return jsonProblem({
      status: 404,
      title: "Not Found",
      detail: "No estás inscrito en esta convocatoria.",
      code: ErrorCode.NOT_FOUND,
    });
  }

  const wasRoster = !mine.is_wait_list;
  const { error } = await ctx.supabase.from("players").delete().eq("id", mine.id);

  if (error) {
    return jsonProblem({
      status: 500,
      title: "Internal Server Error",
      detail: "Oops, algo salió mal",
    });
  }

  const remaining = ctx.players.filter((p) => p.id !== mine.id);
  const counts = countPlayers(remaining);
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
      event: "unsubscribe",
      callupOwnerId: ctx.callup.caller,
      callerUserName,
      callupId,
      statusAfter,
      title: "Baja de convocatoria",
      body: `${mine.name} se bajó · ${when}`,
    });
    if (wasRoster && statusAfter === "Open") {
      await fanOutChannelNotify({
        event: "plaza_libre",
        callupOwnerId: ctx.callup.caller,
        callerUserName,
        callupId,
        statusAfter,
        title: "Plaza libre",
        body: `Hay cupo en ${when}`,
      });
    }
  }

  return new Response(null, { status: 204 });
}
