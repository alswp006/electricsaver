import { describe, it, expect } from "vitest";
import React from "react";
import { screen, within } from "@testing-library/react";
import { mockTds, mockAppsInToss, mockNavigate } from "@/__tests__/__helpers__/mocks";
import { renderWithRouter } from "@/__tests__/__helpers__/test-utils";
import { vi } from "vitest";

mockTds();
mockAppsInToss();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

import Result from "@/pages/Result";
import type { BillInput } from "@/types/navigation";

function renderResult(input: BillInput | null) {
  return renderWithRouter(React.createElement(Result), {
    initialEntries: [
      {
        pathname: "/result",
        state: input ? { input } : null,
      },
    ],
  });
}

describe("S2 결과 화면 렌더링 — 히어로·구간 카드·내역 카드 (/result)", () => {
  it("AC-1[P0]: 350kWh·8월 입력 시 bill-hero에 60,510원과 하계 완화 캡션이 표시된다", () => {
    renderResult({ yearMonth: "2026-08", kWh: 350, month: 8 });

    const hero = screen.getByTestId("bill-hero");
    expect(within(hero).getByText(/60,510원/)).toBeInTheDocument();
    expect(within(hero).getByText(/350kWh · 하계 완화 요금 적용/)).toBeInTheDocument();
  });

  it("AC-1[P0]: 350kWh·3월 입력 시 bill-hero에 71,260원이 표시된다(하계 완화 미적용)", () => {
    renderResult({ yearMonth: "2026-03", kWh: 350, month: 3 });

    const hero = screen.getByTestId("bill-hero");
    expect(within(hero).getByText(/71,260원/)).toBeInTheDocument();
    expect(within(hero).queryByText(/하계 완화 요금 적용/)).not.toBeInTheDocument();
  });

  it("AC-2: stage-card에 stageBreakdown 길이만큼 행이 렌더되고 각 행이 구간·단가·금액을 표시한다", () => {
    renderResult({ yearMonth: "2026-08", kWh: 350, month: 8 });

    const stageCard = screen.getByTestId("stage-card");
    const rows = within(stageCard).getAllByRole("listitem");
    expect(rows).toHaveLength(2);

    expect(rows[0].textContent).toContain("1구간");
    expect(rows[0].textContent).toContain("300kWh · 120원/kWh");
    expect(rows[0].textContent).toContain("36,000원");

    expect(rows[1].textContent).toContain("2구간");
    expect(rows[1].textContent).toContain("50kWh · 214.6원/kWh");
    expect(rows[1].textContent).toContain("10,730원");
  });

  it("AC-3: gap>0이면 다음 구간까지 남은 kWh 문구를, gap===0이면 최고 구간 문구를 Chip으로 표시한다", () => {
    renderResult({ yearMonth: "2026-08", kWh: 290, month: 8 });
    const hint1 = screen.getByTestId("next-stage-hint");
    expect(hint1.textContent).toContain("2구간까지 10kWh 남았어요");

    renderResult({ yearMonth: "2026-03", kWh: 500, month: 3 });
    const hint2 = screen.getByTestId("next-stage-hint");
    expect(hint2.textContent).toContain("이미 최고 구간이에요");
  });

  it("AC-4: detail-card에 6개 요금 항목이 기본요금부터 전력산업기반기금 순서로 렌더된다", () => {
    renderResult({ yearMonth: "2026-08", kWh: 350, month: 8 });

    const detailCard = screen.getByTestId("detail-card");
    const rows = within(detailCard).getAllByRole("listitem");
    expect(rows).toHaveLength(6);

    const expectedLabels = [
      "기본요금",
      "전력량요금",
      "기후환경요금",
      "연료비조정액",
      "부가가치세",
      "전력산업기반기금",
    ];
    rows.forEach((row, idx) => {
      expect(row.textContent).toContain(expectedLabels[idx]);
    });

    expect(rows[0].textContent).toContain("1,600원");
    expect(rows[1].textContent).toContain("46,730원");
    expect(rows[2].textContent).toContain("3,150원");
    expect(rows[3].textContent).toContain("1,750원");
    expect(rows[4].textContent).toContain("5,323원");
    expect(rows[5].textContent).toContain("1,960원");
  });

  it("AC-5[P0]: 하단 SubmitFooter 탭 시 navigate('/simulate', { state: { input } })가 호출된다", () => {
    const input: BillInput = { yearMonth: "2026-08", kWh: 350, month: 8 };
    renderResult(input);

    const cta = screen.getByRole("button", { name: /시뮬레이션/ });
    cta.click();

    expect(mockNavigate).toHaveBeenCalledWith("/simulate", { state: { input } });
  });
});
