import { describe, it, expect, beforeEach, vi } from "vitest";
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";

// This test file intentionally does NOT import from
// "@/__tests__/__helpers__/mockAll" — that file's vi.mock("react-router-dom", ...)
// is hoisted for the whole file the moment ANY export of it is imported (see the
// warning at the top of mockAll.ts), which would pin useLocation()/useNavigate()
// to a single fixed value. This packet's whole point is verifying REAL route
// matching (which page renders at which path, tab clicks actually navigating),
// so react-router-dom must stay 100% real here. TDS + the SDK are mocked locally
// instead (mockTds() alone is safe to import — it only touches "@toss/tds-mobile").
import { mockTds } from "@/__tests__/__helpers__/mocks";
import type { BillInput } from "@/lib/types";

mockTds();

vi.mock("@apps-in-toss/web-framework", () => {
  const supported = Object.assign(vi.fn(() => ({ destroy: vi.fn() })), { isSupported: () => true });
  return {
    generateHapticFeedback: vi.fn(),
    TossAds: {
      initialize: Object.assign(vi.fn(), { isSupported: () => true }),
      attachBanner: supported,
      attach: Object.assign(vi.fn(), { isSupported: () => true }),
      destroy: Object.assign(vi.fn(), { isSupported: () => true }),
      destroyAll: Object.assign(vi.fn(), { isSupported: () => true }),
    },
    loadFullScreenAd: vi.fn((opts: { onEvent?: (e: unknown) => void }) => {
      setTimeout(() => opts.onEvent?.({ type: "loaded" }), 0);
    }),
    showFullScreenAd: vi.fn((opts: { onEvent?: (e: unknown) => void }) => {
      setTimeout(() => opts.onEvent?.({ type: "rewarded" }), 0);
    }),
    Storage: {
      setItem: vi.fn(async () => {}),
      getItem: vi.fn(async () => null),
      removeItem: vi.fn(async () => {}),
    },
    Analytics: {
      screen: vi.fn(async () => {}),
      impression: vi.fn(async () => {}),
      click: vi.fn(async () => {}),
    },
  };
});

import App from "@/App";

const sampleInput: BillInput = { kWh: 450, yearMonth: "2026-08", contractType: "low" };

function LocationSpy({ onLocation }: { onLocation: (pathname: string) => void }) {
  const location = useLocation();
  onLocation(location.pathname);
  return null;
}

function renderApp(initialEntries: Array<string | { pathname: string; state?: unknown }>) {
  return render(
    React.createElement(MemoryRouter, { initialEntries }, React.createElement(App)),
  );
}

async function settle() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 10));
  });
}

// Renders a route, lets pending effects/timers (ReportGate's ad-load setTimeout etc.)
// flush WHILE still mounted, runs the assertion, then unmounts — so a dangling timer
// never fires a setState after unmount later (which would print a stray console.error
// and could bleed into a later test's console.error spy, e.g. AC-5).
async function withRoute(
  initialEntries: Array<string | { pathname: string; state?: unknown }>,
  assertFn: () => void,
) {
  const { unmount } = renderApp(initialEntries);
  await settle();
  assertFn();
  unmount();
}

