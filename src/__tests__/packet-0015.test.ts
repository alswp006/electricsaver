import { describe, it, expect, beforeEach, vi } from "vitest";
import React from "react";
import { screen, within } from "@testing-library/react";
import { renderWithRouter } from "@/__tests__/__helpers__/test-utils";
import { mockTds, mockAppsInToss, mockRouter, mockNavigate } from "@/__tests__/__helpers__/mocks";
import { SAVING_TIPS } from "@/data/savingTips";
import type { SimulationSummary } from "@/types/domain";

mockTds();
mockAppsInToss();
mockRouter();

// ReportGate is already exhaustively covered on its own in packet-0016 (ad gate,
// unlock persistence, expiry pruning). Report.tsx's own concern here is just the
// body content + state guard, so pass ReportGate's children straight through and
// avoid coupling this file to its internal unlock/localStorage timing.
vi.mock("@/components/ReportGate", () => ({
  ReportGate: ({ children }: any) => children,
}));

import Report from "@/pages/Report";

const summary: SimulationSummary = {
  baseKWh: 350,
  savedKWh: 108,
  targetKWh: 242,
  baseTotal: 65000,
  targetTotal: 48000,
  savedWon: 17000,
  month: 8,
  appliances: [
    { id: "aircon", name: "에어컨", watt: 1800, hoursPerDay: 6, reduceRatio: 0.3 },
    { id: "fridge", name: "냉장고", watt: 150, hoursPerDay: 24, reduceRatio: 0.1 },
  ],
};

// AC-5.1 공식: Math.round(watt * hoursPerDay * 30 / 1000 * reduceRatio)
const AIRCON_SAVED_KWH = Math.round((1800 * 6 * 30) / 1000 * 0.3); // 97
const FRIDGE_SAVED_KWH = Math.round((150 * 24 * 30) / 1000 * 0.1); // 11

describe("S5 리포트 본문 — 팁 카드 + state 가드 (/report) [packet-0015]", () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it("AC-1[P0]: location.state가 null이면 navigate('/simulate', { replace: true })가 1회 호출되고 본문이 렌더되지 않는다", () => {
    renderWithRouter(React.createElement(Report), { initialEntries: ["/report"] });

    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith("/simulate", { replace: true });
    expect(screen.queryByTestId("report-body")).not.toBeInTheDocument();
    expect(screen.queryAllByTestId("tip-card")).toHaveLength(0);
  });

  it("AC-1[P0]: location.state가 유효하면 navigate가 호출되지 않고 report-body가 렌더된다", () => {
    renderWithRouter(React.createElement(Report), {
      initialEntries: [{ pathname: "/report", state: { summary } }],
    });

    expect(mockNavigate).not.toHaveBeenCalled();
    expect(screen.getByTestId("report-body")).toBeInTheDocument();
  });

  it("AC-2[P0]: summary.appliances 각 항목마다 tip-card 1개씩 총 2개가 렌더되고, 각 카드에는 savingTips[id]의 팁 3줄이 정확히 표시된다", () => {
    renderWithRouter(React.createElement(Report), {
      initialEntries: [{ pathname: "/report", state: { summary } }],
    });

    const cards = screen.getAllByTestId("tip-card");
    expect(cards).toHaveLength(2);

    const airconCard = cards.find((c) => within(c).queryByText(/에어컨/)) as HTMLElement;
    const fridgeCard = cards.find((c) => within(c).queryByText(/냉장고/)) as HTMLElement;
    expect(airconCard).toBeDefined();
    expect(fridgeCard).toBeDefined();

    const airconLines = within(airconCard).getAllByRole("listitem");
    expect(airconLines).toHaveLength(3);
    SAVING_TIPS.aircon.forEach((tip, i) => {
      expect(airconLines[i].textContent).toContain(tip);
    });

    const fridgeLines = within(fridgeCard).getAllByRole("listitem");
    expect(fridgeLines).toHaveLength(3);
    SAVING_TIPS.fridge.forEach((tip, i) => {
      expect(fridgeLines[i].textContent).toContain(tip);
    });
  });

  it("AC-3[P0]: 각 Card 헤더에 가전 이름과 월 절감 kWh, 예상 절감액이 표시된다", () => {
    renderWithRouter(React.createElement(Report), {
      initialEntries: [{ pathname: "/report", state: { summary } }],
    });

    const cards = screen.getAllByTestId("tip-card");
    const airconCard = cards.find((c) => within(c).queryByText(/에어컨/)) as HTMLElement;
    const fridgeCard = cards.find((c) => within(c).queryByText(/냉장고/)) as HTMLElement;

    expect(within(airconCard).getByText(/에어컨/)).toBeInTheDocument();
    expect(within(airconCard).getByText(new RegExp(`${AIRCON_SAVED_KWH}`))).toBeInTheDocument();
    expect(within(airconCard).getByText(/원/)).toBeInTheDocument();

    expect(within(fridgeCard).getByText(/냉장고/)).toBeInTheDocument();
    expect(within(fridgeCard).getByText(new RegExp(`${FRIDGE_SAVED_KWH}`))).toBeInTheDocument();
    expect(within(fridgeCard).getByText(/원/)).toBeInTheDocument();
  });

  it("AC-4[P1]: 화면 최하단에 예상치 고지 문구가 st12 tertiary로 노출된다", () => {
    renderWithRouter(React.createElement(Report), {
      initialEntries: [{ pathname: "/report", state: { summary } }],
    });

    const notice = screen.getByText("예상치예요. 실제 청구액은 한국전력 고지서를 확인해주세요");
    expect(notice).toBeInTheDocument();
    expect(notice.getAttribute("data-typography")).toBe("st12");
    expect(notice.getAttribute("color")).toBe("tertiary");
  });

  it("AC-4[P1]: 팁 문자열은 savingTips 고정 카탈로그에서만 오며 재렌더해도 동일하다(Math.random/Date 비의존)", () => {
    renderWithRouter(React.createElement(Report), {
      initialEntries: [{ pathname: "/report", state: { summary } }],
    });
    const firstTexts = screen
      .getAllByRole("listitem")
      .map((el) => el.textContent);

    renderWithRouter(React.createElement(Report), {
      initialEntries: [{ pathname: "/report", state: { summary } }],
    });
    const secondTexts = screen
      .getAllByRole("listitem")
      .map((el) => el.textContent);

    expect(secondTexts).toEqual(firstTexts);
    expect(firstTexts).toEqual([
      ...SAVING_TIPS.aircon,
      ...SAVING_TIPS.fridge,
    ]);
  });
});
