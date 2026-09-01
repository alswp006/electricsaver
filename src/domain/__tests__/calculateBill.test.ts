import { describe, it, expect } from "vitest";
import { calculateBill, getStage } from "@/domain/calculateBill";

// CP-6 고정 테스트 픽스처 (spec.md) — 5행 전량
const FIXTURES = [
  { kWh: 1, month: 3, baseCharge: 910, energyCharge: 120, subtotal: 1044, vat: 104, fund: 30, total: 1170 },
  { kWh: 150, month: 3, baseCharge: 910, energyCharge: 18000, subtotal: 21010, vat: 2101, fund: 770, total: 23880 },
  { kWh: 350, month: 3, baseCharge: 1600, energyCharge: 56190, subtotal: 62690, vat: 6269, fund: 2310, total: 71260 },
  { kWh: 350, month: 8, baseCharge: 1600, energyCharge: 46730, subtotal: 53230, vat: 5323, fund: 1960, total: 60510 },
  { kWh: 500, month: 3, baseCharge: 7300, energyCharge: 97650, subtotal: 111950, vat: 11195, fund: 4140, total: 127280 },
];

describe("calculateBill — CP-6 fixture rows", () => {
  it.each(FIXTURES)(
    "kWh=$kWh month=$month → total=$total",
    ({ kWh, month, baseCharge, energyCharge, subtotal, vat, fund, total }) => {
      const result = calculateBill(kWh, month);
      expect(result.baseCharge).toBe(baseCharge);
      expect(result.energyCharge).toBe(energyCharge);
      expect(result.subtotal).toBe(subtotal);
      expect(result.vat).toBe(vat);
      expect(result.fund).toBe(fund);
      expect(result.total).toBe(total);
    },
  );

  it("switches to summer rate table for month 7 and 8, matching total", () => {
    const july = calculateBill(350, 7);
    const august = calculateBill(350, 8);
    expect(july.total).toBe(august.total);
    expect(july.stage).toBe(2);
    expect(august.stage).toBe(2);
  });

  it("returns stage-3 breakdown with correct baseCharge jump for 500kWh", () => {
    const result = calculateBill(500, 3);
    expect(result.stageBreakdown).toHaveLength(3);
    expect(result.stageBreakdown[2]).toEqual({ stage: 3, kWh: 100, unitPrice: 307.3, charge: 30730 });
    expect(result.baseCharge).toBe(7300);
  });

  it("getStage matches calculateBill().stage for all fixture rows", () => {
    for (const f of FIXTURES) {
      expect(getStage(f.kWh, f.month)).toBe(calculateBill(f.kWh, f.month).stage);
    }
  });
});
