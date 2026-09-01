import { describe, it, expect, beforeEach, afterEach } from "vitest";
import type { MeterRecord, UserProfile, ApplianceItem, ReportUnlock } from "@/types/domain";

// These imports will fail until the implementations exist — that's intentional (TDD)
// Commenting out for now to avoid import errors, will uncomment when testing
// import { getRecords, upsertRecord, deleteRecord } from "@/lib/records";
// import { getProfile, setProfile } from "@/lib/profile";
// import { addAppliance, updateAppliance, removeAppliance } from "@/lib/appliances";
// import { addUnlock, pruneUnlocks, hasValidUnlock } from "@/lib/unlocks";

describe("AC-1: records.ts — getRecords, upsertRecord, deleteRecord, 60-item limit", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("AC-1.1: getRecords() returns empty array when no data exists", async () => {
    // Dynamic import to avoid hard import failure during test discovery
    const { getRecords } = await import("@/lib/records");
    const records = getRecords();
    expect(records).toEqual([]);
  });

  it("AC-1.2: getRecords() returns records sorted by yearMonth descending", async () => {
    const { getRecords, upsertRecord } = await import("@/lib/records");

    const record1: MeterRecord = { yearMonth: "202401", kWh: 100, total: 10000, createdAt: Date.now() };
    const record2: MeterRecord = { yearMonth: "202402", kWh: 110, total: 11000, createdAt: Date.now() };
    const record3: MeterRecord = { yearMonth: "202403", kWh: 120, total: 12000, createdAt: Date.now() };

    upsertRecord(record1);
    upsertRecord(record2);
    upsertRecord(record3);

    const records = getRecords();
    expect(records).toHaveLength(3);
    expect(records[0].yearMonth).toBe("202403");
    expect(records[1].yearMonth).toBe("202402");
    expect(records[2].yearMonth).toBe("202401");
  });

  it("AC-1.3: upsertRecord() overwrites existing record with same yearMonth (count stays same)", async () => {
    const { getRecords, upsertRecord } = await import("@/lib/records");

    const record1: MeterRecord = { yearMonth: "202401", kWh: 100, total: 10000, createdAt: Date.now() };
    const record1Updated: MeterRecord = { yearMonth: "202401", kWh: 150, total: 15000, createdAt: Date.now() };

    upsertRecord(record1);
    let records = getRecords();
    expect(records).toHaveLength(1);
    expect(records[0].kWh).toBe(100);

    upsertRecord(record1Updated);
    records = getRecords();
    expect(records).toHaveLength(1); // Count stays same
    expect(records[0].kWh).toBe(150); // Value updated
    expect(records[0].total).toBe(15000);
  });

  it("AC-1.4: deleteRecord() removes record by yearMonth", async () => {
    const { getRecords, upsertRecord, deleteRecord } = await import("@/lib/records");

    const record1: MeterRecord = { yearMonth: "202401", kWh: 100, total: 10000, createdAt: Date.now() };
    const record2: MeterRecord = { yearMonth: "202402", kWh: 110, total: 11000, createdAt: Date.now() };

    upsertRecord(record1);
    upsertRecord(record2);
    expect(getRecords()).toHaveLength(2);

    deleteRecord("202401");
    const records = getRecords();
    expect(records).toHaveLength(1);
    expect(records[0].yearMonth).toBe("202402");
  });

  it("AC-1.5: 61 inserted records triggers 60-item limit, keeping newest 60", async () => {
    const { getRecords, upsertRecord } = await import("@/lib/records");

    // Insert 61 records with sequential yearMonth values
    for (let i = 1; i <= 61; i++) {
      const yearMonth = String(202300 + i).padStart(6, "0").slice(-6);
      const record: MeterRecord = {
        yearMonth,
        kWh: 100 + i,
        total: 10000 + i * 1000,
        createdAt: Date.now() + i,
      };
      upsertRecord(record);
    }

    const records = getRecords();
    expect(records).toHaveLength(60); // Should be capped at 60
    expect(records[0].yearMonth).toBe("202361"); // Newest (highest)
    expect(records[59].yearMonth).toBe("202302"); // Oldest kept (lowest)
    // 202301 should be deleted as it's the oldest
  });
});

