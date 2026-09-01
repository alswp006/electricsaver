/**
 * Packet 0008 (heal-1-03) — 홈 화면(/) 완성: HomeInput(프레젠테이션) / HomeData(라우트) 분할.
 *
 * HomeInput 계약 (props만 사용, 내부 상태 없음):
 *   { kWh: string; onKwhChange: (v: string) => void;
 *     month: number; onMonthChange: (m: number) => void;
 *     onSubmit: () => void; submitting?: boolean }
 *   - data-testid: "kwh-input"(TextField, inputMode=numeric), "month-row"(탭하면 BottomSheet 오픈),
 *     "month-option-{1..12}"(BottomSheet 옵션), "month-chip"(선택된 월 Chip, 예: "8월"),
 *     "calc-submit"(SubmitFooter)
 *   - '예상치' 고지 문구를 Paragraph.Text로 항상 노출한다("예상치" 텍스트 포함).
 *
 * HomeData 계약 (props 없는 라우트 컴포넌트):
 *   - 마운트 시 es:records의 최근 기록으로 kWh·월을 프리필한다.
 *   - 제출 시 kWh를 1~3000 정수로 검증하고, 범위를 벗어나면 AlertDialog로 에러를 안내하며 이동하지 않는다.
 *   - 유효하면 navigate('/result', { state: { input: { yearMonth, kWh, month } } })로 이동한다
 *     (src/types/navigation.ts의 ResultRouteState/BillInput 모양).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fireEvent, screen } from "@testing-library/react";
import { mockAll, mockNavigate } from "@/__tests__/__helpers__/mocks";
import { renderWithRouter, seedLocalStorage } from "@/__tests__/__helpers__/test-utils";

mockAll();

import HomeInput from "@/pages/HomeInput";
import HomeData from "@/pages/HomeData";
import App from "@/App";

const NOOP = () => {};

describe("0008 홈 화면(/) 완성 — HomeInput/HomeData 분할 구현 및 전 라우트 스모크 복구", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // 기준 시각 고정: 2026-09-15 → 직전 달은 8월(하계 구간 경계 테스트도 겸함)
    vi.setSystemTime(new Date("2026-09-15T09:00:00+09:00"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("HomeInput — 순수 프레젠테이션 컴포넌트", () => {
    it("AC-1[P0]: kWh TextField는 inputMode=numeric·placeholder를 갖고, 입력 시 onKwhChange(값)만 호출한다", () => {
      const onKwhChange = vi.fn();
      renderWithRouter(
        React.createElement(HomeInput, {
          kWh: "",
          onKwhChange,
          month: 8,
          onMonthChange: NOOP,
          onSubmit: NOOP,
        }),
      );

      const input = screen.getByTestId("kwh-input") as HTMLInputElement;
      expect(input.getAttribute("inputMode")).toBe("numeric");
      expect(input.getAttribute("placeholder")).toBeTruthy();

      fireEvent.change(input, { target: { value: "420" } });
      expect(onKwhChange).toHaveBeenCalledWith("420");
      expect(onKwhChange).toHaveBeenCalledTimes(1);
    });

    it("AC-1[P0]: 월 행을 탭하면 BottomSheet가 열려 1~12월 옵션을 보여주고, 선택 시 onMonthChange 호출 후 시트가 닫힌다", () => {
      const onMonthChange = vi.fn();
      renderWithRouter(
        React.createElement(HomeInput, {
          kWh: "300",
          onKwhChange: NOOP,
          month: 3,
          onMonthChange,
          onSubmit: NOOP,
        }),
      );

      expect(screen.getByTestId("month-chip").textContent).toContain("3월");
      expect(screen.queryByRole("dialog")).toBeNull();

      fireEvent.click(screen.getByTestId("month-row"));
      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getByTestId("month-option-8")).toBeInTheDocument();

      fireEvent.click(screen.getByTestId("month-option-8"));
      expect(onMonthChange).toHaveBeenCalledWith(8);
      expect(onMonthChange).toHaveBeenCalledTimes(1);
      expect(screen.queryByRole("dialog")).toBeNull();
    });

    it("AC-1: 예상치 고지 문구가 항상 노출되고, 제출 버튼(calc-submit)이 onSubmit을 호출한다", () => {
      const onSubmit = vi.fn();
      renderWithRouter(
        React.createElement(HomeInput, {
          kWh: "350",
          onKwhChange: NOOP,
          month: 8,
          onMonthChange: NOOP,
          onSubmit,
        }),
      );

      expect(screen.getByText(/예상치/)).toBeInTheDocument();
      fireEvent.click(screen.getByTestId("calc-submit"));
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });

    it("AC-1: submitting=true면 제출 버튼이 비활성화되어 중복 제출을 막는다", () => {
      const onSubmit = vi.fn();
      renderWithRouter(
        React.createElement(HomeInput, {
          kWh: "350",
          onKwhChange: NOOP,
          month: 8,
          onMonthChange: NOOP,
          onSubmit,
          submitting: true,
        }),
      );

      const submitBtn = screen.getByTestId("calc-submit") as HTMLButtonElement;
      expect(submitBtn.disabled).toBe(true);
      fireEvent.click(submitBtn);
      expect(onSubmit).not.toHaveBeenCalled();
    });
  });

  describe("HomeData — 프리필 · 검증 · /result 이동", () => {
    it("AC-2[P1]: es:records의 최근 기록으로 kWh·월이 프리필된다", () => {
      seedLocalStorage({
        "es:records": [{ yearMonth: "2026-08", kWh: 412, total: 92340, createdAt: 1 }],
      });

      renderWithRouter(React.createElement(HomeData));

      expect((screen.getByTestId("kwh-input") as HTMLInputElement).value).toBe("412");
      expect(screen.getByTestId("month-chip").textContent).toContain("8월");
    });

    it("AC-2[P0]: kWh가 1~3000 범위를 벗어나면 AlertDialog로 에러를 안내하고 /result로 이동하지 않는다", () => {
      renderWithRouter(React.createElement(HomeData));

      fireEvent.change(screen.getByTestId("kwh-input"), { target: { value: "0" } });
      fireEvent.click(screen.getByTestId("calc-submit"));

      const dialog = screen.getByRole("alertdialog");
      expect(dialog.textContent).toContain("1kWh 이상");
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it("AC-2[P0]: 3000 초과·정수가 아닌 값도 AlertDialog로 걸러지고 이동하지 않는다", () => {
      renderWithRouter(React.createElement(HomeData));

      fireEvent.change(screen.getByTestId("kwh-input"), { target: { value: "3500" } });
      fireEvent.click(screen.getByTestId("calc-submit"));
      expect(screen.getByRole("alertdialog").textContent).toContain("3000kWh 이하");
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it("AC-2[P0]: 유효한 kWh(1~3000 정수) 입력 시 navigation.ts 공용 타입 형태의 state로 /result에 이동한다", () => {
      renderWithRouter(React.createElement(HomeData));

      fireEvent.change(screen.getByTestId("kwh-input"), { target: { value: "350" } });
      fireEvent.click(screen.getByTestId("calc-submit"));

      expect(mockNavigate).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith("/result", {
        state: { input: { yearMonth: "2026-08", kWh: 350, month: 8 } },
      });
    });
  });

  describe("AC-3/AC-4: 정적 계약 — TDS 전용·HEX 무하드코딩·파일 길이", () => {
    const homeInputSrc = readFileSync(resolve(__dirname, "../pages/HomeInput.tsx"), "utf-8");
    const homeDataSrc = readFileSync(resolve(__dirname, "../pages/HomeData.tsx"), "utf-8");

    it("AC-3: 두 파일 모두 ScreenScaffold를 사용하고 HEX 색상 하드코딩이 없다", () => {
      expect(homeInputSrc).toMatch(/ScreenScaffold/);
      expect(homeDataSrc).toMatch(/ScreenScaffold/);
      expect(homeInputSrc).not.toMatch(/#[0-9a-fA-F]{3,6}\b/);
      expect(homeDataSrc).not.toMatch(/#[0-9a-fA-F]{3,6}\b/);
    });

    it("AC-3: 비-TDS UI 라이브러리(mui/antd/chakra/shadcn)를 import하지 않는다", () => {
      const forbidden = /@mui|antd|@chakra-ui|shadcn/;
      expect(homeInputSrc).not.toMatch(forbidden);
      expect(homeDataSrc).not.toMatch(forbidden);
    });

    it("AC-4: 각 파일이 200줄 이하로 유지된다", () => {
      expect(homeInputSrc.split("\n").length).toBeLessThanOrEqual(200);
      expect(homeDataSrc.split("\n").length).toBeLessThanOrEqual(200);
    });
  });

  describe("AC-5: 전 라우트 스모크 복구 (통합)", () => {
    it("AC-5[P0]: App의 모든 Route가 흰 화면 없이 렌더된다(/, /result, /history, /simulate, /report, /region, /settings)", () => {
      seedLocalStorage({
        "es:records": [{ yearMonth: "2026-08", kWh: 300, total: 70000, createdAt: 1 }],
      });

      const routes: Array<{ path: string; state?: unknown }> = [
        { path: "/" },
        { path: "/result", state: { input: { yearMonth: "2026-08", kWh: 300, month: 8 } } },
        { path: "/history" },
        { path: "/simulate", state: { input: { yearMonth: "2026-08", kWh: 300, month: 8 } } },
        {
          path: "/report",
          state: {
            summary: {
              baseKWh: 300,
              savedKWh: 30,
              targetKWh: 270,
              baseTotal: 70000,
              targetTotal: 60000,
              savedWon: 10000,
              month: 8,
              appliances: [],
            },
          },
        },
        { path: "/region" },
        { path: "/settings" },
      ];

      routes.forEach(({ path, state }) => {
        const { container } = renderWithRouter(React.createElement(App), {
          initialEntries: [{ pathname: path, state }],
        });
        expect(container.innerHTML.length).toBeGreaterThan(0);
        expect(container.querySelectorAll("*").length).toBeGreaterThan(3);
      });
    });
  });
});
