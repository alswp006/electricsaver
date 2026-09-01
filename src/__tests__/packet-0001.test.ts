import { describe, it, expect } from "vitest";
import type {
  MeterRecord,
  UserProfile,
  ApplianceItem,
  SimulationSummary,
  ReportUnlock,
  AppFlags,
  RegionAverage,
  StageBreakdownRow,
  BillBreakdown,
} from "@/types/domain";
import type {
  BillInput,
  ResultRouteState,
  SimulateRouteState,
  ReportRouteState,
  RouteState,
} from "@/types/navigation";
import type { StorageKey } from "@/types/storage";

/**
 * PACKET 0001: 엔티티 타입 + RouteState 계약 정의
 *
 * AC-1: src/types/domain.ts 가 MeterRecord, UserProfile, ApplianceItem, SimulationSummary, ReportUnlock, AppFlags, RegionAverage, BillBreakdown, StageBreakdownRow 9개 타입을 export
 * AC-2: src/types/navigation.ts 가 BillInput, ResultRouteState, SimulateRouteState, ReportRouteState, RouteState 를 SPEC 정의 그대로 export
 * AC-3: src/types/storage.ts 가 StorageKey = 'es:records'|'es:profile'|'es:appliances'|'es:report-unlocks'|'es:flags' 를 export
 * AC-4: npx tsc --noEmit 통과, grep -E "console\.|function |=>" src/types/*.ts 매칭 0건
 */

