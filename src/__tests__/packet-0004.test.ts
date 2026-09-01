import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getStage, getNextStageGap } from "@/domain/stage";
import { assertBillInput } from "@/domain/validate";
import { calculateBill } from "@/domain/calculateBill";

describe("Packet 0004: Stage Helpers & Input Validation", () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, "error");
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe("AC-1.3: getStage - Stage boundary values (winter)", () => {
    it("should return stage 1 for 0-200 kWh in winter (month=3)", () => {
      expect(getStage(200, 3)).toBe(1);
    });

    it("should return stage 2 for 201-400 kWh in winter (month=3)", () => {
      expect(getStage(201, 3)).toBe(2);
      expect(getStage(400, 3)).toBe(2);
    });

    it("should return stage 3 for 401+ kWh in winter (month=3)", () => {
      expect(getStage(401, 3)).toBe(3);
    });
  });

  describe("AC-1.3: getStage - Stage boundary values (summer)", () => {
    it("should return stage 1 for 0-300 kWh in summer (month=8)", () => {
      expect(getStage(300, 8)).toBe(1);
    });

    it("should return stage 2 for 301-450 kWh in summer (month=8)", () => {
      expect(getStage(301, 8)).toBe(2);
      expect(getStage(450, 8)).toBe(2);
    });

    it("should return stage 3 for 451+ kWh in summer (month=8)", () => {
      expect(getStage(451, 8)).toBe(3);
    });
  });

  describe("AC-1.3: getStage - Should treat July as summer", () => {
    it("should apply summer rates for month 7", () => {
      expect(getStage(300, 7)).toBe(1);
      expect(getStage(301, 7)).toBe(2);
      expect(getStage(451, 7)).toBe(3);
    });
  });

  describe("AC-1.3: getNextStageGap - Remaining kWh to next stage", () => {
    it("should return gap to next stage in winter", () => {
      expect(getNextStageGap(180, 3)).toBe(20);
    });

    it("should return 0 when already in final stage", () => {
      expect(getNextStageGap(500, 3)).toBe(0);
    });
  });

  describe("AC-1.3: getNextStageGap - Summer stage gaps", () => {
    it("should calculate gap based on summer boundaries", () => {
      expect(getNextStageGap(280, 8)).toBe(20);
      expect(getNextStageGap(440, 8)).toBe(10);
    });

    it("should return 0 in final stage for summer", () => {
      expect(getNextStageGap(500, 8)).toBe(0);
    });
  });

  describe("AC-1.5: assertBillInput - kWh validation", () => {
    it("should throw RangeError for negative kWh", () => {
      expect(() => assertBillInput(-10, 3)).toThrow(RangeError);
      expect(() => assertBillInput(-10, 3)).toThrow(
        "kWh must be 0 or greater"
      );
    });

    it("should throw RangeError for NaN kWh", () => {
      expect(() => assertBillInput(NaN, 3)).toThrow(RangeError);
      expect(() => assertBillInput(NaN, 3)).toThrow("kWh must be a number");
    });

    it("should throw RangeError for non-numeric kWh", () => {
      // @ts-ignore — intentionally passing wrong type
      expect(() => assertBillInput("abc", 3)).toThrow(RangeError);
      expect(() => assertBillInput("abc" as any, 3)).toThrow(
        "kWh must be a number"
      );
    });

    it("should throw RangeError for kWh exceeding 3000", () => {
      expect(() => assertBillInput(3001, 3)).toThrow(RangeError);
      expect(() => assertBillInput(3001, 3)).toThrow("kWh must be 3000 or less");
    });

    it("should not throw for valid kWh at limit", () => {
      expect(() => assertBillInput(3000, 3)).not.toThrow();
      expect(() => assertBillInput(0, 3)).not.toThrow();
    });
  });

  describe("AC-1.5: assertBillInput - Month validation", () => {
    it("should throw RangeError for month < 1", () => {
      expect(() => assertBillInput(100, 0)).toThrow(RangeError);
      expect(() => assertBillInput(100, 0)).toThrow("month must be 1-12");
    });

    it("should throw RangeError for month > 12", () => {
      expect(() => assertBillInput(100, 13)).toThrow(RangeError);
      expect(() => assertBillInput(100, 13)).toThrow("month must be 1-12");
    });

    it("should accept valid months 1-12", () => {
      expect(() => assertBillInput(100, 1)).not.toThrow();
      expect(() => assertBillInput(100, 12)).not.toThrow();
      expect(() => assertBillInput(100, 6)).not.toThrow();
    });
  });

  describe("AC-1.5 & AC-1.6: console.error should not be called", () => {
    it("should not call console.error during validation", () => {
      try {
        assertBillInput(-10, 3);
      } catch {
        // Expected to throw
      }
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it("should not call console.error for valid inputs", () => {
      assertBillInput(100, 3);
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it("should not call console.error in calculateBill with valid inputs", () => {
      const result = calculateBill(150, 3);
      expect(result).toBeDefined();
      expect(result.total).toBeGreaterThan(0);
      expect(Number.isInteger(result.total)).toBe(true);
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });

    it("should not call console.error in calculateBill with edge case (3000 kWh)", () => {
      const result = calculateBill(3000, 3);
      expect(result).toBeDefined();
      expect(result.total).toBeGreaterThan(0);
      expect(Number.isInteger(result.total)).toBe(true);
      expect(consoleErrorSpy).not.toHaveBeenCalled();
    });
  });

  describe("AC-1.6: calculateBill should reject inputs beyond 3000 kWh", () => {
    it("should throw RangeError for kWh > 3000", () => {
      expect(() => calculateBill(3001, 3)).toThrow(RangeError);
      expect(() => calculateBill(3001, 3)).toThrow("kWh must be 3000 or less");
    });

    it("should succeed and return integer for exactly 3000 kWh", () => {
      const result = calculateBill(3000, 3);
      expect(Number.isInteger(result.total)).toBe(true);
      expect(result.total).toBeGreaterThan(0);
    });
  });

  describe("calculateBill integration: assertBillInput should be called", () => {
    it("should enforce input validation through calculateBill", () => {
      expect(() => calculateBill(NaN, 3)).toThrow("kWh must be a number");
      expect(() => calculateBill(100, 0)).toThrow("month must be 1-12");
      expect(() => calculateBill(-5, 3)).toThrow("kWh must be 0 or greater");
    });

    it("should allow valid inputs to calculate successfully", () => {
      const result = calculateBill(150, 3);
      expect(result).toBeDefined();
      expect(result.total).toBeGreaterThan(0);
      expect(Number.isInteger(result.total)).toBe(true);
    });
  });

  describe("Stage boundary edge cases", () => {
    it("getStage should handle stage transition exactly at boundary (winter)", () => {
      expect(getStage(200, 3)).toBe(1);
      expect(getStage(200.1, 3)).toBe(2);
      expect(getStage(400, 3)).toBe(2);
      expect(getStage(400.1, 3)).toBe(3);
    });

    it("getStage should handle stage transition exactly at boundary (summer)", () => {
      expect(getStage(300, 8)).toBe(1);
      expect(getStage(300.1, 8)).toBe(2);
      expect(getStage(450, 8)).toBe(2);
      expect(getStage(450.1, 8)).toBe(3);
    });

    it("getNextStageGap should return correct gap at various boundaries", () => {
      expect(getNextStageGap(0, 3)).toBe(200);
      expect(getNextStageGap(200, 3)).toBe(0);
      expect(getNextStageGap(201, 3)).toBe(199);
      expect(getNextStageGap(400, 3)).toBe(0);
    });
  });
});
