import type { ErrorCode } from "@/lib/constants/error-codes";
import {
  createProblemDetails,
  type CreateProblemDetailsInput,
} from "@/lib/errors/problem-details";

/**
 * JSON success response with `{ data }` envelope (spec §9).
 */
export function jsonData<T>(
  data: T,
  init?: { status?: number; headers?: HeadersInit },
): Response {
  return Response.json(
    { data },
    {
      status: init?.status ?? 200,
      headers: init?.headers,
    },
  );
}

/**
 * RFC 7807 Problem Details response (`application/problem+json`).
 */
export function jsonProblem(
  input: CreateProblemDetailsInput,
): Response {
  const body = createProblemDetails(input);
  return Response.json(body, {
    status: body.status,
    headers: {
      "Content-Type": "application/problem+json",
    },
  });
}

/**
 * Convenience 401 Problem Details (Spanish detail).
 */
export function unauthorized(
  detail = "Debes iniciar sesión.",
  code: ErrorCode = "UNAUTHORIZED" as ErrorCode,
): Response {
  return jsonProblem({
    status: 401,
    title: "Unauthorized",
    detail,
    code,
  });
}
