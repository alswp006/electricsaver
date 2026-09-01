import { readJSON, writeJSON } from "./storage";
import type { ReportUnlock } from "@/types/domain";

export function getUnlocks(): ReportUnlock[] {
  // TODO: Implement
  return [];
}

export function addUnlock(id: string, now: number) {
  // TODO: Implement
  return { ok: true };
}

export function pruneUnlocks(now: number) {
  // TODO: Implement
  return { ok: true };
}

export function hasValidUnlock(id: string, now: number): boolean {
  // TODO: Implement
  return false;
}
