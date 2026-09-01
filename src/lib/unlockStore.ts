import type { ReportUnlock } from "@/lib/types";
import { STORAGE_KEYS } from "@/lib/types";
import { readJson, writeJson } from "@/lib/safeStorage";

const TTL_MS = 24 * 60 * 60 * 1000;

function readAll(): ReportUnlock {
  const data = readJson<ReportUnlock>(STORAGE_KEYS.reportUnlock, {});
  return data && typeof data === "object" ? data : {};
}

export function isUnlocked(recordId: string): boolean {
  const unlockedAt = readAll()[recordId];
  if (typeof unlockedAt !== "number") return false;
  return Date.now() - unlockedAt < TTL_MS;
}

export function unlock(recordId: string): void {
  const next = { ...readAll(), [recordId]: Date.now() };
  writeJson(STORAGE_KEYS.reportUnlock, next);
}
