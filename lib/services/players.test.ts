import { ErrorCode } from "@/lib/constants/error-codes";
import {
  applyClaimNotifyContract,
  assertChurnMutationAllowed,
  assertPaymentAllowed,
  assertPaymentMutationAllowed,
  assertPromoteAllowed,
  decideAfterRosterInsert,
  decideGuestCreate,
  decidePromote,
  decideSubscribe,
  emitSubscribeIfNeeded,
  mapPlayerRowToDto,
} from "@/lib/services/players";

describe("decideSubscribe", () => {
  const eligibilityOpen = {
    spotsQuantity: 12,
    rosterCount: 7,
    waitList: true,
    waitListThreshold: 6,
    waitlistCount: 0,
    status: "Open" as const,
  };

  it("claims guest silently (notifyChannel false)", () => {
    const decision = decideSubscribe({
      subscriberName: "Pepe",
      existingPlayers: [{ id: "g1", name: "pepe", userId: null }],
      alreadySubscribed: false,
      acceptWaitlist: false,
      eligibility: eligibilityOpen,
    });
    expect(decision).toEqual({
      ok: true,
      kind: "claim",
      playerId: "g1",
      notifyChannel: false,
    });
  });

  it("requires acceptWaitlist when roster full and waitlist available", () => {
    const decision = decideSubscribe({
      subscriberName: "Ana",
      existingPlayers: [],
      alreadySubscribed: false,
      acceptWaitlist: false,
      eligibility: {
        spotsQuantity: 10,
        rosterCount: 10,
        waitList: true,
        waitListThreshold: 5,
        waitlistCount: 1,
        status: "Open",
      },
    });
    expect(decision.ok).toBe(false);
    if (!decision.ok) {
      expect(decision.code).toBe(ErrorCode.WAITLIST_CONFIRM_REQUIRED);
      expect(decision.status).toBe(409);
    }
  });

  it("creates waitlist row when acceptWaitlist true", () => {
    const decision = decideSubscribe({
      subscriberName: "Ana",
      existingPlayers: [],
      alreadySubscribed: false,
      acceptWaitlist: true,
      eligibility: {
        spotsQuantity: 10,
        rosterCount: 10,
        waitList: true,
        waitListThreshold: 5,
        waitlistCount: 1,
        status: "Open",
      },
    });
    expect(decision).toMatchObject({
      ok: true,
      kind: "create",
      isWaitList: true,
      notifyChannel: true,
      event: "subscribe",
    });
  });
});

describe("claim-no-notify contract", () => {
  it("does not call channel notify on claim", () => {
    const notify = jest.fn();
    const result = applyClaimNotifyContract(notify);
    expect(result.notifyChannel).toBe(false);
    expect(notify).not.toHaveBeenCalled();

    emitSubscribeIfNeeded(notify, false);
    expect(notify).not.toHaveBeenCalled();

    emitSubscribeIfNeeded(notify, true);
    expect(notify).toHaveBeenCalledWith("subscribe");
  });
});

describe("decidePromote FIFO", () => {
  it("self-promote on last spot loses when another waitlisted has earlier createdAt", () => {
    const decision = decidePromote({
      mode: "self",
      playerId: "late",
      rosterCount: 11,
      spotsQuantity: 12,
      fifoCandidates: [
        { id: "early", createdAt: "2026-07-01T10:00:00Z" },
        { id: "late", createdAt: "2026-07-02T10:00:00Z" },
      ],
    });
    expect(decision.ok).toBe(false);
    if (!decision.ok) {
      expect(decision.code).toBe(ErrorCode.SPOT_TAKEN_FIFO);
    }
  });

  it("self-promote on last spot wins when earliest FIFO", () => {
    const decision = decidePromote({
      mode: "self",
      playerId: "early",
      rosterCount: 11,
      spotsQuantity: 12,
      fifoCandidates: [
        { id: "early", createdAt: "2026-07-01T10:00:00Z" },
        { id: "late", createdAt: "2026-07-02T10:00:00Z" },
      ],
    });
    expect(decision).toEqual({
      ok: true,
      fields: { isWaitList: false, hasPayment: false },
      notifyChannel: true,
      event: "promote",
    });
  });

  it("owner promote does not apply self FIFO gate when free spots remain", () => {
    const decision = decidePromote({
      mode: "owner",
      playerId: "late",
      rosterCount: 11,
      spotsQuantity: 12,
      fifoCandidates: [
        { id: "early", createdAt: "2026-07-01T10:00:00Z" },
        { id: "late", createdAt: "2026-07-02T10:00:00Z" },
      ],
    });
    expect(decision.ok).toBe(true);
    if (decision.ok) {
      expect(decision.fields).toEqual({
        isWaitList: false,
        hasPayment: false,
      });
    }
  });
});

