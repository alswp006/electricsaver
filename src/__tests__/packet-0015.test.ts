import { describe, it, expect, beforeEach } from "vitest";
import React from "react";
import { render, screen, within, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { mockAll, mockNavigate } from "@/__tests__/__helpers__/mockAll";
import { seedLocalStorage } from "@/__tests__/__helpers__/test-utils";
import { STORAGE_KEYS, type UsageRecord } from "@/lib/types";

mockAll();

import History from "@/pages/History";

function renderHistory() {
  return render(
    React.createElement(MemoryRouter, { initialEntries: ["/history"] }, React.createElement(History)),
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

const THREE_RECORDS: UsageRecord[] = [
  makeRecord({ id: "rec_2026-06", yearMonth: "2026-06", kWh: 300, total: 52000 }),
  makeRecord({ id: "rec_2026-07", yearMonth: "2026-07", kWh: 380, total: 68000 }),
  makeRecord({ id: "rec_2026-08", yearMonth: "2026-08", kWh: 450, total: 86500 }),
];

describe("히스토리 화면 `/history`", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("AC-1[P0]: 레코드 3건이 yearMonth 내림차순 ListRow로 렌더되고 각 행에 연월·사용량·금액이 표시된다", () => {
    seedLocalStorage({ [STORAGE_KEYS.records]: THREE_RECORDS });

    renderHistory();

    const rows = screen.getAllByRole("listitem");
    expect(rows.length).toBe(3);

    // 내림차순: 2026-08이 첫 행
    expect(within(rows[0]).getByText("2026년 8월 · 450kWh")).toBeInTheDocument();
    expect(within(rows[0]).getByText("86,500원")).toBeInTheDocument();
    expect(within(rows[2]).getByText("2026년 6월 · 300kWh")).toBeInTheDocument();
    expect(within(rows[2]).getByText("52,000원")).toBeInTheDocument();
  });

  it("AC-2[P0]: 기록 0건이면 EmptyState가 렌더되고 CTA 탭 시 navigate('/')가 호출된다", () => {
    renderHistory();

    expect(screen.queryByRole("listitem")).not.toBeInTheDocument();
    const cta = screen.getByRole("button", { name: /요금 계산하러 가기/ });
    fireEvent.click(cta);
    expect(mockNavigate).toHaveBeenCalledWith("/");
  });

  it("AC-3[P0]: 삭제 확인 시 해당 행이 사라지고 localStorage에서도 제거되어 새로고침 후에도 복구되지 않는다", () => {
    seedLocalStorage({ [STORAGE_KEYS.records]: THREE_RECORDS });

    renderHistory();

    const deleteButtons = screen.getAllByRole("button", { name: /삭제/ });
    fireEvent.click(deleteButtons[0]);

    const dialog = screen.getByRole("alertdialog");
    expect(within(dialog).getByText("닫기")).toBeInTheDocument();
    const confirmBtn = within(dialog).getByText("삭제");
    fireEvent.click(confirmBtn);

    expect(screen.getAllByRole("listitem")).toHaveLength(2);

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEYS.records) ?? "[]") as UsageRecord[];
    expect(stored).toHaveLength(2);
    expect(stored.find((r) => r.yearMonth === "2026-08")).toBeUndefined();
  });

  it("AC-4[P0]: 행 탭 시 navigate('/result', {state:{input:{kWh, yearMonth, contractType}}})가 호출된다", () => {
    seedLocalStorage({ [STORAGE_KEYS.records]: THREE_RECORDS });

    renderHistory();

    const rows = screen.getAllByRole("listitem");
    fireEvent.click(rows[0]);

    expect(mockNavigate).toHaveBeenCalledWith("/result", {
      state: { input: { kWh: 450, yearMonth: "2026-08", contractType: "low" } },
    });
  });

  it("AC-5[P1]: 레코드 50건 이상이면 초기 렌더 DOM 행 수가 30개 이하다(가상 스크롤/페이징)", () => {
    const many: UsageRecord[] = Array.from({ length: 60 }, (_, i) => {
      const month = String((i % 12) + 1).padStart(2, "0");
      const year = 2021 + Math.floor(i / 12);
      return makeRecord({ id: `rec_${year}-${month}`, yearMonth: `${year}-${month}`, kWh: 300 + i, total: 50000 + i * 100 });
    });
    seedLocalStorage({ [STORAGE_KEYS.records]: many });

    renderHistory();

    const rows = screen.getAllByRole("listitem");
    expect(rows.length).toBeLessThanOrEqual(30);
    expect(rows.length).toBeGreaterThan(0);
  });
});
