import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { screen, fireEvent, waitFor } from "@testing-library/react";
import { mockAll, mockNavigate } from "@/__tests__/__helpers__/mocks";
import { renderWithRouter, seedLocalStorage } from "@/__tests__/__helpers__/test-utils";

mockAll();

import Region from "@/pages/Region";
import type { UserProfile } from "@/types/domain";
import type { MeterRecord } from "@/types/domain";

const PROFILE_SEOUL: UserProfile = { regionCode: "11", householdSize: 2 };

const RECORDS: MeterRecord[] = [
  { yearMonth: "2026-06", kWh: 300, total: 90000, createdAt: 1 },
  { yearMonth: "2026-08", kWh: 400, total: 130000, createdAt: 2 }, // 최신
];

// hero/compare 텍스트 포맷 검증용 — 정확한 평균 산출식은 구현 자유이므로 형식만 고정한다.
const HERO_TEXT_PATTERN = /우리 동네 평균보다\s*\d+(\.\d+)?%\s*(적게|많이)\s*써요/;

describe("S6 우리 동네 비교 — 지연 로더 + 히어로 (/region)", () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  it("AC-1[P0]: regionAverage.json 로드 전에는 region-hero 자리에 Skeleton이 표시되고 비교 문구는 아직 없다", () => {
    seedLocalStorage({ "es:profile": PROFILE_SEOUL, "es:records": RECORDS });

    renderWithRouter(React.createElement(Region));

    const hero = screen.getByTestId("region-hero");
    expect(hero.querySelector('[data-skeleton="true"]')).not.toBeNull();
    expect(screen.queryByText(HERO_TEXT_PATTERN)).not.toBeInTheDocument();
  });

  it("AC-1[P0]: 동적 import 로드가 끝나면 Skeleton이 사라지고 비교 문구로 교체된다", async () => {
    seedLocalStorage({ "es:profile": PROFILE_SEOUL, "es:records": RECORDS });

    renderWithRouter(React.createElement(Region));

    await waitFor(() => {
      expect(screen.getByTestId("region-hero").querySelector('[data-skeleton="true"]')).toBeNull();
    });
    expect(screen.getByTestId("region-hero").textContent).toMatch(HERO_TEXT_PATTERN);
  });

  it("AC-2[P0]: 최신 기록이 없으면 빈 상태만 렌더되고 비교 카드는 표시되지 않는다", async () => {
    seedLocalStorage({ "es:profile": PROFILE_SEOUL, "es:records": [] });

    renderWithRouter(React.createElement(Region));

    await waitFor(() => {
      expect(screen.getByText("먼저 사용량을 입력해주세요")).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: "계산하러 가기" })).toBeInTheDocument();
    expect(screen.queryByTestId("compare-card")).not.toBeInTheDocument();
    expect(screen.queryByTestId("region-hero")).not.toBeInTheDocument();
  });

  it("AC-2[P0]: 빈 상태의 '계산하러 가기' 버튼을 누르면 홈으로 이동한다", async () => {
    seedLocalStorage({ "es:profile": PROFILE_SEOUL, "es:records": [] });

    renderWithRouter(React.createElement(Region));

    const button = await screen.findByRole("button", { name: "계산하러 가기" });
    fireEvent.click(button);

    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith("/");
  });

  it("AC-3[P0]: 기록이 있으면 region-hero에 비교 문구가, compare-card에 최신 기록 기준 두 행이 표시된다", async () => {
    seedLocalStorage({ "es:profile": PROFILE_SEOUL, "es:records": RECORDS });

    renderWithRouter(React.createElement(Region));

    await waitFor(() => {
      expect(screen.getByTestId("region-hero").textContent).toMatch(HERO_TEXT_PATTERN);
    });

    const rows = screen.getAllByTestId("region-compare-row");
    expect(rows).toHaveLength(2);
    expect(rows[0].textContent).toContain("내 사용량");
    expect(rows[0].textContent).toContain("400kWh"); // 최신 기록(2026-08)의 kWh, 2026-06(300kWh) 아님
    expect(rows[1].textContent).toContain("지역 평균");
    expect(rows[1].textContent).toMatch(/\d+(\.\d+)?kWh/);
  });

  it("AC-4[P0]: 등록되지 않은 regionCode는 서울('11') 평균으로 폴백해 렌더되고 크래시하지 않는다", async () => {
    seedLocalStorage({
      "es:profile": { regionCode: "99", householdSize: 3 },
      "es:records": RECORDS,
    });

    expect(() => renderWithRouter(React.createElement(Region))).not.toThrow();

    await waitFor(() => {
      expect(screen.getByTestId("region-hero").textContent).toMatch(HERO_TEXT_PATTERN);
    });
    expect(screen.getAllByTestId("region-compare-row")).toHaveLength(2);
    expect(errorSpy).not.toHaveBeenCalled();
  });
});
