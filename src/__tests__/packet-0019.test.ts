import { describe, it, expect } from "vitest";
import React from "react";
import { screen, fireEvent, within } from "@testing-library/react";
import { renderWithRouter, seedLocalStorage } from "@/__tests__/__helpers__/test-utils";
import { mockAll } from "@/__tests__/__helpers__/mocks";

mockAll();

import Settings from "@/pages/Settings";
import { getStorageBytes } from "@/lib/storage";
import packageJson from "../../package.json";

const ALL_KEYS = ["es:records", "es:profile", "es:appliances", "es:report-unlocks", "es:flags"];

function seedAllKeys() {
  seedLocalStorage({
    "es:records": [{ yearMonth: "2024-01", kWh: 320, total: 58000, createdAt: 1 }],
    "es:profile": { regionCode: "26", householdSize: 3 },
    "es:appliances": [{ id: "a1", name: "냉장고", watt: 150, hoursPerDay: 24, reduceRatio: 0.1 }],
    "es:report-unlocks": [{ applianceId: "a1", unlockedAt: 1, expiresAt: 2 }],
    "es:flags": { schemaVersion: 1, disclaimerSeenAt: null },
  });
}

describe("S7 설정 화면 — 데이터 관리 · 저장 용량 · 고지 (/settings) [packet-0019]", () => {
  it("AC-1[P0]: '우리 집 정보' 행이 현재 지역명과 'N인 가구'를 bottom에 표시하고, 탭하면 프로필 시트가 열린다", () => {
    seedLocalStorage({ "es:profile": { regionCode: "26", householdSize: 3 } });
    renderWithRouter(React.createElement(Settings));

    const row = screen.getByTestId("settings-profile-row");
    expect(row.textContent).toContain("부산");
    expect(row.textContent).toContain("3인 가구");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    fireEvent.click(row);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByTestId("region-item-26")).toBeInTheDocument();
  });

  it("AC-1[P0]: 프로필이 없을 때(기본값) '서울'과 '2인 가구'가 표시된다", () => {
    renderWithRouter(React.createElement(Settings));

    const row = screen.getByTestId("settings-profile-row");
    expect(row.textContent).toContain("서울");
    expect(row.textContent).toContain("2인 가구");
  });

  it("AC-2[P0]: '저장 공간' 행이 getStorageBytes() 결과를 0 이상 정수 KB로 표시한다", () => {
    const bigRecords = Array.from({ length: 60 }, (_, i) => ({
      yearMonth: `2020-${String((i % 12) + 1).padStart(2, "0")}`,
      kWh: 300 + i,
      total: 50000 + i * 10,
      createdAt: i,
    }));
    seedLocalStorage({ "es:records": bigRecords });

    const expectedKB = Math.round(getStorageBytes() / 1024);
    expect(expectedKB).toBeGreaterThan(0);
    expect(Number.isInteger(expectedKB)).toBe(true);

    renderWithRouter(React.createElement(Settings));

    const storageRow = screen.getByTestId("settings-storage-row");
    expect(storageRow.textContent).toContain(`${expectedKB} KB`);
  });

  it("AC-3[P0]: '모든 데이터 삭제' 탭 시 AlertDialog(닫기/삭제)가 뜨고, '삭제' 확정 시 es:* 5개 키가 모두 제거되며 Toast가 노출되고 용량 표시가 즉시 0 KB로 갱신된다", () => {
    seedAllKeys();
    renderWithRouter(React.createElement(Settings));

    ALL_KEYS.forEach((key) => {
      expect(localStorage.getItem(key)).not.toBeNull();
    });
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId("settings-delete-row"));

    const dialog = screen.getByRole("alertdialog");
    expect(within(dialog).getByRole("button", { name: "닫기" })).toBeInTheDocument();
    const confirmButton = within(dialog).getByRole("button", { name: "삭제" });

    fireEvent.click(confirmButton);

    ALL_KEYS.forEach((key) => {
      expect(localStorage.getItem(key)).toBeNull();
    });
    expect(screen.getByText("데이터를 모두 지웠어요")).toBeInTheDocument();
    expect(screen.getByTestId("settings-storage-row").textContent).toContain("0 KB");
  });

  it("AC-3[P0]: '닫기'를 누르면 삭제되지 않고 데이터가 그대로 남는다", () => {
    seedAllKeys();
    renderWithRouter(React.createElement(Settings));

    fireEvent.click(screen.getByTestId("settings-delete-row"));
    const dialog = screen.getByRole("alertdialog");
    fireEvent.click(within(dialog).getByRole("button", { name: "닫기" }));

    ALL_KEYS.forEach((key) => {
      expect(localStorage.getItem(key)).not.toBeNull();
    });
    expect(screen.queryByText("데이터를 모두 지웠어요")).not.toBeInTheDocument();
  });

  it("AC-4[P0]: 하단에 '주택용 저압 기준 예상치예요' 고지와 앱 버전이 st12 tertiary로 표시된다", () => {
    renderWithRouter(React.createElement(Settings));

    const disclaimer = screen.getByTestId("settings-footer-disclaimer");
    expect(disclaimer.textContent).toContain("주택용 저압 기준 예상치예요");
    expect(disclaimer.getAttribute("data-typography")).toBe("st12");

    const version = screen.getByTestId("settings-footer-version");
    expect(version.textContent).toContain(packageJson.version);
    expect(version.getAttribute("data-typography")).toBe("st12");
  });

  it("AC-4[P0]: 외부 설치 유도 문구나 다운로드 링크가 DOM에 0건이다", () => {
    renderWithRouter(React.createElement(Settings));

    expect(document.querySelectorAll("a[href]").length).toBe(0);
    expect(screen.queryByText(/다운로드|앱스토어|App Store|Play\s*스토어|설치하기|지금 설치/)).not.toBeInTheDocument();
  });
});
