import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("safeStorage 기반 계층 (CC-12 대응)", () => {
  const originalLocalStorage = globalThis.localStorage;

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    Object.defineProperty(globalThis, "localStorage", {
      value: originalLocalStorage,
      writable: true,
    });
  });

  describe("AC-1: readJson returns fallback when key missing or JSON corrupted", () => {
    it("should return fallback when key does not exist", async () => {
      const { readJson } = await import("@/lib/safeStorage");
      const fallback = [];
      const result = readJson("es:records:v1", fallback);
      expect(result).toEqual(fallback);
      expect(result).toStrictEqual([]);
    });

    it("should return fallback when stored value is corrupted JSON", async () => {
      const { readJson } = await import("@/lib/safeStorage");
      localStorage.setItem("es:records:v1", "{invalid json");
      const fallback = [];
      const result = readJson("es:records:v1", fallback);
      expect(result).toEqual(fallback);
      expect(result).toStrictEqual([]);
    });

    it("should not throw exception on missing or corrupted data", async () => {
      const { readJson } = await import("@/lib/safeStorage");
      expect(() => readJson("nonexistent:key", [])).not.toThrow();
      localStorage.setItem("corrupted:key", "{ broken");
      expect(() => readJson("corrupted:key", {})).not.toThrow();
    });
  });

  describe("AC-2: writeJson returns {ok:false, reason:'quota'} on QuotaExceededError", () => {
    it("should return {ok:false, reason:'quota'} when storage quota exceeded", async () => {
      const { writeJson } = await import("@/lib/safeStorage");
      const mockLocalStorage = {
        setItem: vi.fn(() => {
          throw new DOMException("QuotaExceededError", "QuotaExceededError");
        }),
        getItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
        length: 0,
        key: vi.fn(),
      };
      Object.defineProperty(globalThis, "localStorage", {
        value: mockLocalStorage,
        writable: true,
      });

      const result = writeJson("es:records:v1", { count: 100 });
      expect(result).toEqual({ ok: false, reason: "quota" });
      expect(result.ok).toBe(false);
      expect(result.reason).toBe("quota");
    });

    it("should not throw exception on QuotaExceededError", async () => {
      const { writeJson } = await import("@/lib/safeStorage");
      const mockLocalStorage = {
        setItem: vi.fn(() => {
          throw new DOMException("QuotaExceededError", "QuotaExceededError");
        }),
        getItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
        length: 0,
        key: vi.fn(),
      };
      Object.defineProperty(globalThis, "localStorage", {
        value: mockLocalStorage,
        writable: true,
      });

      expect(() => writeJson("es:records:v1", {})).not.toThrow();
    });
  });

  describe("AC-3: writeJson success followed by readJson deep-equal", () => {
    it("should return written object via readJson after successful writeJson", async () => {
      const { readJson, writeJson } = await import("@/lib/safeStorage");
      const testData = { id: "record-1", amount: 5000, timestamp: 1234567890 };

      const writeResult = writeJson("es:records:v1", testData);
      expect(writeResult).toEqual({ ok: true });
      expect(writeResult.ok).toBe(true);

      const readResult = readJson("es:records:v1", []);
      expect(readResult).toEqual(testData);
      expect(readResult).toStrictEqual(testData);
      expect(readResult.id).toBe("record-1");
      expect(readResult.amount).toBe(5000);
    });

    it("should persist complex nested objects correctly", async () => {
      const { readJson, writeJson } = await import("@/lib/safeStorage");
      const complexData = {
        user: { name: "Alice", id: 123 },
        records: [
          { date: "2026-01-01", value: 1000 },
          { date: "2026-01-02", value: 2000 },
        ],
        metadata: { version: 1, lastUpdated: 1234567890 },
      };

      const writeResult = writeJson("es:complex:v1", complexData);
      expect(writeResult.ok).toBe(true);

      const readResult = readJson("es:complex:v1", {});
      expect(readResult).toEqual(complexData);
      expect(readResult.user.name).toBe("Alice");
      expect(readResult.records).toHaveLength(2);
      expect(readResult.records[0].value).toBe(1000);
      expect(readResult.metadata.version).toBe(1);
    });
  });

  describe("AC-4: unavailable localStorage environment (undefined)", () => {
    it("should return fallback when localStorage is undefined", async () => {
      Object.defineProperty(globalThis, "localStorage", {
        value: undefined,
        writable: true,
      });
      const { readJson } = await import("@/lib/safeStorage");
      const fallback = [];
      const result = readJson("es:records:v1", fallback);
      expect(result).toEqual(fallback);
      expect(result).toStrictEqual([]);
    });

    it("should return {ok:false, reason:'unavailable'} when localStorage is undefined", async () => {
      Object.defineProperty(globalThis, "localStorage", {
        value: undefined,
        writable: true,
      });
      const { writeJson } = await import("@/lib/safeStorage");
      const result = writeJson("es:records:v1", { count: 100 });
      expect(result).toEqual({ ok: false, reason: "unavailable" });
      expect(result.ok).toBe(false);
      expect(result.reason).toBe("unavailable");
    });

    it("should not throw when localStorage is unavailable", async () => {
      Object.defineProperty(globalThis, "localStorage", {
        value: undefined,
        writable: true,
      });
      const { readJson, writeJson } = await import("@/lib/safeStorage");
      expect(() => readJson("any:key", [])).not.toThrow();
      expect(() => writeJson("any:key", {})).not.toThrow();
    });
  });
});
