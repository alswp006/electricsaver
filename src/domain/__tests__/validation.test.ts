import { describe, it, expect } from "vitest";
import { validateUsage } from "@/domain/validation";

/** contract.ts validateUsageFn 구현 검증 — validateUsageInput(string) 위에 얹은 숫자 입력 래퍼 */
describe("validateUsage — numeric input validation", () => {
  it("accepts a valid usage value", () => {
    expect(validateUsage(450)).toEqual({ valid: true });
  });

  it("rejects a value below the minimum", () => {
    const result = validateUsage(0);
    expect(result.valid).toBe(false);
    expect(result.error).toEqual("사용량을 1kWh 이상 입력해주세요");
  });

  it("rejects a value above the maximum", () => {
    const result = validateUsage(10001);
    expect(result.valid).toBe(false);
    expect(result.error).toEqual("10,000kWh 이하로 입력해주세요");
  });

  it("rejects a non-integer value", () => {
    const result = validateUsage(12.5);
    expect(result.valid).toBe(false);
    expect(result.error).toEqual("숫자만 입력해주세요");
  });
});
