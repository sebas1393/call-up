import { ErrorCode } from "@/lib/constants/error-codes";
import { createProblemDetails } from "@/lib/errors/problem-details";

describe("createProblemDetails", () => {
  it("returns the RFC 7807 shape with Spanish detail and optional code", () => {
    const problem = createProblemDetails({
      status: 409,
      title: "Conflict",
      detail: "La convocatoria está llena.",
      code: ErrorCode.CALLUP_FULL,
      traceId: "fixed-trace-id",
    });

    expect(problem).toEqual({
      type: "about:blank",
      title: "Conflict",
      status: 409,
      detail: "La convocatoria está llena.",
      traceId: "fixed-trace-id",
      code: "CALLUP_FULL",
    });
  });

  it("generates a traceId when none is provided", () => {
    const problem = createProblemDetails({
      status: 404,
      title: "Not Found",
      detail: "Oops, no se pudo encontrar el usuario.",
    });

    expect(problem.traceId).toEqual(expect.any(String));
    expect(problem.traceId.length).toBeGreaterThan(0);
    expect(problem.code).toBeUndefined();
  });

  it("does not include stack traces or unexpected fields", () => {
    const problem = createProblemDetails({
      status: 500,
      title: "Internal Server Error",
      detail: "Oops, algo salió mal",
      code: ErrorCode.VALIDATION_ERROR,
    });

    expect(problem).not.toHaveProperty("stack");
    expect(problem).not.toHaveProperty("stackTrace");
    expect(problem).not.toHaveProperty("cause");
    expect(Object.keys(problem).sort()).toEqual(
      ["code", "detail", "status", "title", "traceId", "type"].sort(),
    );
  });
});
