import type { AppFlags } from "./types";

interface ReadResult<T> {
  ok: boolean;
  value: T;
  reason?: "corrupt";
}

interface WriteResult {
  ok: boolean;
  reason?: "quota";
}

export function readJSON<T>(key: string, fallback: T): ReadResult<T> {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      return { ok: true, value: fallback };
    }
    const parsed = JSON.parse(raw);
    return { ok: true, value: parsed };
  } catch {
    // Reset key to fallback
    try {
      localStorage.setItem(key, JSON.stringify(fallback));
    } catch {
      // If write fails, still return the result without throwing
    }
    return { ok: false, value: fallback, reason: "corrupt" };
  }
}

export function writeJSON<T>(key: string, value: T): WriteResult {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return { ok: true };
  } catch (error) {
    const err = error as Error;
    if (err.name === "QuotaExceededError") {
      return { ok: false, reason: "quota" };
    }
    return { ok: false, reason: "quota" };
  }
}

export function removeKeys(keys: string[]): void {
  keys.forEach((key) => {
    localStorage.removeItem(key);
  });
}

export function getStorageBytes(): number {
  let total = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith("es:")) {
      const value = localStorage.getItem(key) || "";
      total += key.length + value.length;
    }
  }
  return total;
}

export function migrateFlags(): void {
  const fallback: AppFlags = { schemaVersion: 1, disclaimerSeenAt: null };
  const current = localStorage.getItem("es:flags");

  if (!current) {
    // Key does not exist, create with default
    writeJSON("es:flags", fallback);
    return;
  }

  try {
    const parsed = JSON.parse(current) as AppFlags;
    if (parsed.schemaVersion !== 1) {
      // Schema version mismatch, upgrade
      writeJSON("es:flags", fallback);
    }
  } catch {
    // Corrupt, reset to default
    writeJSON("es:flags", fallback);
  }
}

// Legacy API (kept for backward compatibility)
export function getItem<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setItem<T>(key: string, value: T): void {
  localStorage.setItem(key, JSON.stringify(value));
}

export function removeItem(key: string): void {
  localStorage.removeItem(key);
}
