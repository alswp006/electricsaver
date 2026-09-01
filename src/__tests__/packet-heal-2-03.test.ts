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
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { screen, waitFor } from "@testing-library/react";
import { mockAll } from "@/__tests__/__helpers__/mocks";
import { renderWithRouter } from "@/__tests__/__helpers__/test-utils";

mockAll();

import App from "@/App";

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
});
