/**
 * Packet heal-2-02 — 모듈 최상위 부수효과 제거 (storage·env 접근을 지연 실행으로)
 *
 * AC-1: storage/repository/상수 모듈 어디에도 최상위 IO·파싱·마이그레이션 실행이 없다
 * AC-2: localStorage/JSON.parse 접근이 전부 try/catch로 감싸져 실패 시 기본값을 반환한다
 * AC-3: VITE_* env가 전부 미설정이어도 앱이 정상 부팅되고 광고 영역만 미노출된다
 * AC-4: 순환 import가 없다(레이어 방향 고정 — 하위 모듈이 상위 모듈을 참조하지 않는다)
 * AC-5: 전 라우트 스모크가 통과한다
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import React from "react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render, screen, cleanup } from "@testing-library/react";
import { mockTds, mockAppsInToss, mockRouter } from "@/__tests__/__helpers__/mocks";
import { renderWithRouter } from "@/__tests__/__helpers__/test-utils";

mockTds();
mockAppsInToss();
mockRouter();

import App from "@/App";
import { AdSlot } from "@/components/AdSlot";
import { getProfile } from "@/lib/profile";
import { getRecords } from "@/lib/records";
import { getAppliances } from "@/lib/appliances";
import { getUnlocks } from "@/lib/unlocks";

const VALID_RESULT_STATE = { input: { yearMonth: "2024-01", kWh: 320, month: 1 } };
const VALID_REPORT_STATE = {
  summary: {
    baseKWh: 320,
    savedKWh: 20,
    targetKWh: 300,
    baseTotal: 58000,
    targetTotal: 52000,
    savedWon: 6000,
    month: 1,
    appliances: [{ id: "a1", name: "냉장고", watt: 150, hoursPerDay: 24, reduceRatio: 0.1 }],
  },
};

function readSrc(relPath: string): string {
  return readFileSync(resolve(process.cwd(), relPath), "utf-8");
}

describe("모듈 최상위 부수효과 제거 — storage·env 접근을 지연 실행으로 [packet-heal-2-02]", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  describe("AC-1: 모듈 최상위 IO 없음", () => {
    it("AC-1[P0]: src/lib/storage.ts를 새로 import해도 localStorage·JSON.parse가 0회 호출된다", async () => {
      const getSpy = vi.spyOn(Storage.prototype, "getItem");
      const setSpy = vi.spyOn(Storage.prototype, "setItem");
      const parseSpy = vi.spyOn(JSON, "parse");

      vi.resetModules();
      await import("@/lib/storage");

      expect(getSpy).not.toHaveBeenCalled();
      expect(setSpy).not.toHaveBeenCalled();
      expect(parseSpy).not.toHaveBeenCalled();
    });

    it("AC-1[P0]: 리포지토리(records/profile/appliances/unlocks)와 rateTable을 새로 import해도 localStorage가 0회 호출된다", async () => {
      const getSpy = vi.spyOn(Storage.prototype, "getItem");
      const setSpy = vi.spyOn(Storage.prototype, "setItem");

      vi.resetModules();
      await Promise.all([
        import("@/lib/records"),
        import("@/lib/profile"),
        import("@/lib/appliances"),
        import("@/lib/unlocks"),
        import("@/domain/rateTable"),
      ]);

      expect(getSpy).not.toHaveBeenCalled();
      expect(setSpy).not.toHaveBeenCalled();
    });
  });

  describe("AC-2: localStorage/JSON.parse 실패 시 기본값 반환(throw 없음)", () => {
    it("AC-2[P0]: es:profile이 손상된 JSON이어도 getProfile()은 기본 프로필을 반환하고 throw하지 않는다", () => {
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      localStorage.setItem("es:profile", "{{broken-json");

      let result: unknown;
      expect(() => {
        result = getProfile();
      }).not.toThrow();

      expect(result).toEqual({ regionCode: "11", householdSize: 2 });
      expect(errorSpy).not.toHaveBeenCalled();
    });

    it("AC-2[P0]: es:records/es:appliances/es:report-unlocks가 손상돼도 각 getter는 throw 없이 빈 배열을 반환한다", () => {
      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      localStorage.setItem("es:records", "not-json-[[[");
      localStorage.setItem("es:appliances", "not-json-{{{");
      localStorage.setItem("es:report-unlocks", "42abc");

      expect(() => getRecords()).not.toThrow();
      expect(() => getAppliances()).not.toThrow();
      expect(() => getUnlocks()).not.toThrow();

      expect(getRecords()).toEqual([]);
      expect(getAppliances()).toEqual([]);
      expect(getUnlocks()).toEqual([]);
      expect(errorSpy).not.toHaveBeenCalled();
    });
  });

  describe("AC-3: VITE_* env 미설정에서도 정상 부팅, 광고 영역만 미노출", () => {
    it("AC-3[P0]: adGroupId(env)가 없으면 AdSlot은 광고 컨테이너를 렌더하지 않는다(throw 없음, 빈 영역)", () => {
      const envAdGroupId = import.meta.env.VITE_TOSS_AD_GROUP_ID as string | undefined;
      expect(envAdGroupId).toBeUndefined();

      let container: HTMLElement | undefined;
      expect(() => {
        ({ container } = render(React.createElement(AdSlot, { adGroupId: envAdGroupId ?? "" })));
      }).not.toThrow();

      expect(container!.querySelector(".ad-slot")).toBeNull();
      expect(container!.innerHTML).toBe("");
    });

    it("AC-3[P1]: adGroupId가 있으면 기존처럼 광고 컨테이너를 렌더한다(회귀 방지)", () => {
      const { container } = render(React.createElement(AdSlot, { adGroupId: "group-1" }));

      expect(container.querySelector('[data-ad-group-id="group-1"]')).not.toBeNull();
    });

    it("AC-3[P0]: VITE_* env 전부 미설정 상태로 홈 화면이 크래시 없이 부팅된다", () => {
      expect(
        import.meta.env.VITE_TOSS_AD_GROUP_ID ?? import.meta.env.VITE_TOSS_AD_SLOT_ID,
      ).toBeUndefined();

      expect(() =>
        renderWithRouter(React.createElement(App), { initialEntries: ["/"] }),
      ).not.toThrow();

      expect(screen.getByText("ElectricSaver")).toBeInTheDocument();
    });
  });

  describe("AC-4: 순환 import 없음(레이어 방향 고정)", () => {
    it("AC-4[P0]: src/lib/storage.ts는 리포지토리(records/profile/appliances/unlocks)를 import하지 않는다", () => {
      const src = readSrc("src/lib/storage.ts");

      expect(src).not.toMatch(/from\s+["'](\.\/)?(records|profile|appliances|unlocks)["']/);
      expect(src.includes("from \"./records\"")).toBe(false);
    });

    it("AC-4[P0]: src/domain/rateTable.ts는 이를 사용하는 상위 도메인 모듈을 import하지 않는다(하위 계층 상수)", () => {
      const src = readSrc("src/domain/rateTable.ts");

      expect(src.includes("import")).toBe(false);
      expect(src).not.toMatch(/from\s+["']\.\/(calculateBill|stage|validate|simulate|compare)["']/);
    });
  });

  describe("AC-5: 전 라우트 스모크", () => {
    it("AC-5[P0]: 필요한 state를 갖춘 7개 라우트가 모두 크래시 없이 렌더되고 빈 화면이 아니다", () => {
      const cases: Array<[string, unknown]> = [
        ["/", undefined],
        ["/history", undefined],
        ["/region", undefined],
        ["/settings", undefined],
        ["/result", VALID_RESULT_STATE],
        ["/simulate", VALID_RESULT_STATE],
        ["/report", VALID_REPORT_STATE],
      ];

      for (const [pathname, state] of cases) {
        let container: HTMLElement | undefined;
        expect(() => {
          ({ container } = renderWithRouter(React.createElement(App), {
            initialEntries: [{ pathname, state }],
          }));
        }).not.toThrow();

        expect(container!.textContent!.length).toBeGreaterThan(0);
      }
    });
  });
});
