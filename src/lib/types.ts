// Bill calculation types
export interface StageBreakdown {
  stage: 1 | 2 | 3;
  kWh: number;
  unitPrice: number;
  charge: number;
}

export interface BillBreakdown {
  baseCharge: number;
  energyCharge: number;
  subtotal: number;
  vat: number;
  fund: number;
  total: number;
  stage: 1 | 2 | 3;
  stageBreakdown: StageBreakdown[];
}

// Storage types
export interface AppFlags {
  schemaVersion: 1;
  disclaimerSeenAt: string | null;
}
