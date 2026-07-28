import { NextRequest } from "next/server";

import { createSupabaseServerClient } from "@/lib/db/supabase-server";
import {
  resolvePostAuthRedirect,
  toProfileDto,
  type UserRow,
} from "@/lib/services/profile";

/**
 * GET /api/v1/auth/callback — OAuth code exchange, upsert users row, redirect.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const intentParam = searchParams.get("intent");
  const intent =
    intentParam === "caller" || intentParam === "player" ? intentParam : null;
  const redirectTo = searchParams.get("redirectTo");

  if (!code) {
    return Response.redirect(new URL("/?error=auth", origin), 302);
  }

  const supabase = await createSupabaseServerClient();
  const { data: sessionData, error: exchangeError } =
    await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError || !sessionData.user) {
    return Response.redirect(new URL("/?error=auth", origin), 302);
  }

  const authUser = sessionData.user;
  const meta = authUser.user_metadata ?? {};
  const email = authUser.email ?? "";
  const name =
    (typeof meta.full_name === "string" && meta.full_name) ||
    (typeof meta.name === "string" && meta.name) ||
    email.split("@")[0] ||
    "Usuario";
  const avatarUrl =
    (typeof meta.avatar_url === "string" && meta.avatar_url) ||
    (typeof meta.picture === "string" && meta.picture) ||
    null;
  const phoneFromMeta =
    typeof meta.phone === "string" && /^[0-9]{10}$/.test(meta.phone)
      ? meta.phone
      : null;

  const { data: existing } = await supabase
    .from("users")
    .select("id, email, name, phone, user_name, avatar_url")
    .eq("id", authUser.id)
    .maybeSingle();

  if (!existing) {
    await supabase.from("users").insert({
      id: authUser.id,
      email,
      name,
      phone: phoneFromMeta,
      avatar_url: avatarUrl,
      user_name: null,
    });
  } else {
    await supabase
      .from("users")
      .update({
        email,
        name: existing.name || name,
        avatar_url: avatarUrl ?? existing.avatar_url,
        phone: existing.phone ?? phoneFromMeta,
      })
      .eq("id", authUser.id);
  }

  const { data: row } = await supabase
    .from("users")
    .select("id, email, name, phone, user_name, avatar_url")
    .eq("id", authUser.id)
    .single();

  const profile = toProfileDto((row ?? {
    id: authUser.id,
    email,
    name,
    phone: phoneFromMeta,
    user_name: null,
    avatar_url: avatarUrl,
  }) as UserRow);

  const path = resolvePostAuthRedirect({
    intent,
    profileComplete: profile.profileComplete,
    hasUserName: profile.userName != null,
    redirectTo,
  });

  return Response.redirect(new URL(path, origin), 302);
}