describe("decideAfterRosterInsert", () => {
  it("SPOT_TAKEN_FIFO when roster exceeded after race", () => {
    const decision = decideAfterRosterInsert(13, 12);
    expect(decision.ok).toBe(false);
    if (!decision.ok) {
      expect(decision.code).toBe(ErrorCode.SPOT_TAKEN_FIFO);
    }
  });
});

describe("assertPaymentAllowed", () => {
  it("guest payment only by owner", () => {
    expect(
      assertPaymentAllowed({
        actorUserId: "owner",
        callupCallerId: "owner",
        playerUserId: null,
      }).ok,
    ).toBe(true);
    const denied = assertPaymentAllowed({
      actorUserId: "other",
      callupCallerId: "owner",
      playerUserId: null,
    });
    expect(denied.ok).toBe(false);
    if (!denied.ok) {
      expect(denied.code).toBe(ErrorCode.FORBIDDEN);
    }
  });

  it("registered row: self or owner", () => {
    expect(
      assertPaymentAllowed({
        actorUserId: "u1",
        callupCallerId: "owner",
        playerUserId: "u1",
      }).ok,
    ).toBe(true);
    expect(
      assertPaymentAllowed({
        actorUserId: "owner",
        callupCallerId: "owner",
        playerUserId: "u1",
      }).ok,
    ).toBe(true);
    expect(
      assertPaymentAllowed({
        actorUserId: "u2",
        callupCallerId: "owner",
        playerUserId: "u1",
      }).ok,
    ).toBe(false);
  });
});

describe("assertPromoteAllowed", () => {
  it("allows owner or self on waitlist", () => {
    expect(
      assertPromoteAllowed({
        actorUserId: "owner",
        callupCallerId: "owner",
        playerUserId: "u1",
        isWaitList: true,
      }),
    ).toEqual({ ok: true, mode: "owner" });
    expect(
      assertPromoteAllowed({
        actorUserId: "u1",
        callupCallerId: "owner",
        playerUserId: "u1",
        isWaitList: true,
      }),
    ).toEqual({ ok: true, mode: "self" });
  });
});

describe("decideGuestCreate", () => {
  it("forces hasPayment false when actor is not owner", () => {
    const decision = decideGuestCreate({
      guestName: "  Pepe  ",
      acceptWaitlist: false,
      requestedHasPayment: true,
      actorIsOwner: false,
      existingGuestNames: [],
      eligibility: {
        spotsQuantity: 12,
        rosterCount: 1,
        waitList: true,
        waitListThreshold: 6,
        waitlistCount: 0,
        status: "Open",
      },
    });
    expect(decision.ok).toBe(true);
    if (decision.ok) {
      expect(decision.hasPayment).toBe(false);
      expect(decision.displayName).toBe("Pepe");
    }
  });

  it("rejects empty name, duplicate guest, waitlist confirm, and full", () => {
    expect(
      decideGuestCreate({
        guestName: "   ",
        acceptWaitlist: false,
        requestedHasPayment: false,
        actorIsOwner: true,
        existingGuestNames: [],
        eligibility: {
          spotsQuantity: 10,
          rosterCount: 0,
          waitList: true,
          waitListThreshold: 5,
          waitlistCount: 0,
          status: "Open",
        },
      }).ok,
    ).toBe(false);

    expect(
      decideGuestCreate({
        guestName: "Pepe",
        acceptWaitlist: false,
        requestedHasPayment: true,
        actorIsOwner: true,
        existingGuestNames: ["pepe"],
        eligibility: {
          spotsQuantity: 10,
          rosterCount: 0,
          waitList: true,
          waitListThreshold: 5,
          waitlistCount: 0,
          status: "Open",
        },
      }).ok,
    ).toBe(false);

    const needConfirm = decideGuestCreate({
      guestName: "Nuevo",
      acceptWaitlist: false,
      requestedHasPayment: false,
      actorIsOwner: true,
      existingGuestNames: [],
      eligibility: {
        spotsQuantity: 10,
        rosterCount: 10,
        waitList: true,
        waitListThreshold: 5,
        waitlistCount: 0,
        status: "Open",
      },
    });
    expect(needConfirm.ok).toBe(false);
    if (!needConfirm.ok) {
      expect(needConfirm.code).toBe(ErrorCode.WAITLIST_CONFIRM_REQUIRED);
    }

    const full = decideGuestCreate({
      guestName: "Nuevo",
      acceptWaitlist: true,
      requestedHasPayment: false,
      actorIsOwner: true,
      existingGuestNames: [],
      eligibility: {
        spotsQuantity: 10,
        rosterCount: 10,
        waitList: false,
        waitListThreshold: 5,
        waitlistCount: 0,
        status: "Full",
      },
    });
    expect(full.ok).toBe(false);
    if (!full.ok) {
      expect(full.code).toBe(ErrorCode.CALLUP_FULL);
    }

    const waitlisted = decideGuestCreate({
      guestName: "Nuevo",
      acceptWaitlist: true,
      requestedHasPayment: true,
      actorIsOwner: true,
      existingGuestNames: [],
      eligibility: {
        spotsQuantity: 10,
        rosterCount: 10,
        waitList: true,
        waitListThreshold: 5,
        waitlistCount: 0,
        status: "Open",
      },
    });
    expect(waitlisted).toMatchObject({
      ok: true,
      isWaitList: true,
      hasPayment: true,
    });
  });
});

