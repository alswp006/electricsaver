import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

// NOTE: These imports will fail until src/lib/{settingsStore,simStore,unlockStore}.ts are created.
// This is TDD red phase — tests are written first, implementation comes after.
import type { AppSettings, ApplianceCut, SimulationInput } from "@/lib/types";
import {
  getSettings,
  saveSettings,
} from "@/lib/settingsStore";
import {
  getLastSim,
  saveSim,
} from "@/lib/simStore";
import {
  isUnlocked,
  unlock,
} from "@/lib/unlockStore";

describe("settingsStore · simStore · unlockStore (TDD red phase)", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  // ===== SETTINGS STORE TESTS =====

  describe("settingsStore", () => {
    it("AC-1[P0]: getSettings() returns default when no saved value", () => {
      // Arrange: empty localStorage
      expect(localStorage.getItem("es:settings:v1")).toBeNull();

      // Act
      const result = getSettings();

      // Assert: exact default shape
      expect(result).toBeDefined();
      expect(result.contractType).toBe("low");
      expect(result.regionCode).toBe("KR-11");
      expect(result.householdSize).toBe(1);
      expect(result.lastYearMonth).toBeNull();
    });

    it("AC-1[P0]: getSettings() returns saved value when it exists", () => {
      // Arrange: pre-populate settings
      const saved = {
        contractType: "high" as const,
        regionCode: "KR-28" as const,
        householdSize: 4,
        lastYearMonth: "2026-08",
      };
      saveSettings(saved);

      // Act
      const result = getSettings();

      // Assert: saved values are returned
      expect(result.contractType).toBe("high");
      expect(result.regionCode).toBe("KR-28");
      expect(result.householdSize).toBe(4);
      expect(result.lastYearMonth).toBe("2026-08");
    });

    it("AC-2[P0]: saveSettings() merges partial updates and preserves other fields", () => {
      // Arrange: set initial state with all fields
      const initial = {
        contractType: "low" as const,
        regionCode: "KR-11" as const,
        householdSize: 2,
        lastYearMonth: "2026-07",
      };
      saveSettings(initial);

      // Act: update only contractType
      saveSettings({ contractType: "high" });

      // Assert: contractType changed, but regionCode preserved
      const result = getSettings();
      expect(result.contractType).toBe("high");
      expect(result.regionCode).toBe("KR-11");
      expect(result.householdSize).toBe(2);
      expect(result.lastYearMonth).toBe("2026-07");
    });

    it("AC-2[P0]: saveSettings() patch: update regionCode while preserving householdSize", () => {
      // Arrange
      const initial = {
        contractType: "low" as const,
        regionCode: "KR-11" as const,
        householdSize: 3,
        lastYearMonth: null,
      };
      saveSettings(initial);

      // Act: update only regionCode
      saveSettings({ regionCode: "KR-26" });

      // Assert
      const result = getSettings();
      expect(result.regionCode).toBe("KR-26");
      expect(result.householdSize).toBe(3);
      expect(result.contractType).toBe("low");
    });
  });

  // ===== SIM STORE TESTS =====

  describe("simStore", () => {
    it("AC-3[P0]: saveSim() truncates cuts array to max 8 items", () => {
      // Arrange: create input with 9 cuts (exceeds limit)
      const nineCuts: ApplianceCut[] = Array.from({ length: 9 }, (_, i) => ({
        applianceId: `app_${i}`,
        cutHoursPerDay: (i + 1) * 1,
      }));
      const input: SimulationInput = {
        baseRecordId: "rec_2026-08",
        cuts: nineCuts,
        days: 30,
      };

      // Act
      saveSim(input);
      const result = getLastSim();

      // Assert: only 8 cuts saved
      expect(result).toBeDefined();
      expect(result!.cuts).toHaveLength(8);
      // Verify first and last cut values to confirm correct truncation
      expect(result!.cuts[0].applianceId).toBe("app_0");
      expect(result!.cuts[7].applianceId).toBe("app_7");
      expect(result!.baseRecordId).toBe("rec_2026-08");
      expect(result!.days).toBe(30);
    });

    it("AC-3[P0]: saveSim() preserves all cuts when count <= 8", () => {
      // Arrange: create input with exactly 8 cuts
      const eightCuts: ApplianceCut[] = Array.from({ length: 8 }, (_, i) => ({
        applianceId: `fridge_${i}`,
        cutHoursPerDay: (i + 1) * 2,
      }));
      const input: SimulationInput = {
        baseRecordId: "rec_2026-09",
        cuts: eightCuts,
        days: 31,
      };

      // Act
      saveSim(input);
      const result = getLastSim();

      // Assert: all 8 cuts preserved
      expect(result).toBeDefined();
      expect(result!.cuts).toHaveLength(8);
      expect(result!.cuts[0].applianceId).toBe("fridge_0");
      expect(result!.cuts[7].applianceId).toBe("fridge_7");
    });

    it("AC-3[P0]: saveSim() handles fewer than 8 cuts without truncation", () => {
      // Arrange: create input with 5 cuts
      const fiveCuts: ApplianceCut[] = Array.from({ length: 5 }, (_, i) => ({
        applianceId: `heater_${i}`,
        cutHoursPerDay: (i + 1) * 3,
      }));
      const input: SimulationInput = {
        baseRecordId: "rec_2026-10",
        cuts: fiveCuts,
        days: 28,
      };

      // Act
      saveSim(input);
      const result = getLastSim();

      // Assert: all 5 cuts preserved
      expect(result).toBeDefined();
      expect(result!.cuts).toHaveLength(5);
      expect(result!.cuts[4].applianceId).toBe("heater_4");
    });
  });

  // ===== UNLOCK STORE TESTS =====

  describe("unlockStore", () => {
    it("AC-4[P0]: unlock(recordId) records unlock and isUnlocked returns true immediately", () => {
      // Arrange
      const recordId = "rec_2026-08";
      expect(isUnlocked(recordId)).toBe(false);

      // Act
      unlock(recordId);

      // Assert: immediately unlocked
      expect(isUnlocked(recordId)).toBe(true);
    });

    it("AC-4[P0]: isUnlocked() returns false after 24 hours have passed (manual time manipulation)", () => {
      // Arrange
      const recordId = "rec_2026-08";
      const now = Date.now();

      // Mock Date.now to return a fixed time
      vi.spyOn(Date, "now").mockReturnValue(now);

      // Unlock at the mocked "now"
      unlock(recordId);
      expect(isUnlocked(recordId)).toBe(true);

      // Act: advance time by 25 hours (90,000,000 ms)
      const twentyFiveHoursLater = now + 25 * 60 * 60 * 1000;
      vi.spyOn(Date, "now").mockReturnValue(twentyFiveHoursLater);

      // Assert: should be unlocked = false (TTL expired)
      expect(isUnlocked(recordId)).toBe(false);

      // Cleanup
      vi.restoreAllMocks();
    });

    it("AC-4[P0]: isUnlocked() returns true within 24-hour window", () => {
      // Arrange
      const recordId = "rec_2026-09";
      const now = Date.now();
      vi.spyOn(Date, "now").mockReturnValue(now);

      unlock(recordId);

      // Act: advance time by 23 hours 59 minutes (just under 24h)
      const almostTwentyFourHours = now + 23 * 60 * 60 * 1000 + 59 * 60 * 1000;
      vi.spyOn(Date, "now").mockReturnValue(almostTwentyFourHours);

      // Assert: still unlocked
      expect(isUnlocked(recordId)).toBe(true);

      // Cleanup
      vi.restoreAllMocks();
    });

    it("AC-4[P0]: multiple records tracked independently", () => {
      // Arrange
      const recordA = "rec_2026-08";
      const recordB = "rec_2026-09";
      const now = Date.now();
      vi.spyOn(Date, "now").mockReturnValue(now);

      unlock(recordA);
      unlock(recordB);

      // Both should be unlocked
      expect(isUnlocked(recordA)).toBe(true);
      expect(isUnlocked(recordB)).toBe(true);

      // Act: advance time by 25 hours
      const inTheFuture = now + 25 * 60 * 60 * 1000;
      vi.spyOn(Date, "now").mockReturnValue(inTheFuture);

      // Assert: both expired
      expect(isUnlocked(recordA)).toBe(false);
      expect(isUnlocked(recordB)).toBe(false);

      // Cleanup
      vi.restoreAllMocks();
    });
  });
});
