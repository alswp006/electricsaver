import { describe, it, expect, beforeEach, vi } from "vitest";
import React from "react";
import { render, screen, within, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { mockAll, mockNavigate } from "@/__tests__/__helpers__/mockAll";
import { seedLocalStorage } from "@/__tests__/__helpers__/test-utils";
import { STORAGE_KEYS, type UsageRecord, type AppSettings } from "@/lib/types";

mockAll();

import Compare from "@/pages/Compare";

function renderCompare() {
  return render(
    React.createElement(MemoryRouter, { initialEntries: ["/compare"] }, React.createElement(Compare)),
  );
}

function makeRecord(overrides: Partial<UsageRecord> = {}): UsageRecord {
  return {
    id: `rec_${overrides.yearMonth ?? "2026-08"}`,
    yearMonth: "2026-08",
    kWh: 450,
    contractType: "low",
    total: 86500,
    tariffVersion: "2024-01",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...overrides,
  };
}

describe("우리 동네 비교 화면 `/compare`", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("AC-1[P0]: 지역 BottomSheet에 17개 시도가 렌더되고 '부산' 선택 시 regionCode가 KR-26으로 저장되며 재진입 시 유지된다", () => {
    seedLocalStorage({ [STORAGE_KEYS.records]: [makeRecord()] });

    const { unmount } = renderCompare();

    fireEvent.click(screen.getByTestId("region-row"));
    const dialog = screen.getByRole("dialog");
    const options = within(dialog).getAllByTestId(/^region-option-/);
    expect(options.length).toBe(17);

    fireEvent.click(within(dialog).getByText("부산"));

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEYS.settings) ?? "{}") as AppSettings;
    expect(stored.regionCode).toBe("KR-26");

    unmount();
    renderCompare();
    expect(screen.getByTestId("region-row")).toHaveTextContent("부산");
  });

  it("AC-2[P0]: 최신 450kWh vs 서울 8월 평균 320kWh면 '평균보다 130kWh 더 썼어요 (+41%)' 문구와 MiniBar 2개가 렌더된다", () => {
    seedLocalStorage({
      [STORAGE_KEYS.records]: [makeRecord({ kWh: 450, yearMonth: "2026-08" })],
      [STORAGE_KEYS.settings]: { contractType: "low", regionCode: "KR-11", householdSize: 1, lastYearMonth: null },
    });

    renderCompare();

    expect(screen.getByText("평균보다 130kWh 더 썼어요 (+41%)")).toBeInTheDocument();
    expect(screen.getAllByRole("progressbar")).toHaveLength(2);
    expect(screen.getByTestId("usage-bar-mine")).toBeInTheDocument();
    expect(screen.getByTestId("usage-bar-avg")).toBeInTheDocument();
  });

  it("AC-3[P0]: 최신 280kWh vs 서울 8월 평균 320kWh면 '평균보다 40kWh 덜 썼어요 (-12%)' 문구로 바뀐다", () => {
    seedLocalStorage({
      [STORAGE_KEYS.records]: [makeRecord({ kWh: 280, yearMonth: "2026-08" })],
      [STORAGE_KEYS.settings]: { contractType: "low", regionCode: "KR-11", householdSize: 1, lastYearMonth: null },
    });

    renderCompare();

    expect(screen.getByText("평균보다 40kWh 덜 썼어요 (-12%)")).toBeInTheDocument();
  });

  it("AC-4[P0]: 기록이 0건이면 EmptyState와 '요금 계산하러 가기' CTA가 렌더되고 비교 영역(MiniBar)이 표시되지 않는다", () => {
    renderCompare();

    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
    const cta = screen.getByRole("button", { name: /요금 계산하러 가기/ });
    fireEvent.click(cta);
    expect(mockNavigate).toHaveBeenCalledWith("/");
  });

  it("AC-5[P1]: 화면 렌더 중 fetch가 호출되지 않는다(데이터는 번들 JSON에서만 로드)", () => {
    seedLocalStorage({ [STORAGE_KEYS.records]: [makeRecord()] });
    const fetchSpy = vi.fn();
    const originalFetch = globalThis.fetch;
    globalThis.fetch = fetchSpy as unknown as typeof fetch;

    renderCompare();
    fireEvent.click(screen.getByTestId("region-row"));

    expect(fetchSpy).not.toHaveBeenCalled();
    globalThis.fetch = originalFetch;
  });

  it("가구원 수 Chip에서 '3인' 선택 시 householdSize가 3으로 저장된다", () => {
    seedLocalStorage({ [STORAGE_KEYS.records]: [makeRecord()] });

    renderCompare();

    fireEvent.click(screen.getByTestId("household-chip-3"));

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEYS.settings) ?? "{}") as AppSettings;
    expect(stored.householdSize).toBe(3);
  });
});
