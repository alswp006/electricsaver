import { describe, it, expect, vi } from "vitest";
import React from "react";
import { screen, fireEvent, renderHook, act } from "@testing-library/react";
import { renderWithRouter, seedLocalStorage } from "@/__tests__/__helpers__/test-utils";
import { mockTds, mockAppsInToss } from "@/__tests__/__helpers__/mocks";

mockTds();
mockAppsInToss();

import { ApplianceSheet } from "@/components/ApplianceSheet";
import { useAppliances } from "@/hooks/useAppliances";
import { generateHapticFeedback } from "@apps-in-toss/web-framework";
import type { ApplianceItem } from "@/types/domain";

describe("S4 가전 추가/편집 BottomSheet + 영속화 [packet-0014]", () => {
  describe("useAppliances hook — 영속화", () => {
    it("AC-1[P0]: addAppliance는 항목을 목록에 추가하고 es:appliances 에 저장한다", () => {
      const { result } = renderHook(() => useAppliances());

      act(() => {
        const res = result.current.addAppliance({
          id: "aircon",
          name: "에어컨",
          watt: 1800,
          hoursPerDay: 6,
          reduceRatio: 0.3,
        });
        expect(res.ok).toBe(true);
      });

      expect(result.current.appliances).toHaveLength(1);
      expect(result.current.appliances[0].id).toBe("aircon");

      const stored = JSON.parse(localStorage.getItem("es:appliances") ?? "[]");
      expect(stored).toHaveLength(1);
      expect(stored[0].name).toBe("에어컨");
    });

    it("AC-2[P0]: 이미 12건이면 addAppliance가 limit 사유로 거부하고 목록은 12건을 유지한다", () => {
      const twelve: ApplianceItem[] = Array.from({ length: 12 }, (_, i) => ({
        id: `item-${i}`,
        name: `가전${i}`,
        watt: 100,
        hoursPerDay: 1,
        reduceRatio: 0.1,
      }));
      seedLocalStorage({ "es:appliances": twelve });

      const { result } = renderHook(() => useAppliances());
      expect(result.current.appliances).toHaveLength(12);

      act(() => {
        const res = result.current.addAppliance({
          id: "extra",
          name: "추가가전",
          watt: 100,
          hoursPerDay: 1,
          reduceRatio: 0.1,
        });
        expect(res.ok).toBe(false);
        expect(res.reason).toBe("limit");
      });

      expect(result.current.appliances).toHaveLength(12);
      const stored = JSON.parse(localStorage.getItem("es:appliances") ?? "[]");
      expect(stored).toHaveLength(12);
    });

    it("AC-3[P0]: updateAppliance로 변경한 값은 재마운트(새로고침) 후에도 유지된다", () => {
      seedLocalStorage({
        "es:appliances": [
          { id: "aircon", name: "에어컨", watt: 1800, hoursPerDay: 6, reduceRatio: 0.3 },
        ],
      });

      const { result, unmount } = renderHook(() => useAppliances());
      act(() => {
        result.current.updateAppliance("aircon", { hoursPerDay: 3, reduceRatio: 0.5 });
      });
      expect(result.current.appliances[0].hoursPerDay).toBe(3);
      expect(result.current.appliances[0].reduceRatio).toBe(0.5);
      unmount();

      const { result: reloaded } = renderHook(() => useAppliances());
      expect(reloaded.current.appliances[0].hoursPerDay).toBe(3);
      expect(reloaded.current.appliances[0].reduceRatio).toBe(0.5);

      const stored = JSON.parse(localStorage.getItem("es:appliances") ?? "[]");
      expect(stored[0].hoursPerDay).toBe(3);
      expect(stored[0].reduceRatio).toBe(0.5);
    });

    it("AC-4[P0]: removeAppliance는 즉시 목록에서 제거하고 저장소도 갱신한다", () => {
      seedLocalStorage({
        "es:appliances": [
          { id: "aircon", name: "에어컨", watt: 1800, hoursPerDay: 6, reduceRatio: 0.3 },
        ],
      });

      const { result } = renderHook(() => useAppliances());
      expect(result.current.appliances).toHaveLength(1);

      act(() => {
        result.current.removeAppliance("aircon");
      });

      expect(result.current.appliances).toHaveLength(0);
      const stored = JSON.parse(localStorage.getItem("es:appliances") ?? "[]");
      expect(stored).toHaveLength(0);
    });
  });

  describe("ApplianceSheet 컴포넌트", () => {
    it("AC-1[P0]: 카탈로그 모드는 8종 이상 ListRow를 표시하고 항목 선택 시 addAppliance 호출 후 시트가 닫힌다", () => {
      const addAppliance = vi.fn().mockReturnValue({ ok: true });
      const onClose = vi.fn();
      renderWithRouter(
        React.createElement(ApplianceSheet, {
          open: true,
          mode: "catalog",
          onClose,
          appliances: [],
          addAppliance,
          updateAppliance: vi.fn(),
          removeAppliance: vi.fn(),
        }),
      );

      const rows = screen.getAllByTestId("catalog-item");
      expect(rows.length).toBeGreaterThanOrEqual(8);

      fireEvent.click(screen.getByText("에어컨"));

      expect(addAppliance).toHaveBeenCalledTimes(1);
      expect(addAppliance).toHaveBeenCalledWith(
        expect.objectContaining({ id: "aircon", name: "에어컨", watt: 1800 }),
      );
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("AC-2[P0]: 12건 초과로 addAppliance가 거부되면 '가전은 12개까지 담을 수 있어요' Toast가 노출되고 목록 건수는 그대로다", () => {
      const twelve: ApplianceItem[] = Array.from({ length: 12 }, (_, i) => ({
        id: `item-${i}`,
        name: `가전${i}`,
        watt: 100,
        hoursPerDay: 1,
        reduceRatio: 0.1,
      }));
      const addAppliance = vi.fn().mockReturnValue({ ok: false, reason: "limit" });
      const onClose = vi.fn();
      renderWithRouter(
        React.createElement(ApplianceSheet, {
          open: true,
          mode: "catalog",
          onClose,
          appliances: twelve,
          addAppliance,
          updateAppliance: vi.fn(),
          removeAppliance: vi.fn(),
        }),
      );

      fireEvent.click(screen.getByText("에어컨"));

      expect(addAppliance).toHaveBeenCalledTimes(1);
      expect(screen.getByText("가전은 12개까지 담을 수 있어요")).toBeInTheDocument();
    });

    it("AC-3[P0]: 편집 모드에서 hoursPerDay/reduceRatio Chip을 선택하면 updateAppliance가 새 값으로 호출된다", () => {
      const updateAppliance = vi.fn();
      const appliance: ApplianceItem = {
        id: "aircon",
        name: "에어컨",
        watt: 1800,
        hoursPerDay: 6,
        reduceRatio: 0.3,
      };
      renderWithRouter(
        React.createElement(ApplianceSheet, {
          open: true,
          mode: "edit",
          editingAppliance: appliance,
          onClose: vi.fn(),
          appliances: [appliance],
          addAppliance: vi.fn(),
          updateAppliance,
          removeAppliance: vi.fn(),
        }),
      );

      fireEvent.click(screen.getByTestId("hours-chip-3"));
      expect(updateAppliance).toHaveBeenCalledWith("aircon", expect.objectContaining({ hoursPerDay: 3 }));

      fireEvent.click(screen.getByTestId("ratio-chip-50"));
      expect(updateAppliance).toHaveBeenCalledWith("aircon", expect.objectContaining({ reduceRatio: 0.5 }));

      expect(updateAppliance).toHaveBeenCalledTimes(2);
    });

    it("AC-4[P0]: 삭제 탭 시 removeAppliance가 호출되고, Chip 선택 시 tickWeak 햅틱이 호출된다", () => {
      const removeAppliance = vi.fn();
      const appliance: ApplianceItem = {
        id: "aircon",
        name: "에어컨",
        watt: 1800,
        hoursPerDay: 6,
        reduceRatio: 0.3,
      };
      renderWithRouter(
        React.createElement(ApplianceSheet, {
          open: true,
          mode: "edit",
          editingAppliance: appliance,
          onClose: vi.fn(),
          appliances: [appliance],
          addAppliance: vi.fn(),
          updateAppliance: vi.fn(),
          removeAppliance,
        }),
      );

      fireEvent.click(screen.getByTestId("hours-chip-3"));
      expect(generateHapticFeedback).toHaveBeenCalledWith({ type: "tickWeak" });

      fireEvent.click(screen.getByRole("button", { name: "삭제" }));
      expect(removeAppliance).toHaveBeenCalledTimes(1);
      expect(removeAppliance).toHaveBeenCalledWith("aircon");
    });
  });
});
