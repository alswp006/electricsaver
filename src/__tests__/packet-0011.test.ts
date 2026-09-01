import { describe, it, expect } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { mockAll } from "@/__tests__/__helpers__/mocks";
import { APPLIANCES } from "@/domain/appliances";
import type { ApplianceCut } from "@/lib/types";

mockAll();

// generateHapticFeedback is a named export from the mocked SDK — pull it after mockAll()
// registers the vi.mock, so this points at the same mock instance the component imports.
import { generateHapticFeedback } from "@apps-in-toss/web-framework";

import { ApplianceStepperCard } from "@/components/ApplianceStepperCard";

function renderCard(cuts: ApplianceCut[], onChange: (applianceId: string, hours: number) => void = () => {}) {
  return render(
    React.createElement(
      MemoryRouter,
      null,
      React.createElement(ApplianceStepperCard, { cuts, onChange }),
    ),
  );
}

describe("ApplianceStepperCard (가전 8행 스텝퍼)", () => {
  it("AC-1[P0]: 8개 행이 렌더되고 각 행에 name·watt와 -/+ 버튼이 존재한다", () => {
    renderCard([]);

    expect(screen.getAllByRole("listitem")).toHaveLength(APPLIANCES.length);
    expect(screen.getByText("에어컨 · 1800W")).toBeInTheDocument();
    expect(screen.getByText("전기밥솥(보온) · 100W")).toBeInTheDocument();

    // 8 rows × 2 buttons (-/+) each
    const minusButtons = screen.getAllByRole("button", { name: /줄이기|감소|-/i });
    const plusButtons = screen.getAllByRole("button", { name: /늘리기|증가|\+/i });
    expect(minusButtons).toHaveLength(APPLIANCES.length);
    expect(plusButtons).toHaveLength(APPLIANCES.length);
  });

  it("AC-2[P0]: + 를 1회 누르면 0 → 0.5로 증가하고 onChange('aircon', 0.5)가 호출된다", () => {
    let called: [string, number] | null = null;
    renderCard([], (id: string, hours: number) => {
      called = [id, hours];
    });

    const plusButtons = screen.getAllByRole("button", { name: /늘리기|증가|\+/i });
    plusButtons[0].click();

    expect(called).toEqual(["aircon", 0.5]);
    expect(screen.getByText("0.5h")).toBeInTheDocument();
  });

  it("AC-3[P0]: 값이 0이면 - 버튼이 disabled, 12면 + 버튼이 disabled이고 범위 밖 onChange는 발생하지 않는다", () => {
    let callCount = 0;
    const cuts: ApplianceCut[] = [{ applianceId: "aircon", cutHoursPerDay: 12 }];
    renderCard(cuts, () => {
      callCount += 1;
    });

    const rows = screen.getAllByRole("listitem");
    const airconRow = rows[0];
    const minusInRow = airconRow.querySelector('button[aria-label*="줄이기"], button[aria-label*="감소"]') as HTMLButtonElement | null;
    const plusInRow = airconRow.querySelector('button[aria-label*="늘리기"], button[aria-label*="증가"]') as HTMLButtonElement | null;

    // aircon is at max (12) → + must be disabled, clicking it must not call onChange
    expect(plusInRow?.disabled).toBe(true);
    plusInRow?.click();
    expect(callCount).toBe(0);

    // dryer (2nd row) starts at 0 → - must be disabled, clicking it must not call onChange
    const dryerRow = rows[1];
    const dryerMinus = dryerRow.querySelector('button[aria-label*="줄이기"], button[aria-label*="감소"]') as HTMLButtonElement | null;
    expect(dryerMinus?.disabled).toBe(true);
    dryerMinus?.click();
    expect(callCount).toBe(0);
  });

  it("AC-4: -/+ 버튼의 히트 영역이 44px 이상이다", () => {
    renderCard([]);

    const plusButtons = screen.getAllByRole("button", { name: /늘리기|증가|\+/i });
    const minusButtons = screen.getAllByRole("button", { name: /줄이기|감소|-/i });

    expect(plusButtons[0]).toHaveStyle({ minWidth: "44px", minHeight: "44px" });
    expect(minusButtons[0]).toHaveStyle({ minWidth: "44px", minHeight: "44px" });
  });

  it("AC-5: 값 변경 시 generateHapticFeedback({type:'tickWeak'})가 호출된다", () => {
    renderCard([]);

    const plusButtons = screen.getAllByRole("button", { name: /늘리기|증가|\+/i });
    plusButtons[0].click();

    expect(generateHapticFeedback).toHaveBeenCalledWith({ type: "tickWeak" });
  });

  it("AC-2: 이미 감축값이 있는 가전에서 -를 누르면 0.5 감소하고 onChange가 새 값으로 호출된다", () => {
    let called: [string, number] | null = null;
    const cuts: ApplianceCut[] = [{ applianceId: "aircon", cutHoursPerDay: 2 }];
    renderCard(cuts, (id: string, hours: number) => {
      called = [id, hours];
    });

    const rows = screen.getAllByRole("listitem");
    const airconMinus = rows[0].querySelector('button[aria-label*="줄이기"], button[aria-label*="감소"]') as HTMLButtonElement;
    airconMinus.click();

    expect(called).toEqual(["aircon", 1.5]);
    expect(screen.getByText("1.5h")).toBeInTheDocument();
  });
});
