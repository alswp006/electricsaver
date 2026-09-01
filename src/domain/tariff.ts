import type { TariffTable } from "@/lib/types";

export const TARIFF_V2024_01: TariffTable = {
  version: "v2024.01",
  effectiveFrom: "2024-01-01",
  sourceLabel: "한국전력공사 2024년 1월 기준 주택용 전력(저압/고압) 요금표",
  summerMonths: [7, 8],
  climateRate: 9.0,
  fuelAdjRate: 5.0,
  vatRate: 0.1,
  fundRate: 0.037,
  normal: {
    low: [
      { limitKWh: 200, rate: 120.0, baseFee: 910 },
      { limitKWh: 400, rate: 214.6, baseFee: 1600 },
      { limitKWh: null, rate: 307.3, baseFee: 7300 },
    ],
    high: [
      { limitKWh: 200, rate: 105.0, baseFee: 730 },
      { limitKWh: 400, rate: 174.0, baseFee: 1260 },
      { limitKWh: null, rate: 242.3, baseFee: 6060 },
    ],
  },
  summer: {
    low: [
      { limitKWh: 300, rate: 120.0, baseFee: 910 },
      { limitKWh: 450, rate: 214.6, baseFee: 1600 },
      { limitKWh: null, rate: 307.3, baseFee: 7300 },
    ],
    high: [
      { limitKWh: 300, rate: 105.0, baseFee: 730 },
      { limitKWh: 450, rate: 174.0, baseFee: 1260 },
      { limitKWh: null, rate: 242.3, baseFee: 6060 },
    ],
  },
};
