/**
 * Packet heal-2-03 — 부팅 스모크 회귀 테스트: 루트 마운트 + 전 라우트 첫 페인트 검증.
 *
 * 목적: 보이지 않는 부팅 예외(흰 화면)가 재발하지 않도록, 7개 라우트 각각의 첫 페인트를
 * 지정 시간 내 단언하고, storage가 throw하거나 env가 비어 있는 저해상도 환경에서도
 * 부팅이 성공함을 고정한다. 새 화면·새 기능 구현 없음 — 검증만 추가.
 *
 * AC-1: 7개 라우트 전부 첫 페인트 단언 테스트가 존재하고 통과한다
 * AC-2: location.state가 없는 /result, /report는 홈으로 replace되고 빈 화면/무한 로딩이 아니다
 * AC-3: localStorage.getItem/setItem이 throw해도 부팅이 성공한다
 * AC-4: import.meta.env.DEV가 꺼져 있어도(프로덕션 유사 환경) 부팅이 성공한다
 * AC-5: 전 라우트 연속 스윕이 예외 없이 통과한다(전체 스위트/빌드 통과를 대표하는 통합 검증)
 * AC-6: /result·/simulate·/report는 가드 리다이렉트가 아니라, 유효한 location.state로
 *   진입했을 때 실제 목적 화면(가드 우회 아님)이 렌더되고 콘솔 에러가 없다 — ReportGate가
 *   미설정 env(VITE_TOSS_AD_SLOT_ID undefined)로 실제 렌더 경로를 타는 케이스도 겸한다.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { screen, waitFor } from "@testing-library/react";
import { mockAll } from "@/__tests__/__helpers__/mocks";
import { renderWithRouter } from "@/__tests__/__helpers__/test-utils";
import { simulate } from "@/domain/simulate";
import type { BillInput } from "@/types/navigation";

mockAll();

import App from "@/App";

const VALID_INPUT: BillInput = { yearMonth: "2026-08", kWh: 350, month: 8 };
const VALID_SUMMARY = simulate(VALID_INPUT.kWh, VALID_INPUT.month, []);

const BOOT_TIMEOUT_MS = 1000;

// /result, /simulate, /report는 location.state 없이 직접 진입하면 RequireRouteState 가드에
// 의해 홈으로 replace되므로 기대 타이틀도 홈("ElectricSaver")이다.
const ROUTE_CASES: Array<{ path: string; expectedTitle: string }> = [
  { path: "/", expectedTitle: "ElectricSaver" },
  { path: "/result", expectedTitle: "ElectricSaver" },
  { path: "/history", expectedTitle: "검침 기록" },
  { path: "/simulate", expectedTitle: "ElectricSaver" },
  { path: "/report", expectedTitle: "ElectricSaver" },
  { path: "/region", expectedTitle: "우리 동네 비교" },
  { path: "/settings", expectedTitle: "설정" },
];

describe("부팅 스모크 회귀 테스트 — 루트 마운트 + 전 라우트 첫 페인트 검증", () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    // AC-4: 이 파일의 모든 테스트에서 렌더 중 console.error가 한 번이라도 발생하면
    // 여기서 실패해 보이지 않는 부팅 예외를 드러낸다.
    expect(errorSpy).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  it.each(ROUTE_CASES)(
    `AC-1[P0]: $path 경로가 ${BOOT_TIMEOUT_MS}ms 내 실제 콘텐츠를 페인트한다`,
    async ({ path, expectedTitle }) => {
      const { container } = renderWithRouter(React.createElement(App), {
        initialEntries: [path],
      });

      await waitFor(
        () => expect(container.textContent).toContain(expectedTitle),
        { timeout: BOOT_TIMEOUT_MS },
      );
      expect(
        container.querySelectorAll("button, input, h1, h2, nav").length,
      ).toBeGreaterThan(0);
    },
  );

  it("AC-2[P0]: /result에 location.state 없이 진입하면 홈으로 replace되고 무한 로딩 인디케이터가 없다", async () => {
    const { container } = renderWithRouter(React.createElement(App), {
      initialEntries: ["/result"],
    });

    await waitFor(() => expect(container.textContent).toContain("ElectricSaver"));
    expect(container.querySelector('[role="progressbar"]')).toBeNull();
    expect(screen.getByTestId("tabbar-spacer")).toBeInTheDocument();
  });

  it("AC-2[P0]: /report에 location.state 없이 진입하면 홈으로 replace되고 무한 로딩 인디케이터가 없다", async () => {
    const { container } = renderWithRouter(React.createElement(App), {
      initialEntries: ["/report"],
    });

    await waitFor(() => expect(container.textContent).toContain("ElectricSaver"));
    expect(container.querySelector('[role="progressbar"]')).toBeNull();
    expect(screen.getByTestId("tabbar-spacer")).toBeInTheDocument();
  });

  it("AC-3: localStorage.getItem/setItem이 throw하는 환경에서도 부팅이 흰 화면 없이 성공한다", async () => {
    const getSpy = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("storage blocked");
    });
    const setSpy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota exceeded");
    });

    try {
      const { container } = renderWithRouter(React.createElement(App), {
        initialEntries: ["/"],
      });
      await waitFor(() => expect(container.textContent).toContain("ElectricSaver"));
      expect(container.textContent!.length).toBeGreaterThan(0);
    } finally {
      getSpy.mockRestore();
      setSpy.mockRestore();
    }
  });

  it("AC-4: import.meta.env.DEV가 꺼진(프로덕션 유사) 환경에서도 부팅이 성공하고 콘텐츠가 그려진다", async () => {
    vi.stubEnv("DEV", false);
    try {
      const { container } = renderWithRouter(React.createElement(App), {
        initialEntries: ["/"],
      });
      await waitFor(() => expect(container.textContent).toContain("ElectricSaver"));
      expect(container.textContent!.length).toBeGreaterThan(0);
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("AC-5[P0]: 7개 라우트를 한 세션에서 연속 마운트/언마운트해도 예외 없이 통과한다", () => {
    for (const { path, expectedTitle } of ROUTE_CASES) {
      const { container, unmount } = renderWithRouter(React.createElement(App), {
        initialEntries: [path],
      });
      expect(container.textContent).toContain(expectedTitle);
      expect(container.textContent!.length).toBeGreaterThan(0);
      unmount();
    }
  });

  it("AC-6: /result에 유효한 input state로 진입하면 홈으로 리다이렉트되지 않고 실제 결과 화면이 그려진다", async () => {
    const { container } = renderWithRouter(React.createElement(App), {
      initialEntries: [{ pathname: "/result", state: { input: VALID_INPUT } }],
    });

    await waitFor(() => expect(screen.getByTestId("bill-total")).toBeInTheDocument());
    expect(screen.getByTestId("stage-card")).toBeInTheDocument();
    expect(container.textContent).not.toContain("ElectricSaver");
  });

  it("AC-6: /simulate에 유효한 input state로 진입하면 홈으로 리다이렉트되지 않고 실제 시뮬레이션 화면이 그려진다", async () => {
    const { container, getByTestId } = renderWithRouter(React.createElement(App), {
      initialEntries: [{ pathname: "/simulate", state: { input: VALID_INPUT } }],
    });

    await waitFor(() => expect(getByTestId("save-hero")).toBeInTheDocument());
    expect(container.textContent).not.toContain("ElectricSaver");
  });

  it("AC-6: /report에 유효한 summary state로 진입하면 홈/시뮬레이션으로 리다이렉트되지 않고 미설정 env(VITE_TOSS_AD_SLOT_ID undefined) 아래에서도 게이트 화면이 그려진다", async () => {
    const { getByTestId } = renderWithRouter(React.createElement(App), {
      initialEntries: [{ pathname: "/report", state: { summary: VALID_SUMMARY } }],
    });

    await waitFor(() => expect(getByTestId("saved-summary-hero")).toBeInTheDocument());
    expect(getByTestId("report-gate")).toBeInTheDocument();
  });
});
