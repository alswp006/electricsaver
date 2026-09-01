import { readJSON, writeJSON } from "./storage";
import type { MeterRecord } from "@/types/domain";

export function getRecords(): MeterRecord[] {
  // TODO: Implement
  return [];
}

export function upsertRecord(record: MeterRecord) {
  // TODO: Implement
  return { ok: true };
}

export function deleteRecord(yearMonth: string) {
  // TODO: Implement
  return { ok: true };
}
