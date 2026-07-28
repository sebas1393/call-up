import { CallupStatusValue } from "@/lib/constants/status";
import {
  BUSINESS_TIMEZONE,
  isMatchInPast,
  revalidateCallupStatus,
  statusFromCapacity,
} from "@/lib/rules/callup-status";
import {
  canSubscribe,
  getSubscribeEligibility,
  hasNoSubscribeCapacity,
} from "@/lib/rules/subscribe-eligibility";

const baseCapacity = {
  spotsQuantity: 12,
  rosterCount: 7,
  waitList: true,
  waitListThreshold: 6,
  waitlistCount: 0,
};

describe("getSubscribeEligibility", () => {
  it("allows roster when spots remain", () => {
    expect(
      getSubscribeEligibility({
        ...baseCapacity,
        status: CallupStatusValue.Open,
      }),
    ).toEqual({ canJoinRoster: true, canJoinWaitlist: false });
    expect(
      canSubscribe({ ...baseCapacity, status: CallupStatusValue.Open }),
    ).toBe(true);
  });

  it("allows waitlist when roster full and under threshold", () => {
    const input = {
      spotsQuantity: 12,
      rosterCount: 12,
      waitList: true,
      waitListThreshold: 6,
      waitlistCount: 2,
      status: CallupStatusValue.Open as const,
    };
    expect(getSubscribeEligibility(input)).toEqual({
      canJoinRoster: false,
      canJoinWaitlist: true,
    });
  });

  it("blocks when Full, Closed, or cancelled", () => {
    const fullCap = {
      spotsQuantity: 12,
      rosterCount: 12,
      waitList: true,
      waitListThreshold: 6,
      waitlistCount: 6,
    };
    expect(
      canSubscribe({ ...fullCap, status: CallupStatusValue.Full }),
    ).toBe(false);
    expect(
      canSubscribe({ ...baseCapacity, status: CallupStatusValue.Closed }),
    ).toBe(false);
    expect(
      canSubscribe({ ...baseCapacity, status: CallupStatusValue.cancelled }),
    ).toBe(false);
  });
});

describe("hasNoSubscribeCapacity / statusFromCapacity", () => {
  it("Full when roster and waitlist exhausted", () => {
    const capacity = {
      spotsQuantity: 10,
      rosterCount: 10,
      waitList: true,
      waitListThreshold: 5,
      waitlistCount: 5,
    };
    expect(hasNoSubscribeCapacity(capacity)).toBe(true);
    expect(statusFromCapacity(capacity)).toBe(CallupStatusValue.Full);
  });

  it("Open when waitlist still has room", () => {
    const capacity = {
      spotsQuantity: 10,
      rosterCount: 10,
      waitList: true,
      waitListThreshold: 5,
      waitlistCount: 2,
    };
    expect(hasNoSubscribeCapacity(capacity)).toBe(false);
    expect(statusFromCapacity(capacity)).toBe(CallupStatusValue.Open);
  });

  it("Full when waitlist disabled and roster full", () => {
    const capacity = {
      spotsQuantity: 10,
      rosterCount: 10,
      waitList: false,
      waitListThreshold: 5,
      waitlistCount: 0,
    };
    expect(statusFromCapacity(capacity)).toBe(CallupStatusValue.Full);
  });
});

describe("isMatchInPast", () => {
  it("compares absolute instants", () => {
    expect(isMatchInPast("2026-07-01T20:00:00-05:00", "2026-07-28T12:00:00-05:00")).toBe(
      true,
    );
    expect(isMatchInPast("2026-08-01T20:00:00-05:00", "2026-07-28T12:00:00-05:00")).toBe(
      false,
    );
  });
});

describe("revalidateCallupStatus", () => {
  const future = "2026-08-01T20:00:00-05:00";
  const past = "2026-07-01T20:00:00-05:00";
  const now = "2026-07-28T12:00:00-05:00";
  const openCap = {
    spotsQuantity: 12,
    rosterCount: 7,
    waitList: true,
    waitListThreshold: 6,
    waitlistCount: 0,
  };
  const fullCap = {
    spotsQuantity: 12,
    rosterCount: 12,
    waitList: true,
    waitListThreshold: 6,
    waitlistCount: 6,
  };

  it("keeps cancelled sticky", () => {
    expect(
      revalidateCallupStatus({
        currentStatus: CallupStatusValue.cancelled,
        matchAt: past,
        now,
        capacity: fullCap,
      }),
    ).toEqual({ status: "cancelled", changed: false });
  });

  it("sets Closed when matchAt is past", () => {
    expect(
      revalidateCallupStatus({
        currentStatus: CallupStatusValue.Open,
        matchAt: past,
        now,
        capacity: openCap,
      }),
    ).toEqual({ status: "Closed", changed: true });
  });

  it("sets Full when no capacity and date is future", () => {
    expect(
      revalidateCallupStatus({
        currentStatus: CallupStatusValue.Open,
        matchAt: future,
        now,
        capacity: fullCap,
      }),
    ).toEqual({ status: "Full", changed: true });
  });

  it("reopens Full to Open when capacity returns", () => {
    expect(
      revalidateCallupStatus({
        currentStatus: CallupStatusValue.Full,
        matchAt: future,
        now,
        capacity: openCap,
      }),
    ).toEqual({ status: "Open", changed: true });
  });

  it("does not reopen Closed when date is past", () => {
    expect(
      revalidateCallupStatus({
        currentStatus: CallupStatusValue.Closed,
        matchAt: past,
        now,
        capacity: openCap,
      }),
    ).toEqual({ status: "Closed", changed: false });
  });

  it("exports business timezone America/Bogota", () => {
    expect(BUSINESS_TIMEZONE).toBe("America/Bogota");
  });
});
