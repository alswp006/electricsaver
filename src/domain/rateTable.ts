export interface RateStage {
  limit: number;
  baseCharge: number;
  unitPrice: number;
}

export const RATE_TABLE: { winter: RateStage[]; summer: RateStage[] } = {
  winter: [
    { limit: 200, baseCharge: 910, unitPrice: 120.0 },
    { limit: 400, baseCharge: 1600, unitPrice: 214.6 },
    { limit: Infinity, baseCharge: 7300, unitPrice: 307.3 },
  ],
  summer: [
    { limit: 300, baseCharge: 910, unitPrice: 120.0 },
    { limit: 450, baseCharge: 1600, unitPrice: 214.6 },
    { limit: Infinity, baseCharge: 7300, unitPrice: 307.3 },
  ],
};

export const CLIMATE_RATE = 9.0;
export const FUEL_RATE = 5.0;
export const VAT_RATE = 0.1;
export const FUND_RATE = 0.037;
export const MAX_KWH = 3000;
