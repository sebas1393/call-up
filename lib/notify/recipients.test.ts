import { ErrorCode } from "@/lib/constants/error-codes";
import {
  assertNotSelfFollow,
  CHANNEL_NOTIFY_EVENTS,
  resolveRecipientUserIds,
  shouldEmitChannelNotify,
} from "@/lib/notify/recipients";

describe("CHANNEL_NOTIFY_EVENTS", () => {
  it("does not include claim (claim path must never notify)", () => {
    expect(CHANNEL_NOTIFY_EVENTS).not.toContain("claim");
    expect([...CHANNEL_NOTIFY_EVENTS]).toEqual([
      "new_callup",
      "subscribe",
      "unsubscribe",
      "promote",
      "plaza_libre",
      "payment",
    ]);
  });
});

describe("resolveRecipientUserIds", () => {
  const owner = "owner-1";
  const followers = ["f1", "f2", owner];

  it("includes owner for subscribe", () => {
    expect(
      resolveRecipientUserIds({
        event: "subscribe",
        followerUserIds: ["f1", "f2"],
        callupOwnerId: owner,
      }).sort(),
    ).toEqual(["f1", "f2", owner].sort());
  });

  it("excludes creating caller for new_callup", () => {
    expect(
      resolveRecipientUserIds({
        event: "new_callup",
        followerUserIds: followers,
        callupOwnerId: owner,
      }).sort(),
    ).toEqual(["f1", "f2"].sort());
  });

  it("payment is caller only", () => {
    expect(
      resolveRecipientUserIds({
        event: "payment",
        followerUserIds: ["f1"],
        callupOwnerId: owner,
      }),
    ).toEqual([owner]);
  });

  it("promote and plaza_libre include followers + owner", () => {
    for (const event of ["promote", "plaza_libre"] as const) {
      expect(
        resolveRecipientUserIds({
          event,
          followerUserIds: ["f1"],
          callupOwnerId: owner,
        }).sort(),
      ).toEqual(["f1", owner].sort());
    }
  });
});

describe("shouldEmitChannelNotify", () => {
  it("allows churn while Open; blocks when Full/Closed/cancelled", () => {
    expect(
      shouldEmitChannelNotify({ event: "subscribe", statusAfter: "Open" }),
    ).toBe(true);
    expect(
      shouldEmitChannelNotify({ event: "subscribe", statusAfter: "Full" }),
    ).toBe(false);
    expect(
      shouldEmitChannelNotify({
        event: "subscribe",
        statusAfter: "Full",
        filledCapacity: true,
      }),
    ).toBe(true);
    expect(
      shouldEmitChannelNotify({ event: "promote", statusAfter: "cancelled" }),
    ).toBe(false);
  });

  it("allows payment on Closed but not cancelled", () => {
    expect(
      shouldEmitChannelNotify({ event: "payment", statusAfter: "Closed" }),
    ).toBe(true);
    expect(
      shouldEmitChannelNotify({ event: "payment", statusAfter: "cancelled" }),
    ).toBe(false);
  });
});

describe("assertNotSelfFollow", () => {
  it("rejects self-follow with FORBIDDEN", () => {
    const denied = assertNotSelfFollow("vitola", "vitola");
    expect(denied.ok).toBe(false);
    if (!denied.ok) {
      expect(denied.status).toBe(403);
      expect(denied.code).toBe(ErrorCode.FORBIDDEN);
    }
  });

  it("allows following another caller", () => {
    expect(assertNotSelfFollow("juan", "vitola")).toEqual({ ok: true });
  });
});
