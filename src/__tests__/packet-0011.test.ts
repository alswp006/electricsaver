import { describe, it, expect } from "vitest";
import React from "react";
import { screen, fireEvent, within } from "@testing-library/react";
import { renderWithRouter, seedLocalStorage } from "@/__tests__/__helpers__/test-utils";
import { mockAll, mockNavigate } from "@/__tests__/__helpers__/mocks";
import type { MeterRecord } from "@/types/domain";

mockAll();

import History from "@/pages/History";

describe("S3 검침 기록 화면 — 목록·삭제·빈 상태 (/history) [packet-0011]", () => {
  it("AC-1[P0]: records 0건이면 빈 상태(아이콘 + 안내 + 이동 버튼)가 렌더되고 목록 행은 0개다", () => {
    seedLocalStorage({ "es:records": [] });
    renderWithRouter(React.createElement(History));

    expect(screen.getByText("아직 기록이 없어요")).toBeInTheDocument();
    expect(screen.queryAllByTestId("record-row")).toHaveLength(0);

    const goButton = screen.getByRole("button", { name: "요금 계산하러 가기" });
    expect(goButton).toBeInTheDocument();

    fireEvent.click(goButton);
    expect(mockNavigate).toHaveBeenCalledWith("/");
  });

  it("AC-1[P0]: es:records 키가 아예 없을 때(최초 진입)도 빈 상태로 렌더된다", () => {
    renderWithRouter(React.createElement(History));

    expect(screen.getByText("아직 기록이 없어요")).toBeInTheDocument();
    expect(screen.queryAllByTestId("record-row")).toHaveLength(0);
  });

  it("AC-2[P0]: records N건은 yearMonth 내림차순 ListRow N개로 렌더되고 각 행에 연월·사용량·금액이 표시된다", () => {
    const records: MeterRecord[] = [
      { yearMonth: "2026-06", kWh: 280, total: 48000, createdAt: 1 },
      { yearMonth: "2026-08", kWh: 350, total: 60510, createdAt: 3 },
      { yearMonth: "2025-08", kWh: 402, total: 76140, createdAt: 2 },
    ];
    seedLocalStorage({ "es:records": records });
    renderWithRouter(React.createElement(History));

    const rows = screen.getAllByTestId("record-row");
    expect(rows).toHaveLength(3);

    // yearMonth 내림차순: 2026-08 > 2026-06 > 2025-08
    expect(within(rows[0]).getByText(/2026년 8월/)).toBeInTheDocument();
    expect(within(rows[0]).getByText(/350kWh/)).toBeInTheDocument();
    expect(within(rows[0]).getByText(/60,510원/)).toBeInTheDocument();

    expect(within(rows[1]).getByText(/2026년 6월/)).toBeInTheDocument();
    expect(within(rows[2]).getByText(/2025년 8월/)).toBeInTheDocument();
  });

  it("AC-3[P0]: 삭제 액션 탭 → AlertDialog 확인 → '삭제' 확정 시 즉시 목록에서 사라지고 새로고침(재마운트) 후에도 복구되지 않는다", () => {
    const records: MeterRecord[] = [
      { yearMonth: "2026-08", kWh: 350, total: 60510, createdAt: 2 },
      { yearMonth: "2025-08", kWh: 402, total: 76140, createdAt: 1 },
    ];
    seedLocalStorage({ "es:records": records });
    const { unmount } = renderWithRouter(React.createElement(History));

    expect(screen.getAllByTestId("record-row")).toHaveLength(2);

    fireEvent.click(screen.getByTestId("record-delete-2026-08"));

    const dialog = screen.getByRole("alertdialog");
    expect(within(dialog).getByRole("button", { name: "닫기" })).toBeInTheDocument();
    const confirmButton = within(dialog).getByRole("button", { name: "삭제" });
    expect(confirmButton).toBeInTheDocument();

    fireEvent.click(confirmButton);

    expect(screen.getAllByTestId("record-row")).toHaveLength(1);
    expect(screen.queryByTestId("record-delete-2026-08")).not.toBeInTheDocument();

    const stored = JSON.parse(localStorage.getItem("es:records") ?? "[]");
    expect(stored).toHaveLength(1);
    expect(stored[0].yearMonth).toBe("2025-08");

    unmount();
    renderWithRouter(React.createElement(History));
    expect(screen.getAllByTestId("record-row")).toHaveLength(1);
    expect(screen.getByText(/2025년 8월/)).toBeInTheDocument();
  });

  it("AC-3[P1]: 삭제 확인 다이얼로그에서 '닫기'를 누르면 취소되어 건수가 그대로 유지된다", () => {
    const records: MeterRecord[] = [
      { yearMonth: "2026-08", kWh: 350, total: 60510, createdAt: 2 },
      { yearMonth: "2025-08", kWh: 402, total: 76140, createdAt: 1 },
    ];
    seedLocalStorage({ "es:records": records });
    renderWithRouter(React.createElement(History));

    fireEvent.click(screen.getByTestId("record-delete-2026-08"));
    const dialog = screen.getByRole("alertdialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "닫기" }));

    expect(screen.getAllByTestId("record-row")).toHaveLength(2);
    const stored = JSON.parse(localStorage.getItem("es:records") ?? "[]");
    expect(stored).toHaveLength(2);
  });

  it("AC-4[P1]: 50건 이상이어도 모든 행이 렌더되고 각 행의 터치 타깃 높이가 56px 이상이다", () => {
    const records: MeterRecord[] = Array.from({ length: 55 }, (_, i) => ({
      yearMonth: `2022-${String((i % 12) + 1).padStart(2, "0")}`,
      kWh: 300 + i,
      total: 50000 + i * 100,
      createdAt: i,
    }));
    seedLocalStorage({ "es:records": records });
    renderWithRouter(React.createElement(History));

    const rows = screen.getAllByTestId("record-row");
    expect(rows).toHaveLength(55);

    for (const row of rows) {
      expect(Number.parseInt(row.style.minHeight, 10)).toBeGreaterThanOrEqual(56);
    }
  });
});
