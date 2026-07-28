import { ErrorCode } from "@/lib/constants/error-codes";
import { jsonData, jsonProblem, unauthorized } from "@/lib/api/http";
import { createSupabaseServerClient } from "@/lib/db/supabase-server";
import {
  assertCourtOwner,
  normalizeCourtName,
  toCourtDto,
  type CourtRow,
} from "@/lib/services/courts";
import { createCourtBodySchema } from "@/lib/validators/callup";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * PUT /api/v1/courts/{id} — edit name/address; only createdBy.
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
    .from("courts")
    .select("id, name, address, created_by")
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
      detail: "No se encontró la cancha.",
      code: ErrorCode.NOT_FOUND,
    });
  }

  const owner = assertCourtOwner(existing.created_by, user.id);
  if (!owner.ok) {
    return jsonProblem({
      status: owner.status,
      title: "Forbidden",
      detail: owner.detail,
      code: ErrorCode.NOT_COURT_OWNER,
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

  const parsed = createCourtBodySchema.safeParse(body);
  if (!parsed.success) {
    return jsonProblem({
      status: 400,
      title: "Bad Request",
      detail: parsed.error.issues[0]?.message ?? "Datos de cancha inválidos.",
      code: ErrorCode.VALIDATION_ERROR,
    });
  }

  const name = normalizeCourtName(parsed.data.name);
  const address = parsed.data.address.trim().replace(/\s+/g, " ");

  const { data: updated, error } = await supabase
    .from("courts")
    .update({ name, address })
    .eq("id", id)
    .select("id, name, address, created_by")
    .single();

  if (error) {
    if (error.code === "23505") {
      return jsonProblem({
        status: 409,
        title: "Conflict",
        detail: "Ya existe una cancha con ese nombre.",
        code: ErrorCode.VALIDATION_ERROR,
      });
    }
    return jsonProblem({
      status: 500,
      title: "Internal Server Error",
      detail: "Oops, algo salió mal",
    });
  }

  return jsonData(toCourtDto(updated as CourtRow));
}
