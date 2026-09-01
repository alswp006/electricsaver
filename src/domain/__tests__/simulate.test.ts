import { describe, it, expect } from "vitest";
import { simulate } from "@/domain/simulate";
import type { BillInput, ApplianceCut } from "@/lib/types";

const base: BillInput = { kWh: 450, yearMonth: "2026-08", contractType: "low" };

describe("simulate — appliance cut simulation", () => {
  it("AC-6.1: sums saved kWh from a single appliance cut", () => {
    const cuts: ApplianceCut[] = [{ applianceId: "aircon", cutHoursPerDay: 2 }];
    const result = simulate(base, cuts, 30);
    expect(result.savedKWh).toBe(108);
    expect(result.afterKWh).toBe(342);
    expect(result.clamped).toBe(false);
  });

  it("AC-6.2: sums saved kWh across multiple appliances", () => {
    const cuts: ApplianceCut[] = [
      { applianceId: "aircon", cutHoursPerDay: 1 },
      { applianceId: "tv", cutHoursPerDay: 2 },
    ];
    const single = simulate(base, [cuts[0]], 30);
    const combined = simulate(base, cuts, 30);
    expect(combined.savedKWh).toBeGreaterThan(single.savedKWh);
  });

  it("AC-6.3: clamps afterKWh to 1 when savings exceed usage", () => {
    const smallBase: BillInput = { kWh: 100, yearMonth: "2026-08", contractType: "low" };
    const cuts: ApplianceCut[] = [{ applianceId: "aircon", cutHoursPerDay: 3 }];
    const result = simulate(smallBase, cuts, 30);
    expect(result.afterKWh).toBe(1);
    expect(result.clamped).toBe(true);
  });

  it("returns savedWon reflecting the difference between base and after bills", () => {
    const cuts: ApplianceCut[] = [{ applianceId: "aircon", cutHoursPerDay: 2 }];
    const result = simulate(base, cuts, 30);
    expect(result.savedWon).toBe(result.baseBill.total - result.afterBill.total);
    expect(result.savedWon).toBeGreaterThan(0);
  });
});
