import { describe, it, expect, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { mockAll, mockNavigate, mockLocation } from "@/__tests__/__helpers__/mockAll";
import { seedLocalStorage } from "@/__tests__/__helpers__/test-utils";
import { STORAGE_KEYS, type BillInput, type ApplianceCut } from "@/lib/types";
import { simulate } from "@/domain/simulate";

// TDS + SDK + router — Simulate renders ApplianceStepperCard + SummaryHero + SubmitFooter.
mockAll();

import Simulate from "@/pages/Simulate";

function renderSimulate() {
  return render(
    React.createElement(MemoryRouter, { initialEntries: ["/simulate"] }, React.createElement(Simulate)),
  );
}

const BASE_INPUT: BillInput = { kWh: 450, yearMonth: "2026-08", contractType: "low" };

function clickAirconIncrease(times: number) {
  const btn = screen.getByRole("button", { name: "에어컨 사용시간 늘리기" });
  for (let i = 0; i < times; i++) {
    fireEvent.click(btn);
  }
}

function wonText(value: number): string {
  return `${value.toLocaleString("ko-KR")}원`;
}

describe("시뮬레이션 화면 `/simulate`", () => {
  beforeEach(() => {
    localStorage.clear();
    mockLocation.pathname = "/simulate";
    mockLocation.state = { recordId: "rec_2026-08", input: BASE_INPUT } as any;
  });

  it("AC-1[P0]: 에어컨 2시간(0.5h × 4클릭) 감축 시 '월 108kWh 덜 써요'와 절감액이 즉시 갱신된다", () => {
    renderSimulate();

    clickAirconIncrease(4); // 0.5h step × 4 = 2.0h

    expect(screen.getByText("월 108kWh 덜 써요")).toBeInTheDocument();

    const cuts: ApplianceCut[] = [{ applianceId: "aircon", cutHoursPerDay: 2 }];
    const expected = simulate(BASE_INPUT, cuts, 30);
    expect(expected.savedKWh).toBe(108);
    expect(screen.getByText(wonText(expected.savedWon))).toBeInTheDocument();
  });

  it("AC-2[P0]: 감축 입력이 모두 0이면 CTA가 disabled이고 '줄일 가전을 골라주세요' 캡션이 표시된다", () => {
    renderSimulate();

    expect(screen.getByText("줄일 가전을 골라주세요")).toBeInTheDocument();
    const cta = screen.getByRole("button", { name: "리포트 보기" });
    expect(cta).toBeDisabled();
    expect(screen.queryByText(/월 \d+kWh 덜 써요/)).not.toBeInTheDocument();
  });

  it("AC-3[P0]: es:sim:last:v1에 저장된 cuts가 재진입 시 복원되어 클릭 없이도 동일 값이 표시된다", () => {
    seedLocalStorage({
      [STORAGE_KEYS.sim]: {
        baseRecordId: "rec_2026-08",
        cuts: [{ applianceId: "aircon", cutHoursPerDay: 2 }],
        days: 30,
      },
    });

    renderSimulate();

    expect(screen.getByText("2h")).toBeInTheDocument();
    expect(screen.getByText("월 108kWh 덜 써요")).toBeInTheDocument();
    const cta = screen.getByRole("button", { name: "리포트 보기" });
    expect(cta).not.toBeDisabled();
  });

  it("AC-4[P0]: 감축량이 기준 사용량 이상이면 1kWh로 클램프되고 '더 줄일 수 없어요' 문구가 뜨며 음수 금액이 없다", () => {
    mockLocation.state = {
      recordId: "rec_2026-08",
      input: { kWh: 100, yearMonth: "2026-08", contractType: "low" },
    } as any;

    renderSimulate();

    clickAirconIncrease(6); // 0.5h step × 6 = 3.0h → 162kWh saved > 100kWh base

    const cuts: ApplianceCut[] = [{ applianceId: "aircon", cutHoursPerDay: 3 }];
    const expected = simulate({ kWh: 100, yearMonth: "2026-08", contractType: "low" }, cuts, 30);
    expect(expected.clamped).toBe(true);
    expect(expected.afterKWh).toBe(1);

    expect(screen.getByText("더 줄일 수 없어요")).toBeInTheDocument();
    expect(screen.getByText(wonText(expected.savedWon))).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/-\d/);
  });

  it("AC-5[P0]: CTA 탭 시 navigate('/report', {state:{recordId, input, cuts, savedWon}})가 1회 호출된다", () => {
    renderSimulate();

    clickAirconIncrease(2); // 0.5h step × 2 = 1.0h

    const cuts: ApplianceCut[] = [{ applianceId: "aircon", cutHoursPerDay: 1 }];
    const expected = simulate(BASE_INPUT, cuts, 30);

    const cta = screen.getByRole("button", { name: "리포트 보기" });
    fireEvent.click(cta);

    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith("/report", {
      state: {
        recordId: "rec_2026-08",
        input: BASE_INPUT,
        cuts,
        savedWon: expected.savedWon,
      },
    });
  });

  it("AC-5[P0] 예외 경로: location.state가 null이고 저장된 레코드도 없으면 크래시 없이 navigate('/', {replace:true})가 호출된다", () => {
    mockLocation.state = null;

    expect(() => renderSimulate()).not.toThrow();
    expect(mockNavigate).toHaveBeenCalledWith("/", { replace: true });
  });
});
