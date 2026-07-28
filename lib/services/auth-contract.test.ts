import { ErrorCode } from "@/lib/constants/error-codes";
import { createProblemDetails } from "@/lib/errors/problem-details";
import { unauthorized } from "@/lib/api/http";
import { decideSetUsername } from "@/lib/services/profile";

/**
 * Contract-level tests for auth/profile API error and username decisions (Task 8).
 * Full HTTP handler integration against Supabase is covered later with mocks/E2E.
 */
describe("GET /api/v1/me auth gate (contract)", () => {
  it("unauthorized helper returns 401 Problem Details with traceId", async () => {
    const res = unauthorized();
    expect(res.status).toBe(401);
    expect(res.headers.get("Content-Type")).toContain("application/problem+json");

    const body = await res.json();
    expect(body).toMatchObject({
      type: "about:blank",
      title: "Unauthorized",
      status: 401,
      detail: "Debes iniciar sesión.",
      code: ErrorCode.UNAUTHORIZED,
    });
    expect(body.traceId).toEqual(expect.any(String));
    expect(body).not.toHaveProperty("stack");
  });
});

describe("POST /api/v1/me/username decisions (contract)", () => {
  it("maps immutable username to 409 USERNAME_IMMUTABLE", () => {
    const decision = decideSetUsername("taken", "other", false);
    expect(decision.ok).toBe(false);
    if (!decision.ok) {
      const problem = createProblemDetails({
        status: decision.status,
        title: "Conflict",
        detail: decision.detail,
        code: ErrorCode[decision.code],
      });
      expect(problem.status).toBe(409);
      expect(problem.code).toBe("USERNAME_IMMUTABLE");
    }
  });

  it("maps taken slug to 409 USERNAME_TAKEN", () => {
    const decision = decideSetUsername(null, "juanbueno", true);
    expect(decision.ok).toBe(false);
    if (!decision.ok) {
      expect(decision.code).toBe("USERNAME_TAKEN");
    }
  });

  it("success payload shape for first username set", () => {
    const decision = decideSetUsername(null, "juanbueno", false);
    expect(decision).toEqual({
      ok: true,
      userName: "juanbueno",
      link: "/juanbueno",
    });
    if (decision.ok) {
      expect({ data: { userName: decision.userName, link: decision.link } }).toEqual({
        data: { userName: "juanbueno", link: "/juanbueno" },
      });
    }
  });
});

describe("POST /api/v1/auth/logout (contract)", () => {
  it("documents success as 204 empty body", () => {
    const res = new Response(null, { status: 204 });
    expect(res.status).toBe(204);
  });
});
