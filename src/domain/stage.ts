import { RATE_TABLE } from "./rateTable";

export function getStage(kWh: number, month: number): 1 | 2 | 3 {
  const isSummer = month === 7 || month === 8;
  const stages = isSummer ? RATE_TABLE.summer : RATE_TABLE.winter;

  for (let i = 0; i < stages.length; i++) {
    if (kWh <= stages[i].limit) {
      return (i + 1) as 1 | 2 | 3;
    }
  }

  return 3;
}

export function getNextStageGap(kWh: number, month: number): number {
  const isSummer = month === 7 || month === 8;
  const stages = isSummer ? RATE_TABLE.summer : RATE_TABLE.winter;

  for (let i = 0; i < stages.length - 1; i++) {
    if (kWh <= stages[i].limit) {
      return Math.max(0, stages[i].limit - kWh);
    }
  }

  return 0;
}
