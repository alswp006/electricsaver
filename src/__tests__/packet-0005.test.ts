import { describe, it, expect, beforeEach, vi } from "vitest";

/**
 * Packet 0005: localStorage 저수준 래퍼 + 플래그 마이그레이션
 *
 * AC-1: readJSON<T>(key, fallback) — 정상 시 { ok:true, value }, 파싱 실패 시 { ok:false, reason:'corrupt', value: fallback }
 * AC-2: writeJSON<T>(key, value) — setItem throw 시 { ok:false, reason:'quota' }, 재throw 하지 않음
 * AC-3: removeKeys(keys) + getStorageBytes() — es: 접두 키만, 5ms 미만
 * AC-4: migrateFlags() — es:flags 부재/schemaVersion!==1 일 때 초기화, es:records 건수 전후 동일
 * AC-5: console.error 스파이 — 0회
 */

interface AppFlags {
  schemaVersion: 1;
  disclaimerSeenAt: string | null;
}

interface ReadResult<T> {
  ok: boolean;
  value: T;
  reason?: "corrupt";
}

interface WriteResult {
  ok: boolean;
  reason?: "quota";
}

// Import will be from @/lib/storage (not yet implemented)
// For now, we define what we expect:
// import { readJSON, writeJSON, removeKeys, getStorageBytes, migrateFlags } from '@/lib/storage';