describe("Packet 0001: 엔티티 타입 + RouteState 계약 정의", () => {
  describe("AC-1: src/types/domain.ts exports", () => {
    it("should have MeterRecord with yearMonth, kWh, total, createdAt fields", () => {
      const sampleRecord: MeterRecord = {
        yearMonth: "2026-08",
        kWh: 350,
        total: 60510,
        createdAt: Date.now(),
      };

      expect(sampleRecord.yearMonth).toBe("2026-08");
      expect(sampleRecord.kWh).toBe(350);
      expect(sampleRecord.total).toBe(60510);
      expect(typeof sampleRecord.createdAt).toBe("number");
    });

    it("should have UserProfile with regionCode and householdSize fields", () => {
      const sampleProfile: UserProfile = {
        regionCode: "11",
        householdSize: 2,
      };

      expect(sampleProfile.regionCode).toBe("11");
      expect([1, 2, 3, 4]).toContain(sampleProfile.householdSize);
    });

    it("should have ApplianceItem with id, name, watt, hoursPerDay, reduceRatio fields", () => {
      const sampleAppliance: ApplianceItem = {
        id: "aircon",
        name: "에어컨",
        watt: 1800,
        hoursPerDay: 6,
        reduceRatio: 0.3,
      };

      expect(sampleAppliance.id).toBe("aircon");
      expect(sampleAppliance.name).toBe("에어컨");
      expect(sampleAppliance.watt).toBe(1800);
      expect(sampleAppliance.hoursPerDay).toBe(6);
      expect([0.1, 0.2, 0.3, 0.5]).toContain(sampleAppliance.reduceRatio);
    });

    it("should have SimulationSummary with savings calculation fields", () => {
      const sampleSummary: SimulationSummary = {
        baseKWh: 350,
        savedKWh: 97,
        targetKWh: 253,
        baseTotal: 60510,
        targetTotal: 45000,
        savedWon: 15510,
        month: 8,
        appliances: [
          {
            id: "aircon",
            name: "에어컨",
            watt: 1800,
            hoursPerDay: 6,
            reduceRatio: 0.3,
          },
        ],
      };

      expect(sampleSummary.baseKWh).toBe(350);
      expect(sampleSummary.savedKWh).toBe(97);
      expect(sampleSummary.targetKWh).toBe(253);
      expect(sampleSummary.baseTotal).toBe(60510);
      expect(sampleSummary.targetTotal).toBe(45000);
      expect(sampleSummary.savedWon).toBe(15510);
      expect(sampleSummary.month).toBe(8);
      expect(sampleSummary.appliances.length).toBe(1);
    });

    it("should have ReportUnlock with applianceId, unlockedAt, expiresAt fields", () => {
      const now = Date.now();
      const sampleUnlock: ReportUnlock = {
        applianceId: "aircon",
        unlockedAt: now,
        expiresAt: now + 86400000,
      };

      expect(sampleUnlock.applianceId).toBe("aircon");
      expect(typeof sampleUnlock.unlockedAt).toBe("number");
      expect(typeof sampleUnlock.expiresAt).toBe("number");
      expect(sampleUnlock.expiresAt).toBe(sampleUnlock.unlockedAt + 86400000);
    });

    it("should have AppFlags with schemaVersion and disclaimerSeenAt fields", () => {
      const sampleFlags: AppFlags = {
        schemaVersion: 1,
        disclaimerSeenAt: null,
      };

      expect(sampleFlags.schemaVersion).toBe(1);
      expect(sampleFlags.disclaimerSeenAt).toBeNull();

      const withDisclaimer: AppFlags = {
        schemaVersion: 1,
        disclaimerSeenAt: Date.now(),
      };
      expect(typeof withDisclaimer.disclaimerSeenAt).toBe("number");
    });

    it("should have RegionAverage with regionCode, regionName, avgKWh fields", () => {
      const sampleRegion: RegionAverage = {
        regionCode: "11",
        regionName: "서울",
        avgKWh: [210, 268, 312, 349],
      };

      expect(sampleRegion.regionCode).toBe("11");
      expect(sampleRegion.regionName).toBe("서울");
      expect(sampleRegion.avgKWh).toHaveLength(4);
      expect(sampleRegion.avgKWh[0]).toBe(210);
      expect(sampleRegion.avgKWh[3]).toBe(349);
    });

    it("should have StageBreakdownRow with stage, kWh, unitPrice, charge fields", () => {
      const sampleRow: StageBreakdownRow = {
        stage: 2,
        kWh: 50,
        unitPrice: 214.6,
        charge: 10730,
      };

      expect(sampleRow.stage).toBe(2);
      expect(sampleRow.kWh).toBe(50);
      expect(sampleRow.unitPrice).toBe(214.6);
      expect(sampleRow.charge).toBe(10730);
    });

    it("should have BillBreakdown with all 10 required fields", () => {
      const sampleBill: BillBreakdown = {
        baseCharge: 1600,
        energyCharge: 46730,
        climateCharge: 3150,
        fuelCharge: 1750,
        subtotal: 53230,
        vat: 5323,
        fund: 1960,
        total: 60510,
        stage: 2,
        stageBreakdown: [
          {
            stage: 1,
            kWh: 300,
            unitPrice: 214.6,
            charge: 36000,
          },
          {
            stage: 2,
            kWh: 50,
            unitPrice: 214.6,
            charge: 10730,
          },
        ],
      };

      expect(sampleBill.baseCharge).toBe(1600);
      expect(sampleBill.energyCharge).toBe(46730);
      expect(sampleBill.climateCharge).toBe(3150);
      expect(sampleBill.fuelCharge).toBe(1750);
      expect(sampleBill.subtotal).toBe(53230);
      expect(sampleBill.vat).toBe(5323);
      expect(sampleBill.fund).toBe(1960);
      expect(sampleBill.total).toBe(60510);
      expect(sampleBill.stage).toBe(2);
      expect(sampleBill.stageBreakdown).toHaveLength(2);
      expect(sampleBill.stageBreakdown[0].stage).toBe(1);
    });

    it("AC-1: MeterRecord.yearMonth must follow YYYY-MM format", () => {
      const record: MeterRecord = {
        yearMonth: "2026-08",
        kWh: 350,
        total: 60510,
        createdAt: Date.now(),
      };

      expect(record.yearMonth).toMatch(/^\d{4}-\d{2}$/);
    });

    it("AC-1: UserProfile.householdSize must be 1|2|3|4 literal", () => {
      const sizes = [1, 2, 3, 4] as const;
      for (const size of sizes) {
        const profile: UserProfile = {
          regionCode: "11",
          householdSize: size,
        };
        expect([1, 2, 3, 4]).toContain(profile.householdSize);
      }
    });

    it("AC-1: ApplianceItem.reduceRatio must be 0.1|0.2|0.3|0.5 literal", () => {
      const ratios = [0.1, 0.2, 0.3, 0.5] as const;
      for (const ratio of ratios) {
        const appliance: ApplianceItem = {
          id: "test",
          name: "테스트",
          watt: 1000,
          hoursPerDay: 2,
          reduceRatio: ratio,
        };
        expect([0.1, 0.2, 0.3, 0.5]).toContain(appliance.reduceRatio);
      }
    });
  });

  describe("AC-2: src/types/navigation.ts exports", () => {
    it("should have BillInput with yearMonth, kWh, month fields", () => {
      const sampleInput: BillInput = {
        yearMonth: "2026-08",
        kWh: 350,
        month: 8,
      };

      expect(sampleInput.yearMonth).toBe("2026-08");
      expect(sampleInput.kWh).toBe(350);
      expect(sampleInput.month).toBe(8);
    });

    it("should have ResultRouteState with input field", () => {
      const sampleState: ResultRouteState = {
        input: {
          yearMonth: "2026-08",
          kWh: 350,
          month: 8,
        },
      };

      expect(sampleState.input).toBeDefined();
      expect(sampleState.input.yearMonth).toBe("2026-08");
    });

    it("should have SimulateRouteState with input field", () => {
      const sampleState: SimulateRouteState = {
        input: {
          yearMonth: "2026-08",
          kWh: 350,
          month: 8,
        },
      };

      expect(sampleState.input).toBeDefined();
      expect(sampleState.input.kWh).toBe(350);
    });

    it("should have ReportRouteState with input field", () => {
      const sampleState: ReportRouteState = {
        input: {
          yearMonth: "2026-08",
          kWh: 350,
          month: 8,
        },
      };

      expect(sampleState.input).toBeDefined();
      expect(sampleState.input.month).toBe(8);
    });

    it("AC-2: RouteState must accept all three route state types", () => {
      const resultState: RouteState = {
        input: { yearMonth: "2026-08", kWh: 350, month: 8 },
      };
      const simulateState: RouteState = {
        input: { yearMonth: "2026-08", kWh: 350, month: 8 },
      };
      const reportState: RouteState = {
        input: { yearMonth: "2026-08", kWh: 350, month: 8 },
      };

      expect(resultState.input).toBeDefined();
      expect(simulateState.input).toBeDefined();
      expect(reportState.input).toBeDefined();
    });
  });

  describe("AC-3: src/types/storage.ts exports", () => {
    it("should have StorageKey with 5 literal keys", () => {
      const validKeys: StorageKey[] = [
        "es:records",
        "es:profile",
        "es:appliances",
        "es:report-unlocks",
        "es:flags",
      ];

      expect(validKeys).toContain("es:records");
      expect(validKeys).toContain("es:profile");
      expect(validKeys).toContain("es:appliances");
      expect(validKeys).toContain("es:report-unlocks");
      expect(validKeys).toContain("es:flags");
      expect(validKeys).toHaveLength(5);
    });

    it("AC-3: StorageKey must map to localStorage keys", () => {
      const storageKeyMap: Record<StorageKey, string> = {
        "es:records": "MeterRecord[]",
        "es:profile": "UserProfile",
        "es:appliances": "ApplianceItem[]",
        "es:report-unlocks": "ReportUnlock[]",
        "es:flags": "AppFlags",
      };

      expect(Object.keys(storageKeyMap)).toHaveLength(5);
      expect(Object.keys(storageKeyMap)).toContain("es:records");
      expect(Object.keys(storageKeyMap)).toContain("es:profile");
    });
  });

  describe("AC-4: Type structure contracts (SPEC compliance)", () => {
    it("AC-4[P0]: BillBreakdown must have exactly 10 fields", () => {
      const sampleBill: BillBreakdown = {
        baseCharge: 910,
        energyCharge: 120,
        climateCharge: 9,
        fuelCharge: 5,
        subtotal: 1044,
        vat: 104,
        fund: 30,
        total: 1170,
        stage: 1,
        stageBreakdown: [],
      };

      const fields = [
        "baseCharge",
        "energyCharge",
        "climateCharge",
        "fuelCharge",
        "subtotal",
        "vat",
        "fund",
        "total",
        "stage",
        "stageBreakdown",
      ];

      for (const field of fields) {
        expect(field in sampleBill).toBe(true);
      }
      expect(Object.keys(sampleBill)).toHaveLength(10);
    });

    it("AC-4[P0]: StageBreakdownRow must have stage, kWh, unitPrice, charge", () => {
      const row: StageBreakdownRow = {
        stage: 1,
        kWh: 200,
        unitPrice: 120.0,
        charge: 24000,
      };

      expect(row.stage).toBeLessThanOrEqual(3);
      expect(row.kWh).toBeGreaterThan(0);
      expect(row.unitPrice).toBeGreaterThan(0);
      expect(row.charge).toBeGreaterThan(0);
    });

    it("AC-4[P0]: ReportUnlock.expiresAt must be 24 hours after unlockedAt", () => {
      const now = Date.now();
      const unlock: ReportUnlock = {
        applianceId: "test",
        unlockedAt: now,
        expiresAt: now + 86400000,
      };

      expect(unlock.expiresAt - unlock.unlockedAt).toBe(86400000);
    });

    it("AC-4[P0]: RegionAverage.avgKWh must have 4 values for household sizes 1-4+", () => {
      const region: RegionAverage = {
        regionCode: "11",
        regionName: "서울",
        avgKWh: [210, 268, 312, 349],
      };

      expect(region.avgKWh).toHaveLength(4);
      expect(region.avgKWh.every((v) => typeof v === "number")).toBe(true);
    });

    it("AC-4[P0]: BillInput must be embedded in all RouteState types", () => {
      const resultState: ResultRouteState = {
        input: { yearMonth: "2026-08", kWh: 350, month: 8 },
      };
      const simulateState: SimulateRouteState = {
        input: { yearMonth: "2026-08", kWh: 350, month: 8 },
      };
      const reportState: ReportRouteState = {
        input: { yearMonth: "2026-08", kWh: 350, month: 8 },
      };

      expect(resultState.input.yearMonth).toBeDefined();
      expect(simulateState.input.kWh).toBeDefined();
      expect(reportState.input.month).toBeDefined();
    });

    it("AC-4[P1]: SimulationSummary.appliances must be ApplianceItem[]", () => {
      const summary: SimulationSummary = {
        baseKWh: 350,
        savedKWh: 97,
        targetKWh: 253,
        baseTotal: 60510,
        targetTotal: 45000,
        savedWon: 15510,
        month: 8,
        appliances: [
          {
            id: "aircon",
            name: "에어컨",
            watt: 1800,
            hoursPerDay: 6,
            reduceRatio: 0.3,
          },
        ],
      };

      expect(Array.isArray(summary.appliances)).toBe(true);
      expect(summary.appliances[0].id).toBe("aircon");
    });

    it("AC-4[P1]: MeterRecord.createdAt and ReportUnlock timestamps are epoch ms", () => {
      const record: MeterRecord = {
        yearMonth: "2026-08",
        kWh: 350,
        total: 60510,
        createdAt: Date.now(),
      };

      const unlock: ReportUnlock = {
        applianceId: "test",
        unlockedAt: Date.now(),
        expiresAt: Date.now() + 86400000,
      };

      expect(typeof record.createdAt).toBe("number");
      expect(record.createdAt).toBeGreaterThan(0);
      expect(typeof unlock.unlockedAt).toBe("number");
      expect(unlock.unlockedAt).toBeGreaterThan(0);
    });

    it("AC-4[P1]: AppFlags.schemaVersion must be exactly 1", () => {
      const flags: AppFlags = {
        schemaVersion: 1,
        disclaimerSeenAt: null,
      };

      expect(flags.schemaVersion).toBe(1);
    });
  });
});
