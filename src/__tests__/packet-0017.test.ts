import { describe, it, expect, beforeEach, vi } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { mockAll, mockNavigate, mockLocation } from "@/__tests__/__helpers__/mockAll";
import { seedLocalStorage } from "@/__tests__/__helpers__/test-utils";
import { STORAGE_KEYS, type BillInput, type ApplianceCut, type RouteState, type BillBreakdown } from "@/lib/types";
import { simulate } from "@/domain/simulate";
import { TIPS } from "@/domain/tips";

// TDS + SDK(광고) + router — Report는 ReportGate(리워드 광고 게이트) 뒤에서 팁을 렌더한다.
mockAll();

import Report from "@/pages/Report";

function renderReport() {
  return render(
    React.createElement(MemoryRouter, { initialEntries: ["/report"] }, React.createElement(Report)),
  );
}

const RECORD_ID = "rec_2026-03";
const BASE_INPUT: BillInput = { kWh: 410, yearMonth: "2026-03", contractType: "low" };
const DROP_CUTS: ApplianceCut[] = [{ applianceId: "aircon", cutHoursPerDay: 2 }];
const dropResult = simulate(BASE_INPUT, DROP_CUTS, 30);

/** tiers 배열에서 실제 사용량(kWh>0)이 있는 가장 높은 누진 구간 번호를 구한다(calcBill.ts와 동일 로직) */
function currentTier(bill: BillBreakdown): number {
  const applied = [...bill.tiers].reverse().find((t) => t.kWh > 0);
  return applied ? applied.tier : 1;
}

function wonText(value: number): string {
  return `${value.toLocaleString("ko-KR")}원`;
}

function seedUnlocked(recordId: string) {
  seedLocalStorage({ [STORAGE_KEYS.reportUnlock]: { [recordId]: Date.now() } });
}

function setState(state: RouteState["/report"]) {
  mockLocation.state = state as unknown as typeof mockLocation.state;
}

describe("리포트 화면 `/report`", () => {
  beforeEach(() => {
    localStorage.clear();
    mockLocation.pathname = "/report";
    setState({ recordId: RECORD_ID, input: BASE_INPUT, cuts: DROP_CUTS, savedWon: dropResult.savedWon });
  });

  it("AC-1[P0]: 잠금 상태에서는 팁 본문 DOM이 없고 ReportGate의 CTA만 렌더된다", () => {
    renderReport();

    expect(screen.queryByText(TIPS.aircon[0])).not.toBeInTheDocument();
    expect(screen.queryByTestId("tip-section")).not.toBeInTheDocument();
    expect(screen.getByText("절약 리포트가 준비됐어요")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /광고 보고 리포트 열기/ })).toBeInTheDocument();
  });

  it("AC-2[P0]: 해제 후 선택한 가전 수만큼 팁 섹션이 렌더되고 각 섹션에 tips.ts 문자열 2개가 그대로 노출된다", () => {
    const cuts: ApplianceCut[] = [
      { applianceId: "aircon", cutHoursPerDay: 2 },
      { applianceId: "washer", cutHoursPerDay: 1 },
    ];
    setState({ recordId: RECORD_ID, input: BASE_INPUT, cuts, savedWon: simulate(BASE_INPUT, cuts, 30).savedWon });
    seedUnlocked(RECORD_ID);

    renderReport();

    expect(screen.getAllByTestId("tip-section")).toHaveLength(2);
    expect(screen.getByText(TIPS.aircon[0])).toBeInTheDocument();
    expect(screen.getByText(TIPS.aircon[1])).toBeInTheDocument();
    expect(screen.getByText(TIPS.washer[0])).toBeInTheDocument();
    expect(screen.getByText(TIPS.washer[1])).toBeInTheDocument();
  });

  it("AC-3[P0]: 절감액 요약이 '월 X원 · 1년이면 Y원' 형식이고 연간액 = 월 절감액 × 12다", () => {
    seedUnlocked(RECORD_ID);

    renderReport();

    const monthly = dropResult.savedWon;
    const annual = monthly * 12;
    expect(annual).toBe(monthly * 12);
    expect(screen.getByText(`월 ${wonText(monthly)} · 1년이면 ${wonText(annual)}`)).toBeInTheDocument();
  });

  it("AC-4[P0]: 시뮬레이션 결과로 누진 구간이 내려가면 '3구간에서 2구간으로 내려가요' 문구가 표시된다", () => {
    seedUnlocked(RECORD_ID);

    const baseTier = currentTier(dropResult.baseBill);
    const afterTier = currentTier(dropResult.afterBill);
    expect(baseTier).toBe(3);
    expect(afterTier).toBe(2);

    renderReport();

    expect(screen.getByText("3구간에서 2구간으로 내려가요")).toBeInTheDocument();
  });

  it("AC-4b[P0]: 누진 구간이 그대로면 구간 하락 문구가 렌더되지 않는다", () => {
    const sameTierInput: BillInput = { kWh: 150, yearMonth: "2026-03", contractType: "low" };
    const sameTierCuts: ApplianceCut[] = [{ applianceId: "aircon", cutHoursPerDay: 0.5 }];
    const sameResult = simulate(sameTierInput, sameTierCuts, 30);
    expect(currentTier(sameResult.baseBill)).toBe(currentTier(sameResult.afterBill));

    setState({
      recordId: RECORD_ID,
      input: sameTierInput,
      cuts: sameTierCuts,
      savedWon: sameResult.savedWon,
    });
    seedUnlocked(RECORD_ID);

    renderReport();

    expect(screen.queryByText(/구간에서 .*구간으로 내려가요/)).not.toBeInTheDocument();
  });

  it("AC-5[P0]: 화면 내 LLM/네트워크 호출이 0건이고 AI 관련 고지 UI를 렌더하지 않는다", () => {
    const fetchSpy = vi.fn();
    const originalFetch = globalThis.fetch;
    globalThis.fetch = fetchSpy as unknown as typeof fetch;
    seedUnlocked(RECORD_ID);

    renderReport();

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(document.body.textContent ?? "").not.toMatch(/생성형 AI|AI가 생성한/);
    expect(fetchSpy).not.toHaveBeenCalled();

    globalThis.fetch = originalFetch;
  });

  it("state와 저장된 레코드가 모두 없으면 홈으로 리다이렉트한다", () => {
    setState(null);

    renderReport();

    expect(mockNavigate).toHaveBeenCalledWith("/", { replace: true });
    expect(mockNavigate).toHaveBeenCalledTimes(1);
  });
});
