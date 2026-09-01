/**
 * Standalone TossRewardAd mock — deliberately NOT re-exported from mocks.ts.
 *
 * Vitest's `vi.mock()` hoisting is per-file and ignores enclosing function
 * scope: any `vi.mock(...)` call written anywhere in a module's source is
 * hoisted to the top of THAT module and executes the instant the module is
 * loaded — regardless of whether the function containing it is ever called.
 * If this mock lived inside mocks.ts (as it used to), merely importing
 * mockTds/mockAppsInToss/mockRouter from mocks.ts would transitively load
 * this file's vi.mock too, silently overriding any test-local
 * `vi.mock("@/components/TossRewardAd", ...)` declared for finer-grained
 * control (e.g. asserting the onRewarded callback / slotId prop — see
 * packet-0016.test.ts). Keeping it in its own file means it only activates
 * for test files that explicitly import it.
 *
 * Usage:
 *   import { mockTossRewardAd } from "@/__tests__/__helpers__/mockTossRewardAd";
 *   mockTossRewardAd();
 */

import { vi } from "vitest";

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
