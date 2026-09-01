const EPSILON = 1e-9;

/** 소수점 첫째 자리까지 남기고 내림 (예: 100.56 → 100.5) */
export function floor1(value: number): number {
  return Math.floor(value * 10 + EPSILON) / 10;
}

/** 십의 자리까지 남기고 내림 (예: 1234.56 → 1230) */
export function floor10(value: number): number {
  return Math.floor(value / 10 + EPSILON) * 10;
}

/** 주어진 단위로 반올림 (예: roundToNearest(1234, 10) → 1230, unit 기본값 1) */
export function roundToNearest(value: number, unit: number = 1): number {
  if (!Number.isFinite(unit) || unit <= 0) return value;
  return Math.round(value / unit) * unit;
}
