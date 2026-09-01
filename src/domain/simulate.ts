import { calculateBill } from "./calculateBill";

export interface SimAppliance {
  watt: number;
  hoursPerDay: number;
  reduceRatio: number;
}

export interface SimulationSummary {
  baseKWh: number;
  savedKWh: number;
  targetKWh: number;
  baseTotal: number;
  targetTotal: number;
  savedWon: number;
  month: number;
  appliances: SimAppliance[];
}

/** 가전별 월 절감 kWh = watt/1000*hoursPerDay*30*reduceRatio 의 합 */
export function simulate(
  baseKWh: number,
  month: number,
  appliances: SimAppliance[]
): SimulationSummary {
  const savedKWhRaw = appliances.reduce(
    (sum, a) => sum + (a.watt / 1000) * a.hoursPerDay * 30 * a.reduceRatio,
    0
  );
  const savedKWh = Math.round(savedKWhRaw);
  const targetKWh = Math.max(0, baseKWh - savedKWh);

  const baseTotal = calculateBill(baseKWh, month).total;
  const targetTotal = calculateBill(targetKWh, month).total;
  const savedWon = baseTotal - targetTotal;

  return {
    baseKWh,
    savedKWh,
    targetKWh,
    baseTotal,
    targetTotal,
    savedWon,
    month,
    appliances,
  };
}
