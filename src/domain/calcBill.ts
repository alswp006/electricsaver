import type { BillInput, BillBreakdown, TierUsage } from "@/lib/types";
import { TARIFF_V2024_01 } from "@/domain/tariff";
import { floor1, floor10, roundToNearest } from "@/domain/rounding";

/** 순수 함수 — 누진요금 계산. DOM/localStorage 접근 없음 */
export function calcBill(input: BillInput): BillBreakdown {
  const { kWh, yearMonth, contractType } = input;
  const table = TARIFF_V2024_01;

  const month = Number(yearMonth.split("-")[1]);
  const isSummerRelief = table.summerMonths.includes(month);
  const tierTable = (isSummerRelief ? table.summer : table.normal)[contractType];

  const usableKWh = Math.max(0, kWh);
  let remaining = usableKWh;
  let prevLimit = 0;
  let appliedIndex = 0;

  const tiers: TierUsage[] = tierTable.map((tier, idx) => {
    const upperLimit = tier.limitKWh === null ? Infinity : tier.limitKWh;
    const width = upperLimit - prevLimit;
    const used = Math.min(remaining, width);
    if (used > 0) appliedIndex = idx;
    remaining -= used;
    prevLimit = upperLimit;
    return {
      tier: (idx + 1) as 1 | 2 | 3,
      kWh: used,
      rate: tier.rate,
      fee: floor1(used * tier.rate),
    };
  });

  const appliedTier = tierTable[appliedIndex];
  const baseFee = appliedTier.baseFee;
  const marginalRate = appliedTier.rate;

  const energyFee = floor1(tiers.reduce((sum, t) => sum + t.fee, 0));
  const climateFee = floor1(usableKWh * table.climateRate);
  const fuelAdjFee = floor1(usableKWh * table.fuelAdjRate);
  const subtotal = floor1(baseFee + energyFee + climateFee + fuelAdjFee);
  const vat = roundToNearest(subtotal * table.vatRate);
  const fund = floor10(subtotal * table.fundRate);
  const total = floor10(subtotal + vat + fund);

  return {
    input,
    isSummerRelief,
    tariffVersion: table.version,
    baseFee,
    tiers,
    energyFee,
    climateFee,
    fuelAdjFee,
    subtotal,
    vat,
    fund,
    total,
    marginalRate,
  };
}