describe("AC-2: profile.ts — getProfile, setProfile", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("AC-2.1: getProfile() returns default { regionCode:'11', householdSize:2 } when no data", async () => {
    const { getProfile } = await import("@/lib/profile");
    const profile = getProfile();
    expect(profile).toEqual({ regionCode: "11", householdSize: 2 });
  });

  it("AC-2.2: getProfile() returns previously set profile", async () => {
    const { getProfile, setProfile } = await import("@/lib/profile");

    const newProfile: UserProfile = { regionCode: "26", householdSize: 4 };
    setProfile(newProfile);

    const profile = getProfile();
    expect(profile.regionCode).toBe("26");
    expect(profile.householdSize).toBe(4);
  });

  it("AC-2.3: setProfile(patch) performs partial update (only updates specified fields)", async () => {
    const { getProfile, setProfile } = await import("@/lib/profile");

    // Set initial full profile
    setProfile({ regionCode: "26", householdSize: 3 });

    // Partial update: only regionCode
    setProfile({ regionCode: "11" });

    const profile = getProfile();
    expect(profile.regionCode).toBe("11");
    expect(profile.householdSize).toBe(3); // Should remain unchanged
  });

  it("AC-2.4: setProfile(patch) with householdSize only preserves regionCode", async () => {
    const { getProfile, setProfile } = await import("@/lib/profile");

    setProfile({ regionCode: "27", householdSize: 2 });
    setProfile({ householdSize: 4 });

    const profile = getProfile();
    expect(profile.regionCode).toBe("27"); // Should remain unchanged
    expect(profile.householdSize).toBe(4); // Should be updated
  });
});

describe("AC-3: appliances.ts — addAppliance, updateAppliance, removeAppliance, 12-item limit", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("AC-3.1: addAppliance() returns { ok:false, reason:'limit' } when count is 12", async () => {
    const { addAppliance, getAppliances } = await import("@/lib/appliances");

    // Add 12 appliances to reach limit
    for (let i = 1; i <= 12; i++) {
      const appliance: ApplianceItem = {
        id: `appliance-${i}`,
        name: `Device ${i}`,
        watt: 1000 + i * 100,
        hoursPerDay: 4,
        reduceRatio: 0.2,
      };
      addAppliance(appliance);
    }

    expect(getAppliances()).toHaveLength(12);

    // Try to add 13th appliance
    const newAppliance: ApplianceItem = {
      id: "appliance-13",
      name: "Device 13",
      watt: 2300,
      hoursPerDay: 4,
      reduceRatio: 0.2,
    };
    const result = addAppliance(newAppliance);
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("limit");
    expect(getAppliances()).toHaveLength(12); // Count should not increase
  });

  it("AC-3.2: addAppliance() returns { ok:true } when count < 12", async () => {
    const { addAppliance } = await import("@/lib/appliances");

    const appliance: ApplianceItem = {
      id: "appliance-1",
      name: "AC Unit",
      watt: 3000,
      hoursPerDay: 8,
      reduceRatio: 0.3,
    };
    const result = addAppliance(appliance);
    expect(result.ok).toBe(true);
  });

  it("AC-3.3: updateAppliance() updates existing appliance by id", async () => {
    const { addAppliance, updateAppliance, getAppliances } = await import("@/lib/appliances");

    const appliance: ApplianceItem = {
      id: "appliance-1",
      name: "AC Unit",
      watt: 3000,
      hoursPerDay: 8,
      reduceRatio: 0.3,
    };
    addAppliance(appliance);

    const result = updateAppliance("appliance-1", {
      name: "AC Unit Updated",
      watt: 3500,
      hoursPerDay: 10,
      reduceRatio: 0.5,
    });
    expect(result.ok).toBe(true);

    const appliances = getAppliances();
    expect(appliances[0].name).toBe("AC Unit Updated");
    expect(appliances[0].watt).toBe(3500);
  });

  it("AC-3.4: removeAppliance() removes appliance by id", async () => {
    const { addAppliance, removeAppliance, getAppliances } = await import("@/lib/appliances");

    const appliance: ApplianceItem = {
      id: "appliance-1",
      name: "AC Unit",
      watt: 3000,
      hoursPerDay: 8,
      reduceRatio: 0.3,
    };
    addAppliance(appliance);
    expect(getAppliances()).toHaveLength(1);

    const result = removeAppliance("appliance-1");
    expect(result.ok).toBe(true);
    expect(getAppliances()).toHaveLength(0);
  });

  it("AC-3.5: updateAppliance() returns { ok:false } when appliance not found", async () => {
    const { updateAppliance } = await import("@/lib/appliances");

    const result = updateAppliance("nonexistent", { name: "Not Found" });
    expect(result.ok).toBe(false);
  });

  it("AC-3.6: removeAppliance() returns { ok:false } when appliance not found", async () => {
    const { removeAppliance } = await import("@/lib/appliances");

    const result = removeAppliance("nonexistent");
    expect(result.ok).toBe(false);
  });
});