describe("localStorage 저수준 래퍼 + 플래그 마이그레이션", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  // AC-1: readJSON — 정상 값 읽기
  it("AC-1.1: readJSON returns { ok:true, value } when key contains valid JSON", async () => {
    const { readJSON } = await import("@/lib/storage");
    const testValue = { name: "test", count: 42 };
    localStorage.setItem("test-key", JSON.stringify(testValue));

    const result = readJSON("test-key", { name: "default", count: 0 });

    expect(result.ok).toBe(true);
    expect(result.value).toEqual(testValue);
    expect(result.reason).toBeUndefined();
  });

  // AC-1: readJSON — 파싱 실패 시 fallback 사용
  it("AC-1.2: readJSON resets to fallback and returns { ok:false, reason:'corrupt' } when JSON is malformed", async () => {
    const { readJSON } = await import("@/lib/storage");
    const fallback = { name: "fallback", count: 0 };
    // Inject malformed JSON
    localStorage.setItem("es:flags", "{{broken-json");

    const result = readJSON("es:flags", fallback);

    expect(result.ok).toBe(false);
    expect(result.reason).toBe("corrupt");
    expect(result.value).toEqual(fallback);
    // Verify key was re-initialized with fallback
    expect(localStorage.getItem("es:flags")).toBe(JSON.stringify(fallback));
  });

  // AC-1: readJSON — 키 없을 때 fallback
  it("AC-1.3: readJSON returns fallback when key does not exist", async () => {
    const { readJSON } = await import("@/lib/storage");
    const fallback = { schemaVersion: 1, disclaimerSeenAt: null };

    const result = readJSON("es:flags", fallback);

    expect(result.ok).toBe(true);
    expect(result.value).toEqual(fallback);
  });

  // AC-2: writeJSON — 성공 시 { ok:true }
  it("AC-2.1: writeJSON returns { ok:true } on success", async () => {
    const { writeJSON } = await import("@/lib/storage");
    const data = { schemaVersion: 1, disclaimerSeenAt: "2026-09-01" };

    const result = writeJSON("es:flags", data);

    expect(result.ok).toBe(true);
    expect(result.reason).toBeUndefined();
    expect(localStorage.getItem("es:flags")).toBe(JSON.stringify(data));
  });

  // AC-2: writeJSON — QuotaExceededError 처리
  it("AC-2.2: writeJSON returns { ok:false, reason:'quota' } when localStorage is full", async () => {
    const { writeJSON } = await import("@/lib/storage");
    // Mock localStorage.setItem to throw QuotaExceededError
    const setItemSpy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      const error = new Error("QuotaExceededError");
      error.name = "QuotaExceededError";
      throw error;
    });

    const result = writeJSON("es:flags", { schemaVersion: 1, disclaimerSeenAt: null });

    expect(result.ok).toBe(false);
    expect(result.reason).toBe("quota");
    setItemSpy.mockRestore();
  });

  // AC-2: writeJSON — 예외를 재throw하지 않음
  it("AC-2.3: writeJSON does not re-throw the error to caller", async () => {
    const { writeJSON } = await import("@/lib/storage");
    const setItemSpy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });

    const result = writeJSON("es:flags", { schemaVersion: 1, disclaimerSeenAt: null });

    // Should not throw; should return result object
    expect(result.ok).toBe(false);
    expect(() => writeJSON("es:flags", {})).not.toThrow();
    setItemSpy.mockRestore();
  });

  // AC-3: removeKeys — 다중 키 제거
  it("AC-3.1: removeKeys removes multiple keys", async () => {
    const { removeKeys } = await import("@/lib/storage");
    localStorage.setItem("es:records", JSON.stringify([{ id: "1" }]));
    localStorage.setItem("es:profile", JSON.stringify({ region: "Seoul" }));
    localStorage.setItem("es:appliances", JSON.stringify([]));
    localStorage.setItem("other-key", "value");

    removeKeys(["es:records", "es:profile"]);

    expect(localStorage.getItem("es:records")).toBeNull();
    expect(localStorage.getItem("es:profile")).toBeNull();
    expect(localStorage.getItem("es:appliances")).toBe("[]");
    expect(localStorage.getItem("other-key")).toBe("value");
  });

  // AC-3: getStorageBytes — es: 접두 키만 계산, 5ms 미만
  it("AC-3.2: getStorageBytes calculates size of es:* keys only and completes under 5ms", async () => {
    const { getStorageBytes } = await import("@/lib/storage");
    localStorage.setItem("es:records", JSON.stringify([{ id: "1", data: "x" }]));
    localStorage.setItem("es:profile", JSON.stringify({ region: "Seoul" }));
    localStorage.setItem("other-key", "this-should-not-be-counted");

    const startTime = performance.now();
    const bytes = getStorageBytes();
    const endTime = performance.now();

    const elapsed = endTime - startTime;
    expect(elapsed).toBeLessThan(5); // Must complete under 5ms
    expect(bytes).toBeGreaterThan(0);
    // Rough check: should include es:records and es:profile, not other-key
    const esRecordsSize = "es:records".length + JSON.stringify([{ id: "1", data: "x" }]).length;
    const esProfileSize = "es:profile".length + JSON.stringify({ region: "Seoul" }).length;
    expect(bytes).toBeGreaterThanOrEqual(esRecordsSize + esProfileSize);
  });

  // AC-3: getStorageBytes — 정확한 크기 계산
  it("AC-3.3: getStorageBytes includes both key and value length for es:* keys", async () => {
    const { getStorageBytes } = await import("@/lib/storage");
    localStorage.clear();
    localStorage.setItem("es:test", "value");

    const bytes = getStorageBytes();
    const expectedSize = "es:test".length + "value".length; // 7 + 5 = 12

    expect(bytes).toBe(expectedSize);
  });

  // AC-4: migrateFlags — 신규 생성
  it("AC-4.1: migrateFlags creates es:flags with default schema when missing", async () => {
    const { migrateFlags } = await import("@/lib/storage");
    localStorage.clear();
    localStorage.setItem("es:records", JSON.stringify([{ id: "1" }]));

    migrateFlags();

    const flags = JSON.parse(localStorage.getItem("es:flags") || "null") as AppFlags;
    expect(flags).not.toBeNull();
    expect(flags.schemaVersion).toBe(1);
    expect(flags.disclaimerSeenAt).toBeNull();
    // Verify es:records still intact
    expect(JSON.parse(localStorage.getItem("es:records")!)).toEqual([{ id: "1" }]);
  });

  // AC-4: migrateFlags — 버전 업그레이드
  it("AC-4.2: migrateFlags upgrades es:flags when schemaVersion !== 1", async () => {
    const { migrateFlags } = await import("@/lib/storage");
    localStorage.clear();
    localStorage.setItem("es:flags", JSON.stringify({ schemaVersion: 0 }));
    localStorage.setItem("es:records", JSON.stringify([{ id: "1" }, { id: "2" }]));

    migrateFlags();

    const flags = JSON.parse(localStorage.getItem("es:flags") || "null") as AppFlags;
    expect(flags.schemaVersion).toBe(1);
    expect(flags.disclaimerSeenAt).toBeNull();
    // Verify es:records count unchanged
    const records = JSON.parse(localStorage.getItem("es:records") || "[]");
    expect(records).toHaveLength(2);
  });

  // AC-4: migrateFlags — 건수 유지
  it("AC-4.3: migrateFlags preserves es:records count before and after migration", async () => {
    const { migrateFlags } = await import("@/lib/storage");
    localStorage.clear();
    const recordsBefore = Array.from({ length: 10 }, (_, i) => ({ id: `${i}` }));
    localStorage.setItem("es:records", JSON.stringify(recordsBefore));

    migrateFlags();

    const recordsAfter = JSON.parse(localStorage.getItem("es:records") || "[]");
    expect(recordsAfter).toHaveLength(10);
  });

  // AC-5: console.error 스파이 — 0회 호출
  it("AC-5: console.error is never called during normal operations", async () => {
    const { readJSON, writeJSON, removeKeys, getStorageBytes, migrateFlags } = await import(
      "@/lib/storage"
    );
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    // Run all operations
    readJSON("es:flags", { schemaVersion: 1, disclaimerSeenAt: null });
    writeJSON("es:flags", { schemaVersion: 1, disclaimerSeenAt: null });
    localStorage.setItem("es:test", "value");
    removeKeys(["es:test"]);
    getStorageBytes();
    migrateFlags();

    expect(consoleErrorSpy).not.toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  // Integration: migrateFlags idempotent
  it("Integration: migrateFlags is idempotent (calling twice produces same result)", async () => {
    const { migrateFlags } = await import("@/lib/storage");
    localStorage.clear();

    migrateFlags();
    const firstResult = localStorage.getItem("es:flags");

    migrateFlags();
    const secondResult = localStorage.getItem("es:flags");

    expect(firstResult).toBe(secondResult);
  });

  // Integration: corrupt flag recovery
  it("Integration: corrupted es:flags is recovered by migrateFlags", async () => {
    const { readJSON, migrateFlags } = await import("@/lib/storage");
    localStorage.clear();
    localStorage.setItem("es:flags", "{{invalid");

    // readJSON should handle corruption
    const readResult = readJSON("es:flags", { schemaVersion: 1, disclaimerSeenAt: null });
    expect(readResult.ok).toBe(false);
    expect(readResult.reason).toBe("corrupt");

    // migrateFlags should re-initialize
    migrateFlags();
    const flags = JSON.parse(localStorage.getItem("es:flags") || "null") as AppFlags;
    expect(flags.schemaVersion).toBe(1);
  });
});
