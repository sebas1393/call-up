import { ErrorCode } from "@/lib/constants/error-codes";
import { jsonData, jsonProblem, unauthorized } from "@/lib/api/http";
import { createSupabaseServerClient } from "@/lib/db/supabase-server";
import {
  normalizeCourtName,
  toCourtDto,
  type CourtRow,
} from "@/lib/services/courts";
import {
  courtSearchQuerySchema,
  createCourtBodySchema,
} from "@/lib/validators/callup";

/**
 * Ensures the session user is a caller (has userName). Returns user id or an error Response.
 */
async function requireCaller(): Promise<
  { userId: string; supabase: Awaited<ReturnType<typeof createSupabaseServerClient>> } | Response
> {
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
      detail: "Debes configurar tu usuario de caller para gestionar canchas.",
      code: ErrorCode.FORBIDDEN,
    });
  }

  return { userId: user.id, supabase };
}

/**
 * GET /api/v1/courts?search= — global search (min 3 chars). No list-mine.
 */
export async function GET(request: Request) {
  const caller = await requireCaller();
  if (caller instanceof Response) return caller;
  const { supabase } = caller;

  const url = new URL(request.url);
  const parsed = courtSearchQuerySchema.safeParse({
    search: url.searchParams.get("search") ?? "",
  });

  if (!parsed.success) {
    return jsonProblem({
      status: 400,
      title: "Bad Request",
      detail:
        parsed.error.issues[0]?.message ??
        "La búsqueda debe tener al menos 3 caracteres.",
      code: ErrorCode.VALIDATION_ERROR,
    });
  }

  const q = parsed.data.search.replace(/[,()"]/g, " ").trim();
  const pattern = `%${q}%`;
  const { data, error } = await supabase
    .from("courts")
    .select("id, name, address, created_by")
    .or(`name.ilike."${pattern}",address.ilike."${pattern}"`)
    .limit(50);

  if (error) {
    return jsonProblem({
      status: 500,
      title: "Internal Server Error",
      detail: "Oops, algo salió mal",
    });
  }

  const items = (data ?? []).map((row) => toCourtDto(row as CourtRow));
  return jsonData({ items });
}

/**
 * POST /api/v1/courts — create court (normalized UPPERCASE name) + link caller_courts.
 */
export async function POST(request: Request) {
  const caller = await requireCaller();
  if (caller instanceof Response) return caller;
  const { userId, supabase } = caller;

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

  const { data: court, error } = await supabase
    .from("courts")
    .insert({
      name,
      address,
      created_by: userId,
    })
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

  await supabase.from("caller_courts").upsert(
    { caller_user_id: userId, court_id: court.id },
    { onConflict: "caller_user_id,court_id" },
  );

  return jsonData(toCourtDto(court as CourtRow), { status: 201 });
}
