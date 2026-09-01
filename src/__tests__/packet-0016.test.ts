import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { screen, fireEvent, renderHook, act } from "@testing-library/react";
import { renderWithRouter, seedLocalStorage } from "@/__tests__/__helpers__/test-utils";
import { mockTds, mockAppsInToss, mockRouter } from "@/__tests__/__helpers__/mocks";
import type { ReportUnlock } from "@/types/domain";

mockTds();
mockAppsInToss();
mockRouter();

// ── local TossRewardAd mock (captures props so we can assert slotId + trigger onRewarded) ──
const tossRewardAdSpy = vi.hoisted(() => vi.fn());
vi.mock("@/components/TossRewardAd", () => ({
  TossRewardAd: (props: any) => {
    tossRewardAdSpy(props);
    return React.createElement(
      "div",
      { "data-testid": "reward-ad-gate" },
      React.createElement(
        "button",
        { onClick: () => props.onRewarded?.() },
        "watch-ad",
      ),
      props.children,
    );
  },
}));

import { ReportGate } from "@/components/ReportGate";
import { useReportUnlock } from "@/hooks/useReportUnlock";

const TTL_MS = 86400000;
const NOW = 1735689600000; // fixed instant for deterministic assertions

function makeUnlock(applianceId: string, unlockedAt: number, expiresAt: number): ReportUnlock {
  return { applianceId, unlockedAt, expiresAt };
}

describe("S5 TossRewardAd 게이트 + 24시간 열람권 [packet-0016]", () => {
  beforeEach(() => {
    tossRewardAdSpy.mockClear();
    vi.spyOn(Date, "now").mockReturnValue(NOW);
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("useReportUnlock — hasValidUnlock", () => {
    it("AC-1[P0]: 유효한(만료 전) 열람권이 있으면 hasValidUnlock이 true를 반환한다", () => {
      seedLocalStorage({
        "es:report-unlocks": [makeUnlock("aircon", NOW - 1000, NOW + TTL_MS - 1000)],
      });

      const { result } = renderHook(() => useReportUnlock());

      expect(result.current.hasValidUnlock("aircon", NOW)).toBe(true);
      expect(result.current.hasValidUnlock("fridge", NOW)).toBe(false);
    });

    it("AC-1[P0]: 만료됐거나 없는 열람권은 hasValidUnlock이 false를 반환한다", () => {
      seedLocalStorage({
        "es:report-unlocks": [makeUnlock("aircon", NOW - TTL_MS - 1000, NOW - 1000)],
      });

      const { result } = renderHook(() => useReportUnlock());

      expect(result.current.hasValidUnlock("aircon", NOW)).toBe(false);
      expect(result.current.hasValidUnlock("no-such-id", NOW)).toBe(false);
    });
  });

  describe("ReportGate — 유효한 열람권", () => {
    it("AC-1[P0]: 유효한 열람권이 있으면 TossRewardAd를 거치지 않고 children이 즉시 렌더된다", () => {
      seedLocalStorage({
        "es:report-unlocks": [makeUnlock("aircon", NOW - 1000, NOW + TTL_MS - 1000)],
      });

      renderWithRouter(
        React.createElement(
          ReportGate,
          { applianceId: "aircon" },
          React.createElement("p", null, "리포트 본문"),
        ),
      );

      expect(screen.getByText("리포트 본문")).toBeInTheDocument();
      expect(tossRewardAdSpy).not.toHaveBeenCalled();
      expect(screen.queryByTestId("reward-ad-gate")).not.toBeInTheDocument();
    });
  });

  describe("ReportGate — 열람권 없음 (광고 게이트)", () => {
    it("AC-2[P0]: 열람권이 없으면 TossRewardAd(slotId=env)로 children이 감싸진다", () => {
      renderWithRouter(
        React.createElement(
          ReportGate,
          { applianceId: "aircon" },
          React.createElement("p", null, "리포트 본문"),
        ),
      );

      expect(screen.getByTestId("reward-ad-gate")).toBeInTheDocument();
      expect(screen.getByText("리포트 본문")).toBeInTheDocument();
      expect(tossRewardAdSpy).toHaveBeenCalledTimes(1);
      expect(tossRewardAdSpy.mock.calls[0][0].slotId).toBe(
        import.meta.env.VITE_TOSS_AD_SLOT_ID,
      );
    });

    it("AC-2[P0]: 광고 시청 완료 콜백에서 addUnlock이 호출되어 expiresAt = unlockedAt + 86400000 로 저장된다", () => {
      renderWithRouter(
        React.createElement(
          ReportGate,
          { applianceId: "aircon" },
          React.createElement("p", null, "리포트 본문"),
        ),
      );

      fireEvent.click(screen.getByText("watch-ad"));

      const stored = JSON.parse(localStorage.getItem("es:report-unlocks") ?? "[]") as ReportUnlock[];
      const entry = stored.find((u) => u.applianceId === "aircon");
      expect(entry).toBeDefined();
      expect(entry?.unlockedAt).toBe(NOW);
      expect(entry?.expiresAt).toBe(NOW + TTL_MS);
    });
  });

  describe("만료 정리 (pruneUnlocks)", () => {
    it("AC-3[P0]: 마운트 시 pruneUnlocks(Date.now())가 실행되어 만료 항목이 es:report-unlocks에서 제거된다", () => {
      seedLocalStorage({
        "es:report-unlocks": [
          makeUnlock("expired-item", NOW - TTL_MS - 2000, NOW - 1000),
          makeUnlock("valid-item", NOW - 1000, NOW + TTL_MS - 1000),
        ],
      });

      renderWithRouter(
        React.createElement(
          ReportGate,
          { applianceId: "valid-item" },
          React.createElement("p", null, "리포트 본문"),
        ),
      );

      const stored = JSON.parse(localStorage.getItem("es:report-unlocks") ?? "[]") as ReportUnlock[];
      expect(stored.find((u) => u.applianceId === "expired-item")).toBeUndefined();
      expect(stored.find((u) => u.applianceId === "valid-item")).toBeDefined();
      expect(stored).toHaveLength(1);
    });
  });

  describe("env 미설정 방어", () => {
    it("AC-4: VITE_TOSS_AD_SLOT_ID가 undefined여도 크래시 없이 children을 렌더하고 콘솔 에러가 없다", () => {
      expect(import.meta.env.VITE_TOSS_AD_SLOT_ID).toBeUndefined();

      expect(() =>
        renderWithRouter(
          React.createElement(
            ReportGate,
            { applianceId: "aircon" },
            React.createElement("p", null, "리포트 본문"),
          ),
        ),
      ).not.toThrow();

      expect(screen.getByText("리포트 본문")).toBeInTheDocument();
      // eslint-disable-next-line no-console
      expect(console.error).not.toHaveBeenCalled();
    });
  });
});
