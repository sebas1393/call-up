import {
  bogotaLocalInputToIso,
  isoToBogotaLocalInput,
} from "@/lib/format/match-at-input";

describe("match-at-input", () => {
  it("round-trips Bogotá local for known offset", () => {
    const iso = "2026-08-01T20:00:00-05:00";
    expect(isoToBogotaLocalInput(iso)).toBe("2026-08-01T20:00");
    expect(bogotaLocalInputToIso("2026-08-01T20:00")).toBe(iso);
  });

  it("rejects malformed local input", () => {
    expect(() => bogotaLocalInputToIso("2026-08-01")).toThrow();
  });
});
