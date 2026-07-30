import { ErrorCode } from "@/lib/constants/error-codes";
import { createProblemDetails } from "@/lib/errors/problem-details";
import {
  assertCallupEditable,
  assertCallupOwner,
  assertMatchAtNotPast,
  assertSpotsAboveRoster,
  computeWaitListThreshold,
  countPlayers,
  initialCallupStatus,
  toCallupDetailDto,
  toCallupSummaryDto,
  toPlayerDto,
  type CallupRow,
  type PlayerRow,
} from "@/lib/services/callups";

const baseCallup: CallupRow = {
  id: "cu1",
  caller: "owner",
  court_id: "c1",
  court_type: "F6",
  match_at: "2026-08-01T20:00:00-05:00",
  spots_quantity: 12,
  wait_list: true,
  wait_list_threshold: 6,
  payment_key: "@llave123",
  status: "Open",
  created_at: "2026-07-28T10:00:00-05:00",
};

describe("computeWaitListThreshold", () => {
  it("uses floor(spots/2) at create", () => {
    expect(computeWaitListThreshold(12)).toBe(6);
    expect(computeWaitListThreshold(11)).toBe(5);
    expect(computeWaitListThreshold(1)).toBe(0);
  });
});

describe("countPlayers", () => {
  it("splits roster and waitlist", () => {
    expect(
      countPlayers([
        { is_wait_list: false },
        { is_wait_list: false },
        { is_wait_list: true },
      ]),
    ).toEqual({ rosterCount: 2, waitlistCount: 1 });
  });
});

describe("assertCallupEditable", () => {
  it("allows Open and Full", () => {
    expect(assertCallupEditable("Open")).toEqual({ ok: true });
    expect(assertCallupEditable("Full")).toEqual({ ok: true });
  });

  it("blocks cancelled and Closed with CALLUP_READ_ONLY", () => {
    const cancelled = assertCallupEditable("cancelled");
    expect(cancelled.ok).toBe(false);
    if (!cancelled.ok) {
      expect(cancelled.code).toBe(ErrorCode.CALLUP_READ_ONLY);
      expect(cancelled.status).toBe(409);
    }
    const closed = assertCallupEditable("Closed");
    expect(closed.ok).toBe(false);
    if (!closed.ok) {
      expect(closed.code).toBe(ErrorCode.CALLUP_READ_ONLY);
    }
  });
});

describe("assertSpotsAboveRoster", () => {
  it("rejects spots below roster with SPOTS_BELOW_ROSTER", () => {
    const decision = assertSpotsAboveRoster(5, 7);
    expect(decision.ok).toBe(false);
    if (!decision.ok) {
      expect(decision.code).toBe(ErrorCode.SPOTS_BELOW_ROSTER);
      const problem = createProblemDetails({
        status: decision.status,
        title: "Conflict",
        detail: decision.detail,
        code: ErrorCode.SPOTS_BELOW_ROSTER,
      });
      expect(problem.code).toBe("SPOTS_BELOW_ROSTER");
    }
  });

  it("allows spots equal to roster", () => {
    expect(assertSpotsAboveRoster(7, 7)).toEqual({ ok: true });
  });
});

describe("assertMatchAtNotPast", () => {
  it("rejects past matchAt", () => {
    const decision = assertMatchAtNotPast(
      "2026-07-01T20:00:00-05:00",
      "2026-07-28T12:00:00-05:00",
    );
    expect(decision.ok).toBe(false);
    if (!decision.ok) {
      expect(decision.code).toBe(ErrorCode.VALIDATION_ERROR);
    }
  });

  it("allows future matchAt", () => {
    expect(
      assertMatchAtNotPast(
        "2026-08-01T20:00:00-05:00",
        "2026-07-28T12:00:00-05:00",
      ),
    ).toEqual({ ok: true });
  });

  it("defaults now when omitted (future match stays ok)", () => {
    const farFuture = new Date(Date.now() + 86_400_000).toISOString();
    expect(assertMatchAtNotPast(farFuture)).toEqual({ ok: true });
  });
});

describe("initialCallupStatus", () => {
  it("Open when capacity remains after subscribeMyself", () => {
    expect(
      initialCallupStatus({
        spotsQuantity: 10,
        rosterCount: 1,
        waitList: true,
        waitListThreshold: 5,
        waitlistCount: 0,
      }),
    ).toBe("Open");
  });

  it("Full when subscribeMyself fills last spot and waitlist off", () => {
    expect(
      initialCallupStatus({
        spotsQuantity: 1,
        rosterCount: 1,
        waitList: false,
        waitListThreshold: 0,
        waitlistCount: 0,
      }),
    ).toBe("Full");
  });
});

describe("assertCallupOwner", () => {
  it("allows owner and forbids others", () => {
    expect(assertCallupOwner("u1", "u1")).toEqual({ ok: true });
    const denied = assertCallupOwner("u1", "u2");
    expect(denied.ok).toBe(false);
    if (!denied.ok) {
      expect(denied.code).toBe(ErrorCode.FORBIDDEN);
    }
  });
});

describe("public DTOs omit email/phone", () => {
  const players: PlayerRow[] = [
    {
      id: "p1",
      callup_id: "cu1",
      name: "Sebas",
      has_payment: true,
      is_wait_list: false,
      user_id: "u9",
      created_at: "2026-07-28T11:00:00-05:00",
    },
  ];

  it("toPlayerDto has no email/phone keys", () => {
    const dto = toPlayerDto(players[0]!);
    expect(dto).not.toHaveProperty("email");
    expect(dto).not.toHaveProperty("phone");
    expect(Object.keys(dto).sort()).toEqual(
      ["createdAt", "hasPayment", "id", "isWaitList", "name", "userId"].sort(),
    );
  });

  it("toCallupDetailDto court and players omit email/phone", () => {
    const detail = toCallupDetailDto({
      callup: baseCallup,
      court: { id: "c1", name: "VECIGOL", address: "Calle 20" },
      players,
    });
    expect(detail).not.toHaveProperty("email");
    expect(detail).not.toHaveProperty("phone");
    expect(detail.court).not.toHaveProperty("email");
    expect(detail.players[0]).not.toHaveProperty("email");
    expect(detail.waitListThreshold).toBe(6);
    expect(detail.rosterCount).toBe(1);
    expect(detail.callerId).toBe("owner");
  });

  it("toCallupSummaryDto includes eligibility and paymentKey", () => {
    const summary = toCallupSummaryDto({
      callup: baseCallup,
      courtName: "VECIGOL",
      rosterCount: 7,
      waitlistCount: 0,
    });
    expect(summary.courtName).toBe("VECIGOL");
    expect(summary.courtAddress).toBe("");
    expect(summary.paymentKey).toBe("@llave123");
    expect(summary.subscribeEligibility).toEqual({
      canJoinRoster: true,
      canJoinWaitlist: false,
    });
    expect(summary).not.toHaveProperty("email");
  });
});
