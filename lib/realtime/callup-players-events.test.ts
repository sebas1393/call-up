import {
  callupIdFromPlayersChange,
  isPlayersChangeForCallups,
} from "@/lib/realtime/callup-players-events";

describe("callup-players-events", () => {
  it("reads callup_id from insert/update new row", () => {
    expect(
      callupIdFromPlayersChange({
        new: { callup_id: "c1", id: "p1" },
        old: null,
      }),
    ).toBe("c1");
  });

  it("reads callup_id from delete old row", () => {
    expect(
      callupIdFromPlayersChange({
        new: null,
        old: { callup_id: "c2", id: "p2" },
      }),
    ).toBe("c2");
  });

  it("filters to on-screen callups only", () => {
    expect(
      isPlayersChangeForCallups(
        { new: { callup_id: "a" } },
        ["a", "b"],
      ),
    ).toBe(true);
    expect(
      isPlayersChangeForCallups({ new: { callup_id: "z" } }, ["a", "b"]),
    ).toBe(false);
  });
});
