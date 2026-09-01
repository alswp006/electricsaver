import { readJSON, writeJSON } from "./storage";
import type { UserProfile } from "@/types/domain";

const KEY = "es:profile";
const DEFAULT_PROFILE: UserProfile = { regionCode: "11", householdSize: 2 };

export function getProfile(): UserProfile {
  const { value } = readJSON<UserProfile>(KEY, DEFAULT_PROFILE);
  if (!value || typeof value !== "object") return DEFAULT_PROFILE;
  return { ...DEFAULT_PROFILE, ...value };
}

export function setProfile(patch: Partial<UserProfile>) {
  const next = { ...getProfile(), ...patch };
  return writeJSON(KEY, next);
}
