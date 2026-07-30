import {
  callupIdFromCallupsChange,
  callupIdFromPlayersChange,
  isCallupsChangeForCallups,
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

  it("refetches on DELETE when callup_id is missing (replica identity default)", () => {
    expect(
      isPlayersChangeForCallups(
        { eventType: "DELETE", new: null, old: { id: "p1" } },
        ["a"],
      ),
    ).toBe(true);
    expect(
      isPlayersChangeForCallups(
        { eventType: "DELETE", new: null, old: { id: "p1" } },
        [],
      ),
    ).toBe(false);
  });

  it("reads callup id from callups status change", () => {
    expect(
      callupIdFromCallupsChange({
        new: { id: "c9", status: "Full" },
        old: { id: "c9", status: "Open" },
      }),
    ).toBe("c9");
    expect(
      isCallupsChangeForCallups(
        { new: { id: "c9", status: "Full" } },
        ["c9"],
      ),
    ).toBe(true);
    expect(
      isCallupsChangeForCallups(
        { new: { id: "other", status: "Full" } },
        ["c9"],
      ),
    ).toBe(false);
  });
});
