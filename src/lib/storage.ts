import type { AppFlags } from "./types";
import type { MeterRecord } from "../types/domain";

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
  } catch {
    return { ok: false, reason: "quota" };
  }
}

export function removeKeys(keys: string[]): void {
  keys.forEach((key) => {
    try {
      localStorage.removeItem(key);
    } catch {
      // Storage unavailable — nothing to do
    }
  });
}

export function getStorageBytes(): number {
  let total = 0;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("es:")) {
        const value = localStorage.getItem(key) || "";
        total += key.length + value.length;
      }
    }
  } catch {
    return 0;
  }
  return total;
}

export function migrateFlags(): void {
  const fallback: AppFlags = { schemaVersion: 1, disclaimerSeenAt: null };
  let current: string | null = null;
  try {
    current = localStorage.getItem("es:flags");
  } catch {
    // Storage unavailable — nothing to migrate
    return;
  }

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

export function upsertRecord(record: MeterRecord): WriteResult {
  const { value: records } = readJSON<MeterRecord[]>("es:records", []);
  const list = Array.isArray(records) ? records : [];
  const idx = list.findIndex((r) => r.yearMonth === record.yearMonth);
  const next = idx >= 0 ? [...list.slice(0, idx), record, ...list.slice(idx + 1)] : [...list, record];
  return writeJSON("es:records", next);
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
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage unavailable/quota exceeded — silently no-op
  }
}

export function removeItem(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // Storage unavailable — nothing to do
  }
}
