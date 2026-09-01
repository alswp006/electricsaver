import { useCallback } from "react";
import { readJSON, writeJSON } from "@/lib/storage";
import type { ReportUnlock } from "@/types/domain";

const KEY = "es:report-unlocks";
const TTL_MS = 86400000;
const MAX_UNLOCKS = 12;

function loadUnlocks(): ReportUnlock[] {
  const { value } = readJSON<ReportUnlock[]>(KEY, []);
  return Array.isArray(value) ? value : [];
}

export function useReportUnlock() {
  const hasValidUnlock = useCallback((applianceId: string, now: number): boolean => {
    const unlocks = loadUnlocks();
    return unlocks.some((u) => u.applianceId === applianceId && u.expiresAt > now);
  }, []);

  const addUnlock = useCallback((applianceId: string, now: number) => {
    const unlocks = loadUnlocks();
    const next: ReportUnlock = { applianceId, unlockedAt: now, expiresAt: now + TTL_MS };
    const rest = unlocks.filter((u) => u.applianceId !== applianceId);
    const merged = [...rest, next].slice(-MAX_UNLOCKS);
    writeJSON(KEY, merged);
  }, []);

  const pruneUnlocks = useCallback((now: number) => {
    const unlocks = loadUnlocks();
    const next = unlocks.filter((u) => u.expiresAt > now);
    if (next.length !== unlocks.length) {
      writeJSON(KEY, next);
    }
  }, []);

  return { hasValidUnlock, addUnlock, pruneUnlocks };
}
