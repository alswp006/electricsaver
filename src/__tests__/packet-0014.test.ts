import { describe, it, expect, beforeEach, vi } from "vitest";
import React from "react";
import { render, screen, within, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { mockAll, mockNavigate, mockLocation } from "@/__tests__/__helpers__/mockAll";
import type { BillInput } from "@/lib/types";

// TDS + SDK + router + TossRewardAd — Result renders an AdSlot banner + tier ListRows.
mockAll();

import Result from "@/pages/Result";
import * as recordStoreModule from "@/lib/recordStore";
import { QUOTA_TOAST_MESSAGE } from "@/hooks/useQuotaToast";

function renderResult() {
  return render(
    React.createElement(
      MemoryRouter,
      { initialEntries: ["/result"] },
      React.createElement(Result),
    ),
  );
}

const SUMMER_INPUT: BillInput = { kWh: 450, yearMonth: "2026-08", contractType: "low" };

describe("결과 화면 `/result`", () => {
  beforeEach(() => {
    localStorage.clear();
    mockLocation.pathname = "/result";
    mockLocation.state = { input: SUMMER_INPUT } as any;
  });

  it("AC-1[P0]: 여름철 저압 450kWh 진입 시 청구금액 86,500원과 완화 절감액이 렌더된다", () => {
    renderResult();

    expect(screen.getByText("86,500원")).toBeInTheDocument();
    expect(screen.getByText("450kWh · 저압")).toBeInTheDocument();
    expect(screen.getByText("여름철 완화 적용")).toBeInTheDocument();
    expect(screen.getByText("완화 덕분에 22,510원 아꼈어요")).toBeInTheDocument();
  });

  it("AC-2[P0]: tier-card에 누진 3구간 ListRow가 정확한 kWh/요금으로 렌더되고 MiniBar 비율 합이 1.0에 가깝다", () => {
    renderResult();

    const tierCard = screen.getByTestId("tier-card");
    const rows = within(tierCard).getAllByRole("listitem");
    expect(rows).toHaveLength(3);

    expect(within(rows[0]).getByText("1구간 300kWh")).toBeInTheDocument();
    expect(within(rows[0]).getByText("36,000원")).toBeInTheDocument();
    expect(within(rows[1]).getByText("2구간 150kWh")).toBeInTheDocument();
    expect(within(rows[1]).getByText("32,190원")).toBeInTheDocument();
    expect(within(rows[2]).getByText("3구간 0kWh")).toBeInTheDocument();
    expect(within(rows[2]).getByText("0원")).toBeInTheDocument();

    const bars = within(tierCard).getAllByRole("progressbar");
    const ratioSum = bars.reduce(
      (sum, bar) => sum + Number(bar.getAttribute("aria-valuenow")) / 100,
      0,
    );
    expect(ratioSum).toBeGreaterThanOrEqual(0.99);
    expect(ratioSum).toBeLessThanOrEqual(1.01);
  });

  it("AC-3[P0]: 진입 시 upsertRecord가 1회 호출되고 es:records:v1에 동일 yearMonth 레코드가 저장된다", async () => {
    const spy = vi.spyOn(recordStoreModule, "upsertRecord");

    renderResult();

    await waitFor(() => expect(spy).toHaveBeenCalledTimes(1));

    const stored = recordStoreModule.getLatestRecord();
    expect(stored?.yearMonth).toBe("2026-08");
    expect(stored?.kWh).toBe(450);
    expect(stored?.contractType).toBe("low");
    expect(stored?.total).toBe(86500);

    spy.mockRestore();
  });

  it("AC-4[P1]: 저장 quota 초과 시 Toast 안내 문구가 뜨고 결과 화면 DOM은 유지된다", async () => {
    const setItemSpy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("Quota exceeded", "QuotaExceededError");
    });

    renderResult();

    await waitFor(() => expect(screen.getByText(QUOTA_TOAST_MESSAGE)).toBeInTheDocument());
    // Toast가 떠도 결과 화면 본문(히어로 금액)은 그대로 남아 있어야 한다 — 흰 화면 방지
    expect(screen.getByText("86,500원")).toBeInTheDocument();

    setItemSpy.mockRestore();
  });

  it("AC-5[P0]: location.state가 null이면 navigate('/', {replace:true})가 호출되고 크래시하지 않는다", () => {
    mockLocation.state = null;

    expect(() => renderResult()).not.toThrow();
    expect(mockNavigate).toHaveBeenCalledWith("/", { replace: true });
  });
});
