import { describe, it, expect } from "vitest";
import type { UsageRecord, BillInput, ApplianceCut } from "@/lib/types";
import { validateUsageInput, validateYearMonth } from "@/domain/validation";
import { findYoY, diffPercent } from "@/domain/compare";
import { simulate } from "@/domain/simulate";

/**
 * Packet 0004 TDD RED PHASE — 입력 검증 + 비교/시뮬레이션 순수 함수
 *
 * Files to be implemented (by Coder):
 * - src/domain/validation.ts: validateUsageInput, validateYearMonth
 * - src/domain/compare.ts: findYoY, diffPercent
 * - src/domain/simulate.ts: simulate (uses calcBill from packet 0003)
 *
 * All tests are pure function tests — no mocks, no React rendering.
 * RED phase: Tests will fail until implementations exist.
 */

describe("AC-1: validateUsageInput — input validation", () => {
  it("AC-1[P0]: should reject empty string", () => {
    const result = validateUsageInput("");
    expect(result.ok).toBe(false);
    expect(result.message).toEqual("사용량을 1kWh 이상 입력해주세요");
  });

  it("AC-1[P0]: should reject '0' (below minimum)", () => {
    const result = validateUsageInput("0");
    expect(result.ok).toBe(false);
    expect(result.message).toEqual("사용량을 1kWh 이상 입력해주세요");
  });

  it("AC-1[P0]: should reject '10001' (exceeds max)", () => {
    const result = validateUsageInput("10001");
    expect(result.ok).toBe(false);
    expect(result.message).toEqual("10,000kWh 이하로 입력해주세요");
  });

  it("AC-1[P0]: should reject '12.5' (decimal, not integer)", () => {
    const result = validateUsageInput("12.5");
    expect(result.ok).toBe(false);
    expect(result.message).toEqual("숫자만 입력해주세요");
  });

  it("AC-1[P0]: should reject '-5' (negative)", () => {
    const result = validateUsageInput("-5");
    expect(result.ok).toBe(false);
    expect(result.message).toEqual("숫자만 입력해주세요");
  });

  it("AC-1[P0]: should accept '450' (valid input)", () => {
    const result = validateUsageInput("450");
    expect(result.ok).toBe(true);
    expect(result.kWh).toBe(450);
  });
});

describe("AC-2: validateYearMonth — year-month validation", () => {
  it("AC-2[P0]: should reject future month '2026-10' when today is '2026-09-02'", () => {
    const today = new Date("2026-09-02");
    const result = validateYearMonth("2026-10", today);
    expect(result.ok).toBe(false);
    expect(result.message).toEqual("아직 오지 않은 달이에요");
  });

  it("AC-2[P0]: should accept current month '2026-09' when today is '2026-09-02'", () => {
    const today = new Date("2026-09-02");
    const result = validateYearMonth("2026-09", today);
    expect(result.ok).toBe(true);
  });

  it("AC-2[P0]: should accept past month '2021-09' when today is '2026-09-02'", () => {
    const today = new Date("2026-09-02");
    const result = validateYearMonth("2021-09", today);
    expect(result.ok).toBe(true);
  });
});

