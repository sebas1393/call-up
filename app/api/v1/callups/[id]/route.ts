import { ErrorCode } from "@/lib/constants/error-codes";
import { jsonData, jsonProblem, unauthorized } from "@/lib/api/http";
import { createSupabaseServerClient } from "@/lib/db/supabase-server";
import { revalidateCallupStatus } from "@/lib/rules/callup-status";
import {
  assertCallupEditable,
  assertCallupOwner,
  assertMatchAtNotPast,
  assertSpotsAboveRoster,
  countPlayers,
  toCallupDetailDto,
  type CallupRow,
  type PlayerRow,
} from "@/lib/services/callups";
import { ensureCallerCourtLink } from "@/lib/services/courts";
import { updateCallupBodySchema } from "@/lib/validators/callup";

type RouteContext = { params: Promise<{ id: string }> };

const CALLUP_SELECT =
  "id, caller, court_id, court_type, match_at, spots_quantity, wait_list, wait_list_threshold, payment_key, status, created_at" as const;

const PLAYER_SELECT =
  "id, callup_id, name, has_payment, is_wait_list, user_id, created_at" as const;

function mapCallupRow(row: {
  id: string;
  caller: string;
  court_id: string;
  court_type: CallupRow["court_type"];
  match_at: string;
  spots_quantity: number;
  wait_list: boolean;
  wait_list_threshold: number;
  payment_key: string;
  status: CallupRow["status"];
  created_at: string;
}): CallupRow {
  return {
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
}

function unwrapCourt(
  courtRaw:
    | { id: string; name: string; address: string }
    | { id: string; name: string; address: string }[]
    | null,
): { id: string; name: string; address: string } | null {
  if (!courtRaw) return null;
  return Array.isArray(courtRaw) ? (courtRaw[0] ?? null) : courtRaw;
}

/**
 * GET /api/v1/callups/{id} — detail + players (anon read). Public DTO omits email/phone.
 */
export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const supabase = await createSupabaseServerClient();

  const { data: row, error } = await supabase
    .from("callups")
    .select(
      `${CALLUP_SELECT}, courts ( id, name, address ), players ( ${PLAYER_SELECT} )`,
    )
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

  const court = unwrapCourt(
    row.courts as
      | { id: string; name: string; address: string }
      | { id: string; name: string; address: string }[]
      | null,
  ) ?? {
    id: row.court_id,
    name: "",
    address: "",
  };

  return jsonData(
    toCallupDetailDto({
      callup: mapCallupRow(row),
      court,
      players: (row.players ?? []) as PlayerRow[],
    }),
  );
}

/**
 * PUT /api/v1/callups/{id} — edit (owner); blocked when cancelled/Closed; spots ≥ roster.
 */
export async function PUT(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return unauthorized();
  }

  const { data: existing, error: loadError } = await supabase
    .from("callups")
    .select(
      `${CALLUP_SELECT}, courts!inner ( id, name, address ), players ( ${PLAYER_SELECT} )`,
    )
    .eq("id", id)
    .maybeSingle();

  if (loadError) {
    return jsonProblem({
      status: 500,
      title: "Internal Server Error",
      detail: "Oops, algo salió mal",
    });
  }

  if (!existing) {
    return jsonProblem({
      status: 404,
      title: "Not Found",
      detail: "No se encontró la convocatoria.",
      code: ErrorCode.NOT_FOUND,
    });
  }

  const owner = assertCallupOwner(existing.caller, user.id);
  if (!owner.ok) {
    return jsonProblem({
      status: owner.status,
      title: "Forbidden",
      detail: owner.detail,
      code: owner.code,
    });
  }

  const editable = assertCallupEditable(existing.status);
  if (!editable.ok) {
    return jsonProblem({
      status: editable.status,
      title: "Conflict",
      detail: editable.detail,
      code: editable.code,
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

  const parsed = updateCallupBodySchema.safeParse(body);
  if (!parsed.success) {
    return jsonProblem({
      status: 400,
      title: "Bad Request",
      detail: parsed.error.issues[0]?.message ?? "Datos de convocatoria inválidos.",
      code: ErrorCode.VALIDATION_ERROR,
    });
  }

  const matchCheck = assertMatchAtNotPast(parsed.data.matchAt);
  if (!matchCheck.ok) {
    return jsonProblem({
      status: matchCheck.status,
      title: "Bad Request",
      detail: matchCheck.detail,
      code: matchCheck.code,
    });
  }

  const players = (existing.players ?? []) as PlayerRow[];
  const { rosterCount, waitlistCount } = countPlayers(players);
  const spotsOk = assertSpotsAboveRoster(parsed.data.spotsQuantity, rosterCount);
  if (!spotsOk.ok) {
    return jsonProblem({
      status: spotsOk.status,
      title: "Conflict",
      detail: spotsOk.detail,
      code: spotsOk.code,
    });
  }

  const { data: courtExists, error: courtError } = await supabase
    .from("courts")
    .select("id")
    .eq("id", parsed.data.courtId)
    .maybeSingle();

  if (courtError) {
    return jsonProblem({
      status: 500,
      title: "Internal Server Error",
      detail: "Oops, algo salió mal",
    });
  }

  if (!courtExists) {
    return jsonProblem({
      status: 404,
      title: "Not Found",
      detail: "No se encontró la cancha.",
      code: ErrorCode.NOT_FOUND,
    });
  }

  const linked = await ensureCallerCourtLink(
    supabase,
    user.id,
    parsed.data.courtId,
  );
  if (!linked.ok) {
    return jsonProblem({
      status: 500,
      title: "Internal Server Error",
      detail: "Oops, algo salió mal",
    });
  }

  // wait_list / wait_list_threshold stay immutable (snapshot from create).
  const nextStatus = revalidateCallupStatus({
    currentStatus: existing.status,
    matchAt: parsed.data.matchAt,
    capacity: {
      spotsQuantity: parsed.data.spotsQuantity,
      rosterCount,
      waitList: existing.wait_list,
      waitListThreshold: existing.wait_list_threshold,
      waitlistCount,
    },
  }).status;

  const { data: updated, error: updateError } = await supabase
    .from("callups")
    .update({
      court_id: parsed.data.courtId,
      court_type: parsed.data.courtType,
      spots_quantity: parsed.data.spotsQuantity,
      match_at: parsed.data.matchAt,
      payment_key: parsed.data.paymentKey,
      status: nextStatus,
    })
    .eq("id", id)
    .select(
      `${CALLUP_SELECT}, courts!inner ( id, name, address ), players ( ${PLAYER_SELECT} )`,
    )
    .single();

  if (updateError || !updated) {
    return jsonProblem({
      status: 500,
      title: "Internal Server Error",
      detail: "Oops, algo salió mal",
    });
  }

  const court = unwrapCourt(
    updated.courts as
      | { id: string; name: string; address: string }
      | { id: string; name: string; address: string }[]
      | null,
  );
  if (!court) {
    return jsonProblem({
      status: 500,
      title: "Internal Server Error",
      detail: "Oops, algo salió mal",
    });
  }

  return jsonData(
    toCallupDetailDto({
      callup: mapCallupRow(updated),
      court,
      players: (updated.players ?? []) as PlayerRow[],
    }),
  );
}
