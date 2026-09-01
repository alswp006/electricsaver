import { useCallback, useState } from "react";
import { readJSON, writeJSON } from "@/lib/storage";
import type { ApplianceItem } from "@/types/domain";

const KEY = "es:appliances";
const MAX_APPLIANCES = 12;

export type AddApplianceResult = { ok: boolean; reason?: "limit" };

function loadAppliances(): ApplianceItem[] {
  const { value } = readJSON<ApplianceItem[]>(KEY, []);
  return Array.isArray(value) ? value : [];
}

export function useAppliances() {
  const [appliances, setAppliances] = useState<ApplianceItem[]>(loadAppliances);

  const addAppliance = useCallback(
    (item: ApplianceItem): AddApplianceResult => {
      if (appliances.length >= MAX_APPLIANCES) {
        return { ok: false, reason: "limit" };
      }
      const next = [...appliances, item];
      writeJSON(KEY, next);
      setAppliances(next);
      return { ok: true };
    },
    [appliances],
  );

  const updateAppliance = useCallback(
    (id: string, patch: Partial<ApplianceItem>) => {
      const next = appliances.map((item) => (item.id === id ? { ...item, ...patch } : item));
      writeJSON(KEY, next);
      setAppliances(next);
    },
    [appliances],
  );

  const removeAppliance = useCallback(
    (id: string) => {
      const next = appliances.filter((item) => item.id !== id);
      writeJSON(KEY, next);
      setAppliances(next);
    },
    [appliances],
  );

  return { appliances, addAppliance, updateAppliance, removeAppliance };
}
