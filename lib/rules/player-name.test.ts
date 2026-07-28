import { ErrorCode } from "@/lib/constants/error-codes";
import { resolveClaim } from "@/lib/rules/claim";
import {
  normalizePlayerName,
  playerNamesMatch,
} from "@/lib/rules/player-name";
import {
  promoteSuccessFields,
  resolvePromoteRace,
} from "@/lib/rules/promote";

describe("normalizePlayerName / playerNamesMatch", () => {
  it('matches " Pepe " with "pepe"', () => {
    expect(normalizePlayerName(" Pepe ")).toBe("pepe");
    expect(playerNamesMatch(" Pepe ", "pepe")).toBe(true);
  });

  it("collapses inner spaces", () => {
    expect(normalizePlayerName("Juan   Bueno")).toBe("juan bueno");
    expect(playerNamesMatch("Juan   Bueno", "juan bueno")).toBe(true);
  });

  it("does not fold accents (José ≠ Jose)", () => {
    expect(playerNamesMatch("José", "Jose")).toBe(false);
    expect(normalizePlayerName("José")).toBe("josé");
    expect(normalizePlayerName("Jose")).toBe("jose");
  });
});

describe("resolveClaim", () => {
  const players = [
    { id: "p1", name: "Pepe", userId: null },
    { id: "p2", name: "Ana", userId: "user-ana" },
  ];

  it("claims guest row with same normalized name and null userId", () => {
    expect(resolveClaim(" pepe ", players)).toEqual({
      kind: "claim",
      playerId: "p1",
    });
  });

  it("creates a new row when no guest matches", () => {
    expect(resolveClaim("Luis", players)).toEqual({ kind: "create" });
  });

  it("does not claim a registered row even if names match", () => {
    expect(resolveClaim("Ana", players)).toEqual({ kind: "create" });
  });
});

describe("resolvePromoteRace / promoteSuccessFields", () => {
  const early = {
    id: "early",
    createdAt: "2026-07-01T10:00:00-05:00",
  };
  const late = {
    id: "late",
    createdAt: "2026-07-01T11:00:00-05:00",
  };

  it("FIFO: earlier createdAt wins", () => {
    expect(resolvePromoteRace([late, early], "early")).toEqual({
      ok: true,
      winnerId: "early",
    });
  });

  it("loser gets SPOT_TAKEN_FIFO", () => {
    expect(resolvePromoteRace([late, early], "late")).toEqual({
      ok: false,
      code: ErrorCode.SPOT_TAKEN_FIFO,
      winnerId: "early",
    });
  });

  it("promote resets waitlist and payment flags", () => {
    expect(promoteSuccessFields()).toEqual({
      isWaitList: false,
      hasPayment: false,
    });
  });

  it("throws when candidates empty; ties break by id; accepts Date createdAt", () => {
    expect(() => resolvePromoteRace([], "x")).toThrow(/at least one candidate/);
    const a = { id: "a", createdAt: new Date("2026-07-01T10:00:00Z") };
    const b = { id: "b", createdAt: new Date("2026-07-01T10:00:00Z") };
    expect(resolvePromoteRace([b, a], "a")).toEqual({
      ok: true,
      winnerId: "a",
    });
  });
});
