import { readJSON, writeJSON } from "./storage";
import type { ApplianceItem } from "@/types/domain";

export type AddApplianceResult = { ok: boolean; reason?: "limit" };

export function getAppliances(): ApplianceItem[] {
  // TODO: Implement
  return [];
}

export function addAppliance(appliance: ApplianceItem): AddApplianceResult {
  // TODO: Implement
  return { ok: true };
}

export function updateAppliance(id: string, patch: Partial<ApplianceItem>) {
  // TODO: Implement
  return { ok: true };
}

export function removeAppliance(id: string) {
  // TODO: Implement
  return { ok: true };
}
