import type { RegionAverageEntry } from "@/lib/types";
import regionAverageData from "@/data/region-average.json";

const REGIONS = regionAverageData as RegionAverageEntry[];

export function listRegions(): RegionAverageEntry[] {
  return REGIONS;
}

export function getRegionAverage(regionCode: string, yearMonth: string): number | null {
  const region = REGIONS.find((r) => r.regionCode === regionCode);
  if (!region) return null;
  const month = String(Number(yearMonth.split("-")[1]));
  return region.monthly[month] ?? null;
}
