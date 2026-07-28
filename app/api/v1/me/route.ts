import { ErrorCode } from "@/lib/constants/error-codes";
import { jsonData, jsonProblem, unauthorized } from "@/lib/api/http";
import { createSupabaseServerClient } from "@/lib/db/supabase-server";
import { toProfileDto, type UserRow } from "@/lib/services/profile";
import { patchMeBodySchema } from "@/lib/validators/profile";

const USER_SELECT = "id, email, name, phone, user_name, avatar_url" as const;

/**
 * GET /api/v1/me — current user profile only (self).
 */
export async function GET() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return unauthorized();
  }

  const { data: row, error } = await supabase
    .from("users")
    .select(USER_SELECT)
    .eq("id", user.id)
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
      detail: "Oops, no se pudo encontrar el usuario.",
      code: ErrorCode.NOT_FOUND,
    });
  }

  return jsonData(toProfileDto(row as UserRow));
}

/**
 * PATCH /api/v1/me — update name/phone (not username).
 */
export async function PATCH(request: Request) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return unauthorized();
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

  const parsed = patchMeBodySchema.safeParse(body);
  if (!parsed.success) {
    const detail =
      parsed.error.issues[0]?.message ?? "Datos de perfil inválidos.";
    return jsonProblem({
      status: 400,
      title: "Bad Request",
      detail,
      code: ErrorCode.VALIDATION_ERROR,
    });
  }

  const { data: row, error } = await supabase
    .from("users")
    .update({
      name: parsed.data.name,
      phone: parsed.data.phone,
    })
    .eq("id", user.id)
    .select(USER_SELECT)
    .single();

  if (error || !row) {
    return jsonProblem({
      status: 500,
      title: "Internal Server Error",
      detail: "Oops, algo salió mal",
    });
  }

  return jsonData(toProfileDto(row as UserRow));
}
