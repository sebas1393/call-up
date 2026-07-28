import { ErrorCode } from "@/lib/constants/error-codes";
import { jsonData, jsonProblem, unauthorized } from "@/lib/api/http";
import { createSupabaseServerClient } from "@/lib/db/supabase-server";
import {
  countPlayers,
  toCallupSummaryDto,
  type CallupRow,
} from "@/lib/services/callups";
import { callupsMineQuerySchema } from "@/lib/validators/callup";

const CALLUP_SELECT =
  "id, caller, court_id, court_type, match_at, spots_quantity, wait_list, wait_list_threshold, payment_key, status, created_at" as const;

/**
 * GET /api/v1/callups/mine — caller dashboard only; newest first; pageSize default 10.
 */
export async function GET(request: Request) {
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
    .select("user_name")
    .eq("id", user.id)
    .maybeSingle();

  if (!me?.user_name) {
    return jsonProblem({
      status: 403,
      title: "Forbidden",
      detail: "Debes configurar tu usuario de caller para ver tus convocatorias.",
      code: ErrorCode.FORBIDDEN,
    });
  }

  const url = new URL(request.url);
  const parsed = callupsMineQuerySchema.safeParse({
    pageIndex: url.searchParams.get("pageIndex") ?? undefined,
    pageSize: url.searchParams.get("pageSize") ?? undefined,
    status: url.searchParams.get("status") ?? undefined,
  });

  if (!parsed.success) {
    return jsonProblem({
      status: 400,
      title: "Bad Request",
      detail: parsed.error.issues[0]?.message ?? "Parámetros de paginación inválidos.",
      code: ErrorCode.VALIDATION_ERROR,
    });
  }

  const { pageIndex, pageSize, status } = parsed.data;
  const from = pageIndex * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("callups")
    .select(
      `${CALLUP_SELECT}, courts!inner ( name ), players ( is_wait_list )`,
      { count: "exact" },
    )
    .eq("caller", user.id)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error, count } = await query;

  if (error) {
    return jsonProblem({
      status: 500,
      title: "Internal Server Error",
      detail: "Oops, algo salió mal",
    });
  }

  const items = (data ?? []).map((row) => {
    const courtRaw = row.courts as
      | { name: string }
      | { name: string }[]
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
      rosterCount,
      waitlistCount,
    });
  });

  return jsonData({
    items,
    pageIndex,
    pageSize,
    totalCount: count ?? 0,
  });
}
