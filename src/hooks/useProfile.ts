import { useCallback, useState } from "react";
import { readJSON, writeJSON } from "@/lib/storage";
import type { UserProfile } from "@/types/domain";

const KEY = "es:profile";
const DEFAULT_PROFILE: UserProfile = { regionCode: "11", householdSize: 2 };

function loadProfile(): UserProfile {
  const { value } = readJSON<UserProfile>(KEY, DEFAULT_PROFILE);
  if (!value || typeof value !== "object") return DEFAULT_PROFILE;
  return { ...DEFAULT_PROFILE, ...value };
}

export function useProfile() {
  const [profile, setProfileState] = useState<UserProfile>(loadProfile);

  const setProfile = useCallback((patch: Partial<UserProfile>) => {
    setProfileState((prev) => {
      const next = { ...prev, ...patch };
      writeJSON(KEY, next);
      return next;
    });
  }, []);

  return { profile, setProfile };
}
