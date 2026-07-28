import {
  COURT_SEARCH_MIN_LENGTH,
  DEFAULT_SPOTS_BY_COURT_TYPE,
} from "@/lib/constants/callup";
import {
  callupsMineQuerySchema,
  courtSearchQuerySchema,
  createCallupBodySchema,
  createCourtBodySchema,
  defaultSpotsForCourtType,
  paymentKeySchema,
  spotsQuantitySchema,
  updateCallupBodySchema,
} from "@/lib/validators/callup";
import {
  patchMeBodySchema,
  usernameBodySchema,
} from "@/lib/validators/profile";

describe("paymentKeySchema", () => {
  it("accepts nequi-like, numeric, and email keys", () => {
    expect(paymentKeySchema.parse("@nequi123")).toBe("@nequi123");
    expect(paymentKeySchema.parse("3102222222")).toBe("3102222222");
    expect(paymentKeySchema.parse("vitola@gmail.com")).toBe("vitola@gmail.com");
  });

  it("rejects empty, too long, and whitespace", () => {
    expect(() => paymentKeySchema.parse("")).toThrow();
    expect(() => paymentKeySchema.parse("a".repeat(51))).toThrow();
    expect(() => paymentKeySchema.parse("llave con espacios")).toThrow();
  });
});

describe("spotsQuantitySchema", () => {
  it("accepts 1–30", () => {
    expect(spotsQuantitySchema.parse(1)).toBe(1);
    expect(spotsQuantitySchema.parse(30)).toBe(30);
  });

  it("rejects out of range", () => {
    expect(() => spotsQuantitySchema.parse(0)).toThrow();
    expect(() => spotsQuantitySchema.parse(31)).toThrow();
  });
});

describe("defaultSpotsForCourtType", () => {
  it("defaults F5=10 and F6=12", () => {
    expect(defaultSpotsForCourtType("F5")).toBe(DEFAULT_SPOTS_BY_COURT_TYPE.F5);
    expect(defaultSpotsForCourtType("F6")).toBe(DEFAULT_SPOTS_BY_COURT_TYPE.F6);
  });
});

describe("courtSearchQuerySchema", () => {
  it(`requires min ${COURT_SEARCH_MIN_LENGTH} chars`, () => {
    expect(() => courtSearchQuerySchema.parse({ search: "ab" })).toThrow();
    expect(courtSearchQuerySchema.parse({ search: "abc" })).toEqual({
      search: "abc",
    });
  });
});

describe("createCourtBodySchema", () => {
  it("accepts valid court body", () => {
    expect(
      createCourtBodySchema.parse({
        name: "Vecigol",
        address: "Calle 20",
      }),
    ).toEqual({ name: "Vecigol", address: "Calle 20" });
  });
});

describe("createCallupBodySchema", () => {
  it("parses create body and defaults subscribeMyself to false", () => {
    const parsed = createCallupBodySchema.parse({
      courtId: "550e8400-e29b-41d4-a716-446655440000",
      courtType: "F5",
      spotsQuantity: 10,
      waitList: true,
      matchAt: "2026-08-01T20:00:00-05:00",
      paymentKey: "@nequi123",
    });
    expect(parsed.subscribeMyself).toBe(false);
  });
});

describe("updateCallupBodySchema", () => {
  it("strips waitList if present (immutable after create)", () => {
    const parsed = updateCallupBodySchema.safeParse({
      courtId: "550e8400-e29b-41d4-a716-446655440000",
      courtType: "F6",
      spotsQuantity: 12,
      matchAt: "2026-08-01T20:00:00-05:00",
      paymentKey: "@nequi123",
      waitList: false,
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data).not.toHaveProperty("waitList");
    }
  });
});

describe("callupsMineQuerySchema", () => {
  it("defaults pageIndex=0 and pageSize=10", () => {
    expect(callupsMineQuerySchema.parse({})).toEqual({
      pageIndex: 0,
      pageSize: 10,
    });
  });

  it("accepts optional status filter", () => {
    expect(
      callupsMineQuerySchema.parse({ pageIndex: "1", pageSize: "5", status: "Full" }),
    ).toEqual({ pageIndex: 1, pageSize: 5, status: "Full" });
  });
});

describe("profile schemas", () => {
  it("validates patch me and username bodies", () => {
    expect(
      patchMeBodySchema.parse({ name: "Juan", phone: "3102222222" }),
    ).toEqual({ name: "Juan", phone: "3102222222" });
    expect(usernameBodySchema.parse({ userName: "JuanBueno" })).toEqual({
      userName: "juanbueno",
    });
  });
});
