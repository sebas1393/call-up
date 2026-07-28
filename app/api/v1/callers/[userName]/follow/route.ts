import { ErrorCode } from "@/lib/constants/error-codes";
import { jsonData, jsonProblem, unauthorized } from "@/lib/api/http";
import { createSupabaseServerClient } from "@/lib/db/supabase-server";
import { assertNotSelfFollow } from "@/lib/notify/recipients";

type RouteContext = { params: Promise<{ userName: string }> };

async function requireAuth() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return { error: unauthorized() as Response };
  }
  return { supabase, userId: user.id };
}

async function loadChannel(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  userName: string,
) {
  const slug = userName.toLowerCase();
  const { data, error } = await supabase
    .from("callup_channels")
    .select("id, caller_user_id, user_name")
    .eq("user_name", slug)
    .maybeSingle();

  if (error) {
    return {
      error: jsonProblem({
        status: 500,
        title: "Internal Server Error",
        detail: "Oops, algo salió mal",
      }),
    };
  }

  if (!data) {
    return {
      error: jsonProblem({
        status: 404,
        title: "Not Found",
        detail: "No se encontró el usuario del caller.",
        code: ErrorCode.NOT_FOUND,
      }),
    };
  }

  return { channel: data };
}

/**
 * GET /api/v1/callers/{userName}/follow — whether current user follows this channel.
 */
export async function GET(_request: Request, context: RouteContext) {
  const { userName } = await context.params;
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const loaded = await loadChannel(auth.supabase, userName);
  if ("error" in loaded) return loaded.error;

  const { data } = await auth.supabase
    .from("player_subscriptions")
    .select("player_user_id")
    .eq("player_user_id", auth.userId)
    .eq("caller_user_id", loaded.channel.caller_user_id)
    .maybeSingle();

  return jsonData({ following: Boolean(data) });
}

/**
 * POST /api/v1/callers/{userName}/follow — Seguir (no self-follow).
 */
export async function POST(_request: Request, context: RouteContext) {
  const { userName } = await context.params;
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const loaded = await loadChannel(auth.supabase, userName);
  if ("error" in loaded) return loaded.error;

  const { data: me } = await auth.supabase
    .from("users")
    .select("user_name")
    .eq("id", auth.userId)
    .maybeSingle();

  const self = assertNotSelfFollow(me?.user_name ?? null, loaded.channel.user_name);
  if (!self.ok) {
    return jsonProblem({
      status: self.status,
      title: "Forbidden",
      detail: self.detail,
      code: ErrorCode.FORBIDDEN,
    });
  }

  // Also reject when session uid is the channel owner (covers missing user_name edge).
  if (auth.userId === loaded.channel.caller_user_id) {
    return jsonProblem({
      status: 403,
      title: "Forbidden",
      detail: "No puedes seguir tu propio canal.",
      code: ErrorCode.FORBIDDEN,
    });
  }

  const { data: existing } = await auth.supabase
    .from("player_subscriptions")
    .select("player_user_id")
    .eq("player_user_id", auth.userId)
    .eq("caller_user_id", loaded.channel.caller_user_id)
    .maybeSingle();

  if (existing) {
    return jsonData({ following: true }, { status: 200 });
  }

  const { error } = await auth.supabase.from("player_subscriptions").insert({
    player_user_id: auth.userId,
    caller_user_id: loaded.channel.caller_user_id,
    channel_id: loaded.channel.id,
  });

  if (error) {
    if (error.code === "23505") {
      return jsonData({ following: true }, { status: 200 });
    }
    if (error.code === "23514") {
      return jsonProblem({
        status: 403,
        title: "Forbidden",
        detail: "No puedes seguir tu propio canal.",
        code: ErrorCode.FORBIDDEN,
      });
    }
    return jsonProblem({
      status: 500,
      title: "Internal Server Error",
      detail: "Oops, algo salió mal",
    });
  }

  return jsonData({ following: true }, { status: 201 });
}

/**
 * DELETE /api/v1/callers/{userName}/follow — No Seguir.
 */
export async function DELETE(_request: Request, context: RouteContext) {
  const { userName } = await context.params;
  const auth = await requireAuth();
  if ("error" in auth) return auth.error;

  const loaded = await loadChannel(auth.supabase, userName);
  if ("error" in loaded) return loaded.error;

  await auth.supabase
    .from("player_subscriptions")
    .delete()
    .eq("player_user_id", auth.userId)
    .eq("caller_user_id", loaded.channel.caller_user_id);

  return new Response(null, { status: 204 });
}
