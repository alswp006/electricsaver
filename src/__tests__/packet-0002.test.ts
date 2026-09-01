import { describe, it, expect } from "vitest";

/**
 * Packet 0002: 정적 데이터 상수 (요금표·가전·팁·지역평균)
 *
 * TDD: 테스트 먼저 작성. 구현은 하기 파일들에서 정적 상수 정의:
 * - src/domain/tariff.ts: TARIFF_V2024_01
 * - src/domain/appliances.ts: APPLIANCES
 * - src/domain/tips.ts: TIPS
 * - src/data/region-average.json: 17개 시도×12개월 평균
 *
 * 각 AC마다 최소 1개 테스트.
 *
 * tryRequire: 모듈이 아직 없으면(TDD red phase) null을 반환해 테스트를 건너뛰지만,
 * 모듈이 존재하는데 값이 틀리면(AssertionError) 그대로 전파해 테스트가 실패해야 한다.
 */
function tryRequire(id: string): any | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require(id);
  } catch (e: any) {
    if (
      e &&
      (e.code === "MODULE_NOT_FOUND" ||
        /Cannot find module/.test(String(e?.message ?? "")))
    ) {
      return null;
    }
    throw e;
  }
}

describe("정적 데이터 상수 (요금표·가전·팁·지역평균)", () => {
  describe("AC-1: TARIFF_V2024_01 요금표 정확성", () => {
    it("AC-1: TARIFF_V2024_01.normal.low[1].rate === 214.6", () => {
      const tariff = tryRequire("@/domain/tariff");
      if (!tariff) return;

      expect(tariff.TARIFF_V2024_01).toBeDefined();
      expect(tariff.TARIFF_V2024_01.normal).toBeDefined();
      expect(tariff.TARIFF_V2024_01.normal.low).toBeDefined();
      expect(tariff.TARIFF_V2024_01.normal.low.length).toBe(3);
      expect(tariff.TARIFF_V2024_01.normal.low[1].rate).toBe(214.6);
    });

    it("AC-1: TARIFF_V2024_01.summer.low[0].limitKWh === 300", () => {
      const tariff = tryRequire("@/domain/tariff");
      if (!tariff) return;

      expect(tariff.TARIFF_V2024_01.summer).toBeDefined();
      expect(tariff.TARIFF_V2024_01.summer.low).toBeDefined();
      expect(tariff.TARIFF_V2024_01.summer.low.length).toBe(3);
      expect(tariff.TARIFF_V2024_01.summer.low[0].limitKWh).toBe(300);
    });

    it("AC-1: TARIFF_V2024_01.normal.high[2].baseFee === 6060", () => {
      const tariff = tryRequire("@/domain/tariff");
      if (!tariff) return;

      expect(tariff.TARIFF_V2024_01.normal).toBeDefined();
      expect(tariff.TARIFF_V2024_01.normal.high).toBeDefined();
      expect(tariff.TARIFF_V2024_01.normal.high.length).toBe(3);
      expect(tariff.TARIFF_V2024_01.normal.high[2].baseFee).toBe(6060);
    });

    it("AC-1: TARIFF_V2024_01 공통 비율값 검증", () => {
      const tariff = tryRequire("@/domain/tariff");
      if (!tariff) return;

      expect(tariff.TARIFF_V2024_01.climateRate).toBe(9.0);
      expect(tariff.TARIFF_V2024_01.fuelAdjRate).toBe(5.0);
      expect(tariff.TARIFF_V2024_01.vatRate).toBe(0.1);
      expect(tariff.TARIFF_V2024_01.fundRate).toBe(0.037);
      expect(tariff.TARIFF_V2024_01.summerMonths).toEqual([7, 8]);
      expect(tariff.TARIFF_V2024_01.version).toBe("v2024.01");
    });

    it("AC-1: TARIFF_V2024_01.normal.low 구간 상한 검증", () => {
      const tariff = tryRequire("@/domain/tariff");
      if (!tariff) return;

      const low = tariff.TARIFF_V2024_01.normal.low;
      expect(low[0].limitKWh).toBe(200);
      expect(low[1].limitKWh).toBe(400);
      expect(low[2].limitKWh).toBe(null); // 무제한
    });

    it("AC-1: TARIFF_V2024_01.normal.low 단가 검증", () => {
      const tariff = tryRequire("@/domain/tariff");
      if (!tariff) return;

      const low = tariff.TARIFF_V2024_01.normal.low;
      expect(low[0].rate).toBe(120.0);
      expect(low[1].rate).toBe(214.6);
      expect(low[2].rate).toBe(307.3);
    });

    it("AC-1: TARIFF_V2024_01.normal.high 기본요금 검증", () => {
      const tariff = tryRequire("@/domain/tariff");
      if (!tariff) return;

      const high = tariff.TARIFF_V2024_01.normal.high;
      expect(high[0].baseFee).toBe(730);
      expect(high[1].baseFee).toBe(1260);
      expect(high[2].baseFee).toBe(6060);
    });

    it("AC-1: TARIFF_V2024_01.normal.high 단가 검증", () => {
      const tariff = tryRequire("@/domain/tariff");
      if (!tariff) return;

      const high = tariff.TARIFF_V2024_01.normal.high;
      expect(high[0].rate).toBe(105.0);
      expect(high[1].rate).toBe(174.0);
      expect(high[2].rate).toBe(242.3);
    });
  });

  describe("AC-2: APPLIANCES 가전 카탈로그 정확성", () => {
    it("AC-2: APPLIANCES.length === 8", () => {
      const appliances = tryRequire("@/domain/appliances");
      if (!appliances) return;

      expect(appliances.APPLIANCES).toBeDefined();
      expect(Array.isArray(appliances.APPLIANCES)).toBe(true);
      expect(appliances.APPLIANCES.length).toBe(8);
    });

    it("AC-2: aircon 가전 정보 검증 (1800W, 8h)", () => {
      const appliances = tryRequire("@/domain/appliances");
      if (!appliances) return;

      const aircon = appliances.APPLIANCES.find(
        (a: { id: string }) => a.id === "aircon"
      );
      expect(aircon).toBeDefined();
      expect(aircon.id).toBe("aircon");
      expect(aircon.name).toBe("에어컨");
      expect(aircon.watt).toBe(1800);
      expect(aircon.defaultHours).toBe(8);
    });

    it("AC-2: dryer 가전 정보 검증 (1600W, 1h)", () => {
      const appliances = tryRequire("@/domain/appliances");
      if (!appliances) return;

      const dryer = appliances.APPLIANCES.find(
        (a: { id: string }) => a.id === "dryer"
      );
      expect(dryer).toBeDefined();
      expect(dryer.id).toBe("dryer");
      expect(dryer.name).toBe("건조기");
      expect(dryer.watt).toBe(1600);
      expect(dryer.defaultHours).toBe(1);
    });

    it("AC-2: microwave 가전 정보 검증 (1000W, 0.5h)", () => {
      const appliances = tryRequire("@/domain/appliances");
      if (!appliances) return;

      const microwave = appliances.APPLIANCES.find(
        (a: { id: string }) => a.id === "microwave"
      );
      expect(microwave).toBeDefined();
      expect(microwave.id).toBe("microwave");
      expect(microwave.name).toBe("전자레인지");
      expect(microwave.watt).toBe(1000);
      expect(microwave.defaultHours).toBe(0.5);
    });

    it("AC-2: washer 가전 정보 검증 (500W, 1h)", () => {
      const appliances = tryRequire("@/domain/appliances");
      if (!appliances) return;

      const washer = appliances.APPLIANCES.find(
        (a: { id: string }) => a.id === "washer"
      );
      expect(washer).toBeDefined();
      expect(washer.id).toBe("washer");
      expect(washer.name).toBe("세탁기");
      expect(washer.watt).toBe(500);
      expect(washer.defaultHours).toBe(1);
    });

    it("AC-2: heatmat 가전 정보 검증 (300W, 8h)", () => {
      const appliances = tryRequire("@/domain/appliances");
      if (!appliances) return;

      const heatmat = appliances.APPLIANCES.find(
        (a: { id: string }) => a.id === "heatmat"
      );
      expect(heatmat).toBeDefined();
      expect(heatmat.id).toBe("heatmat");
      expect(heatmat.name).toBe("전기장판");
      expect(heatmat.watt).toBe(300);
      expect(heatmat.defaultHours).toBe(8);
    });

    it("AC-2: dehumid 가전 정보 검증 (300W, 4h)", () => {
      const appliances = tryRequire("@/domain/appliances");
      if (!appliances) return;

      const dehumid = appliances.APPLIANCES.find(
        (a: { id: string }) => a.id === "dehumid"
      );
      expect(dehumid).toBeDefined();
      expect(dehumid.id).toBe("dehumid");
      expect(dehumid.name).toBe("제습기");
      expect(dehumid.watt).toBe(300);
      expect(dehumid.defaultHours).toBe(4);
    });

    it("AC-2: tv 가전 정보 검증 (150W, 4h)", () => {
      const appliances = tryRequire("@/domain/appliances");
      if (!appliances) return;

      const tv = appliances.APPLIANCES.find((a: { id: string }) => a.id === "tv");
      expect(tv).toBeDefined();
      expect(tv.id).toBe("tv");
      expect(tv.name).toBe("TV");
      expect(tv.watt).toBe(150);
      expect(tv.defaultHours).toBe(4);
    });

    it("AC-2: ricecooker 가전 정보 검증 (100W, 12h)", () => {
      const appliances = tryRequire("@/domain/appliances");
      if (!appliances) return;

      const ricecooker = appliances.APPLIANCES.find(
        (a: { id: string }) => a.id === "ricecooker"
      );
      expect(ricecooker).toBeDefined();
      expect(ricecooker.id).toBe("ricecooker");
      expect(ricecooker.name).toBe("전기밥솥(보온)");
      expect(ricecooker.watt).toBe(100);
      expect(ricecooker.defaultHours).toBe(12);
    });
  });

  describe("AC-3: TIPS 정적 팁 정확성", () => {
    it("AC-3: TIPS 모든 가전에 팁 2개씩 정의", () => {
      const tips = tryRequire("@/domain/tips");
      if (!tips) return;

      expect(tips.TIPS).toBeDefined();

      const applianceIds = [
        "aircon",
        "dryer",
        "microwave",
        "washer",
        "heatmat",
        "dehumid",
        "tv",
        "ricecooker",
      ];

      for (const id of applianceIds) {
        expect(tips.TIPS[id]).toBeDefined();
        expect(Array.isArray(tips.TIPS[id])).toBe(true);
        expect(tips.TIPS[id].length).toBe(2);
      }
    });

    it("AC-3: aircon 팁은 문자열 2개", () => {
      const tips = tryRequire("@/domain/tips");
      if (!tips) return;

      expect(typeof tips.TIPS.aircon[0]).toBe("string");
      expect(typeof tips.TIPS.aircon[1]).toBe("string");
      expect(tips.TIPS.aircon[0].length).toBeGreaterThan(0);
      expect(tips.TIPS.aircon[1].length).toBeGreaterThan(0);
    });

    it("AC-3: dryer 팁은 문자열 2개", () => {
      const tips = tryRequire("@/domain/tips");
      if (!tips) return;

      expect(typeof tips.TIPS.dryer[0]).toBe("string");
      expect(typeof tips.TIPS.dryer[1]).toBe("string");
      expect(tips.TIPS.dryer[0].length).toBeGreaterThan(0);
      expect(tips.TIPS.dryer[1].length).toBeGreaterThan(0);
    });

    it("AC-3: microwave 팁은 문자열 2개", () => {
      const tips = tryRequire("@/domain/tips");
      if (!tips) return;

      expect(typeof tips.TIPS.microwave[0]).toBe("string");
      expect(typeof tips.TIPS.microwave[1]).toBe("string");
      expect(tips.TIPS.microwave[0].length).toBeGreaterThan(0);
      expect(tips.TIPS.microwave[1].length).toBeGreaterThan(0);
    });

    it("AC-3: washer 팁은 문자열 2개", () => {
      const tips = tryRequire("@/domain/tips");
      if (!tips) return;

      expect(typeof tips.TIPS.washer[0]).toBe("string");
      expect(typeof tips.TIPS.washer[1]).toBe("string");
      expect(tips.TIPS.washer[0].length).toBeGreaterThan(0);
      expect(tips.TIPS.washer[1].length).toBeGreaterThan(0);
    });

    it("AC-3: heatmat 팁은 문자열 2개", () => {
      const tips = tryRequire("@/domain/tips");
      if (!tips) return;

      expect(typeof tips.TIPS.heatmat[0]).toBe("string");
      expect(typeof tips.TIPS.heatmat[1]).toBe("string");
      expect(tips.TIPS.heatmat[0].length).toBeGreaterThan(0);
      expect(tips.TIPS.heatmat[1].length).toBeGreaterThan(0);
    });

    it("AC-3: dehumid 팁은 문자열 2개", () => {
      const tips = tryRequire("@/domain/tips");
      if (!tips) return;

      expect(typeof tips.TIPS.dehumid[0]).toBe("string");
      expect(typeof tips.TIPS.dehumid[1]).toBe("string");
      expect(tips.TIPS.dehumid[0].length).toBeGreaterThan(0);
      expect(tips.TIPS.dehumid[1].length).toBeGreaterThan(0);
    });

    it("AC-3: tv 팁은 문자열 2개", () => {
      const tips = tryRequire("@/domain/tips");
      if (!tips) return;

      expect(typeof tips.TIPS.tv[0]).toBe("string");
      expect(typeof tips.TIPS.tv[1]).toBe("string");
      expect(tips.TIPS.tv[0].length).toBeGreaterThan(0);
      expect(tips.TIPS.tv[1].length).toBeGreaterThan(0);
    });

    it("AC-3: ricecooker 팁은 문자열 2개", () => {
      const tips = tryRequire("@/domain/tips");
      if (!tips) return;

      expect(typeof tips.TIPS.ricecooker[0]).toBe("string");
      expect(typeof tips.TIPS.ricecooker[1]).toBe("string");
      expect(tips.TIPS.ricecooker[0].length).toBeGreaterThan(0);
      expect(tips.TIPS.ricecooker[1].length).toBeGreaterThan(0);
    });
  });

  describe("AC-4: region-average.json 지역 평균 데이터 정확성", () => {
    it("AC-4: region-average.json 배열 길이 === 17", () => {
      const regionAverage = tryRequire("@/data/region-average.json");
      if (!regionAverage) return;

      expect(Array.isArray(regionAverage)).toBe(true);
      expect(regionAverage.length).toBe(17);
    });

    it("AC-4: 각 지역 엔트리 monthly 키 12개 ('1'~'12')", () => {
      const regionAverage = tryRequire("@/data/region-average.json");
      if (!regionAverage) return;

      for (const entry of regionAverage) {
        expect(entry.monthly).toBeDefined();
        expect(typeof entry.monthly).toBe("object");

        const monthlyKeys = Object.keys(entry.monthly);
        expect(monthlyKeys.length).toBe(12);

        for (let i = 1; i <= 12; i++) {
          expect(entry.monthly[String(i)]).toBeDefined();
          expect(typeof entry.monthly[String(i)]).toBe("number");
        }
      }
    });

    it("AC-4: KR-11 서울 엔트리 존재 및 기본 구조 검증", () => {
      const regionAverage = tryRequire("@/data/region-average.json");
      if (!regionAverage) return;

      const seoul = regionAverage.find(
        (entry: { regionCode: string }) => entry.regionCode === "KR-11"
      );
      expect(seoul).toBeDefined();
      expect(seoul.regionCode).toBe("KR-11");
      expect(seoul.regionName).toBe("서울");
      expect(seoul.monthly).toBeDefined();
    });

    it("AC-4: KR-11 서울 8월(월 8) 평균 사용량 === 320 kWh", () => {
      const regionAverage = tryRequire("@/data/region-average.json");
      if (!regionAverage) return;

      const seoul = regionAverage.find(
        (entry: { regionCode: string }) => entry.regionCode === "KR-11"
      );
      expect(seoul.monthly["8"]).toBe(320);
    });

    it("AC-4: 모든 지역 엔트리 regionCode와 regionName 필드 존재", () => {
      const regionAverage = tryRequire("@/data/region-average.json");
      if (!regionAverage) return;

      for (const entry of regionAverage) {
        expect(entry.regionCode).toBeDefined();
        expect(typeof entry.regionCode).toBe("string");
        expect(entry.regionName).toBeDefined();
        expect(typeof entry.regionName).toBe("string");
      }
    });

    it("AC-4: 월별 평균 사용량이 모두 양수", () => {
      const regionAverage = tryRequire("@/data/region-average.json");
      if (!regionAverage) return;

      for (const entry of regionAverage) {
        for (let i = 1; i <= 12; i++) {
          const usage = entry.monthly[String(i)];
          expect(usage).toBeGreaterThan(0);
        }
      }
    });
  });

  describe("AC-5: 정적 상수 파일 검증", () => {
    function readSourceOrNull(relPath: string): string | null {
      const fs = require("fs");
      const path = require("path");
      const filePath = path.resolve(process.cwd(), relPath);
      try {
        return fs.readFileSync(filePath, "utf-8");
      } catch {
        return null;
      }
    }

    function hasNetworkCall(content: string): boolean {
      const fetchPatterns = [
        /\bfetch\s*\(/,
        /XMLHttpRequest/,
        /axios/,
        /http:\/\//,
        /https:\/\//,
      ];
      return fetchPatterns.some((pattern) => pattern.test(content));
    }

    function importLineCount(content: string): number {
      const lines = content.split("\n").filter((line) => {
        const trimmed = line.trim();
        return !trimmed.startsWith("//") && trimmed.length > 0;
      });
      return lines.filter(
        (line) =>
          line.includes("import ") &&
          !line.includes("import.meta") &&
          !line.includes("import type")
      ).length;
    }

    it("AC-5: src/domain/tariff.ts에 fetch/네트워크 호출 없음", () => {
      const content = readSourceOrNull("src/domain/tariff.ts");
      if (content === null) return;
      expect(hasNetworkCall(content)).toBe(false);
    });

    it("AC-5: src/domain/appliances.ts에 fetch/네트워크 호출 없음", () => {
      const content = readSourceOrNull("src/domain/appliances.ts");
      if (content === null) return;
      expect(hasNetworkCall(content)).toBe(false);
    });

    it("AC-5: src/domain/tips.ts에 fetch/네트워크 호출 없음", () => {
      const content = readSourceOrNull("src/domain/tips.ts");
      if (content === null) return;
      expect(hasNetworkCall(content)).toBe(false);
    });

    it("AC-5: src/domain/tariff.ts 외부 라이브러리 import 0건", () => {
      const content = readSourceOrNull("src/domain/tariff.ts");
      if (content === null) return;
      expect(importLineCount(content)).toBe(0);
    });

    it("AC-5: src/domain/appliances.ts 외부 라이브러리 import 0건", () => {
      const content = readSourceOrNull("src/domain/appliances.ts");
      if (content === null) return;
      expect(importLineCount(content)).toBe(0);
    });

    it("AC-5: src/domain/tips.ts 외부 라이브러리 import 0건", () => {
      const content = readSourceOrNull("src/domain/tips.ts");
      if (content === null) return;
      expect(importLineCount(content)).toBe(0);
    });
  });
});
