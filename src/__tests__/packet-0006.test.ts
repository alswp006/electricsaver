import { describe, it, expect, beforeEach } from "vitest";
import type {
  MeterRecord,
  UserProfile,
  ApplianceItem,
  ReportUnlock,
} from "@/types/domain";

/**
 * TDD Test Suite for Entity CRUD Repositories (records/profile/appliances/unlocks)
 *
 * Tests will fail until implementations are created:
 * - src/lib/records.ts
 * - src/lib/profile.ts
 * - src/lib/appliances.ts
 * - src/lib/unlocks.ts
 */

describe("Entity CRUD Repositories (packet-0006)", () => {
  // ============================================================================
  // AC-1: records — getRecords() yearMonth descending, upsertRecord, deleteRecord, 60-item limit
  // ============================================================================

  describe("Records Repository", () => {
    it("AC-1.1[P0]: getRecords() returns empty array as default", async () => {
      const { getRecords } = await import("@/lib/records");
      const records = getRecords();
      expect(records).toEqual([]);
      expect(Array.isArray(records)).toBe(true);
    });

    it("AC-1.2[P0]: upsertRecord saves new record and returns success", async () => {
      const { getRecords, upsertRecord } = await import("@/lib/records");

      const record: MeterRecord = {
        yearMonth: "2025-09",
        kWh: 350,
        total: 50000,
        createdAt: Date.now(),
      };

      const result = upsertRecord(record);
      expect(result.ok).toBe(true);

      const records = getRecords();
      expect(records).toHaveLength(1);
      expect(records[0].yearMonth).toBe("2025-09");
      expect(records[0].kWh).toBe(350);
      expect(records[0].total).toBe(50000);
    });

    it("AC-1.3[P0]: upsertRecord updates existing yearMonth (dedupe)", async () => {
      const { getRecords, upsertRecord } = await import("@/lib/records");

      const record1: MeterRecord = {
        yearMonth: "2025-09",
        kWh: 350,
        total: 50000,
        createdAt: 100,
      };
      const record2: MeterRecord = {
        yearMonth: "2025-09",
        kWh: 400, // updated value
        total: 55000, // updated value
        createdAt: 200,
      };

      upsertRecord(record1);
      upsertRecord(record2);

      const records = getRecords();
      expect(records).toHaveLength(1); // count preserved
      expect(records[0].kWh).toBe(400); // new value
      expect(records[0].total).toBe(55000); // new value
    });

    it("AC-1.4[P0]: getRecords() returns records in yearMonth descending order", async () => {
      const { getRecords, upsertRecord } = await import("@/lib/records");

      const records: MeterRecord[] = [
        {
          yearMonth: "2025-07",
          kWh: 300,
          total: 40000,
          createdAt: 100,
        },
        {
          yearMonth: "2025-09",
          kWh: 350,
          total: 50000,
          createdAt: 200,
        },
        {
          yearMonth: "2025-08",
          kWh: 330,
          total: 45000,
          createdAt: 150,
        },
      ];

      records.forEach((r) => upsertRecord(r));

      const result = getRecords();
      expect(result).toHaveLength(3);
      expect(result[0].yearMonth).toBe("2025-09"); // newest first
      expect(result[1].yearMonth).toBe("2025-08");
      expect(result[2].yearMonth).toBe("2025-07"); // oldest last
    });

    it("AC-1.5[P0]: deleteRecord removes record by yearMonth", async () => {
      const { getRecords, upsertRecord, deleteRecord } = await import(
        "@/lib/records"
      );

      const record: MeterRecord = {
        yearMonth: "2025-09",
        kWh: 350,
        total: 50000,
        createdAt: Date.now(),
      };

      upsertRecord(record);
      expect(getRecords()).toHaveLength(1);

      const deleteResult = deleteRecord("2025-09");
      expect(deleteResult.ok).toBe(true);
      expect(getRecords()).toHaveLength(0);
    });

    it("AC-1.6[P0]: 61st record triggers eviction, maintains 60-item limit", async () => {
      const { getRecords, upsertRecord } = await import("@/lib/records");

      // Insert 61 records
      for (let i = 0; i < 61; i++) {
        const month = String(i).padStart(2, "0");
        const record: MeterRecord = {
          yearMonth: `2024-${month}`,
          kWh: 300 + i,
          total: 40000 + i * 100,
          createdAt: i,
        };
        upsertRecord(record);
      }

      const records = getRecords();
      expect(records).toHaveLength(60); // limit enforced
      // Oldest (createdAt=0) should be evicted
      expect(records.every((r) => r.createdAt > 0)).toBe(true);
    });

    it("AC-1.7[P0]: upsertRecord returns writeJSON result for quota awareness", async () => {
      const { upsertRecord } = await import("@/lib/records");

      const record: MeterRecord = {
        yearMonth: "2025-09",
        kWh: 350,
        total: 50000,
        createdAt: Date.now(),
      };

      const result = upsertRecord(record);
      expect(typeof result).toBe("object");
      expect(result).toHaveProperty("ok");
      expect(typeof result.ok).toBe("boolean");
    });
  });

  // ============================================================================
  // AC-2: profile — getProfile() default, setProfile patch update
  // ============================================================================

  describe("Profile Repository", () => {
    it("AC-2.1[P0]: getProfile() returns default { regionCode:'11', householdSize:2 }", async () => {
      const { getProfile } = await import("@/lib/profile");

      const profile = getProfile();
      expect(profile.regionCode).toBe("11");
      expect(profile.householdSize).toBe(2);
    });

    it("AC-2.2[P0]: setProfile updates profile with patch (partial update)", async () => {
      const { getProfile, setProfile } = await import("@/lib/profile");

      const patch: Partial<UserProfile> = { householdSize: 4 };
      const result = setProfile(patch);

      expect(result.ok).toBe(true);

      const updated = getProfile();
      expect(updated.householdSize).toBe(4);
      expect(updated.regionCode).toBe("11"); // unchanged
    });

    it("AC-2.3[P0]: setProfile updates regionCode independently", async () => {
      const { getProfile, setProfile } = await import("@/lib/profile");

      const patch: Partial<UserProfile> = { regionCode: "26" };
      const result = setProfile(patch);

      expect(result.ok).toBe(true);

      const updated = getProfile();
      expect(updated.regionCode).toBe("26");
      expect(updated.householdSize).toBe(2); // unchanged
    });

    it("AC-2.4[P0]: setProfile returns writeJSON result for quota awareness", async () => {
      const { setProfile } = await import("@/lib/profile");

      const patch: Partial<UserProfile> = { householdSize: 3 };
      const result = setProfile(patch);

      expect(typeof result).toBe("object");
      expect(result).toHaveProperty("ok");
      expect(typeof result.ok).toBe("boolean");
    });
  });

  // ============================================================================
  // AC-3: appliances — 12-item limit, addAppliance rejection at limit, update/remove
  // ============================================================================

  describe("Appliances Repository", () => {
    it("AC-3.1[P0]: getAppliances() returns empty array as default", async () => {
      const { getAppliances } = await import("@/lib/appliances");

      const appliances = getAppliances();
      expect(appliances).toEqual([]);
      expect(Array.isArray(appliances)).toBe(true);
    });

    it("AC-3.2[P0]: addAppliance saves appliance below 12-item limit", async () => {
      const { getAppliances, addAppliance } = await import(
        "@/lib/appliances"
      );

      const appliance: ApplianceItem = {
        id: "ac-001",
        name: "에어컨",
        watt: 1500,
        hoursPerDay: 8,
        reduceRatio: 0.3,
      };

      const result = addAppliance(appliance);
      expect(result.ok).toBe(true);

      const appliances = getAppliances();
      expect(appliances).toHaveLength(1);
      expect(appliances[0].id).toBe("ac-001");
      expect(appliances[0].name).toBe("에어컨");
      expect(appliances[0].watt).toBe(1500);
    });

    it("AC-3.3[P0]: addAppliance at 12-item limit returns { ok:false, reason:'limit' }", async () => {
      const { getAppliances, addAppliance } = await import(
        "@/lib/appliances"
      );

      // Fill to 12 items
      for (let i = 0; i < 12; i++) {
        const appliance: ApplianceItem = {
          id: `appliance-${i}`,
          name: `기기-${i}`,
          watt: 1000,
          hoursPerDay: 6,
          reduceRatio: 0.2,
        };
        addAppliance(appliance);
      }

      expect(getAppliances()).toHaveLength(12);

      // 13th attempt should be rejected
      const newAppliance: ApplianceItem = {
        id: "appliance-13",
        name: "기기-13",
        watt: 1000,
        hoursPerDay: 6,
        reduceRatio: 0.2,
      };

      const result = addAppliance(newAppliance);
      expect(result.ok).toBe(false);
      expect(result.reason).toBe("limit");

      // Count remains 12
      expect(getAppliances()).toHaveLength(12);
    });

    it("AC-3.4[P0]: updateAppliance modifies appliance by id", async () => {
      const { getAppliances, addAppliance, updateAppliance } = await import(
        "@/lib/appliances"
      );

      const appliance: ApplianceItem = {
        id: "ac-001",
        name: "에어컨",
        watt: 1500,
        hoursPerDay: 8,
        reduceRatio: 0.3,
      };

      addAppliance(appliance);

      const patch: Partial<ApplianceItem> = {
        name: "에어컨 (수정)",
        watt: 2000,
        hoursPerDay: 10,
        reduceRatio: 0.5,
      };

      const result = updateAppliance("ac-001", patch);
      expect(result.ok).toBe(true);

      const appliances = getAppliances();
      expect(appliances).toHaveLength(1);
      expect(appliances[0].name).toBe("에어컨 (수정)");
      expect(appliances[0].watt).toBe(2000);
      expect(appliances[0].hoursPerDay).toBe(10);
    });

    it("AC-3.5[P0]: removeAppliance deletes appliance by id", async () => {
      const { getAppliances, addAppliance, removeAppliance } = await import(
        "@/lib/appliances"
      );

      const appliance: ApplianceItem = {
        id: "ac-001",
        name: "에어컨",
        watt: 1500,
        hoursPerDay: 8,
        reduceRatio: 0.3,
      };

      addAppliance(appliance);
      expect(getAppliances()).toHaveLength(1);

      const result = removeAppliance("ac-001");
      expect(result.ok).toBe(true);
      expect(getAppliances()).toHaveLength(0);
    });

    it("AC-3.6[P0]: updateAppliance and removeAppliance return writeJSON result", async () => {
      const { addAppliance, updateAppliance, removeAppliance } = await import(
        "@/lib/appliances"
      );

      const appliance: ApplianceItem = {
        id: "ac-001",
        name: "에어컨",
        watt: 1500,
        hoursPerDay: 8,
        reduceRatio: 0.3,
      };

      addAppliance(appliance);

      const updateResult = updateAppliance("ac-001", { name: "에어컨 (수정)" });
      expect(typeof updateResult).toBe("object");
      expect(updateResult).toHaveProperty("ok");

      const removeResult = removeAppliance("ac-001");
      expect(typeof removeResult).toBe("object");
      expect(removeResult).toHaveProperty("ok");
    });
  });

  // ============================================================================
  // AC-4: unlocks — TTL 24h, addUnlock, pruneUnlocks, hasValidUnlock, 12-item limit with eviction
  // ============================================================================

  describe("Unlocks Repository", () => {
    it("AC-4.1[P0]: getUnlocks() returns empty array as default", async () => {
      const { getUnlocks } = await import("@/lib/unlocks");

      const unlocks = getUnlocks();
      expect(unlocks).toEqual([]);
      expect(Array.isArray(unlocks)).toBe(true);
    });

    it("AC-4.2[P0]: addUnlock(id, now) sets expiresAt to now + 86400000 (24h)", async () => {
      const { getUnlocks, addUnlock } = await import("@/lib/unlocks");

      const now = Date.now();
      const result = addUnlock("appliance-1", now);

      expect(result.ok).toBe(true);

      const unlocks = getUnlocks();
      expect(unlocks).toHaveLength(1);
      expect(unlocks[0].applianceId).toBe("appliance-1");
      expect(unlocks[0].unlockedAt).toBe(now);
      expect(unlocks[0].expiresAt).toBe(now + 86400000); // exactly 24h later
    });

    it("AC-4.3[P0]: hasValidUnlock returns true before expiration, false after", async () => {
      const { addUnlock, hasValidUnlock } = await import("@/lib/unlocks");

      const now = Date.now();
      addUnlock("appliance-1", now);

      // Before expiration
      expect(hasValidUnlock("appliance-1", now + 1000)).toBe(true);
      expect(hasValidUnlock("appliance-1", now + 43200000)).toBe(true); // 12h later

      // At/after expiration
      expect(hasValidUnlock("appliance-1", now + 86400000)).toBe(false);
      expect(hasValidUnlock("appliance-1", now + 86400001)).toBe(false);

      // Non-existent unlock
      expect(hasValidUnlock("non-existent", now)).toBe(false);
    });

    it("AC-4.4[P0]: pruneUnlocks(now) removes expired items", async () => {
      const { getUnlocks, addUnlock, pruneUnlocks } = await import(
        "@/lib/unlocks"
      );

      const now = Date.now();

      // Add two unlocks
      addUnlock("appliance-1", now - 100000); // expires at now - 100000 + 86400000
      addUnlock("appliance-2", now); // expires at now + 86400000

      const beforePrune = getUnlocks();
      expect(beforePrune).toHaveLength(2);

      // Prune at time when first has expired, second hasn't
      const pruneTime = now + 86300000; // first expired, second still valid
      pruneUnlocks(pruneTime);

      const afterPrune = getUnlocks();
      expect(afterPrune).toHaveLength(1);
      expect(afterPrune[0].applianceId).toBe("appliance-2");
    });

    it("AC-4.5[P0]: pruneUnlocks returns writeJSON result", async () => {
      const { addUnlock, pruneUnlocks } = await import("@/lib/unlocks");

      const now = Date.now();
      addUnlock("appliance-1", now);

      const result = pruneUnlocks(now + 86400000);
      expect(typeof result).toBe("object");
      expect(result).toHaveProperty("ok");
      expect(typeof result.ok).toBe("boolean");
    });

    it("AC-4.6[P0]: 13th unlock triggers eviction of oldest unlockedAt, maintains 12-item limit", async () => {
      const { getUnlocks, addUnlock } = await import("@/lib/unlocks");

      const baseTime = Date.now();

      // Add 13 unlocks
      for (let i = 0; i < 13; i++) {
        const time = baseTime + i * 1000; // stagger times
        addUnlock(`appliance-${i}`, time);
      }

      const unlocks = getUnlocks();
      expect(unlocks).toHaveLength(12); // limit enforced

      // Oldest (time=baseTime) should be evicted
      const oldestId = unlocks.find((u) => u.applianceId === "appliance-0");
      expect(oldestId).toBeUndefined();

      // Newest should be preserved
      const newestId = unlocks.find((u) => u.applianceId === "appliance-12");
      expect(newestId).toBeDefined();
    });

    it("AC-4.7[P0]: addUnlock returns writeJSON result for quota awareness", async () => {
      const { addUnlock } = await import("@/lib/unlocks");

      const result = addUnlock("appliance-1", Date.now());

      expect(typeof result).toBe("object");
      expect(result).toHaveProperty("ok");
      expect(typeof result.ok).toBe("boolean");
    });
  });

  // ============================================================================
  // AC-5: All tests green
  // ============================================================================

  describe("Integration", () => {
    it("AC-5.1[P0]: all repositories load without import errors", async () => {
      const records = await import("@/lib/records");
      const profile = await import("@/lib/profile");
      const appliances = await import("@/lib/appliances");
      const unlocks = await import("@/lib/unlocks");

      expect(typeof records.getRecords).toBe("function");
      expect(typeof profile.getProfile).toBe("function");
      expect(typeof appliances.getAppliances).toBe("function");
      expect(typeof unlocks.getUnlocks).toBe("function");
    });
  });
});
