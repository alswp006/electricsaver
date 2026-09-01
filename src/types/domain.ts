export interface MeterRecord {
  yearMonth: string;
  kWh: number;
  total: number;
  createdAt: number;
}

export interface UserProfile {
  regionCode: string;
  householdSize: 1 | 2 | 3 | 4;
}

export interface ApplianceItem {
  id: string;
  name: string;
  watt: number;
  hoursPerDay: number;
  reduceRatio: 0.1 | 0.2 | 0.3 | 0.5;
}

export interface SimulationSummary {
  baseKWh: number;
  savedKWh: number;
  targetKWh: number;
  baseTotal: number;
  targetTotal: number;
  savedWon: number;
  month: number;
  appliances: ApplianceItem[];
}

export interface ReportUnlock {
  applianceId: string;
  unlockedAt: number;
  expiresAt: number;
}

export interface AppFlags {
  schemaVersion: 1;
  disclaimerSeenAt: number | null;
}

export interface RegionAverage {
  regionCode: string;
  regionName: string;
  avgKWh: [number, number, number, number];
}

export interface StageBreakdownRow {
  stage: number;
  kWh: number;
  unitPrice: number;
  charge: number;
}

export interface BillBreakdown {
  baseCharge: number;
  energyCharge: number;
  climateCharge: number;
  fuelCharge: number;
  subtotal: number;
  vat: number;
  fund: number;
  total: number;
  stage: number;
  stageBreakdown: StageBreakdownRow[];
}
