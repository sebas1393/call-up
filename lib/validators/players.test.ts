import {
  createGuestBodySchema,
  patchPaymentBodySchema,
  patchPlayerNameBodySchema,
  subscribeBodySchema,
} from "@/lib/validators/players";
import {
  deletePushSubscriptionBodySchema,
  pushSubscriptionBodySchema,
} from "@/lib/validators/push";

describe("subscribeBodySchema", () => {
  it("defaults acceptWaitlist to false", () => {
    expect(subscribeBodySchema.parse({})).toEqual({ acceptWaitlist: false });
    expect(subscribeBodySchema.parse({ acceptWaitlist: true })).toEqual({
      acceptWaitlist: true,
    });
  });
});

describe("createGuestBodySchema", () => {
  it("parses guest create body with defaults", () => {
    expect(
      createGuestBodySchema.parse({ guestName: "Pepe" }),
    ).toEqual({
      guestName: "Pepe",
      acceptWaitlist: false,
      hasPayment: false,
    });
  });
});

describe("patchPlayerNameBodySchema / patchPaymentBodySchema", () => {
  it("requires name and hasPayment", () => {
    expect(patchPlayerNameBodySchema.parse({ name: " Ana " })).toEqual({
      name: "Ana",
    });
    expect(patchPaymentBodySchema.parse({ hasPayment: true })).toEqual({
      hasPayment: true,
    });
  });
});

describe("pushSubscriptionBodySchema", () => {
  it("accepts browser PushSubscription shape", () => {
    expect(
      pushSubscriptionBodySchema.parse({
        endpoint: "https://push.example/abc",
        keys: { p256dh: "pk", auth: "ak" },
      }),
    ).toMatchObject({
      endpoint: "https://push.example/abc",
      keys: { p256dh: "pk", auth: "ak" },
    });
  });

  it("parses delete body by endpoint", () => {
    expect(
      deletePushSubscriptionBodySchema.parse({
        endpoint: "https://push.example/abc",
      }),
    ).toEqual({ endpoint: "https://push.example/abc" });
  });
});
