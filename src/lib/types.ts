export type ContractType = "low" | "high";

export interface TariffTier {
  limitKWh: number | null;
  rate: number;
  baseFee: number;
}

export interface TariffTable {
  version: string;
  effectiveFrom: string;
  sourceLabel: string;
  summerMonths: number[];
  climateRate: number;
  fuelAdjRate: number;
  vatRate: number;
  fundRate: number;
  normal: Record<ContractType, TariffTier[]>;
  summer: Record<ContractType, TariffTier[]>;
}

export interface BillInput {
  kWh: number;
  yearMonth: string;
  contractType: ContractType;
}

export interface TierUsage {
  tier: 1 | 2 | 3;
  kWh: number;
  rate: number;
  fee: number;
}

export interface BillBreakdown {
  input: BillInput;
  isSummerRelief: boolean;
  tariffVersion: string;
  baseFee: number;
  tiers: TierUsage[];
  energyFee: number;
  climateFee: number;
  fuelAdjFee: number;
  subtotal: number;
  vat: number;
  fund: number;
  total: number;
  marginalRate: number;
}

export interface UsageRecord {
  id: string;
  yearMonth: string;
  kWh: number;
  contractType: ContractType;
  total: number;
  tariffVersion: string;
  createdAt: number;
  updatedAt: number;
}

export interface AppSettings {
  contractType: ContractType;
  regionCode: string;
  householdSize: 1 | 2 | 3 | 4;
  lastYearMonth: string | null;
}

export interface ApplianceCut {
  applianceId: string;
  cutHoursPerDay: number;
}

export interface SimulationInput {
  baseRecordId: string;
  cuts: ApplianceCut[];
  days: number;
}

export type ReportUnlock = Record<string, number>;

export interface Appliance {
  id: string;
  name: string;
  watt: number;
  defaultHours: number;
  icon: string;
}

export interface RegionAverageEntry {
  regionCode: string;
  regionName: string;
  monthly: Record<string, number>;
}

export type RouteState = {
  "/": void;
  "/result": { input: BillInput } | null;
  "/simulate": { recordId: string; input: BillInput } | null;
  "/report": {
    recordId: string;
    input: BillInput;
    cuts: ApplianceCut[];
    savedWon: number;
  } | null;
  "/history": void;
  "/compare": void;
};

export const STORAGE_KEYS = {
  records: "es:records:v1",
  settings: "es:settings:v1",
  sim: "es:sim:last:v1",
  reportUnlock: "es:report_unlock:v1",
} as const;
