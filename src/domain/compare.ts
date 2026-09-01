import type { UsageRecord } from "@/lib/types";
import type { Bill } from "@/lib/contract";

/** 순수 함수 — 전년 동월 레코드 조회. 없으면 null */
export function findYoY(records: UsageRecord[], yearMonth: string): UsageRecord | null {
  const [year, month] = yearMonth.split("-").map(Number);
  const targetYearMonth = `${year - 1}-${String(month).padStart(2, "0")}`;
  return records.find((r) => r.yearMonth === targetYearMonth) ?? null;
}

/** 순수 함수 — prev 대비 curr의 변화율(%), 소수점 둘째 자리까지 */
export function diffPercent(prev: number, curr: number): number {
  if (prev === 0) return 0;
  return Math.round(((curr - prev) / prev) * 10000) / 100;
}

/** 계약(src/lib/contract.ts) compareYoYFn 구현 — 전년 동월 대비 금액 증감 (AC-5.2: 정수% 반올림, 0원 방어) */
export function compareYoY(currentMonth: Bill, previousYearMonth: Bill): { delta: number; percent: number } {
  const delta = currentMonth.amountKrw - previousYearMonth.amountKrw;
  const percent = previousYearMonth.amountKrw === 0 ? 0 : Math.round((delta / previousYearMonth.amountKrw) * 100);
  return { delta, percent };
}
