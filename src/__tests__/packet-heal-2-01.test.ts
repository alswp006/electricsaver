/**
 * Packet heal-2-01 — App 루트 부팅 배선 최소화: 단일 Router · Suspense · ErrorBoundary
 *
 * 목적: 부팅 배선(Router 중복, lazy without Suspense, 하위 예외 미포착)이 흰 화면·타임아웃의
 * 원인이 되지 않도록 고정한다. 새 기능·새 화면 추가 없음 — 배선만 검증.
 *
 * AC-1: 앱 전체에 Router 컴포넌트 인스턴스가 정확히 1개만 존재한다
 * AC-2: lazy 라우트가 있으면 이를 감싸는 Suspense fallback이 존재한다(또는 전부 정적 import)
 * AC-3: 라우터 훅(useNavigate/useLocation)을 쓰는 모든 컴포넌트가 Router 하위에서만 정상 동작한다
 * AC-4: 루트 ErrorBoundary가 하위 예외를 잡아 흰 화면 대신 식별 가능한 에러 화면을 페인트한다
 * AC-5: /, /result, /history, /simulate, /report, /region, /settings 전 라우트가 타임아웃 없이
 *   첫 페인트에 도달한다
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { mockAll } from "@/__tests__/__helpers__/mocks";
import { renderWithRouter } from "@/__tests__/__helpers__/test-utils";

mockAll();

import App from "@/App";
import { FloatingTabBar } from "@/components/FloatingTabBar";

function readSrc(relPath: string): string {
  return readFileSync(resolve(process.cwd(), relPath), "utf-8");
}

// 실패를 강제로 던지는 하위 컴포넌트 — ErrorBoundary가 실제로 포착하는지 검증하는 용도.
function Boom(): React.ReactElement {
  throw new Error("boom-heal-2-01");
}

const BOOT_TIMEOUT_MS = 1000;
const ROUTE_CASES: string[] = ["/", "/result", "/history", "/simulate", "/report", "/region", "/settings"];

describe("App 루트 부팅 배선 최소화 — 단일 Router · Suspense · ErrorBoundary [packet heal-2-01]", () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    cleanup();
    errorSpy.mockRestore();
    vi.restoreAllMocks();
  });

  describe("AC-1: 단일 Router 인스턴스", () => {
    it("AC-1[P0]: main.tsx는 BrowserRouter를 정확히 1개만 JSX로 사용한다", () => {
      const mainSrc = readSrc("src/main.tsx");
      const jsxOpenTags = mainSrc.match(/<BrowserRouter\b/g) ?? [];
      expect(jsxOpenTags.length).toBe(1);
      expect(mainSrc).toContain("import { BrowserRouter }");
    });

    it("AC-1[P0]: App.tsx는 Router 컴포넌트(BrowserRouter/MemoryRouter/HashRouter)를 선언하지 않는다", () => {
      const appSrc = readSrc("src/App.tsx");
      expect(appSrc).not.toMatch(/\bBrowserRouter\b/);
      expect(appSrc).not.toMatch(/\bMemoryRouter\b/);
      expect(appSrc).not.toMatch(/\bHashRouter\b/);
    });
  });

  describe("AC-2: lazy 라우트는 Suspense로 감싼다", () => {
    it("AC-2: App.tsx에 lazy(...) 호출이 있으면 같은 파일에 Suspense 사용이 반드시 존재한다", () => {
      const appSrc = readSrc("src/App.tsx");
      const lazyCalls = appSrc.match(/\blazy\(/g) ?? [];
      if (lazyCalls.length > 0) {
        expect(appSrc).toMatch(/<Suspense\b/);
        expect(appSrc).toMatch(/fallback=/);
      } else {
        // 전부 정적 import로 대체된 경우 — 대체 조건 충족
        expect(appSrc).not.toMatch(/\blazy\(/);
      }
    });

    it("AC-2: lazy 라우트로 진입해도 렌더가 멈추지 않고(서스펜드 무한 대기 아님) 곧 콘텐츠가 그려진다", async () => {
      const { container } = renderWithRouter(React.createElement(App), {
        initialEntries: ["/"],
      });
      await waitFor(() => expect(container.textContent!.length).toBeGreaterThan(0), {
        timeout: BOOT_TIMEOUT_MS,
      });
    });
  });

  describe("AC-3: 라우터 훅 컴포넌트는 Router 하위에서만 렌더된다", () => {
    it("AC-3[P0]: FloatingTabBar(useNavigate/useLocation 사용)는 MemoryRouter 하위에서 예외 없이 렌더된다", () => {
      render(
        React.createElement(
          MemoryRouter,
          { initialEntries: ["/"] },
          React.createElement(FloatingTabBar, {
            items: [{ label: "홈", path: "/" }],
          }),
        ),
      );
      expect(screen.getByRole("tablist")).toBeInTheDocument();
      expect(errorSpy).not.toHaveBeenCalled();
    });

    it("AC-3: App 전체를 MemoryRouter로 마운트해도 'useNavigate() may be used only' 류의 라우터 컨텍스트 에러가 없다", () => {
      renderWithRouter(React.createElement(App), { initialEntries: ["/"] });
      const routerContextErrors = errorSpy.mock.calls.filter((call) =>
        String(call[0]).includes("useNavigate") || String(call[0]).includes("useLocation"),
      );
      expect(routerContextErrors.length).toBe(0);
    });
  });

  describe("AC-4: 루트 ErrorBoundary", () => {
    it("AC-4[P0]: 하위 컴포넌트가 throw해도 ErrorBoundary가 잡아 식별 가능한 에러 화면을 페인트한다(빈 화면 아님)", async () => {
      const { ErrorBoundary } = await import("@/components/ErrorBoundary");

      const { container } = render(
        React.createElement(ErrorBoundary, null, React.createElement(Boom)),
      );

      expect(container.textContent!.length).toBeGreaterThan(0);
      // 원본 예외가 트리 밖으로 전파되지 않음 — render()가 여기까지 도달한 것 자체가 증거지만
      // 명시적으로 unmount 시에도 재throw 없이 정리되는지 확인한다.
      expect(() => cleanup()).not.toThrow();
    });

    it("AC-4: App.tsx 소스가 최상위에서 ErrorBoundary로 라우트 트리를 감싼다", () => {
      const appSrc = readSrc("src/App.tsx");
      expect(appSrc).toMatch(/ErrorBoundary/);
    });
  });

  describe("AC-5: 전 라우트 첫 페인트 (타임아웃 없음)", () => {
    it.each(ROUTE_CASES)(
      `AC-5[P0]: %s 경로가 ${BOOT_TIMEOUT_MS}ms 내 흰 화면 없이 첫 페인트에 도달한다`,
      async (path) => {
        const { container } = renderWithRouter(React.createElement(App), {
          initialEntries: [path],
        });
        await waitFor(() => expect(container.textContent!.length).toBeGreaterThan(0), {
          timeout: BOOT_TIMEOUT_MS,
        });
        expect(container.firstChild).not.toBeNull();
      },
    );
  });
});