describe("churn / payment status guards", () => {
  it("blocks churn on cancelled and Closed with distinct details", () => {
    const cancelled = assertChurnMutationAllowed("cancelled");
    expect(cancelled.ok).toBe(false);
    if (!cancelled.ok) {
      expect(cancelled.detail).toMatch(/cancelada/);
    }
    const closed = assertChurnMutationAllowed("Closed");
    expect(closed.ok).toBe(false);
    if (!closed.ok) {
      expect(closed.detail).toMatch(/cerrada/);
    }
    expect(assertChurnMutationAllowed("Open")).toEqual({ ok: true });
  });

  it("blocks payment only when cancelled", () => {
    expect(assertPaymentMutationAllowed("Closed")).toEqual({ ok: true });
    expect(assertPaymentMutationAllowed("Open")).toEqual({ ok: true });
    const denied = assertPaymentMutationAllowed("cancelled");
    expect(denied.ok).toBe(false);
  });
});

describe("decideSubscribe remaining branches", () => {
  it("rejects already subscribed, creates roster, and CALLUP_FULL", () => {
    expect(
      decideSubscribe({
        subscriberName: "Ana",
        existingPlayers: [],
        alreadySubscribed: true,
        acceptWaitlist: false,
        eligibility: {
          spotsQuantity: 12,
          rosterCount: 1,
          waitList: true,
          waitListThreshold: 6,
          waitlistCount: 0,
          status: "Open",
        },
      }).ok,
    ).toBe(false);

    expect(
      decideSubscribe({
        subscriberName: "Ana",
        existingPlayers: [],
        alreadySubscribed: false,
        acceptWaitlist: false,
        eligibility: {
          spotsQuantity: 12,
          rosterCount: 1,
          waitList: true,
          waitListThreshold: 6,
          waitlistCount: 0,
          status: "Open",
        },
      }),
    ).toMatchObject({ kind: "create", isWaitList: false });

    const full = decideSubscribe({
      subscriberName: "Ana",
      existingPlayers: [],
      alreadySubscribed: false,
      acceptWaitlist: true,
      eligibility: {
        spotsQuantity: 10,
        rosterCount: 10,
        waitList: true,
        waitListThreshold: 5,
        waitlistCount: 5,
        status: "Full",
      },
    });
    expect(full.ok).toBe(false);
    if (!full.ok) {
      expect(full.code).toBe(ErrorCode.CALLUP_FULL);
    }
  });
});

describe("assertPromoteAllowed remaining branches", () => {
  it("rejects non-waitlist and unrelated actors", () => {
    expect(
      assertPromoteAllowed({
        actorUserId: "u1",
        callupCallerId: "owner",
        playerUserId: "u1",
        isWaitList: false,
      }).ok,
    ).toBe(false);
    expect(
      assertPromoteAllowed({
        actorUserId: "u2",
        callupCallerId: "owner",
        playerUserId: "u1",
        isWaitList: true,
      }).ok,
    ).toBe(false);
  });
});

describe("decidePromote no free spots + mapPlayerRowToDto", () => {
  it("returns CALLUP_FULL when roster is full", () => {
    const decision = decidePromote({
      mode: "owner",
      playerId: "p1",
      rosterCount: 12,
      spotsQuantity: 12,
      fifoCandidates: [],
    });
    expect(decision.ok).toBe(false);
    if (!decision.ok) {
      expect(decision.code).toBe(ErrorCode.CALLUP_FULL);
    }
  });

  it("maps player row via mapPlayerRowToDto", () => {
    expect(
      mapPlayerRowToDto({
        id: "p1",
        callup_id: "c1",
        name: "Ana",
        has_payment: false,
        is_wait_list: true,
        user_id: null,
        created_at: "2026-07-01T00:00:00Z",
      }),
    ).toMatchObject({ id: "p1", name: "Ana", isWaitList: true });
  });

  it("allows decideAfterRosterInsert when within capacity", () => {
    expect(decideAfterRosterInsert(12, 12)).toEqual({ ok: true });
  });
});
