import type { SimulationInput } from "@/lib/types";
import { STORAGE_KEYS } from "@/lib/types";
import { readJson, writeJson } from "@/lib/safeStorage";

const MAX_CUTS = 8;

export function getLastSim(): SimulationInput | null {
  return readJson<SimulationInput | null>(STORAGE_KEYS.sim, null);
}

export function saveSim(input: SimulationInput): SimulationInput {
  const truncated: SimulationInput = {
    ...input,
    cuts: input.cuts.slice(0, MAX_CUTS),
  };
  writeJson(STORAGE_KEYS.sim, truncated);
  return truncated;
}
