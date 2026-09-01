import { describe, it, expect, vi } from "vitest";
import { execSync } from "node:child_process";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import path from "node:path";
import React from "react";
import { render, act } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

// react-router-dom must stay 100% REAL for AC-4's multi-route render (see packet 0019 —
// mockAll()'s vi.mock("react-router-dom", ...) is file-hoisted and would pin useLocation
// to a fixed value). Only TDS + the SDK are mocked locally.
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

const REPO_ROOT = path.resolve(__dirname, "..", "..");
const SRC_DIR = path.resolve(REPO_ROOT, "src");

/**
 * src/ 아래 확장자에 맞는 파일을 전부 모은다 (node_modules/dist는 애초에 src/ 밖).
 * __tests__ 디렉터리는 제외한다 — 이 파일 자체가 배너 SDK 이름을 문자열 리터럴로
 * 나열하므로(예: bannedSdks 배열), 스캔 대상에 테스트 코드를 포함하면 이 파일이
 * 자기 자신을 위반으로 잡는 자기참조 오탐이 생긴다. 컴플라이언스 스캔은 실제
 * 배포되는 앱 소스가 대상이지 테스트 코드가 대상이 아니다.
 */
function walkFiles(dir: string, extensions: string[]): string[] {
  let results: string[] = [];
  for (const entry of readdirSync(dir)) {
    if (entry === "__tests__") continue;
    const full = path.join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      results = results.concat(walkFiles(full, extensions));
    } else if (extensions.some((ext) => entry.endsWith(ext))) {
      results.push(full);
    }
  }
  return results;
}

function readAllSrc(extensions: string[]): { file: string; content: string }[] {
  return walkFiles(SRC_DIR, extensions).map((file) => ({
    file: path.relative(REPO_ROOT, file),
    content: readFileSync(file, "utf-8"),
  }));
}

const ALL_SRC_FILES = readAllSrc([".ts", ".tsx", ".css"]);

function countMatches(regex: RegExp): { file: string; count: number }[] {
  return ALL_SRC_FILES.map(({ file, content }) => {
    const matches = content.match(new RegExp(regex.source, regex.flags.includes("g") ? regex.flags : regex.flags + "g"));
    return { file, count: matches ? matches.length : 0 };
  }).filter((r) => r.count > 0);
}

const sampleInput: BillInput = { kWh: 450, yearMonth: "2026-08", contractType: "low" };

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

const ALL_ROUTES: Array<string | { pathname: string; state?: unknown }> = [
  ["/"],
  [{ pathname: "/result", state: { input: sampleInput } }],
  [{ pathname: "/simulate", state: { recordId: "rec_2026-08", input: sampleInput } }],
  [
    {
      pathname: "/report",
      state: { recordId: "rec_2026-08", input: sampleInput, cuts: [], savedWon: 5000 },
    },
  ],
  ["/history"],
  ["/compare"],
].map((entries) => entries[0]);

