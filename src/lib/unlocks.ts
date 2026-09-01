import { readJSON, writeJSON } from "./storage";
import type { ReportUnlock } from "@/types/domain";

const KEY = "es:report-unlocks";
const TTL_MS = 86400000;

function loadUnlocks(): ReportUnlock[] {
  const { value } = readJSON<ReportUnlock[]>(KEY, []);
  return Array.isArray(value) ? value : [];
}

export function getUnlocks(): ReportUnlock[] {
  return loadUnlocks();
}

export function addUnlock(id: string, now: number) {
  const list = loadUnlocks();
  const rest = list.filter((u) => u.applianceId !== id);
  const next: ReportUnlock = { applianceId: id, unlockedAt: now, expiresAt: now + TTL_MS };
  return writeJSON(KEY, [...rest, next]);
}

export function pruneUnlocks(now: number) {
  const list = loadUnlocks();
  const next = list.filter((u) => u.expiresAt > now);
  return writeJSON(KEY, next);
}

export function hasValidUnlock(id: string, now: number): boolean {
  const list = loadUnlocks();
  return list.some((u) => u.applianceId === id && u.expiresAt > now);
}
