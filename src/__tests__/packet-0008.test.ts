/**
 * Packet 0008 — S1 홈 화면 분할: HomeInput(입력 UI) + HomeData(데이터/네비게이션)
 *
 * AC-1: HomeInput — 사용량 입력, 월 선택(BottomSheet), 보조/에러 텍스트, 하계 Chip, 제출 버튼
 * AC-2: HomeData — es:records 프리필, 사용량 검증, /result 이동, 예상치 고지 다이얼로그 1회
 * AC-3: 두 컴포넌트를 조합해도(HomeData → HomeInput) 기존 F2(S1) 동작이 회귀 없이 유지됨
 * AC-4: (코드 스플릿 자체는 파일 존재 + 정상 합성 렌더로 간접 검증 — 아래 각 테스트가 겸함)
 *
 * HomeInput 계약 (props):
 *   { kWh: string; onKwhChange: (v: string) => void; kwhError?: string; helperText?: string;
 *     month: number; onMonthChange: (m: number) => void; showSummerChip: boolean;
 *     onSubmit: () => void; submitting?: boolean }
 *   - data-testid: "kwh-input"(TextField), "month-row"(ListRow, 탭하면 BottomSheet 오픈),
 *     "month-option-{1..12}"(BottomSheet 내 옵션), "summer-chip"(showSummerChip=true일 때만),
 *     "kwh-helper"(에러 없을 때 helperText 표시), "calc-submit"(SubmitFooter)
 *   - kwhError가 있으면 TextField에 hasError+help로 전달되어 role="alert" 로 노출되고,
 *     이때 kwh-helper는 표시되지 않는다(에러가 helper보다 우선).
 *
 * HomeData 계약: props 없는 페이지 컴포넌트. es:records 최신 항목으로 kWh/보조텍스트를 프리필하고
 *   월 기본값은 현재 시각 기준 직전 달이다. 제출 시 domain/validate의 validateUsage로 검증하고,
 *   유효하면 이동 전 localStorage 쓰기 없이 navigate('/result', { state: { input: { yearMonth, kWh, month } } }).
 *   es:flags.disclaimerSeenAt === null 이면 마운트 시 예상치 고지 AlertDialog를 노출하고
 *   확인 시 es:flags.disclaimerSeenAt에 epoch ms를 기록해 이후 재마운트에는 노출하지 않는다.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { fireEvent, screen } from "@testing-library/react";
import { mockAll, mockNavigate } from "@/__tests__/__helpers__/mocks";
import { renderWithRouter, seedLocalStorage } from "@/__tests__/__helpers__/test-utils";

mockAll();

import HomeInput from "@/pages/HomeInput";
import HomeData from "@/pages/HomeData";

const NOOP = () => {};

describe("S1 홈 화면 — 사용량 입력 · 월 선택 · 예상치 고지 (/)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // 직전 달 계산의 기준 시각을 고정: 2026-09-15 → 직전 달은 8월(하계)
    vi.setSystemTime(new Date("2026-09-15T09:00:00+09:00"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("HomeInput — 입력 UI", () => {
    it("AC-1[P0]: 사용량 입력 필드는 numeric 키패드용 placeholder를 갖고 입력 시 onKwhChange가 값으로 호출된다", () => {
      const onKwhChange = vi.fn();
      renderWithRouter(
        React.createElement(HomeInput, {
          kWh: "",
          onKwhChange,
          month: 8,
          onMonthChange: NOOP,
          showSummerChip: false,
          onSubmit: NOOP,
        }),
      );

      const input = screen.getByTestId("kwh-input") as HTMLInputElement;
      expect(input.getAttribute("placeholder")).toBeTruthy();
      expect(input.getAttribute("inputMode")).toBe("numeric");

      fireEvent.change(input, { target: { value: "350" } });
      expect(onKwhChange).toHaveBeenCalledWith("350");
      expect(onKwhChange).toHaveBeenCalledTimes(1);
    });

    it("AC-1[P0]: 월 선택 행을 탭하면 BottomSheet가 열리고 옵션 선택 시 onMonthChange 호출 후 시트가 닫힌다", () => {
      const onMonthChange = vi.fn();
      renderWithRouter(
        React.createElement(HomeInput, {
          kWh: "100",
          onKwhChange: NOOP,
          month: 3,
          onMonthChange,
          showSummerChip: false,
          onSubmit: NOOP,
        }),
      );

      expect(screen.queryByRole("dialog")).toBeNull();
      fireEvent.click(screen.getByTestId("month-row"));
      expect(screen.getByRole("dialog")).toBeInTheDocument();

      fireEvent.click(screen.getByTestId("month-option-8"));
      expect(onMonthChange).toHaveBeenCalledWith(8);
      expect(screen.queryByRole("dialog")).toBeNull();
    });

    it("AC-1: 하계 Chip은 showSummerChip prop에 따라 조건부로 렌더되고, 제출 버튼은 calc-submit으로 onSubmit을 호출한다", () => {
      const onSubmit = vi.fn();
      renderWithRouter(
        React.createElement(HomeInput, {
          kWh: "350",
          onKwhChange: NOOP,
          month: 8,
          onMonthChange: NOOP,
          showSummerChip: true,
          onSubmit,
        }),
      );
      expect(screen.getByTestId("summer-chip").textContent).toContain("하계 완화 요금 적용");
      fireEvent.click(screen.getByTestId("calc-submit"));
      expect(onSubmit).toHaveBeenCalledTimes(1);

      renderWithRouter(
        React.createElement(HomeInput, {
          kWh: "350",
          onKwhChange: NOOP,
          month: 3,
          onMonthChange: NOOP,
          showSummerChip: false,
          onSubmit: NOOP,
        }),
      );
      expect(screen.queryByTestId("summer-chip")).toBeNull();
    });

    it("AC-1: 에러가 없으면 helperText가 kwh-helper로 표시되고, kwhError가 있으면 role=alert로 대체 표시된다", () => {
      renderWithRouter(
        React.createElement(HomeInput, {
          kWh: "300",
          onKwhChange: NOOP,
          helperText: "지난달 300kWh",
          month: 3,
          onMonthChange: NOOP,
          showSummerChip: false,
          onSubmit: NOOP,
        }),
      );
      expect(screen.getByTestId("kwh-helper").textContent).toContain("지난달 300kWh");
      expect(screen.queryByRole("alert")).toBeNull();

      renderWithRouter(
        React.createElement(HomeInput, {
          kWh: "",
          onKwhChange: NOOP,
          kwhError: "사용량을 1kWh 이상 입력해주세요",
          month: 3,
          onMonthChange: NOOP,
          showSummerChip: false,
          onSubmit: NOOP,
        }),
      );
      expect(screen.getByRole("alert").textContent).toBe("사용량을 1kWh 이상 입력해주세요");
      expect(screen.queryByTestId("kwh-helper")).toBeNull();
    });
  });

  describe("HomeData — 프리필 · 검증 · 이동 · 고지", () => {
    it("AC-2[P1]: 직전 기록이 있으면 사용량이 프리필되고 보조 텍스트가 표시되며 월 기본값은 직전 달(8월)이다", () => {
      seedLocalStorage({
        "es:records": [{ yearMonth: "2026-07", kWh: 412, total: 92340, createdAt: 1 }],
        "es:flags": { schemaVersion: 1, disclaimerSeenAt: 1690000000000 },
      });

      renderWithRouter(React.createElement(HomeData));

      expect((screen.getByTestId("kwh-input") as HTMLInputElement).value).toBe("412");
      expect(screen.getByTestId("kwh-helper").textContent).toContain("지난달 412kWh");
      expect(screen.getByTestId("month-row").textContent).toContain("8월");
    });

    it("AC-2[P0]: 사용량 검증 실패 시 에러를 보여주고 이동하지 않으며, 유효 입력 시 저장 없이 /result로 이동한다", () => {
      seedLocalStorage({ "es:flags": { schemaVersion: 1, disclaimerSeenAt: 1690000000000 } });
      renderWithRouter(React.createElement(HomeData));

      fireEvent.click(screen.getByTestId("calc-submit"));
      expect(screen.getByRole("alert").textContent).toBe("사용량을 1kWh 이상 입력해주세요");
      expect(mockNavigate).not.toHaveBeenCalled();

      fireEvent.change(screen.getByTestId("kwh-input"), { target: { value: "350" } });
      fireEvent.click(screen.getByTestId("calc-submit"));

      expect(mockNavigate).toHaveBeenCalledWith("/result", {
        state: { input: { yearMonth: "2026-08", kWh: 350, month: 8 } },
      });
      expect(localStorage.getItem("es:records")).toBeNull();
    });

    it("AC-2[P0]: 예상치 고지 다이얼로그가 최초 1회 표시되고 확인 시 es:flags에 시각이 기록된다", () => {
      renderWithRouter(React.createElement(HomeData));

      const dialog = screen.getByRole("alertdialog");
      expect(dialog.textContent).toContain("예상치입니다");
      const before = JSON.parse(localStorage.getItem("es:flags") ?? "null");
      expect(before?.disclaimerSeenAt ?? null).toBeNull();

      fireEvent.click(screen.getByRole("button", { name: "확인" }));

      const flags = JSON.parse(localStorage.getItem("es:flags")!);
      expect(typeof flags.disclaimerSeenAt).toBe("number");
      expect(screen.queryByRole("alertdialog")).toBeNull();
    });

    it("AC-3: 이미 고지에 동의했으면 다이얼로그가 재노출되지 않고, 월 7 선택 시 하계 Chip이 연동 표시된다(회귀 없음)", () => {
      seedLocalStorage({ "es:flags": { schemaVersion: 1, disclaimerSeenAt: 1690000000000 } });
      renderWithRouter(React.createElement(HomeData));
      expect(screen.queryByRole("alertdialog")).toBeNull();

      fireEvent.click(screen.getByTestId("month-row"));
      fireEvent.click(screen.getByTestId("month-option-7"));
      expect(screen.getByTestId("summer-chip").textContent).toContain("하계 완화 요금 적용");

      fireEvent.click(screen.getByTestId("month-row"));
      fireEvent.click(screen.getByTestId("month-option-3"));
      expect(screen.queryByTestId("summer-chip")).toBeNull();
    });
  });
});
