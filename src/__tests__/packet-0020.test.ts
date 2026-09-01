/**
 * Packet 0020 — 라우팅 배선 + FloatingTabBar + 전역 Provider (App.tsx 단독 소유)
 *
 * AC-1: 7개 Route(/, /result, /history, /simulate, /report, /region, /settings) 배선,
 *       직접 진입 시 화이트스크린 없이 렌더 또는 폴백 replace 이동
 * AC-2: FloatingTabBar 4탭(홈/기록/시뮬레이션/설정), 현재 경로 활성화, 상세 화면에서는
 *       탭바가 콘텐츠를 가리지 않음(safe-area 포함 하단 spacer)
 * AC-3: 부팅 시 migrateFlags() 정확히 1회 호출, es:records 건수 전후 동일
 * AC-4: src/main.tsx diff 0줄 (ANCHOR 보존)
 * AC-5: 콘솔 에러 0건
 */
import { describe, it, expect, vi } from "vitest";
import React from "react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { screen, waitFor } from "@testing-library/react";
import { mockTds, mockAppsInToss } from "@/__tests__/__helpers__/mocks";
import { renderWithRouter, seedLocalStorage } from "@/__tests__/__helpers__/test-utils";

mockTds();
mockAppsInToss();

// migrateFlags를 실제 구현으로 감싸는 spy — 다른 storage 함수는 실제 동작 유지
vi.mock("@/lib/storage", async () => {
  const actual = await vi.importActual<typeof import("@/lib/storage")>("@/lib/storage");
  return { ...actual, migrateFlags: vi.fn(actual.migrateFlags) };
});

import App from "@/App";
import { migrateFlags } from "@/lib/storage";

const VALID_RESULT_STATE = {
  input: { yearMonth: "2024-01", kWh: 320, month: 1 },
};

const VALID_REPORT_STATE = {
  summary: {
    baseKWh: 320,
    savedKWh: 20,
    targetKWh: 300,
    baseTotal: 58000,
    targetTotal: 52000,
    savedWon: 6000,
    month: 1,
    appliances: [
      { id: "a1", name: "냉장고", watt: 150, hoursPerDay: 24, reduceRatio: 0.1 },
    ],
  },
};

