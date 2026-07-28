import { ErrorCode } from "@/lib/constants/error-codes";
import { jsonData, jsonProblem, unauthorized } from "@/lib/api/http";
import { createSupabaseServerClient } from "@/lib/db/supabase-server";
import { decideSetUsername } from "@/lib/services/profile";
import { usernameBodySchema } from "@/lib/validators/profile";

/**
 * POST /api/v1/me/username — set caller slug once; creates Callup_Channel.
 */
export async function POST(request: Request) {
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

  const parsed = usernameBodySchema.safeParse(body);
  if (!parsed.success) {
    const detail =
      parsed.error.issues[0]?.message ?? "Usuario inválido.";
    return jsonProblem({
      status: 400,
      title: "Bad Request",
      detail,
      code: ErrorCode.VALIDATION_ERROR,
    });
  }

  const { data: me, error: meError } = await supabase
    .from("users")
    .select("id, user_name")
    .eq("id", user.id)
    .maybeSingle();

  if (meError || !me) {
    return jsonProblem({
      status: 404,
      title: "Not Found",
      detail: "Oops, no se pudo encontrar el usuario.",
      code: ErrorCode.NOT_FOUND,
    });
  }

  const { data: takenRow } = await supabase
    .from("users")
    .select("id")
    .eq("user_name", parsed.data.userName)
    .neq("id", user.id)
    .maybeSingle();

  const decision = decideSetUsername(
    me.user_name,
    parsed.data.userName,
    takenRow != null,
  );

  if (!decision.ok) {
    return jsonProblem({
      status: decision.status,
      title: "Conflict",
      detail: decision.detail,
      code: ErrorCode[decision.code],
    });
  }

  const { error: updateError } = await supabase
    .from("users")
    .update({ user_name: decision.userName })
    .eq("id", user.id);

  if (updateError) {
    if (updateError.code === "23505") {
      return jsonProblem({
        status: 409,
        title: "Conflict",
        detail: "Ese nombre de usuario ya está en uso.",
        code: ErrorCode.USERNAME_TAKEN,
      });
    }
    return jsonProblem({
      status: 500,
      title: "Internal Server Error",
      detail: "Oops, algo salió mal",
    });
  }

  const { error: channelError } = await supabase.from("callup_channels").insert({
    caller_user_id: user.id,
    user_name: decision.userName,
    link: decision.link,
  });

  if (channelError && channelError.code !== "23505") {
    return jsonProblem({
      status: 500,
      title: "Internal Server Error",
      detail: "Oops, algo salió mal",
    });
  }

  return jsonData(
    { userName: decision.userName, link: decision.link },
    { status: 201 },
  );
}
