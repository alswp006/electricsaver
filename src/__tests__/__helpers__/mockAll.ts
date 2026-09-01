/**
 * Shared test mocks that need the FULL stack (SDK + reward-ad wrapper + router).
 *
 * IMPORTANT — vi.mock is hoisted to the top of whatever FILE it is written in,
 * regardless of which function it's nested inside. That means merely importing
 * this file (even a single named export) registers ALL vi.mock calls below —
 * unconditionally, before any consuming test's own code runs. This file exists
 * SEPARATELY from mocks.ts precisely so that tests wanting only `mockTds()`
 * (e.g. one that supplies its own controllable "@apps-in-toss/web-framework"
 * mock, or wants the real "@/components/TossRewardAd") don't get these other
 * mocks silently forced on them too (discovered 2026-09-02 debugging packet 0012:
 * a test importing only `mockTds` from mocks.ts still got TossRewardAd + the SDK
 * auto-mocked, silently breaking a from-scratch controllable ad mock).
 *
 * Usage:
 *   import { mockAll } from "@/__tests__/__helpers__/mockAll";
 *   mockAll();
 */

import { vi } from "vitest";
import { mockTds } from "@/__tests__/__helpers__/mocks";

export const mockNavigate = vi.fn();
export const mockLocation = { pathname: "/", search: "", state: null, key: "default" };

// ── @apps-in-toss/web-framework ──
// Mocks the REAL SDK exports (verified from .d.ts).
// SDK is imperative (no hooks). Callback-style APIs invoke onEvent immediately for test speed.
export function mockAppsInToss() {
  vi.mock("@apps-in-toss/web-framework", () => {
    const Storage = {
      setItem: vi.fn(async (k: string, v: string) => { localStorage.setItem(k, v); }),
      getItem: vi.fn(async (k: string) => localStorage.getItem(k)),
      removeItem: vi.fn(async (k: string) => { localStorage.removeItem(k); }),
      clearItems: vi.fn(async () => { localStorage.clear(); }),
    };

    const Analytics = {
      screen: vi.fn(async () => {}),
      impression: vi.fn(async () => {}),
      click: vi.fn(async () => {}),
    };

    // Imperative ad API — auto-fires onEvent so tests don't hang
    const loadFullScreenAd = vi.fn((opts: { onEvent?: (e: any) => void; onError?: (e: any) => void }) => {
      setTimeout(() => opts.onEvent?.({ type: "loaded" }), 0);
    });
    const showFullScreenAd = vi.fn((opts: { onEvent?: (e: any) => void; onError?: (e: any) => void }) => {
      setTimeout(() => opts.onEvent?.({ type: "rewarded" }), 0);
    });
    // TossAds banner API (real SDK exports — see @apps-in-toss/web-bridge .d.ts)
    const TossAds = {
      initialize: Object.assign(vi.fn(), { isSupported: () => true }),
      attachBanner: Object.assign(
        vi.fn(() => ({ destroy: vi.fn() })),
        { isSupported: () => true },
      ),
      attach: Object.assign(vi.fn(), { isSupported: () => true }),
      destroy: Object.assign(vi.fn(), { isSupported: () => true }),
      destroyAll: Object.assign(vi.fn(), { isSupported: () => true }),
    };

    // IAP
    const createOneTimePurchaseOrder = vi.fn((opts: any) => {
      setTimeout(async () => {
        const granted = await opts.options.processProductGrant({ orderId: "test-order-1" });
        if (granted) {
          opts.onEvent?.({
            type: "success",
            data: {
              orderId: "test-order-1",
              displayName: "Test Product",
              displayAmount: "1,000원",
              amount: 1000,
              currency: "KRW",
              fraction: 0,
              miniAppIconUrl: null,
            },
          });
        }
      }, 0);
    });
    const createSubscriptionPurchaseOrder = vi.fn((opts: any) => {
      setTimeout(async () => {
        const granted = await opts.options.processProductGrant({
          orderId: "test-sub-1",
          subscriptionId: "test-sub",
        });
        if (granted) {
          opts.onEvent?.({
            type: "success",
            data: {
              orderId: "test-sub-1",
              displayName: "Test Subscription",
              displayAmount: "4,900원/월",
              amount: 4900,
              currency: "KRW",
              fraction: 0,
              miniAppIconUrl: null,
            },
          });
        }
      }, 0);
    });

    return {
      Storage,
      Analytics,

      generateHapticFeedback: vi.fn(),
      grantPromotionReward: vi.fn(async () => {}),
      getIsTossLoginIntegratedService: vi.fn(async () => false),

      loadFullScreenAd,
      showFullScreenAd,
      TossAds,

      // IAP 실제 API는 IAP 네임스페이스 아래에 있다(.d.ts 검증). 각 메서드는 cleanup 함수 반환.
      // (최상위 이름은 하위호환용으로 유지 — 실제 SDK 최상위 export 아님)
      createOneTimePurchaseOrder,
      createSubscriptionPurchaseOrder,
      IAP: {
        createOneTimePurchaseOrder: vi.fn((opts: any) => {
          createOneTimePurchaseOrder(opts);
          return () => {};
        }),
        createSubscriptionPurchaseOrder: vi.fn((opts: any) => {
          createSubscriptionPurchaseOrder(opts);
          return () => {};
        }),
      },

      // Misc bridge
      share: vi.fn(async () => {}),
      setClipboardText: vi.fn(async () => {}),
      getClipboardText: vi.fn(async () => ""),
      requestReview: vi.fn(async () => {}),
      openURL: vi.fn(async () => {}),
      getPlatformOS: vi.fn(async () => "ios"),
      getNetworkStatus: vi.fn(async () => ({ connected: true, type: "wifi" })),
      getTossAppVersion: vi.fn(async () => "5.0.0"),
      getOperationalEnvironment: vi.fn(async () => "development"),
      getPermission: vi.fn(async () => ({ granted: true })),
      getSchemeUri: vi.fn(async () => "intoss://test-app"),
    };
  });
}

// ── Toss Reward Ad Component ──
// TossRewardAd is a project-local component that wraps content behind ad viewing.
// In tests, render the children directly (ad always "watched").
export function mockTossRewardAd() {
  vi.mock("@/components/TossRewardAd", () => ({
    TossRewardAd: ({ children, onReward }: any) => {
      // Auto-trigger onReward in tests to unlock content
      if (onReward) setTimeout(onReward, 0);
      return children;
    },
    default: ({ children }: any) => children,
  }));
}

// ── react-router-dom ──
// Preserve actual router + override useNavigate for assertion.
export function mockRouter() {
  vi.mock("react-router-dom", async () => {
    const actual = await vi.importActual<typeof import("react-router-dom")>(
      "react-router-dom",
    );
    return {
      ...actual,
      useNavigate: () => mockNavigate,
      useLocation: () => mockLocation,
    };
  });
}

// ── Convenience: mock everything ──
export function mockAll() {
  mockTds();
  mockAppsInToss();
  mockTossRewardAd();
  mockRouter();
}
