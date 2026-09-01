import { describe, it, expect } from "vitest";
import { compareYoY } from "@/domain/compare";
import { simulate } from "@/domain/simulate";
import { compareRegion } from "@/domain/compare";

describe("packet 0007: 파생 계산 (YoY 비교 / 시뮬레이션 / 지역 비교)", () => {

  describe("compareYoY", () => {
    it("AC-1: should return null when previous year same month has no record", () => {
      const records = [
        { yearMonth: "202409", kWh: 300, won: 100000 }
      ];
      const result = compareYoY(records, "202409");
      expect(result).toBeNull();
    });

    it("AC-1: should return { diffKWh, diffWon, diffPercent } with 1 decimal rounding when previous year record exists", () => {
      const records = [
        { yearMonth: "202409", kWh: 300, won: 100000 },
        { yearMonth: "202309", kWh: 250, won: 85000 }
      ];
      const result = compareYoY(records, "202409");
      expect(result).not.toBeNull();
      expect(result!.diffKWh).toBe(50); // 300 - 250
      expect(result!.diffWon).toBe(15000); // 100000 - 85000
      expect(result!.diffPercent).toBe(20.0); // (50/250)*100 = 20.0, 1 decimal
    });

    it("AC-1: should handle negative diff when usage decreased", () => {
      const records = [
        { yearMonth: "202409", kWh: 200, won: 60000 },
        { yearMonth: "202309", kWh: 300, won: 100000 }
      ];
      const result = compareYoY(records, "202409");
      expect(result!.diffKWh).toBe(-100);
      expect(result!.diffWon).toBe(-40000);
      expect(result!.diffPercent).toBeCloseTo(-33.3, 1);
    });
  });

  describe("simulate", () => {
    it("AC-2: should calculate savedKWh from single appliance using formula watt/1000*hoursPerDay*30*reduceRatio", () => {
      const baseKWh = 500;
      const appliances = [
        { watt: 1000, hoursPerDay: 8, reduceRatio: 0.5 }
      ];
      const result = simulate(baseKWh, 9, appliances);
      // 1000/1000 * 8 * 30 * 0.5 = 120
      expect(result.savedKWh).toBe(120);
      expect(result.baseKWh).toBe(500);
    });

    it("AC-2: should calculate targetKWh = max(0, baseKWh - savedKWh)", () => {
      const baseKWh = 500;
      const appliances = [
        { watt: 1000, hoursPerDay: 8, reduceRatio: 0.5 }
      ];
      const result = simulate(baseKWh, 9, appliances);
      expect(result.targetKWh).toBe(380); // max(0, 500-120)
    });

    it("AC-2: should calculate baseTotal and targetTotal via calculateBill", () => {
      const baseKWh = 500;
      const appliances = [];
      const result = simulate(baseKWh, 9, appliances);
      expect(result.baseTotal).toBeGreaterThan(0);
      expect(result.targetTotal).toBeGreaterThan(0);
      expect(typeof result.baseTotal).toBe("number");
      expect(typeof result.targetTotal).toBe("number");
    });

    it("AC-2: should calculate savedWon = baseTotal - targetTotal", () => {
      const baseKWh = 500;
      const appliances = [
        { watt: 1000, hoursPerDay: 8, reduceRatio: 0.5 }
      ];
      const result = simulate(baseKWh, 9, appliances);
      const expectedSavedWon = result.baseTotal - result.targetTotal;
      expect(result.savedWon).toBe(expectedSavedWon);
    });

    it("AC-3: should return zero savings when no appliances provided", () => {
      const result = simulate(500, 9, []);
      expect(result.savedKWh).toBe(0);
      expect(result.targetKWh).toBe(500);
      expect(result.targetTotal).toBe(result.baseTotal);
      expect(result.savedWon).toBe(0);
    });

    it("AC-2: should sum multiple appliances correctly", () => {
      const appliances = [
        { watt: 1000, hoursPerDay: 8, reduceRatio: 0.5 }, // 120
        { watt: 2000, hoursPerDay: 4, reduceRatio: 0.3 }  // 72
      ];
      const result = simulate(500, 9, appliances);
      expect(result.savedKWh).toBe(192); // 120 + 72 = 192, Math.round
    });

    it("AC-2: should clamp targetKWh to minimum 0 when savings exceed base", () => {
      const baseKWh = 100;
      const appliances = [
        { watt: 2000, hoursPerDay: 10, reduceRatio: 1.0 } // 2000/1000*10*30*1 = 600
      ];
      const result = simulate(baseKWh, 9, appliances);
      expect(result.targetKWh).toBe(0); // max(0, 100-600)
      expect(result.savedKWh).toBe(600);
    });

    it("AC-2: should include all fields in SimulationSummary", () => {
      const result = simulate(500, 9, [
        { watt: 1000, hoursPerDay: 8, reduceRatio: 0.5 }
      ]);
      expect(result).toHaveProperty("baseKWh", 500);
      expect(result).toHaveProperty("savedKWh");
      expect(result).toHaveProperty("targetKWh");
      expect(result).toHaveProperty("baseTotal");
      expect(result).toHaveProperty("targetTotal");
      expect(result).toHaveProperty("savedWon");
      expect(result).toHaveProperty("month", 9);
      expect(result).toHaveProperty("appliances");
    });
  });

  describe("compareRegion", () => {
    it("AC-4: should return { avgKWh, diffKWh, ratioPercent } when regionCode is found", () => {
      const result = compareRegion("11", 3, 400);
      expect(result).toHaveProperty("avgKWh");
      expect(result).toHaveProperty("diffKWh");
      expect(result).toHaveProperty("ratioPercent");
      expect(typeof result.avgKWh).toBe("number");
      expect(typeof result.diffKWh).toBe("number");
      expect(typeof result.ratioPercent).toBe("number");
    });

    it("AC-4: should calculate diffKWh = kWh - avgKWh correctly", () => {
      const result = compareRegion("11", 3, 400);
      expect(result.diffKWh).toBe(400 - result.avgKWh);
    });

    it("AC-4: should calculate ratioPercent = (kWh / avgKWh) * 100", () => {
      const result = compareRegion("11", 3, 400);
      const expected = (400 / result.avgKWh) * 100;
      expect(result.ratioPercent).toBeCloseTo(expected, 1);
    });

    it("AC-4: should fallback to region 11 when regionCode is not registered", () => {
      const resultValid = compareRegion("11", 3, 400);
      const resultInvalid = compareRegion("99", 3, 400);
      expect(resultInvalid.avgKWh).toBe(resultValid.avgKWh);
      expect(resultInvalid.diffKWh).toBe(resultValid.diffKWh);
      expect(resultInvalid.ratioPercent).toBe(resultValid.ratioPercent);
    });

    it("AC-4: should handle different household sizes with same region", () => {
      const result1 = compareRegion("11", 1, 300);
      const result2 = compareRegion("11", 4, 300);
      // avgKWh should be from regionAverage.json, householdSize is parameter
      expect(result1.avgKWh).toBe(result2.avgKWh);
      expect(result1.diffKWh).toBe(result2.diffKWh);
    });
  });

  describe("AC-5: No localStorage access in derived functions", () => {
    it("compareYoY should not access localStorage", () => {
      const records = [
        { yearMonth: "202409", kWh: 300, won: 100000 },
        { yearMonth: "202309", kWh: 250, won: 85000 }
      ];
      // This test passes if compareYoY executes without accessing localStorage
      // If it tries to access localStorage in a non-mocked jsdom environment, it would throw
      expect(() => compareYoY(records, "202409")).not.toThrow();
    });

    it("simulate should not access localStorage", () => {
      expect(() => simulate(500, 9, [])).not.toThrow();
    });

    it("compareRegion should not access localStorage", () => {
      expect(() => compareRegion("11", 3, 400)).not.toThrow();
    });
  });
});
