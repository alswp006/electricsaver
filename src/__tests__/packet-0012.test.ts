import { describe, it, expect, vi } from "vitest";
import React from "react";
import { screen } from "@testing-library/react";
import { renderWithRouter } from "@/__tests__/__helpers__/test-utils";
import { mockTds } from "@/__tests__/__helpers__/mocks";
import type { MeterRecord } from "@/types/domain";

mockTds();

import { YoyCompareCard } from "@/components/YoyCompareCard";
import { TrendCard } from "@/components/TrendCard";

describe("S3 전년 동월 비교 Chip + 추이 카드 [packet-0012]", () => {
  describe("YoyCompareCard", () => {
    it("AC-1[P0]: 전년 동월 기록이 있고 사용량이 늘었으면 yoy-chip에 증가 문구 + warning 톤을 표시한다", () => {
      const records: MeterRecord[] = [
        { yearMonth: "2025-08", kWh: 300, total: 85000, createdAt: 1 },
        { yearMonth: "2026-08", kWh: 350, total: 100000, createdAt: 2 },
      ];
      renderWithRouter(React.createElement(YoyCompareCard, { records }));

      const chip = screen.getByTestId("yoy-chip");
      expect(chip.textContent).toContain("작년 같은 달보다 50kWh 늘었어요");
      expect(chip.getAttribute("data-tone")).toBe("warning");
    });

    it("AC-1[P0]: 전년 동월 기록이 있고 사용량이 줄었으면 yoy-chip에 감소 문구 + success 톤을 표시한다", () => {
      const records: MeterRecord[] = [
        { yearMonth: "2025-08", kWh: 350, total: 100000, createdAt: 1 },
        { yearMonth: "2026-08", kWh: 300, total: 85000, createdAt: 2 },
      ];
      renderWithRouter(React.createElement(YoyCompareCard, { records }));

      const chip = screen.getByTestId("yoy-chip");
      expect(chip.textContent).toContain("작년 같은 달보다 50kWh 줄었어요");
      expect(chip.getAttribute("data-tone")).toBe("success");
    });

    it("AC-2[P0]: 전년 동월 기록이 없으면 yoy-chip 대신 안내 문구만 표시한다", () => {
      const records: MeterRecord[] = [
        { yearMonth: "2026-08", kWh: 350, total: 100000, createdAt: 1 },
      ];
      renderWithRouter(React.createElement(YoyCompareCard, { records }));

      expect(screen.queryByTestId("yoy-chip")).not.toBeInTheDocument();
      expect(screen.getByText("작년 기록이 쌓이면 비교해드릴게요")).toBeInTheDocument();
    });

    it("AC-4: YoyCompareCard는 records prop만 사용하고 localStorage를 직접 읽지 않는다", () => {
      const getItemSpy = vi.spyOn(window.localStorage, "getItem");
      const records: MeterRecord[] = [
        { yearMonth: "2025-08", kWh: 300, total: 85000, createdAt: 1 },
        { yearMonth: "2026-08", kWh: 350, total: 100000, createdAt: 2 },
      ];
      renderWithRouter(React.createElement(YoyCompareCard, { records }));

      expect(getItemSpy).not.toHaveBeenCalled();
      getItemSpy.mockRestore();
    });
  });

  describe("TrendCard", () => {
    it("AC-3[P0]: 최근 12개월 범위 안에 존재하는 기록만 막대로 렌더한다", () => {
      const records: MeterRecord[] = [
        { yearMonth: "2024-06", kWh: 200, total: 60000, createdAt: 1 }, // 범위 밖
        { yearMonth: "2025-08", kWh: 300, total: 85000, createdAt: 2 }, // 범위 밖 (13개월 전)
        { yearMonth: "2025-09", kWh: 250, total: 75000, createdAt: 3 }, // 범위 안 (12개월 전)
        { yearMonth: "2026-08", kWh: 400, total: 110000, createdAt: 4 }, // 최신
      ];
      renderWithRouter(React.createElement(TrendCard, { records }));

      const bars = screen.getAllByTestId("trend-bar");
      expect(bars).toHaveLength(2);
    });

    it("AC-3[P0]: 최대값 막대는 폭 100%, 나머지는 최대값 대비 비율(%)로 렌더하며 고정 px 폭을 쓰지 않는다", () => {
      const records: MeterRecord[] = [
        { yearMonth: "2025-09", kWh: 250, total: 75000, createdAt: 1 },
        { yearMonth: "2026-08", kWh: 400, total: 110000, createdAt: 2 },
      ];
      renderWithRouter(React.createElement(TrendCard, { records }));

      const bars = screen.getAllByTestId("trend-bar");
      const maxBar = bars.find((b) => b.getAttribute("data-yearmonth") === "2026-08");
      const otherBar = bars.find((b) => b.getAttribute("data-yearmonth") === "2025-09");
      expect(maxBar).toBeDefined();
      expect(otherBar).toBeDefined();
      expect(maxBar!.style.width).toBe("100%");
      expect(otherBar!.style.width).toBe("62.5%");
      expect(maxBar!.style.width).not.toMatch(/px/);
      expect(otherBar!.style.width).not.toMatch(/px/);
    });

    it("AC-3: 기록이 하나도 없으면 막대 없이 크래시 없이 렌더한다", () => {
      expect(() =>
        renderWithRouter(React.createElement(TrendCard, { records: [] })),
      ).not.toThrow();
      expect(screen.queryAllByTestId("trend-bar")).toHaveLength(0);
    });

    it("AC-4: TrendCard는 records prop만 사용하고 localStorage를 직접 읽지 않는다", () => {
      const getItemSpy = vi.spyOn(window.localStorage, "getItem");
      const records: MeterRecord[] = [
        { yearMonth: "2026-08", kWh: 400, total: 110000, createdAt: 1 },
      ];
      renderWithRouter(React.createElement(TrendCard, { records }));

      expect(getItemSpy).not.toHaveBeenCalled();
      getItemSpy.mockRestore();
    });
  });
});
