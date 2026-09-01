import { describe, it, expect, beforeEach } from "vitest";
import React from "react";
import { screen } from "@testing-library/react";
import { vi } from "vitest";
import { mockTds, mockAppsInToss, mockNavigate } from "@/__tests__/__helpers__/mocks";
import { renderWithRouter, seedLocalStorage } from "@/__tests__/__helpers__/test-utils";

mockTds();
mockAppsInToss();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

import Simulate from "@/pages/Simulate";
import type { BillInput } from "@/types/navigation";
import type { ApplianceItem } from "@/types/domain";
import { simulate } from "@/domain/simulate";

const AIRCON: ApplianceItem = {
  id: "a1",
  name: "에어컨",
  watt: 1000,
  hoursPerDay: 2,
  reduceRatio: 0.5,
};

function renderSimulate(input: BillInput | null) {
  return renderWithRouter(React.createElement(Simulate), {
    initialEntries: [
      {
        pathname: "/simulate",
        state: input ? { input } : null,
      },
    ],
  });
}

beforeEach(() => {
  mockNavigate.mockClear();
});

describe("S4 시뮬레이션 화면 — 히어로·비교 카드·구간 하락 배지 (/simulate)", () => {
  it("AC-1[P0]: location.state가 null이면 navigate('/', { replace: true })가 1회 호출되고 본문이 렌더되지 않는다", () => {
    renderSimulate(null);

    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith("/", { replace: true });
    expect(screen.queryByTestId("save-hero")).not.toBeInTheDocument();
  });

  it("AC-1[P0]: input이 있으면 navigate가 호출되지 않는다", () => {
    seedLocalStorage({ "es:appliances": [AIRCON] });
    renderSimulate({ yearMonth: "2026-08", kWh: 350, month: 8 });

    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("AC-2: 가전 0건이면 빈 상태(Asset.ContentIcon + 안내 문구)와 '가전 추가' 버튼이 표시되고 히어로 절감액은 0원이다", () => {
    seedLocalStorage({ "es:appliances": [] });
    renderSimulate({ yearMonth: "2026-08", kWh: 350, month: 8 });

    expect(screen.getByText(/절약할 가전을 추가해보세요/)).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /.*/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /가전 추가/ })).toBeInTheDocument();

    const hero = screen.getByTestId("save-hero");
    expect(hero.textContent).toContain("0원");
  });

  it("AC-3[P0]: 가전이 1건 이상이면 save-hero에 절감액이, 비교 카드에 baseKWh/baseTotal·targetKWh/targetTotal이 표시된다", () => {
    seedLocalStorage({ "es:appliances": [AIRCON] });
    const input: BillInput = { yearMonth: "2026-08", kWh: 350, month: 8 };
    renderSimulate(input);

    const summary = simulate(input.kWh, input.month, [AIRCON]);
    expect(summary.savedWon).toBe(7800);
    expect(summary.baseTotal).toBe(60510);
    expect(summary.targetKWh).toBe(320);
    expect(summary.targetTotal).toBe(52710);

    const hero = screen.getByTestId("save-hero");
    expect(hero.textContent).toContain("월 7,800원 아껴요");

    expect(screen.getByText(/350kWh/)).toBeInTheDocument();
    expect(screen.getByText(/60,510원/)).toBeInTheDocument();
    expect(screen.getByText(/320kWh/)).toBeInTheDocument();
    expect(screen.getByText(/52,710원/)).toBeInTheDocument();
  });

  it("AC-4[P0]: 절감 후 구간이 낮아지면 stage-drop-badge가 'N구간 → M구간 내려가요'로 표시된다", () => {
    seedLocalStorage({ "es:appliances": [AIRCON] });
    const input: BillInput = { yearMonth: "2026-08", kWh: 310, month: 8 };
    renderSimulate(input);

    const summary = simulate(input.kWh, input.month, [AIRCON]);
    expect(summary.targetKWh).toBe(280);
    expect(summary.savedWon).toBe(6430);

    const badge = screen.getByTestId("stage-drop-badge");
    expect(badge.textContent).toContain("2구간 → 1구간 내려가요");
  });

  it("AC-4: 절감 후에도 구간이 같으면 stage-drop-badge가 렌더되지 않는다", () => {
    seedLocalStorage({ "es:appliances": [AIRCON] });
    renderSimulate({ yearMonth: "2026-08", kWh: 350, month: 8 });

    expect(screen.queryByTestId("stage-drop-badge")).not.toBeInTheDocument();
  });

  it("AC-5[P0]: 하단 버튼 탭 시 navigate('/report', { state: { summary } })가 SimulationSummary로 호출된다", () => {
    seedLocalStorage({ "es:appliances": [AIRCON] });
    const input: BillInput = { yearMonth: "2026-08", kWh: 350, month: 8 };
    renderSimulate(input);

    // 하단 CTA는 ScreenScaffold의 bottom 슬롯 — children 다음, DOM상 마지막 버튼
    const buttons = screen.getAllByRole("button");
    const cta = buttons[buttons.length - 1];
    cta.click();

    const expectedSummary = simulate(input.kWh, input.month, [AIRCON]);
    expect(mockNavigate).toHaveBeenCalledWith("/report", {
      state: { summary: expectedSummary },
    });
  });
});
