import { readJSON, writeJSON } from "./storage";
import type { ApplianceItem } from "@/types/domain";

const KEY = "es:appliances";
const MAX_APPLIANCES = 12;

export type AddApplianceResult = { ok: boolean; reason?: "limit" };

function loadAppliances(): ApplianceItem[] {
  const { value } = readJSON<ApplianceItem[]>(KEY, []);
  return Array.isArray(value) ? value : [];
}

export function getAppliances(): ApplianceItem[] {
  return loadAppliances();
}

export function addAppliance(appliance: ApplianceItem): AddApplianceResult {
  const list = loadAppliances();
  if (list.length >= MAX_APPLIANCES) {
    return { ok: false, reason: "limit" };
  }
  const next = [...list, appliance];
  const result = writeJSON(KEY, next);
  return result.ok ? { ok: true } : { ok: false };
}

export function updateAppliance(id: string, patch: Partial<ApplianceItem>) {
  const list = loadAppliances();
  const idx = list.findIndex((a) => a.id === id);
  if (idx < 0) {
    return { ok: false };
  }
  const next = [...list.slice(0, idx), { ...list[idx], ...patch }, ...list.slice(idx + 1)];
  return writeJSON(KEY, next);
}

export function removeAppliance(id: string) {
  const list = loadAppliances();
  if (!list.some((a) => a.id === id)) {
    return { ok: false };
  }
  const next = list.filter((a) => a.id !== id);
  return writeJSON(KEY, next);
}