describe("라우팅 + FloatingTabBar 통합 (App.tsx 단독 소유)", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("AC-1[P0]: 6개 경로 진입 시 각 경로에 대응하는 페이지가 렌더된다", async () => {
    await withRoute(["/"], () => {
      expect(screen.getByText("우리집 전기요금")).toBeInTheDocument();
    });

    await withRoute([{ pathname: "/result", state: { input: sampleInput } }], () => {
      expect(screen.getByText("2026년 8월 요금")).toBeInTheDocument();
    });

    await withRoute(
      [{ pathname: "/simulate", state: { recordId: "rec_2026-08", input: sampleInput } }],
      () => {
        expect(screen.getByText("절약 시뮬레이션")).toBeInTheDocument();
      },
    );

    await withRoute(
      [
        {
          pathname: "/report",
          state: { recordId: "rec_2026-08", input: sampleInput, cuts: [], savedWon: 5000 },
        },
      ],
      () => {
        expect(screen.getByText("절약 리포트")).toBeInTheDocument();
      },
    );

    await withRoute(["/history"], () => {
      expect(screen.getByText("계산 기록")).toBeInTheDocument();
    });

    await withRoute(["/compare"], () => {
      expect(screen.getByText("우리 동네 비교")).toBeInTheDocument();
    });
  });

  it("AC-1[P0]: 정의되지 않은 경로는 '/'로 replace 리다이렉트되어 홈이 렌더된다", async () => {
    const seenPathnames: string[] = [];
    render(
      React.createElement(
        MemoryRouter,
        { initialEntries: ["/no-such-route-xyz"] },
        React.createElement(App),
        React.createElement(LocationSpy, { onLocation: (p: string) => seenPathnames.push(p) }),
      ),
    );
    await settle();

    expect(screen.getByText("우리집 전기요금")).toBeInTheDocument();
    expect(seenPathnames[seenPathnames.length - 1]).toBe("/");
  });

  it("AC-2[P0]: FloatingTabBar는 '/','/history','/compare'에서만 정확히 1개 렌더되고 다른 3개 경로에는 없다", async () => {
    await withRoute(["/"], () => {
      expect(screen.getAllByRole("tablist", { name: "메인 네비게이션" })).toHaveLength(1);
    });

    await withRoute(["/history"], () => {
      expect(screen.getAllByRole("tablist", { name: "메인 네비게이션" })).toHaveLength(1);
    });

    await withRoute(["/compare"], () => {
      expect(screen.getAllByRole("tablist", { name: "메인 네비게이션" })).toHaveLength(1);
    });

    await withRoute([{ pathname: "/result", state: { input: sampleInput } }], () => {
      expect(screen.queryByRole("tablist", { name: "메인 네비게이션" })).not.toBeInTheDocument();
    });

    await withRoute(
      [{ pathname: "/simulate", state: { recordId: "rec_2026-08", input: sampleInput } }],
      () => {
        expect(screen.queryByRole("tablist", { name: "메인 네비게이션" })).not.toBeInTheDocument();
      },
    );

    await withRoute(
      [
        {
          pathname: "/report",
          state: { recordId: "rec_2026-08", input: sampleInput, cuts: [], savedWon: 5000 },
        },
      ],
      () => {
        expect(screen.queryByRole("tablist", { name: "메인 네비게이션" })).not.toBeInTheDocument();
      },
    );
  });

  it("AC-3[P0]: 하단 탭 '기록' 클릭 시 /history로 이동하고 활성 탭에 컬러 틴트가 적용된다", async () => {
    renderApp(["/"]);

    const tabBar = screen.getByRole("tablist", { name: "메인 네비게이션" });
    const calcTab = screen.getByRole("tab", { name: "계산" });
    const historyTab = screen.getByRole("tab", { name: "기록" });
    expect(calcTab).toHaveAttribute("aria-selected", "true");
    expect(historyTab).toHaveAttribute("aria-selected", "false");

    fireEvent.click(historyTab);
    await settle();

    expect(screen.getByText("계산 기록")).toBeInTheDocument();
    const historyTabAfter = screen.getByRole("tab", { name: "기록" });
    expect(historyTabAfter).toHaveAttribute("aria-selected", "true");
    expect(historyTabAfter.style.color).toBe("var(--adaptiveBlue500)");
    expect(tabBar).toBeInTheDocument();
  });

  it("AC-4: main.tsx 파일이 git diff에서 변경되지 않았고 @AI:ANCHOR 블록이 그대로 유지된다", () => {
    const diff = execSync("git diff --stat -- src/main.tsx", { encoding: "utf-8" }).trim();
    expect(diff).toBe("");

    const content = readFileSync("src/main.tsx", "utf-8");
    expect(content).toContain("@AI:ANCHOR");
    expect(content).toContain("TDSMobileAITProvider");
  });

  it("AC-5[P0]: 6개 경로 순회 및 탭 전환 중 console.error가 0건이다", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    try {
      await withRoute(["/"], () => {
        expect(screen.queryByTestId("home-skeleton")).not.toBeInTheDocument();
      });
      await withRoute([{ pathname: "/result", state: { input: sampleInput } }], () => {});
      await withRoute(
        [{ pathname: "/simulate", state: { recordId: "rec_2026-08", input: sampleInput } }],
        () => {},
      );
      await withRoute(
        [
          {
            pathname: "/report",
            state: { recordId: "rec_2026-08", input: sampleInput, cuts: [], savedWon: 5000 },
          },
        ],
        () => {},
      );
      await withRoute(["/history"], () => {});

      const { unmount } = renderApp(["/compare"]);
      await settle();
      fireEvent.click(screen.getByRole("tab", { name: "계산" }));
      await settle();
      unmount();
    } finally {
      expect(errorSpy).not.toHaveBeenCalled();
      errorSpy.mockRestore();
    }
  });
});
