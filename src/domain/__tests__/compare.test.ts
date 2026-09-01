import { describe, it, expect } from "vitest";
import { compareYoY } from "@/domain/compare";
import type { Bill } from "@/lib/contract";

const bill = (amountKrw: number): Bill => ({
  id: "b1",
  date: "2026-08",
  usage: 450,
  amountKrw,
  tariffTier: "low",
});

/** contract.ts compareYoYFn 구현 검증 — spec AC-5.2/AC-5.5 */
describe("compareYoY — year-over-year amount comparison", () => {
  it("AC-5.2: calculates delta and rounded integer percent", () => {
    const result = compareYoY(bill(86500), bill(68000));
    expect(result.delta).toBe(18500);
    expect(result.percent).toBe(27);
  });

  it("calculates a negative percent when the amount decreased", () => {
    const result = compareYoY(bill(68000), bill(86500));
    expect(result.delta).toBeLessThan(0);
    expect(result.percent).toBeLessThan(0);
  });

  it("AC-5.5: guards against division by zero when previous amount is 0", () => {
    const result = compareYoY(bill(50000), bill(0));
    expect(result.percent).toBe(0);
    expect(Number.isFinite(result.percent)).toBe(true);
  });
});
