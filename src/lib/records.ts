import { readJSON, writeJSON } from "./storage";
import type { MeterRecord } from "@/types/domain";

const KEY = "es:records";
const MAX_RECORDS = 60;

function loadRecords(): MeterRecord[] {
  const { value } = readJSON<MeterRecord[]>(KEY, []);
  return Array.isArray(value) ? value : [];
}

export function getRecords(): MeterRecord[] {
  return [...loadRecords()].sort((a, b) => (a.yearMonth < b.yearMonth ? 1 : a.yearMonth > b.yearMonth ? -1 : 0));
}

export function upsertRecord(record: MeterRecord) {
  const list = loadRecords();
  const idx = list.findIndex((r) => r.yearMonth === record.yearMonth);
  const next = idx >= 0 ? [...list.slice(0, idx), record, ...list.slice(idx + 1)] : [...list, record];
  next.sort((a, b) => (a.yearMonth < b.yearMonth ? 1 : a.yearMonth > b.yearMonth ? -1 : 0));
  const capped = next.slice(0, MAX_RECORDS);
  return writeJSON(KEY, capped);
}

export function deleteRecord(yearMonth: string) {
  const list = loadRecords();
  const next = list.filter((r) => r.yearMonth !== yearMonth);
  return writeJSON(KEY, next);
}