describe("라우팅 배선 + FloatingTabBar + 전역 Provider (App.tsx 단독 소유) [packet-0020]", () => {
  it("AC-1[P0]: 홈/기록/동네비교/설정 4개 화면은 상태 없이 직접 진입해도 화이트스크린 없이 렌더된다", () => {
    const cases: Array<[string, string]> = [
      ["/", "ElectricSaver"],
      ["/history", "검침 기록"],
      ["/region", "우리 동네 비교"],
      ["/settings", "설정"],
    ];

    for (const [path, expectedTitle] of cases) {
      const { container, unmount } = renderWithRouter(
        React.createElement(App),
        { initialEntries: [path] },
      );
      expect(container.textContent).toContain(expectedTitle);
      expect(container.textContent!.length).toBeGreaterThan(0);
      unmount();
    }
  });

  it("AC-1[P0]: 결과/시뮬레이션 화면은 location.state 없이 직접 진입하면 화이트스크린 대신 홈으로 replace 이동한다", async () => {
    const { container: resultContainer } = renderWithRouter(React.createElement(App), {
      initialEntries: ["/result"],
    });
    await waitFor(() => expect(resultContainer.textContent).toContain("ElectricSaver"));
    expect(resultContainer.textContent!.length).toBeGreaterThan(0);

    const { container: simulateContainer } = renderWithRouter(React.createElement(App), {
      initialEntries: ["/simulate"],
    });
    await waitFor(() => expect(simulateContainer.textContent).toContain("ElectricSaver"));
    expect(simulateContainer.textContent!.length).toBeGreaterThan(0);
  });

  it("AC-2[P0]: FloatingTabBar는 홈·기록·시뮬레이션·설정 4탭이며, 현재 경로 탭만 aria-selected=true다", () => {
    const { unmount } = renderWithRouter(React.createElement(App), { initialEntries: ["/"] });

    const tabs = screen.getAllByRole("tab");
    expect(tabs).toHaveLength(4);
    const labels = tabs.map((t) => t.getAttribute("aria-label"));
    expect(labels).toEqual(expect.arrayContaining(["홈", "기록", "시뮬레이션", "설정"]));

    const homeTab = tabs.find((t) => t.getAttribute("aria-label") === "홈")!;
    const historyTab = tabs.find((t) => t.getAttribute("aria-label") === "기록")!;
    expect(homeTab.getAttribute("aria-selected")).toBe("true");
    expect(historyTab.getAttribute("aria-selected")).toBe("false");
    unmount();
  });

  it("AC-2[P0]: 경로가 /history로 바뀌면 활성 탭도 기록 탭으로 바뀐다", () => {
    renderWithRouter(React.createElement(App), { initialEntries: ["/history"] });

    const tabs = screen.getAllByRole("tab");
    const homeTab = tabs.find((t) => t.getAttribute("aria-label") === "홈")!;
    const historyTab = tabs.find((t) => t.getAttribute("aria-label") === "기록")!;
    expect(historyTab.getAttribute("aria-selected")).toBe("true");
    expect(homeTab.getAttribute("aria-selected")).toBe("false");
  });

  it("AC-2: 상세 화면(/result, /report)은 상태가 있어도 탭바를 렌더하지 않아 콘텐츠를 가리지 않는다", () => {
    const { unmount: unmountResult } = renderWithRouter(React.createElement(App), {
      initialEntries: [{ pathname: "/result", state: VALID_RESULT_STATE }],
    });
    expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
    expect(screen.queryAllByRole("tab")).toHaveLength(0);
    unmountResult();

    renderWithRouter(React.createElement(App), {
      initialEntries: [{ pathname: "/report", state: VALID_REPORT_STATE }],
    });
    expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
    expect(screen.queryAllByRole("tab")).toHaveLength(0);
  });

  it("AC-2: 탭-루트 화면은 탭바에 가려지지 않도록 safe-area 포함 하단 spacer를 가지며, 상세 화면에는 없다", () => {
    const { unmount } = renderWithRouter(React.createElement(App), { initialEntries: ["/"] });
    const spacer = screen.getByTestId("tabbar-spacer");
    expect(spacer.getAttribute("style") ?? "").toMatch(/calc\(.*(env\(safe-area-inset-bottom\)|var\(--toss-safe-area-bottom\)).*\)/);
    expect(spacer.getAttribute("style") ?? "").toMatch(/padding-bottom/);
    unmount();

    renderWithRouter(React.createElement(App), {
      initialEntries: [{ pathname: "/result", state: VALID_RESULT_STATE }],
    });
    expect(screen.queryByTestId("tabbar-spacer")).not.toBeInTheDocument();
  });

  it("AC-3[P0]: 부팅 시 migrateFlags가 정확히 1회 호출되고 es:records 건수는 부팅 전후 동일하다", () => {
    seedLocalStorage({
      "es:records": [
        { yearMonth: "2024-01", kWh: 320, total: 58000, createdAt: 1 },
        { yearMonth: "2024-02", kWh: 300, total: 54000, createdAt: 2 },
        { yearMonth: "2024-03", kWh: 280, total: 50000, createdAt: 3 },
      ],
    });

    renderWithRouter(React.createElement(App), { initialEntries: ["/"] });

    expect(migrateFlags).toHaveBeenCalledTimes(1);
    const recordsAfter = JSON.parse(localStorage.getItem("es:records") ?? "[]");
    expect(recordsAfter).toHaveLength(3);
  });

  it("AC-3: es:flags가 손상된 상태로 부팅해도 migrateFlags가 1회만 호출되고 정상 스키마로 복구된다", () => {
    localStorage.setItem("es:flags", "{not-json");
    renderWithRouter(React.createElement(App), { initialEntries: ["/"] });

    expect(migrateFlags).toHaveBeenCalledTimes(1);
    const flags = JSON.parse(localStorage.getItem("es:flags") ?? "null");
    expect(flags.schemaVersion).toBe(1);
  });

  it("AC-4: src/main.tsx는 수정되지 않는다 (@AI:ANCHOR 주석 보존)", () => {
    const mainTsx = readFileSync(resolve(__dirname, "../main.tsx"), "utf-8");
    expect(mainTsx).toContain("@AI:ANCHOR");
    expect(mainTsx).toContain("코딩 에이전트가 수정하지 마세요");
  });

  it("AC-5[P0]: 7개 경로 모두 렌더 시 console.error가 발생하지 않는다", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const routes: Array<{ pathname: string; state?: unknown }> = [
      { pathname: "/" },
      { pathname: "/result", state: VALID_RESULT_STATE },
      { pathname: "/history" },
      { pathname: "/simulate", state: { input: VALID_RESULT_STATE.input } },
      { pathname: "/report", state: VALID_REPORT_STATE },
      { pathname: "/region" },
      { pathname: "/settings" },
    ];

    for (const route of routes) {
      const { unmount } = renderWithRouter(React.createElement(App), {
        initialEntries: [route],
      });
      unmount();
    }

    expect(errorSpy).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});
