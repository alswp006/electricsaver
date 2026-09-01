import { MAX_KWH } from "./rateTable";

/**
 * 사용량 검증 결과. 계약(lib/contract)의 validateUsageKwhFn을 좁힌 형태로,
 * 성공 시 정수로 정규화된 값(normalized)을 함께 돌려준다 — 화면은 이 값을 그대로 쓴다.
 */
export type UsageValidation =
  | { valid: true; normalized: number }
  | { valid: false; error: string };

export const validateUsage = (value: string | number): UsageValidation => {
  const raw = typeof value === "number" ? String(value) : value.trim();

  if (raw === "") {
    return { valid: false, error: "사용량을 1kWh 이상 입력해주세요" };
  }

  const parsed = Number(raw);

  if (Number.isNaN(parsed)) {
    return { valid: false, error: "숫자만 입력해주세요" };
  }

  if (!Number.isInteger(parsed)) {
    return { valid: false, error: "사용량은 정수로 입력해주세요" };
  }

  if (parsed < 1) {
    return { valid: false, error: "사용량을 1kWh 이상 입력해주세요" };
  }

  if (parsed > MAX_KWH) {
    return { valid: false, error: "사용량은 3000kWh 이하로 입력해주세요" };
  }

  return { valid: true, normalized: parsed };
};

export function assertBillInput(kWh: number, month: number): void {
  if (typeof kWh !== "number" || Number.isNaN(kWh)) {
    throw new RangeError("kWh must be a number");
  }

  if (kWh < 0) {
    throw new RangeError("kWh must be 0 or greater");
  }

  if (kWh > MAX_KWH) {
    throw new RangeError("kWh must be 3000 or less");
  }

  if (month < 1 || month > 12) {
    throw new RangeError("month must be 1-12");
  }
}
