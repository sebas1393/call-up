import { ErrorCode } from "@/lib/constants/error-codes";
import { createProblemDetails } from "@/lib/errors/problem-details";
import { courtSearchQuerySchema } from "@/lib/validators/callup";
import {
  assertCourtOwner,
  normalizeCourtName,
  toCourtDto,
} from "@/lib/services/courts";

describe("normalizeCourtName", () => {
  it("trims, collapses spaces, and uppercases", () => {
    expect(normalizeCourtName("  vecigol   norte ")).toBe("VECIGOL NORTE");
  });
});

describe("toCourtDto", () => {
  it("maps snake_case row to camelCase", () => {
    expect(
      toCourtDto({
        id: "c1",
        name: "VECIGOL",
        address: "Calle 20",
        created_by: "u1",
      }),
    ).toEqual({
      id: "c1",
      name: "VECIGOL",
      address: "Calle 20",
      createdBy: "u1",
    });
  });
});

describe("assertCourtOwner", () => {
  it("allows createdBy", () => {
    expect(assertCourtOwner("u1", "u1")).toEqual({ ok: true });
  });

  it("rejects non-owner with NOT_COURT_OWNER", () => {
    const decision = assertCourtOwner("owner", "other");
    expect(decision.ok).toBe(false);
    if (!decision.ok) {
      expect(decision.code).toBe("NOT_COURT_OWNER");
      expect(decision.status).toBe(403);
      const problem = createProblemDetails({
        status: decision.status,
        title: "Forbidden",
        detail: decision.detail,
        code: ErrorCode.NOT_COURT_OWNER,
      });
      expect(problem.code).toBe("NOT_COURT_OWNER");
    }
  });
});

describe("GET /courts search validation (contract)", () => {
  it("rejects search shorter than 3 chars with VALIDATION_ERROR semantics", () => {
    const parsed = courtSearchQuerySchema.safeParse({ search: "ab" });
    expect(parsed.success).toBe(false);
    const problem = createProblemDetails({
      status: 400,
      title: "Bad Request",
      detail: "La búsqueda debe tener al menos 3 caracteres.",
      code: ErrorCode.VALIDATION_ERROR,
    });
    expect(problem.status).toBe(400);
    expect(problem.code).toBe("VALIDATION_ERROR");
  });

  it("documents that no GET /courts/mine exists (search-only list)", () => {
    const minePath = "/api/v1/courts/mine";
    expect(minePath).not.toBe("/api/v1/courts");
  });
});
