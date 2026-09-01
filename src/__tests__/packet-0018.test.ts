import { describe, it, expect, vi } from "vitest";
import React from "react";
import { screen, fireEvent, renderHook, act } from "@testing-library/react";
import { renderWithRouter, seedLocalStorage } from "@/__tests__/__helpers__/test-utils";
import { mockTds, mockAppsInToss } from "@/__tests__/__helpers__/mocks";

mockTds();
mockAppsInToss();

import { ProfileSheet } from "@/components/ProfileSheet";
import { useProfile } from "@/hooks/useProfile";
import { generateHapticFeedback } from "@apps-in-toss/web-framework";
import type { UserProfile } from "@/types/domain";

const DEFAULT_PROFILE: UserProfile = { regionCode: "11", householdSize: 2 };

describe("S6 프로필 BottomSheet (지역·가구원수) [packet-0018]", () => {
  describe("useProfile hook — 영속화", () => {
    it("AC-3[P0]: 기본값은 서울(11)/2인이고, setProfile은 부분 patch를 병합해 상태와 es:profile 저장소에 반영한다", () => {
      const { result } = renderHook(() => useProfile());
      expect(result.current.profile).toEqual(DEFAULT_PROFILE);

      act(() => {
        result.current.setProfile({ regionCode: "26" });
      });

      expect(result.current.profile).toEqual({ regionCode: "26", householdSize: 2 });

      const stored = JSON.parse(localStorage.getItem("es:profile") ?? "null");
      expect(stored.regionCode).toBe("26");
      expect(stored.householdSize).toBe(2);
    });

    it("AC-3[P0]: 새로고침(재마운트) 후에도 저장된 프로필 값이 그대로 유지된다", () => {
      seedLocalStorage({ "es:profile": { regionCode: "48", householdSize: 4 } });

      const { result } = renderHook(() => useProfile());
      expect(result.current.profile.regionCode).toBe("48");
      expect(result.current.profile.householdSize).toBe(4);

      act(() => {
        result.current.setProfile({ householdSize: 1 });
      });

      const { result: reloaded } = renderHook(() => useProfile());
      expect(reloaded.current.profile).toEqual({ regionCode: "48", householdSize: 1 });
    });
  });

  describe("ProfileSheet 컴포넌트", () => {
    it("AC-1[P0]: 지역 시트가 regionAverage 데이터의 17개 시도를 ListRow로 표시한다", () => {
      renderWithRouter(
        React.createElement(ProfileSheet, {
          open: true,
          onClose: vi.fn(),
          profile: DEFAULT_PROFILE,
          setProfile: vi.fn(),
        }),
      );

      const rows = screen.getAllByTestId(/^region-item-/);
      expect(rows).toHaveLength(17);
      expect(screen.getByText("서울")).toBeInTheDocument();
      expect(screen.getByText("제주")).toBeInTheDocument();
    });

    it("AC-1[P0]: 지역 선택 시 setProfile({ regionCode })가 호출되고 시트가 닫힌다", () => {
      const setProfile = vi.fn();
      const onClose = vi.fn();
      renderWithRouter(
        React.createElement(ProfileSheet, {
          open: true,
          onClose,
          profile: DEFAULT_PROFILE,
          setProfile,
        }),
      );

      fireEvent.click(screen.getByTestId("region-item-26"));

      expect(setProfile).toHaveBeenCalledTimes(1);
      expect(setProfile).toHaveBeenCalledWith({ regionCode: "26" });
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("AC-2[P0]: 가구원수 Chip 4개(1인/2인/3인/4인 이상)가 렌더된다", () => {
      renderWithRouter(
        React.createElement(ProfileSheet, {
          open: true,
          onClose: vi.fn(),
          profile: DEFAULT_PROFILE,
          setProfile: vi.fn(),
        }),
      );

      expect(screen.getByTestId("household-chip-1")).toHaveTextContent("1인");
      expect(screen.getByTestId("household-chip-2")).toHaveTextContent("2인");
      expect(screen.getByTestId("household-chip-3")).toHaveTextContent("3인");
      expect(screen.getByTestId("household-chip-4")).toHaveTextContent("4인 이상");
    });

    it("AC-2[P0]: 가구원수 Chip 선택 시 setProfile({ householdSize })가 1|2|3|4 값으로 호출된다", () => {
      const setProfile = vi.fn();
      renderWithRouter(
        React.createElement(ProfileSheet, {
          open: true,
          onClose: vi.fn(),
          profile: DEFAULT_PROFILE,
          setProfile,
        }),
      );

      fireEvent.click(screen.getByTestId("household-chip-3"));
      expect(setProfile).toHaveBeenCalledWith({ householdSize: 3 });

      fireEvent.click(screen.getByTestId("household-chip-4"));
      expect(setProfile).toHaveBeenCalledWith({ householdSize: 4 });

      expect(setProfile).toHaveBeenCalledTimes(2);
    });

    it("AC-3[P0]: 가구원수 선택 직후 onChange가 병합된 최신 UserProfile로 호출된다", () => {
      const onChange = vi.fn();
      renderWithRouter(
        React.createElement(ProfileSheet, {
          open: true,
          onClose: vi.fn(),
          profile: DEFAULT_PROFILE,
          setProfile: vi.fn(),
          onChange,
        }),
      );

      fireEvent.click(screen.getByTestId("household-chip-3"));

      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledWith({ regionCode: "11", householdSize: 3 });
    });

    it("AC-3[P0]: 지역 선택 직후 onChange가 병합된 최신 UserProfile로 호출된다", () => {
      const onChange = vi.fn();
      renderWithRouter(
        React.createElement(ProfileSheet, {
          open: true,
          onClose: vi.fn(),
          profile: DEFAULT_PROFILE,
          setProfile: vi.fn(),
          onChange,
        }),
      );

      fireEvent.click(screen.getByTestId("region-item-48"));

      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange).toHaveBeenCalledWith({ regionCode: "48", householdSize: 2 });
    });

    it("AC-4[P0]: Chip/ListRow 선택 시 tickWeak 햅틱이 호출되고 모든 선택 항목의 터치 영역이 44px 이상이다", () => {
      renderWithRouter(
        React.createElement(ProfileSheet, {
          open: true,
          onClose: vi.fn(),
          profile: DEFAULT_PROFILE,
          setProfile: vi.fn(),
        }),
      );

      const regionRow = screen.getByTestId("region-item-11");
      expect(Number.parseInt(regionRow.style.minHeight, 10)).toBeGreaterThanOrEqual(44);

      const householdWrap = screen.getByTestId("household-chip-wrap-1");
      expect(Number.parseInt(householdWrap.style.minHeight, 10)).toBeGreaterThanOrEqual(44);

      fireEvent.click(screen.getByTestId("household-chip-1"));
      expect(generateHapticFeedback).toHaveBeenCalledWith({ type: "tickWeak" });

      fireEvent.click(screen.getByTestId("region-item-27"));
      expect(generateHapticFeedback).toHaveBeenCalledTimes(2);
    });
  });
});
