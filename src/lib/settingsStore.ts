import type { AppSettings } from "@/lib/types";
import { STORAGE_KEYS } from "@/lib/types";
import { readJson, writeJson } from "@/lib/safeStorage";

const DEFAULT_SETTINGS: AppSettings = {
  contractType: "low",
  regionCode: "KR-11",
  householdSize: 1,
  lastYearMonth: null,
};

export function getSettings(): AppSettings {
  return readJson<AppSettings>(STORAGE_KEYS.settings, DEFAULT_SETTINGS);
}

export function saveSettings(patch: Partial<AppSettings>): AppSettings {
  const merged: AppSettings = { ...getSettings(), ...patch };
  writeJson(STORAGE_KEYS.settings, merged);
  return merged;
}
