import { CallupStatusValue } from "@/lib/constants/status";
import {
  canMutateCallup,
  formatMatchAtEs,
  statusLabelEs,
} from "@/lib/format/callup-display";

describe("formatMatchAtEs", () => {
  it("formats in Spanish with Bogota timezone", () => {
    const text = formatMatchAtEs("2026-08-01T20:00:00-05:00");
    expect(text.toLowerCase()).toContain("agosto");
    expect(text).toMatch(/8:00|20:00/);
  });
});

describe("statusLabelEs / canMutateCallup", () => {
  it("maps ES labels and mutation rules", () => {
    expect(statusLabelEs(CallupStatusValue.Open)).toBe("Abierta");
    expect(statusLabelEs(CallupStatusValue.Full)).toBe("Llena");
    expect(statusLabelEs(CallupStatusValue.Closed)).toBe("Cerrada");
    expect(statusLabelEs(CallupStatusValue.cancelled)).toBe("Cancelada");
    expect(canMutateCallup("Open")).toBe(true);
    expect(canMutateCallup("Full")).toBe(true);
    expect(canMutateCallup("Closed")).toBe(false);
    expect(canMutateCallup("cancelled")).toBe(false);
  });
});
