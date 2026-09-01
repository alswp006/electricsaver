export type WriteResult = {
  ok: boolean;
  reason?: "quota" | "unavailable";
};

function getStorage(): Storage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

export function readJson<T = unknown>(key: string, fallback: T): any {
  const storage = getStorage();
  if (!storage) return fallback;
  try {
    const raw = storage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function writeJson<T = unknown>(key: string, value: T): WriteResult {
  const storage = getStorage();
  if (!storage) return { ok: false, reason: "unavailable" };
  try {
    storage.setItem(key, JSON.stringify(value));
    return { ok: true };
  } catch (error) {
    if (error instanceof DOMException && error.name === "QuotaExceededError") {
      return { ok: false, reason: "quota" };
    }
    return { ok: false, reason: "quota" };
  }
}
