import type { ContractType, UsageRecord } from "@/lib/types";
import { STORAGE_KEYS } from "@/lib/types";
import { readJson, writeJson, type WriteResult } from "@/lib/safeStorage";
import type { Bill, recordStoreFn } from "@/lib/contract";
import { TARIFF_V2024_01 } from "@/domain/tariff";

const MAX_RECORDS = 60;

function readAll(): UsageRecord[] {
  const data = readJson<UsageRecord[]>(STORAGE_KEYS.records, []);
  return Array.isArray(data) ? data : [];
}

function sortDesc(records: UsageRecord[]): UsageRecord[] {
  return [...records].sort((a, b) =>
    a.yearMonth < b.yearMonth ? 1 : a.yearMonth > b.yearMonth ? -1 : 0
  );
}

export function listRecords(): UsageRecord[] {
  return sortDesc(readAll());
}

export function getLatestRecord(): UsageRecord | null {
  return listRecords()[0] ?? null;
}

export type UpsertResult = WriteResult & UsageRecord;

export function upsertRecord(rec: UsageRecord): UpsertResult {
  const id = `rec_${rec.yearMonth}`;
  const existing = readAll();
  const prev = existing.find((r) => r.id === id);
  const now = Date.now();

  const merged: UsageRecord = {
    ...rec,
    id,
    createdAt: prev?.createdAt ?? rec.createdAt ?? now,
    updatedAt: now,
  };

  const next = sortDesc([
    ...existing.filter((r) => r.id !== id),
    merged,
  ]).slice(0, MAX_RECORDS);

  const result = writeJson(STORAGE_KEYS.records, next);
  if (!result.ok) return result as UpsertResult;
  return { ...result, ...merged };
}

export function removeRecord(id: string): WriteResult {
  const next = readAll().filter((r) => r.id !== id);
  return writeJson(STORAGE_KEYS.records, next);
}

export function pruneRecords(): WriteResult {
  const sorted = sortDesc(readAll());
  if (sorted.length <= MAX_RECORDS) return { ok: true };
  return writeJson(STORAGE_KEYS.records, sorted.slice(0, MAX_RECORDS));
}

function recordToBill(r: UsageRecord): Bill {
  return { id: r.id, date: r.yearMonth, usage: r.kWh, amountKrw: r.total, tariffTier: r.contractType };
}

function billToRecord(b: Bill, prev?: UsageRecord): UsageRecord {
  return {
    id: `rec_${b.date}`,
    yearMonth: b.date,
    kWh: b.usage,
    contractType: (b.tariffTier as ContractType) ?? "low",
    total: b.amountKrw,
    tariffVersion: prev?.tariffVersion ?? TARIFF_V2024_01.version,
    createdAt: prev?.createdAt ?? Date.now(),
    updatedAt: Date.now(),
  };
}

/** 계약(src/lib/contract.ts) recordStoreFn 구현 — Bill<->UsageRecord 변환 후 위 함수들에 위임 */
export const recordStore: recordStoreFn = {
  list: async () => listRecords().map(recordToBill),
  upsert: async (b) => {
    const prev = readAll().find((r) => r.id === `rec_${b.date}`);
    upsertRecord(billToRecord(b, prev));
  },
  remove: async (id) => {
    removeRecord(id);
  },
  prune: async () => {
    pruneRecords();
  },
  latest: async () => {
    const r = getLatestRecord();
    return r ? recordToBill(r) : null;
  },
};
