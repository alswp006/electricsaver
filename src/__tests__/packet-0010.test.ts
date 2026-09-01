import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { mockAll } from "@/__tests__/__helpers__/mockAll";
import type { UsageRecord } from "@/lib/types";
import { YoYCard } from "@/components/YoYCard";

/**
 * TDD red phase — packet 0010: YoYCard (전년 동월 비교 카드)
 *
 * Expected component contract (to be implemented by Coder):
 *   src/components/YoYCard.tsx
 *   YoYCard({
 *     currentYearMonth: string;   // e.g. "2026-08"
 *     currentKWh: number;
 *     yoyRecord: UsageRecord | null;  // record found via findYoY, or null
 *     records: UsageRecord[];    // recent records for the 12-month Sparkline trend
 *     testId?: string;
 *   })
 */

mockAll();

function makeRecord(overrides: Partial<UsageRecord>): UsageRecord {
  return {
    id: "r1",
    yearMonth: "2025-08",
    kWh: 380,
    contractType: "low",
    total: 55000,
    tariffVersion: "2026-01",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  };
}

function renderCard(props: Partial<React.ComponentProps<typeof YoYCard>>) {
  const defaults: React.ComponentProps<typeof YoYCard> = {
    currentYearMonth: "2026-08",
    currentKWh: 450,
    yoyRecord: makeRecord({ yearMonth: "2025-08", kWh: 380 }),
    records: [],
    testId: "yoy-card",
  };
  return render(
    React.createElement(MemoryRouter, null, React.createElement(YoYCard, { ...defaults, ...props })),
  );
}

describe("YoYCard (전년 동월 비교 카드)", () => {
  it("AC-1[P0]: 작년 380kWh 대비 올해 450kWh — '70kWh 더 썼어요' 문구와 Badge '+18%'가 렌더된다", () => {
    renderCard({
      currentYearMonth: "2026-08",
      currentKWh: 450,
      yoyRecord: makeRecord({ yearMonth: "2025-08", kWh: 380 }),
    });
    const card = screen.getByTestId("yoy-card");
    expect(card.textContent).toContain("작년보다 70kWh 더 썼어요");
    const badge = screen.getByRole("status");
    expect(badge.textContent).toBe("+18%");
  });

  it("AC-2[P0]: 작년 동월 레코드가 없으면 안내 문구만 렌더되고 Badge는 렌더되지 않는다", () => {
    renderCard({
      currentYearMonth: "2026-08",
      currentKWh: 450,
      yoyRecord: null,
    });
    const card = screen.getByTestId("yoy-card");
    expect(card.textContent).toContain("작년 8월 기록이 없어요. 이번 달부터 쌓아볼까요?");
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("AC-3: 사용량이 줄었을 때 '30kWh 덜 썼어요' 문구와 음수 Badge '-8%'가 렌더된다", () => {
    renderCard({
      currentYearMonth: "2026-08",
      currentKWh: 345,
      yoyRecord: makeRecord({ yearMonth: "2025-08", kWh: 375 }),
    });
    const card = screen.getByTestId("yoy-card");
    expect(card.textContent).toContain("작년보다 30kWh 덜 썼어요");
    const badge = screen.getByRole("status");
    expect(badge.textContent).toBe("-8%");
  });

  it("AC-4[P0]: records가 2건 미만이면 Sparkline 영역을 렌더하지 않고 크래시하지 않는다", () => {
    const { container } = renderCard({
      currentYearMonth: "2026-08",
      currentKWh: 450,
      yoyRecord: makeRecord({ yearMonth: "2025-08", kWh: 380 }),
      records: [makeRecord({ id: "only-one", yearMonth: "2026-08", kWh: 450 })],
    });
    expect(container.querySelector('svg[role="img"]')).toBeNull();
    expect(screen.getByTestId("yoy-card")).toBeInTheDocument();
  });

  it("AC-4: records가 2건 이상이면 Sparkline(svg)이 렌더된다", () => {
    const { container } = renderCard({
      currentYearMonth: "2026-08",
      currentKWh: 450,
      yoyRecord: makeRecord({ yearMonth: "2025-08", kWh: 380 }),
      records: [
        makeRecord({ id: "a", yearMonth: "2026-06", kWh: 300 }),
        makeRecord({ id: "b", yearMonth: "2026-07", kWh: 400 }),
        makeRecord({ id: "c", yearMonth: "2026-08", kWh: 450 }),
      ],
    });
    expect(container.querySelector('svg[role="img"]')).not.toBeNull();
  });

  it("AC-5: 카드 소스에 HEX 색상 하드코딩이 0건이다", () => {
    const src = readFileSync("src/components/YoYCard.tsx", "utf-8");
    const hexPattern = /#[0-9A-Fa-f]{3,8}\b/;
    expect(hexPattern.test(src)).toBe(false);
  });

  it("AC-5: 카드 소스에서 ListRow에 padding prop/인라인 여백 오버라이드가 없다", () => {
    const src = readFileSync("src/components/YoYCard.tsx", "utf-8");
    expect(/<ListRow[^>]*padding/i.test(src)).toBe(false);
    expect(/style=\{\{[^}]*(padding|margin)/i.test(src)).toBe(false);
  });
});
