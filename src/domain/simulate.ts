import type { BillInput, BillBreakdown, ApplianceCut } from "@/lib/types";
import { calcBill } from "@/domain/calcBill";
import { APPLIANCES } from "@/domain/appliances";
import { roundToNearest } from "@/domain/rounding";

export interface SimulationResult {
  savedKWh: number;
  afterKWh: number;
  clamped: boolean;
  baseBill: BillBreakdown;
  afterBill: BillBreakdown;
  savedWon: number;
}

/** 순수 함수 — 가전 절전 시뮬레이션. 요금 산식은 calcBill만 재사용(중복 구현 없음) */
export function simulate(base: BillInput, cuts: ApplianceCut[], days: number = 30): SimulationResult {
  const savedKWh = cuts.reduce((sum, cut) => {
    const appliance = APPLIANCES.find((a) => a.id === cut.applianceId);
    if (!appliance) return sum;
    const cutKWh = (appliance.watt / 1000) * cut.cutHoursPerDay * days;
    return sum + roundToNearest(cutKWh);
  }, 0);

  const rawAfterKWh = base.kWh - savedKWh;
  const clamped = rawAfterKWh < 1;
  const afterKWh = Math.max(1, rawAfterKWh);

  const baseBill = calcBill(base);
  const afterBill = calcBill({ ...base, kWh: afterKWh });
  const savedWon = baseBill.total - afterBill.total;

  return { savedKWh, afterKWh, clamped, baseBill, afterBill, savedWon };
}
