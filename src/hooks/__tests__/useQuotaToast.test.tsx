import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mockTds } from "@/__tests__/__helpers__/mocks";

mockTds();

import { render, screen, act } from "@testing-library/react";
import { Toast } from "@toss/tds-mobile";
import { useQuotaToast, QUOTA_TOAST_MESSAGE } from "@/hooks/useQuotaToast";

type SaveResult = { ok: true } | { ok: false; reason: "quota" };

function fakeSave(): SaveResult {
  return { ok: false, reason: "quota" };
}

function TestScreen() {
  const { toastProps, showQuotaToast } = useQuotaToast();

  const handleSave = () => {
    const result = fakeSave();
    if (!result.ok && result.reason === "quota") {
      showQuotaToast();
    }
  };

  return (
    <div>
      <div data-testid="result-area">결과 화면</div>
      <button onClick={handleSave}>기록 저장</button>
      <Toast {...toastProps} />
    </div>
  );
}

describe("useQuotaToast", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("AC-1: showQuotaToast() opens toast with the fixed quota message", () => {
    render(<TestScreen />);

    act(() => {
      screen.getByRole("button", { name: "기록 저장" }).click();
    });

    expect(screen.getByRole("status").textContent).toBe(QUOTA_TOAST_MESSAGE);
  });

  it("AC-2: toast auto-closes after 3 seconds", () => {
    render(<TestScreen />);

    act(() => {
      screen.getByRole("button", { name: "기록 저장" }).click();
    });
    expect(screen.getByRole("status")).toBeTruthy();

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(screen.queryByRole("status")).toBeNull();
  });

  it("AC-3: save failure keeps the render tree mounted (no white screen)", () => {
    render(<TestScreen />);

    act(() => {
      screen.getByRole("button", { name: "기록 저장" }).click();
    });

    const resultArea = screen.getByTestId("result-area");
    expect(resultArea).toBeTruthy();
    expect(resultArea.textContent).toBe("결과 화면");
  });

  it("returns showToast for custom messages without touching the quota copy", () => {
    function CustomScreen() {
      const { toastProps, showToast } = useQuotaToast();
      return (
        <div>
          <button onClick={() => showToast("네트워크 연결을 확인해주세요")}>
            알림
          </button>
          <Toast {...toastProps} />
        </div>
      );
    }

    render(<CustomScreen />);
    act(() => {
      screen.getByRole("button", { name: "알림" }).click();
    });

    expect(screen.getByRole("status").textContent).toBe(
      "네트워크 연결을 확인해주세요",
    );
  });
});
