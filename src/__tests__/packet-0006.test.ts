import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { UsageRecord } from "@/lib/types";

/**
 * Packet 0006 TDD RED PHASE — recordStore (list/upsert/remove/prune/latest)
 *
 * Files to be implemented (by Coder):
 * - src/lib/recordStore.ts: upsertRecord, listRecords, removeRecord, pruneRecords, getLatestRecord
 *
 * Schema: UsageRecord[] stored at localStorage key 'es:records:v1'
 * - id: 'rec_' + yearMonth (enforced)
 * - Max 60 records (older entries pruned)
 * - yearMonth DESC order
 *
 * All tests are pure function tests with localStorage isolation.
 * RED phase: Tests WILL fail until implementations exist.
 */

describe("recordStore (list/upsert/remove/prune/latest)", () => {
  const originalLocalStorage = globalThis.localStorage;
  const STORAGE_KEY = "es:records:v1";

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

  describe("AC-1: upsertRecord — duplicate yearMonth overwrites with updatedAt refresh", () => {
    it("AC-1[P0]: should overwrite existing yearMonth and update updatedAt", async () => {
      const { upsertRecord, listRecords } = await import("@/lib/recordStore");

      const rec1 = upsertRecord({
        id: "rec_2026-08",
        yearMonth: "2026-08",
        kWh: 100,
        contractType: "low",
        total: 20000,
        tariffVersion: "v2024.01",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      expect(rec1.ok).toBe(true);

      // Wait a tiny bit to ensure updatedAt is different
      await new Promise((r) => setTimeout(r, 10));

      const rec2 = upsertRecord({
        id: "rec_2026-08",
        yearMonth: "2026-08",
        kWh: 200,
        contractType: "low",
        total: 40000,
        tariffVersion: "v2024.01",
        createdAt: rec1.createdAt,
        updatedAt: Date.now(),
      });

      expect(rec2.ok).toBe(true);

      const records = listRecords();
      expect(records).toHaveLength(1);
      expect(records[0].kWh).toBe(200);
      expect(records[0].total).toBe(40000);
      expect(records[0].updatedAt).toBeGreaterThan(rec1.updatedAt);
    });

    it("AC-1[P0]: should maintain createdAt on upsert (not reset)", async () => {
      const { upsertRecord, listRecords } = await import("@/lib/recordStore");

      const now = Date.now();
      const rec1 = upsertRecord({
        id: "rec_2026-08",
        yearMonth: "2026-08",
        kWh: 100,
        contractType: "low",
        total: 20000,
        tariffVersion: "v2024.01",
        createdAt: now,
        updatedAt: now,
      });

      await new Promise((r) => setTimeout(r, 20));

      const rec2 = upsertRecord({
        id: "rec_2026-08",
        yearMonth: "2026-08",
        kWh: 150,
        contractType: "low",
        total: 30000,
        tariffVersion: "v2024.01",
        createdAt: now,
        updatedAt: Date.now(),
      });

      const records = listRecords();
      expect(records[0].createdAt).toBe(now);
      expect(records[0].updatedAt).toBeGreaterThan(now);
    });
  });

  describe("AC-2: listRecords — yearMonth DESC order, first element matches getLatestRecord", () => {
    it("AC-2[P0]: should return records sorted by yearMonth DESC", async () => {
      const { upsertRecord, listRecords } = await import("@/lib/recordStore");

      // Insert in random order
      upsertRecord({
        id: "rec_2026-06",
        yearMonth: "2026-06",
        kWh: 100,
        contractType: "low",
        total: 20000,
        tariffVersion: "v2024.01",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      upsertRecord({
        id: "rec_2026-08",
        yearMonth: "2026-08",
        kWh: 150,
        contractType: "low",
        total: 30000,
        tariffVersion: "v2024.01",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      upsertRecord({
        id: "rec_2026-07",
        yearMonth: "2026-07",
        kWh: 120,
        contractType: "low",
        total: 25000,
        tariffVersion: "v2024.01",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      const records = listRecords();
      expect(records).toHaveLength(3);
      expect(records[0].yearMonth).toBe("2026-08");
      expect(records[1].yearMonth).toBe("2026-07");
      expect(records[2].yearMonth).toBe("2026-06");
    });

    it("AC-2[P0]: should have first element equal to getLatestRecord", async () => {
      const { upsertRecord, listRecords, getLatestRecord } = await import(
        "@/lib/recordStore"
      );

      upsertRecord({
        id: "rec_2026-05",
        yearMonth: "2026-05",
        kWh: 100,
        contractType: "low",
        total: 20000,
        tariffVersion: "v2024.01",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      upsertRecord({
        id: "rec_2026-08",
        yearMonth: "2026-08",
        kWh: 200,
        contractType: "low",
        total: 40000,
        tariffVersion: "v2024.01",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      const list = listRecords();
      const latest = getLatestRecord();

      expect(latest).not.toBeNull();
      expect(list[0]).toEqual(latest);
      expect(list[0].yearMonth).toBe("2026-08");
    });

    it("AC-2[P0]: should return empty array when no records exist", async () => {
      const { listRecords, getLatestRecord } = await import("@/lib/recordStore");

      const records = listRecords();
      const latest = getLatestRecord();

      expect(records).toEqual([]);
      expect(latest).toBeNull();
    });
  });

  describe("AC-3: pruneRecords — 60 record limit, oldest yearMonth removed", () => {
    it("AC-3[P0]: should remove oldest record when 61 records inserted", async () => {
      const { upsertRecord, listRecords } = await import("@/lib/recordStore");

      // Insert 61 records (2025-01 through 2026-01 via manual creation for test)
      const baseYear = 2025;
      const baseMonth = 1;

      for (let i = 0; i < 61; i++) {
        const monthOffset = i;
        const year = baseYear + Math.floor((baseMonth + monthOffset - 1) / 12);
        const month = ((baseMonth + monthOffset - 1) % 12) + 1;
        const yearMonth = `${year}-${String(month).padStart(2, "0")}`;

        upsertRecord({
          id: `rec_${yearMonth}`,
          yearMonth,
          kWh: 100 + i,
          contractType: "low",
          total: 20000 + i * 100,
          tariffVersion: "v2024.01",
          createdAt: Date.now() - (61 - i) * 1000,
          updatedAt: Date.now() - (61 - i) * 1000,
        });
      }

      const records = listRecords();
      expect(records).toHaveLength(60);
      expect(records[0].yearMonth).toBe("2026-01");
      expect(records[records.length - 1].yearMonth).toBe("2025-02");
    });

    it("AC-3[P0]: should NOT include 2025-01 after pruning", async () => {
      const { upsertRecord, listRecords } = await import("@/lib/recordStore");

      for (let i = 0; i < 61; i++) {
        const monthOffset = i;
        const year = 2025 + Math.floor((1 + monthOffset - 1) / 12);
        const month = ((1 + monthOffset - 1) % 12) + 1;
        const yearMonth = `${year}-${String(month).padStart(2, "0")}`;

        upsertRecord({
          id: `rec_${yearMonth}`,
          yearMonth,
          kWh: 100 + i,
          contractType: "low",
          total: 20000 + i * 100,
          tariffVersion: "v2024.01",
          createdAt: Date.now() - (61 - i) * 1000,
          updatedAt: Date.now() - (61 - i) * 1000,
        });
      }

      const records = listRecords();
      const yearMonths = records.map((r) => r.yearMonth);
      expect(yearMonths).not.toContain("2025-01");
      expect(yearMonths).toContain("2025-02");
    });
  });

  describe("AC-4: removeRecord — persistence across page reload", () => {
    it("AC-4[P0]: should not include removed record in listRecords", async () => {
      const { upsertRecord, removeRecord, listRecords } = await import(
        "@/lib/recordStore"
      );

      upsertRecord({
        id: "rec_2026-08",
        yearMonth: "2026-08",
        kWh: 150,
        contractType: "low",
        total: 30000,
        tariffVersion: "v2024.01",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      upsertRecord({
        id: "rec_2026-07",
        yearMonth: "2026-07",
        kWh: 120,
        contractType: "low",
        total: 25000,
        tariffVersion: "v2024.01",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      expect(listRecords()).toHaveLength(2);

      removeRecord("rec_2026-08");

      const records = listRecords();
      expect(records).toHaveLength(1);
      expect(records[0].id).toBe("rec_2026-07");
    });

    it("AC-4[P0]: should persist removal to localStorage (survives re-import)", async () => {
      const { upsertRecord, removeRecord } = await import("@/lib/recordStore");

      upsertRecord({
        id: "rec_2026-08",
        yearMonth: "2026-08",
        kWh: 150,
        contractType: "low",
        total: 30000,
        tariffVersion: "v2024.01",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      removeRecord("rec_2026-08");

      // Verify localStorage directly (simulating page reload)
      const stored = localStorage.getItem(STORAGE_KEY);
      const parsed = stored ? JSON.parse(stored) : [];
      expect(parsed).toHaveLength(0);
    });

    it("AC-4[P0]: should not throw when removing non-existent record", async () => {
      const { removeRecord } = await import("@/lib/recordStore");

      expect(() => removeRecord("rec_2026-99")).not.toThrow();
    });
  });

  describe("AC-5: upsertRecord quota failure — returns {ok:false, reason:'quota'}", () => {
    it("AC-5[P0]: should return {ok:false, reason:'quota'} when writeJson fails with quota error", async () => {
      const { upsertRecord } = await import("@/lib/recordStore");

      // Mock localStorage to throw QuotaExceededError
      const mockLocalStorage = {
        setItem: vi.fn(() => {
          throw new DOMException("QuotaExceededError", "QuotaExceededError");
        }),
        getItem: vi.fn(() => null),
        removeItem: vi.fn(),
        clear: vi.fn(),
        length: 0,
        key: vi.fn(),
      };

      Object.defineProperty(globalThis, "localStorage", {
        value: mockLocalStorage,
        writable: true,
      });

      const result = upsertRecord({
        id: "rec_2026-08",
        yearMonth: "2026-08",
        kWh: 150,
        contractType: "low",
        total: 30000,
        tariffVersion: "v2024.01",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      expect(result.ok).toBe(false);
      expect(result.reason).toBe("quota");
    });

    it("AC-5[P0]: should not throw exception on quota error", async () => {
      const { upsertRecord } = await import("@/lib/recordStore");

      const mockLocalStorage = {
        setItem: vi.fn(() => {
          throw new DOMException("QuotaExceededError", "QuotaExceededError");
        }),
        getItem: vi.fn(() => null),
        removeItem: vi.fn(),
        clear: vi.fn(),
        length: 0,
        key: vi.fn(),
      };

      Object.defineProperty(globalThis, "localStorage", {
        value: mockLocalStorage,
        writable: true,
      });

      expect(() =>
        upsertRecord({
          id: "rec_2026-08",
          yearMonth: "2026-08",
          kWh: 150,
          contractType: "low",
          total: 30000,
          tariffVersion: "v2024.01",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        })
      ).not.toThrow();
    });
  });
});
