import { readJSON, writeJSON } from "./storage";
import type { UserProfile } from "@/types/domain";

const DEFAULT_PROFILE: UserProfile = { regionCode: "11", householdSize: 2 };

export function getProfile(): UserProfile {
  // TODO: Implement
  return DEFAULT_PROFILE;
}

export function setProfile(patch: Partial<UserProfile>) {
  // TODO: Implement
  return { ok: true };
}
