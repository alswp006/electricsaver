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
  let final = [...rest, next];

  // Maintain 12-item limit (max 12)
  if (final.length > 12) {
    // Find and remove the oldest (minimum unlockedAt)
    const minIdx = final.reduce(
      (minI, item, i) => (item.unlockedAt < final[minI].unlockedAt ? i : minI),
      0
    );
    final = [...final.slice(0, minIdx), ...final.slice(minIdx + 1)];
  }

  return writeJSON(KEY, final);
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
