import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { act, render, renderHook, screen } from "@testing-library/react";
import { mockAll } from "@/__tests__/__helpers__/mocks";
import { useQuotaToast } from "@/hooks/useQuotaToast";

mockAll();

describe("useQuotaToast 훅 (저장 실패 공통 처리)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("AC-1[P0]: showQuotaToast() 호출 시 toastProps.open===true, message가 정확한 안내 문구다", () => {
    const { result } = renderHook(() => useQuotaToast());

    act(() => {
      result.current.showQuotaToast();
    });

    expect(result.current.toastProps.open).toBe(true);
    expect(result.current.toastProps.text).toBe(
      "저장 공간이 부족해요. 오래된 기록을 삭제해주세요",
    );
  });

  it("AC-2[P0]: 3초 경과(fake timer) 후 toastProps.open이 false로 자동 전환된다", () => {
    const { result } = renderHook(() => useQuotaToast());

    act(() => {
      result.current.showQuotaToast();
    });
    expect(result.current.toastProps.open).toBe(true);

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(result.current.toastProps.open).toBe(false);
  });

  it("AC-2: 3초 미만 경과 시에는 아직 open===true를 유지한다", () => {
    const { result } = renderHook(() => useQuotaToast());

    act(() => {
      result.current.showQuotaToast();
    });

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current.toastProps.open).toBe(true);
  });

  it("AC-3[P0]: 저장 실패가 발생해도 훅 사용 컴포넌트가 언마운트되지 않고 결과 영역이 유지된다", () => {
    function DemoResult() {
      const { toastProps, showQuotaToast } = useQuotaToast();
      const handleSave = () => {
        // 저장 실패 시뮬레이션 (safeStorage의 quota 사유)
        const saveResult = { ok: false as const, reason: "quota" as const };
        if (!saveResult.ok && saveResult.reason === "quota") {
          showQuotaToast();
        }
      };
      return React.createElement(
        "div",
        null,
        React.createElement("div", { "data-testid": "result-area" }, "결과 123,000원"),
        React.createElement("button", { onClick: handleSave }, "기록 저장"),
        React.createElement("div", { role: "status", "data-open": toastProps.open ? "true" : "false" }, toastProps.text),
      );
    }

    render(React.createElement(DemoResult));

    expect(screen.getByTestId("result-area").textContent).toBe("결과 123,000원");

    act(() => {
      screen.getByRole("button", { name: /기록 저장/ }).click();
    });

    expect(screen.getByTestId("result-area").textContent).toBe("결과 123,000원");
    expect(screen.getByRole("status").getAttribute("data-open")).toBe("true");
  });

  it("AC-4: showToast(message)로 임의 메시지를 노출할 수 있고, 반환값에 HEX 색상 리터럴이 없다", () => {
    const { result } = renderHook(() => useQuotaToast());

    act(() => {
      result.current.showToast("기록을 저장했어요");
    });

    expect(result.current.toastProps.open).toBe(true);
    expect(result.current.toastProps.text).toBe("기록을 저장했어요");

    const serialized = JSON.stringify(result.current.toastProps);
    expect(/#[0-9a-fA-F]{3,8}/.test(serialized)).toBe(false);
  });

  it("AC-1/AC-4: 초기 상태는 toastProps.open===false이다", () => {
    const { result } = renderHook(() => useQuotaToast());

    expect(result.current.toastProps.open).toBe(false);
    expect(typeof result.current.showQuotaToast).toBe("function");
    expect(typeof result.current.showToast).toBe("function");
  });
});