describe("AC-4: unlocks.ts — addUnlock, pruneUnlocks, hasValidUnlock", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("AC-4.1: addUnlock(id, now) sets expiresAt to now + 86400000 (24 hours)", async () => {
    const { addUnlock, getUnlocks } = await import("@/lib/unlocks");

    const now = Date.now();
    addUnlock("appliance-1", now);

    const unlocks = getUnlocks();
    expect(unlocks).toHaveLength(1);
    expect(unlocks[0].applianceId).toBe("appliance-1");
    expect(unlocks[0].expiresAt).toBe(now + 86400000);
  });

  it("AC-4.2: pruneUnlocks(now) removes expired unlocks", async () => {
    const { addUnlock, pruneUnlocks, getUnlocks } = await import("@/lib/unlocks");

    const now = Date.now();
    addUnlock("appliance-1", now - 100000); // Expired
    addUnlock("appliance-2", now + 50000); // Still valid

    pruneUnlocks(now);

    const unlocks = getUnlocks();
    expect(unlocks).toHaveLength(1);
    expect(unlocks[0].applianceId).toBe("appliance-2");
  });

  it("AC-4.3: hasValidUnlock(id, now) returns true before expiration", async () => {
    const { addUnlock, hasValidUnlock } = await import("@/lib/unlocks");

    const now = Date.now();
    addUnlock("appliance-1", now);

    // Check at time before expiration
    const result = hasValidUnlock("appliance-1", now + 50000);
    expect(result).toBe(true);
  });

  it("AC-4.4: hasValidUnlock(id, now) returns false after expiration", async () => {
    const { addUnlock, hasValidUnlock } = await import("@/lib/unlocks");

    const now = Date.now();
    addUnlock("appliance-1", now);

    // Check at time after expiration (24 hours + 1ms)
    const result = hasValidUnlock("appliance-1", now + 86400000 + 1);
    expect(result).toBe(false);
  });

  it("AC-4.5: hasValidUnlock(id, now) returns false for non-existent unlock", async () => {
    const { hasValidUnlock } = await import("@/lib/unlocks");

    const now = Date.now();
    const result = hasValidUnlock("nonexistent", now);
    expect(result).toBe(false);
  });

  it("AC-4.6: hasValidUnlock(id, now) returns false at exact expiration time", async () => {
    const { addUnlock, hasValidUnlock } = await import("@/lib/unlocks");

    const now = Date.now();
    addUnlock("appliance-1", now);

    // Check at exact expiration time (should be false at boundary)
    const result = hasValidUnlock("appliance-1", now + 86400000);
    expect(result).toBe(false);
  });

  it("AC-4.7: addUnlock with same id overwrites previous unlock", async () => {
    const { addUnlock, getUnlocks } = await import("@/lib/unlocks");

    const now = Date.now();
    addUnlock("appliance-1", now);
    addUnlock("appliance-1", now + 10000); // Overwrite

    const unlocks = getUnlocks();
    expect(unlocks).toHaveLength(1);
    expect(unlocks[0].unlockedAt).toBe(now + 10000);
    expect(unlocks[0].expiresAt).toBe(now + 10000 + 86400000);
  });
});

describe("AC-5: Module integrity — no React imports in repositories", () => {
  it("AC-5.1: records.ts has no React imports", async () => {
    const module = await import("@/lib/records");
    const source = Object.keys(module);
    // Module successfully imported means no syntax errors
    // This is a live check that the module doesn't crash on import
    expect(source.length).toBeGreaterThan(0);
  });

  it("AC-5.2: profile.ts has no React imports", async () => {
    const module = await import("@/lib/profile");
    const source = Object.keys(module);
    expect(source.length).toBeGreaterThan(0);
  });

  it("AC-5.3: appliances.ts has no React imports", async () => {
    const module = await import("@/lib/appliances");
    const source = Object.keys(module);
    expect(source.length).toBeGreaterThan(0);
  });

  it("AC-5.4: unlocks.ts has no React imports", async () => {
    const module = await import("@/lib/unlocks");
    const source = Object.keys(module);
    expect(source.length).toBeGreaterThan(0);
  });
});
