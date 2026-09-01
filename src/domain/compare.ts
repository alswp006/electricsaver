import type { RegionAverage } from "@/types/domain";
import regionAverageData from "@/data/regionAverage.json";

export interface UsageRecordLite {
  yearMonth: string; // "YYYYMM"
  kWh: number;
  won: number;
}

export interface YoYComparison {
  diffKWh: number;
  diffWon: number;
  diffPercent: number;
}

/** 전년 동월(yearMonth - 1년) 기록과 비교. 없으면 null */
export function compareYoY(
  records: UsageRecordLite[],
  yearMonth: string
): YoYComparison | null {
  const current = records.find((r) => r.yearMonth === yearMonth);
  if (!current) return null;

  const year = Number(yearMonth.slice(0, 4));
  const month = yearMonth.slice(4);
  const previousYearMonth = `${year - 1}${month}`;

  const previous = records.find((r) => r.yearMonth === previousYearMonth);
  if (!previous) return null;

  const diffKWh = current.kWh - previous.kWh;
  const diffWon = current.won - previous.won;
  const diffPercent =
    previous.kWh === 0 ? 0 : Math.round((diffKWh / previous.kWh) * 1000) / 10;

  return { diffKWh, diffWon, diffPercent };
}

export interface RegionComparison {
  avgKWh: number;
  diffKWh: number;
  ratioPercent: number;
}

const FALLBACK_REGION_CODE = "11";

/** 지역 평균 대비 사용량 비교. 미등록 regionCode는 서울('11')로 폴백 */
export function compareRegion(
  regionCode: string,
  householdSize: number,
  kWh: number
): RegionComparison {
  const table = regionAverageData as RegionAverage[];
  const region =
    table.find((r) => r.regionCode === regionCode) ??
    table.find((r) => r.regionCode === FALLBACK_REGION_CODE)!;

  const avgKWh =
    Math.round(
      (region.avgKWh.reduce((sum, v) => sum + v, 0) / region.avgKWh.length) * 10
    ) / 10;

  const diffKWh = kWh - avgKWh;
  const ratioPercent = Math.round((kWh / avgKWh) * 1000) / 10;

  return { avgKWh, diffKWh, ratioPercent };
}
