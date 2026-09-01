import { MAX_KWH } from "./rateTable";

export function assertBillInput(kWh: number, month: number): void {
  if (typeof kWh !== "number" || Number.isNaN(kWh)) {
    throw new RangeError("kWh must be a number");
  }

  if (kWh < 0) {
    throw new RangeError("kWh must be 0 or greater");
  }

  if (kWh > MAX_KWH) {
    throw new RangeError("kWh must be 3000 or less");
  }

  if (month < 1 || month > 12) {
    throw new RangeError("month must be 1-12");
  }
}
