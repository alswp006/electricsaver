import { describe, it, expect, vi, afterEach } from "vitest";
import { getStage, getNextStageGap } from "@/domain/stage";
import { assertBillInput, validateUsage } from "@/domain/validate";
import { calculateBill } from "@/domain/calculateBill";

describe("getStage", () => {
  it("winter: boundary transitions at 200/400 kWh", () => {
    expect(getStage(200, 3)).toBe(1);
    expect(getStage(201, 3)).toBe(2);
    expect(getStage(400, 3)).toBe(2);
    expect(getStage(401, 3)).toBe(3);
  });

  it("summer: boundary transitions at 300/450 kWh", () => {
    expect(getStage(300, 8)).toBe(1);
    expect(getStage(301, 8)).toBe(2);
    expect(getStage(450, 8)).toBe(2);
    expect(getStage(451, 8)).toBe(3);
  });
});

describe("getNextStageGap", () => {
  it("returns remaining kWh to next stage boundary", () => {
    expect(getNextStageGap(180, 3)).toBe(20);
  });

  it("returns 0 when already in the last stage", () => {
    expect(getNextStageGap(500, 3)).toBe(0);
  });
});

describe("assertBillInput", () => {
  const errorSpy = vi.spyOn(console, "error");

  afterEach(() => {
    errorSpy.mockClear();
  });

  it("throws for negative kWh", () => {
    expect(() => assertBillInput(-1, 3)).toThrow(new RangeError("kWh must be 0 or greater"));
  });

  it("throws for NaN/non-number kWh", () => {
    expect(() => assertBillInput(NaN, 3)).toThrow(new RangeError("kWh must be a number"));
    expect(() => assertBillInput("100" as unknown as number, 3)).toThrow(
      new RangeError("kWh must be a number"),
    );
  });

  it("throws for month outside 1-12", () => {
    expect(() => assertBillInput(100, 0)).toThrow(new RangeError("month must be 1-12"));
    expect(() => assertBillInput(100, 13)).toThrow(new RangeError("month must be 1-12"));
  });

  it("throws for kWh greater than 3000", () => {
    expect(() => assertBillInput(3001, 3)).toThrow(new RangeError("kWh must be 3000 or less"));
  });

  it("never calls console.error while validating", () => {
    [
      () => assertBillInput(-1, 3),
      () => assertBillInput(NaN, 3),
      () => assertBillInput(100, 13),
      () => assertBillInput(3001, 3),
    ].forEach((fn) => {
      try {
        fn();
      } catch {
        // expected
      }
    });
    expect(errorSpy).not.toHaveBeenCalled();
  });
});

describe("validateUsage", () => {
  it("AC-2.4: rejects empty string and 0", () => {
    expect(validateUsage("")).toEqual({ valid: false, error: "사용량을 1kWh 이상 입력해주세요" });
    expect(validateUsage(0)).toEqual({ valid: false, error: "사용량을 1kWh 이상 입력해주세요" });
  });

  it("AC-2.5: rejects out-of-range, non-integer, and non-numeric values", () => {
    expect(validateUsage("3500")).toEqual({
      valid: false,
      error: "사용량은 3000kWh 이하로 입력해주세요",
    });
    expect(validateUsage("12.5")).toEqual({
      valid: false,
      error: "사용량은 정수로 입력해주세요",
    });
    expect(validateUsage("abc")).toEqual({ valid: false, error: "숫자만 입력해주세요" });
  });

  it("accepts a valid integer within range and normalizes it", () => {
    expect(validateUsage("350")).toEqual({ valid: true, normalized: 350 });
    expect(validateUsage(3000)).toEqual({ valid: true, normalized: 3000 });
  });
});

describe("calculateBill input validation integration", () => {
  it("does not throw for kWh=3000 and returns a positive integer total", () => {
    const result = calculateBill(3000, 3);
    expect(Number.isInteger(result.total)).toBe(true);
    expect(result.total).toBeGreaterThan(0);
  });
});