describe("AC-3: findYoY + diffPercent — year-over-year comparison", () => {
  it("AC-3[P0]: should find YoY record '2025-08' when searching for '2026-08'", () => {
    const records: UsageRecord[] = [
      {
        id: "rec_2026-08",
        yearMonth: "2026-08",
        kWh: 450,
        contractType: "low",
        total: 86500,
        tariffVersion: "v2024.01",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
      {
        id: "rec_2025-08",
        yearMonth: "2025-08",
        kWh: 400,
        contractType: "low",
        total: 78000,
        tariffVersion: "v2024.01",
        createdAt: Date.now() - 365 * 24 * 60 * 60 * 1000,
        updatedAt: Date.now() - 365 * 24 * 60 * 60 * 1000,
      },
    ];
    const result = findYoY(records, "2026-08");
    expect(result).not.toBeNull();
    expect(result?.yearMonth).toEqual("2025-08");
    expect(result?.kWh).toBe(400);
  });

  it("AC-3[P0]: should return null when YoY record not found", () => {
    const records: UsageRecord[] = [
      {
        id: "rec_2026-09",
        yearMonth: "2026-09",
        kWh: 480,
        contractType: "low",
        total: 95000,
        tariffVersion: "v2024.01",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ];
    const result = findYoY(records, "2026-08");
    expect(result).toBeNull();
  });

  it("AC-3[P0]: should calculate diffPercent(100, 127) === 27", () => {
    const result = diffPercent(100, 127);
    expect(result).toBe(27);
  });

  it("AC-3[P0]: should calculate diffPercent(127, 100) ≈ -21.26 (decrease)", () => {
    const result = diffPercent(127, 100);
    expect(result).toBeLessThan(0);
    expect(result).toBeCloseTo(-21.26, 1);
  });
});

describe("AC-4: simulate — basic simulation functionality", () => {
  it("AC-4[P0]: should calculate savedKWh=108, afterKWh=342 for aircon cutHoursPerDay=2", () => {
    const base: BillInput = {
      kWh: 450,
      yearMonth: "2026-08",
      contractType: "low",
    };
    const cuts: ApplianceCut[] = [
      { applianceId: "aircon", cutHoursPerDay: 2 },
    ];
    const result = simulate(base, cuts, 30);

    // aircon 1800W × 2h × 30d / 1000 = 108 kWh saved
    // afterKWh = 450 - 108 = 342 kWh
    expect(result.savedKWh).toBe(108);
    expect(result.afterKWh).toBe(342);
  });

  it("AC-4[P0]: should return savedWon > 0 from simulate", () => {
    const base: BillInput = {
      kWh: 450,
      yearMonth: "2026-08",
      contractType: "low",
    };
    const cuts: ApplianceCut[] = [
      { applianceId: "aircon", cutHoursPerDay: 2 },
    ];
    const result = simulate(base, cuts, 30);
    expect(result.savedWon).toBeGreaterThan(0);
  });

  it("AC-4[P0]: should set clamped=false when afterKWh > 1", () => {
    const base: BillInput = {
      kWh: 300,
      yearMonth: "2026-08",
      contractType: "low",
    };
    const cuts: ApplianceCut[] = [
      { applianceId: "tv", cutHoursPerDay: 1 }, // 150W × 1h × 30d = 4.5 kWh saved
    ];
    const result = simulate(base, cuts, 30);
    expect(result.clamped).toBe(false);
  });
});

describe("AC-5: simulate — clamped behavior", () => {
  it("AC-5[P0]: should clamp afterKWh to 1 when savings >= base.kWh, set clamped=true", () => {
    const base: BillInput = {
      kWh: 100,
      yearMonth: "2026-08",
      contractType: "low",
    };
    // aircon 1800W × 3h × 30d / 1000 = 162 kWh saved (exceeds 100)
    const cuts: ApplianceCut[] = [
      { applianceId: "aircon", cutHoursPerDay: 3 },
    ];
    const result = simulate(base, cuts, 30);

    expect(result.afterKWh).toBe(1);
    expect(result.clamped).toBe(true);
  });

  it("AC-5[P0]: should not clamp when savings < base.kWh, set clamped=false", () => {
    const base: BillInput = {
      kWh: 450,
      yearMonth: "2026-08",
      contractType: "low",
    };
    // aircon 1800W × 2h × 30d / 1000 = 108 kWh saved (less than 450)
    const cuts: ApplianceCut[] = [
      { applianceId: "aircon", cutHoursPerDay: 2 },
    ];
    const result = simulate(base, cuts, 30);

    expect(result.afterKWh).toBe(342);
    expect(result.clamped).toBe(false);
  });
});
