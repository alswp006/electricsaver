/** 순수 함수 — 입력 검증. DOM/localStorage 접근 없음 */

export type UsageValidationResult =
  | { ok: true; kWh: number; message?: undefined }
  | { ok: false; message: string; kWh?: undefined };

export type YearMonthValidationResult =
  | { ok: true; message?: undefined }
  | { ok: false; message: string };

/** 사용량 입력 문자열 검증 (1~10,000kWh, 정수만) */
export function validateUsageInput(raw: string): UsageValidationResult {
  const trimmed = raw.trim();

  if (trimmed === "") {
    return { ok: false, message: "사용량을 1kWh 이상 입력해주세요" };
  }
  if (!/^\d+$/.test(trimmed)) {
    return { ok: false, message: "숫자만 입력해주세요" };
  }

  const kWh = Number(trimmed);
  if (kWh < 1) {
    return { ok: false, message: "사용량을 1kWh 이상 입력해주세요" };
  }
  if (kWh > 10000) {
    return { ok: false, message: "10,000kWh 이하로 입력해주세요" };
  }

  return { ok: true, kWh };
}

/** 계약(src/lib/contract.ts) validateUsageFn 구현 — 숫자 입력 검증. validateUsageInput 재사용 */
export function validateUsage(value: number): { valid: boolean; error?: string } {
  const result = validateUsageInput(String(value));
  return result.ok ? { valid: true } : { valid: false, error: result.message };
}

/** 연월(YYYY-MM) 입력 검증 — 미래 월 거부 */
export function validateYearMonth(ym: string, today: Date): YearMonthValidationResult {
  const [year, month] = ym.split("-").map(Number);
  const todayYear = today.getFullYear();
  const todayMonth = today.getMonth() + 1;

  const isFuture = year > todayYear || (year === todayYear && month > todayMonth);
  if (isFuture) {
    return { ok: false, message: "아직 오지 않은 달이에요" };
  }

  return { ok: true };
}
