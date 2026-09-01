import type { BillBreakdown, StageBreakdown } from "@/lib/types";
import {
  RATE_TABLE,
  CLIMATE_RATE,
  FUEL_RATE,
  VAT_RATE,
  FUND_RATE,
  type RateStage,
} from "./rateTable";
import { getStage, getNextStageGap } from "./stage";
import { assertBillInput } from "./validate";

export { getStage, getNextStageGap };

export function calculateBill(kWh: number, month: number): BillBreakdown {
  assertBillInput(kWh, month);

  const isSummer = month === 7 || month === 8;
  const rates = isSummer ? RATE_TABLE.summer : RATE_TABLE.winter;

  // Determine stage and calculate stageBreakdown
  const stageBreakdown: StageBreakdown[] = [];
  let remainingKWh = kWh;
  let stage: 1 | 2 | 3 = 1;
  let energyChargeTmp = 0;

  for (let i = 0; i < 3; i++) {
    const currentRate = rates[i];
    const stageLimit = i === 0 ? currentRate.limit : currentRate.limit - rates[i - 1].limit;
    const stageKWh = Math.min(remainingKWh, stageLimit);

    if (stageKWh > 0) {
      const charge = stageKWh * currentRate.unitPrice;
      stageBreakdown.push({
        stage: (i + 1) as 1 | 2 | 3,
        kWh: stageKWh,
        unitPrice: currentRate.unitPrice,
        charge: charge,
      });
      energyChargeTmp += charge;
      stage = (i + 1) as 1 | 2 | 3;
    }

    remainingKWh -= stageKWh;
    if (remainingKWh <= 0) break;
  }

  // Get base charge from final stage
  const baseCharge = rates[stage - 1].baseCharge;

  // Calculate charges
  const energyCharge = Math.round(energyChargeTmp);
  const climateCharge = Math.round(kWh * CLIMATE_RATE);
  const fuelCharge = Math.round(kWh * FUEL_RATE);

  // Calculate subtotal
  const subtotal = baseCharge + energyCharge + climateCharge + fuelCharge;

  // Calculate VAT
  const vat = Math.round(subtotal * VAT_RATE);

  // Calculate fund
  const fund = Math.floor((subtotal * FUND_RATE) / 10) * 10;

  // Calculate total
  const total = Math.floor((subtotal + vat + fund) / 10) * 10;

  return {
    baseCharge,
    energyCharge,
    subtotal,
    vat,
    fund,
    total,
    stage,
    stageBreakdown,
  };
}
