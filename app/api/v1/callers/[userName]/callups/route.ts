import { ErrorCode } from "@/lib/constants/error-codes";
import { jsonData, jsonProblem } from "@/lib/api/http";
import { createSupabaseServerClient } from "@/lib/db/supabase-server";
import {
  countPlayers,
  toCallupSummaryDto,
  type CallupRow,
} from "@/lib/services/callups";
import { callupsMineQuerySchema } from "@/lib/validators/callup";
import { USERNAME_PATTERN } from "@/lib/constants/callup";

const CALLUP_SELECT =
  "id, caller, court_id, court_type, match_at, spots_quantity, wait_list, wait_list_threshold, payment_key, status, created_at" as const;

type RouteContext = { params: Promise<{ userName: string }> };

/**
 * GET /api/v1/callers/{userName}/callups — public channel list (anon OK).
 * Never returns email/phone.
 */
export async function GET(request: Request, context: RouteContext) {
  const { userName: raw } = await context.params;
  const userName = raw.trim().toLowerCase();

  if (!USERNAME_PATTERN.test(userName) || userName.length < 5 || userName.length > 10) {
    return jsonProblem({
      status: 404,
      title: "Not Found",
      detail: "No se encontró el usuario del caller.",
      code: ErrorCode.NOT_FOUND,
    });
  }

  const supabase = await createSupabaseServerClient();

  const { data: channel, error: channelError } = await supabase
    .from("callup_channels")
    .select("caller_user_id, user_name")
    .eq("user_name", userName)
    .maybeSingle();

  if (channelError) {
    return jsonProblem({
      status: 500,
      title: "Internal Server Error",
      detail: "Oops, algo salió mal",
    });
  }

  if (!channel) {
    return jsonProblem({
      status: 404,
      title: "Not Found",
      detail: "No se encontró el usuario del caller.",
      code: ErrorCode.NOT_FOUND,
    });
  }

  const url = new URL(request.url);
  const parsed = callupsMineQuerySchema.safeParse({
    pageIndex: url.searchParams.get("pageIndex") ?? undefined,
    pageSize: url.searchParams.get("pageSize") ?? undefined,
  });

  if (!parsed.success) {
    return jsonProblem({
      status: 400,
      title: "Bad Request",
      detail:
        parsed.error.issues[0]?.message ?? "Parámetros de paginación inválidos.",
      code: ErrorCode.VALIDATION_ERROR,
    });
  }

  const { pageIndex, pageSize } = parsed.data;
  const from = pageIndex * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await supabase
    .from("callups")
    .select(
      `${CALLUP_SELECT}, courts ( name, address ), players ( is_wait_list )`,
      { count: "exact" },
    )
    .eq("caller", channel.caller_user_id)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    return jsonProblem({
      status: 500,
      title: "Internal Server Error",
      detail: "Oops, algo salió mal",
    });
  }

  const items = (data ?? []).map((row) => {
    const courtRaw = row.courts as
      | { name: string; address: string }
      | { name: string; address: string }[]
      | null;
    const court = Array.isArray(courtRaw) ? courtRaw[0] : courtRaw;
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
    const { rosterCount, waitlistCount } = countPlayers(
      (row.players ?? []) as { is_wait_list: boolean }[],
    );
    return toCallupSummaryDto({
      callup,
      courtName: court?.name ?? "",
      courtAddress: court?.address ?? "",
      rosterCount,
      waitlistCount,
    });
  });

  return jsonData({
    userName: channel.user_name,
    items,
    pageIndex,
    pageSize,
    totalCount: count ?? 0,
  });
}