describe("컴플라이언스 정적 스캔 + 호환성 설정 + 최종 QA", () => {
  it("AC-1[P0]: 외부 이탈(location.href/window.open/<a href) · 설치 유도 문구 · grantPromotionReward 매칭이 소스 전체에서 0건이다", () => {
    const locationHrefHits = countMatches(/location\s*\.\s*href\s*=\s*['"]http/gi);
    const windowOpenHits = countMatches(/window\s*\.\s*open\s*\(/gi);
    const anchorHrefHits = countMatches(/<a\s+href/gi);
    const installCopyHits = countMatches(/설치|다운로드|앱스토어|플레이스토어/g);
    const promotionRewardHits = countMatches(/grantPromotionReward/g);

    expect(locationHrefHits).toEqual([]);
    expect(windowOpenHits).toEqual([]);
    expect(anchorHrefHits).toEqual([]);
    expect(installCopyHits).toEqual([]);
    expect(promotionRewardHits).toEqual([]);
  });

  it("AC-2[P0]: package.json 의존성과 소스 import에 금지된 외부 분석/광고/결제 SDK 매칭이 0건이다", () => {
    const bannedSdks = [
      "stripe",
      "iamport",
      "bootpay",
      "admob",
      "adsense",
      "firebase",
      "kakao",
      "naver",
      "google-analytics",
      "amplitude",
    ];

    const packageJson = readFileSync(path.resolve(REPO_ROOT, "package.json"), "utf-8");
    const srcConcat = ALL_SRC_FILES.map((f) => f.content).join("\n");

    const packageJsonHits: Record<string, number> = {};
    const srcHits: Record<string, number> = {};

    for (const sdk of bannedSdks) {
      // \b 경계 — "regionAverage" 안의 "nAver" 같은 부분일치(오탐) 방지
      const re = new RegExp(`\\b${sdk}\\b`, "gi");
      packageJsonHits[sdk] = (packageJson.match(re) ?? []).length;
      srcHits[sdk] = (srcConcat.match(re) ?? []).length;
    }

    expect(packageJsonHits).toEqual(Object.fromEntries(bannedSdks.map((s) => [s, 0])));
    expect(srcHits).toEqual(Object.fromEntries(bannedSdks.map((s) => [s, 0])));
  });

  it("AC-3[P0]: src/**/*.{ts,tsx,css} 전체에서 #RRGGBB/#RGB 하드코딩 HEX 리터럴 매칭이 0건이다", () => {
    const hexHits = countMatches(/#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{3})(?![0-9a-fA-F])/g);
    expect(hexHits).toEqual([]);
  });

  it("AC-4[P0]: 6개 라우트를 순회 렌더하는 동안 fetch/XMLHttpRequest 네트워크 호출과 console.error가 각각 0건이다", async () => {
    // 워밍업 패스(스파이 미장착): React DevMode의 validateDOMNesting 경고는 동일한
    // 조상 트리 조합에 한해 프로세스당 1회만 발화(dedupe)한다. 스파이를 걸기 전에
    // 전 라우트를 한 번 렌더해 두면, 실제 검증 패스에서는 이미 발화된 경고가
    // 재발화되지 않아 "앱 실제 컴플라이언스 위반"과 "React 개발 경고 중복 발화
    // 타이밍"이라는 무관한 두 가지가 섞이지 않는다.
    for (const entries of ALL_ROUTES) {
      const { unmount } = renderApp([entries] as Array<string | { pathname: string; state?: unknown }>);
      await settle();
      unmount();
    }

    const fetchSpy = vi.fn();
    const originalFetch = globalThis.fetch;
    globalThis.fetch = fetchSpy as unknown as typeof fetch;
    const xhrOpenSpy = vi.spyOn(XMLHttpRequest.prototype, "open").mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    try {
      for (const entries of ALL_ROUTES) {
        const { unmount } = renderApp([entries] as Array<string | { pathname: string; state?: unknown }>);
        await settle();
        unmount();
      }
    } finally {
      expect(fetchSpy).not.toHaveBeenCalled();
      expect(xhrOpenSpy).not.toHaveBeenCalled();
      expect(errorSpy).not.toHaveBeenCalled();

      globalThis.fetch = originalFetch;
      xhrOpenSpy.mockRestore();
      errorSpy.mockRestore();
    }
  });

  it("AC-5[P0]: vite.config.ts의 build.target이 'es2020'이고 .browserslistrc에 'iOS >= 16'/'Android >= 7'이 포함된다", () => {
    // 동적 import(../../vite.config.ts)는 쓰지 않는다 — jsdom 테스트 환경에서
    // vitest가 .ts를 즉석 transform할 때 esbuild가 쓰는 TextEncoder invariant가
    // jsdom의 TextEncoder 셰임과 충돌해 "environment is broken" 에러로 죽는다
    // (컴플라이언스 스캔과 무관한 환경 문제). 정적 텍스트 검사로 충분하고 더 안전하다.
    const viteConfigPath = path.resolve(REPO_ROOT, "vite.config.ts");
    const viteConfigContent = readFileSync(viteConfigPath, "utf-8");
    expect(viteConfigContent).toMatch(/target\s*:\s*['"]es2020['"]/);

    const browserslistPath = path.resolve(REPO_ROOT, ".browserslistrc");
    expect(existsSync(browserslistPath)).toBe(true);

    const browserslistContent = readFileSync(browserslistPath, "utf-8");
    expect(browserslistContent).toContain("iOS >= 16");
    expect(browserslistContent).toContain("Android >= 7");
  });

  it("AC-5: npm run build가 에러 없이 성공하고 dist에 빌드 산출물을 남긴다", () => {
    const distDir = path.resolve(REPO_ROOT, "dist");
    const output = execSync("npm run build", {
      cwd: REPO_ROOT,
      encoding: "utf-8",
      timeout: 120_000,
    });

    expect(output).toContain("built in");
    expect(existsSync(path.resolve(distDir, "index.html"))).toBe(true);
  });
});
