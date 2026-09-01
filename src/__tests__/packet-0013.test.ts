import { describe, it, expect, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { mockAll, mockNavigate } from "@/__tests__/__helpers__/mockAll";
import { STORAGE_KEYS } from "@/lib/types";
import type { AppSettings } from "@/lib/types";

// TDS + SDK + router + TossRewardAd — full stack mock (Home renders an AdSlot banner too).
mockAll();

// generateHapticFeedback is a named export from the mocked SDK — pull it after mockAll()
// registers the vi.mock, so this points at the same mock instance the component imports.
import { generateHapticFeedback } from "@apps-in-toss/web-framework";

import Home from "@/pages/Home";

function renderHome() {
  return render(React.createElement(MemoryRouter, { initialEntries: ["/"] }, React.createElement(Home)));
}

async function waitForSkeletonGone() {
  await waitFor(() => expect(screen.queryByTestId("home-skeleton")).not.toBeInTheDocument());
}

function seedSettings(patch: Partial<AppSettings>) {
  const settings: AppSettings = {
    contractType: "low",
    regionCode: "KR-11",
    householdSize: 1,
    lastYearMonth: null,
    ...patch,
  };
  localStorage.setItem(STORAGE_KEYS.settings, JSON.stringify(settings));
}

describe("홈 화면 `/` (사용량 입력)", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("AC-5[P0]: 설정 복원 중에는 home-skeleton 안에 Skeleton 3개가 렌더되고 CTA가 disabled다", () => {
    renderHome();

    const skeleton = screen.getByTestId("home-skeleton");
    expect(within(skeleton).getAllByRole("presentation")).toHaveLength(3);

    const cta = screen.getByRole("button", { name: "요금 계산하기" });
    expect(cta).toBeDisabled();
  });

  it("AC-1[P0]: 사용량 미입력/0 입력 후 CTA 탭 시 에러 문구가 뜨고 navigate가 호출되지 않는다", async () => {
    renderHome();
    await waitForSkeletonGone();

    const cta = screen.getByRole("button", { name: "요금 계산하기" });

    // 미입력 상태로 제출
    fireEvent.click(cta);
    expect(screen.getByText("사용량을 1kWh 이상 입력해주세요")).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();

    // 0 입력 후에도 동일하게 차단
    const input = screen.getByRole("textbox") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "0" } });
    fireEvent.click(cta);
    expect(screen.getByText("사용량을 1kWh 이상 입력해주세요")).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("AC-2[P0]: '450' 입력 + 연월 선택 후 CTA 탭 시 haptic 후 navigate('/result', {state:{input}})가 정확히 1회 호출된다", async () => {
    renderHome();
    await waitForSkeletonGone();

    const input = screen.getByRole("textbox") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "450" } });

    // 검침 연월 ListRow → BottomSheet(최근 24개월)에서 과거 월 선택
    fireEvent.click(screen.getByTestId("home-yearmonth-row"));
    fireEvent.click(await screen.findByTestId("month-option-2026-08"));

    const cta = screen.getByRole("button", { name: "요금 계산하기" });
    fireEvent.click(cta);

    expect(generateHapticFeedback).toHaveBeenCalledWith({ type: "success" });
    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith("/result", {
      state: { input: { kWh: 450, yearMonth: "2026-08", contractType: "low" } },
    });
  });

  it("AC-3[P0]: '고압' Tab 선택 시 es:settings:v1에 contractType='high'로 저장되고 재진입 시 복원된다", async () => {
    const { unmount } = renderHome();
    await waitForSkeletonGone();

    expect(screen.getByRole("tab", { name: "저압" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "고압" })).toHaveAttribute("aria-selected", "false");

    fireEvent.click(screen.getByRole("tab", { name: "고압" }));

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEYS.settings) ?? "{}");
    expect(stored.contractType).toBe("high");

    unmount();

    renderHome();
    await waitForSkeletonGone();

    expect(screen.getByRole("tab", { name: "고압" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "저압" })).toHaveAttribute("aria-selected", "false");
  });

  it("AC-4[P1]: 복원된 연월이 미래면 '아직 오지 않은 달이에요' 문구가 뜨고 CTA 제출이 차단된다", async () => {
    seedSettings({ lastYearMonth: "2099-01" });
    renderHome();
    await waitForSkeletonGone();

    expect(screen.getByText("아직 오지 않은 달이에요")).toBeInTheDocument();

    const input = screen.getByRole("textbox") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "300" } });

    fireEvent.click(screen.getByRole("button", { name: "요금 계산하기" }));

    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
