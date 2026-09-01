import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { mockTds } from "@/__tests__/__helpers__/mocks";
import { unlock, isUnlocked } from "@/lib/unlockStore";
import { STORAGE_KEYS } from "@/lib/types";

// TDS crashes in jsdom — mock with lightweight DOM stand-ins.
mockTds();

// ── @apps-in-toss/web-framework ──
// Controllable mock (NOT auto-firing): loadFullScreenAd/showFullScreenAd capture their
// onEvent/onError callbacks so each test can manually simulate load-success, load-failure,
// watch-complete, or watch-abandoned without depending on internal implementation timing.
const mocks = vi.hoisted(() => {
  const state: { loadOpts: any; showOpts: any } = { loadOpts: null, showOpts: null };
  return {
    state,
    loadFullScreenAd: vi.fn((opts: any) => {
      state.loadOpts = opts;
    }),
    showFullScreenAd: vi.fn((opts: any) => {
      state.showOpts = opts;
    }),
  };
});

vi.mock("@apps-in-toss/web-framework", () => ({
  loadFullScreenAd: mocks.loadFullScreenAd,
  showFullScreenAd: mocks.showFullScreenAd,
  generateHapticFeedback: vi.fn(),
}));

// eslint-disable-next-line import/first
import { ReportGate } from "@/components/ReportGate";

function renderGate(recordId: string) {
  return render(
    React.createElement(
      MemoryRouter,
      null,
      React.createElement(
        ReportGate,
        { recordId },
        React.createElement("div", { "data-testid": "gated-content" }, "리포트 본문"),
      ),
    ),
  );
}

// Regex tolerant of exact copy differences between spec sources — anchors on the
// concept (ad → report unlock) rather than one literal string.
const CTA_NAME = /광고.*(리포트|보고).*(열기|확인)/;

describe("ReportGate (리워드 광고 게이팅 상태머신)", () => {
  beforeEach(() => {
    mocks.state.loadOpts = null;
    mocks.state.showOpts = null;
  });

  it("AC-1[P0]: isUnlocked(recordId)===true면 잠금 UI 없이 children이 즉시 렌더된다", () => {
    const recordId = "rec_2026-08-unlocked";
    unlock(recordId);
    expect(isUnlocked(recordId)).toBe(true);

    renderGate(recordId);

    expect(screen.getByTestId("gated-content")).toBeInTheDocument();
    expect(screen.getByText("리포트 본문")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: CTA_NAME })).not.toBeInTheDocument();
  });

  it("AC-2[P0]: 잠금 상태에서 CTA 버튼과 안내 문구가 렌더되고 children은 DOM에 없다", () => {
    const recordId = "rec_2026-08-locked";
    expect(isUnlocked(recordId)).toBe(false);

    renderGate(recordId);

    expect(screen.getByRole("button", { name: CTA_NAME })).toBeInTheDocument();
    expect(screen.queryByTestId("gated-content")).not.toBeInTheDocument();
    // 안내 문구: 절감/리포트 관련 설명 텍스트가 버튼과 별개로 존재
    expect(screen.getByText(/절감액|리포트를 보려면|광고를 시청하면/)).toBeInTheDocument();
  });

  it("AC-3[P0]: 광고 시청 완료 콜백 실행 시 unlock(recordId)가 호출되고 children이 렌더된다", async () => {
    const recordId = "rec_2026-08-watch-complete";
    renderGate(recordId);

    await waitFor(() => expect(mocks.loadFullScreenAd).toHaveBeenCalled());
    mocks.state.loadOpts?.onEvent?.({ type: "loaded" });

    const cta = await screen.findByRole("button", { name: CTA_NAME });
    await waitFor(() => expect(cta).not.toBeDisabled());
    fireEvent.click(cta);

    await waitFor(() => expect(mocks.showFullScreenAd).toHaveBeenCalled());
    mocks.state.showOpts?.onEvent?.({ type: "rewarded" });

    await waitFor(() => expect(screen.getByTestId("gated-content")).toBeInTheDocument());
    expect(isUnlocked(recordId)).toBe(true);

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEYS.reportUnlock) ?? "{}");
    expect(typeof stored[recordId]).toBe("number");
  });

  it("AC-4[P1]: 광고 로드 실패 시 실패 문구와 다시 시도 버튼이 렌더되고 크래시하지 않는다", async () => {
    const recordId = "rec_2026-08-load-fail";

    expect(() => renderGate(recordId)).not.toThrow();
    await waitFor(() => expect(mocks.loadFullScreenAd).toHaveBeenCalled());

    expect(() => mocks.state.loadOpts?.onError?.({ type: "error" })).not.toThrow();

    const retryButton = await screen.findByRole("button", { name: "다시 시도" });
    expect(retryButton).toBeInTheDocument();
    expect(screen.getByText(/광고를 (불러오지 못했|불러올 수 없)/)).toBeInTheDocument();
    expect(screen.queryByTestId("gated-content")).not.toBeInTheDocument();
    expect(isUnlocked(recordId)).toBe(false);
  });

  it("AC-5[P1]: 중도 이탈(미완료 종료) 시 잠금 화면이 유지되고 unlock은 호출되지 않는다", async () => {
    const recordId = "rec_2026-08-abandoned";
    renderGate(recordId);

    await waitFor(() => expect(mocks.loadFullScreenAd).toHaveBeenCalled());
    mocks.state.loadOpts?.onEvent?.({ type: "loaded" });

    const cta = await screen.findByRole("button", { name: CTA_NAME });
    await waitFor(() => expect(cta).not.toBeDisabled());
    fireEvent.click(cta);

    await waitFor(() => expect(mocks.showFullScreenAd).toHaveBeenCalled());
    // 광고를 끝까지 보지 않고 닫음 — 보상 없는 종료
    mocks.state.showOpts?.onEvent?.({ type: "dismissed" });

    // 잠금 화면 유지: children 미렌더, CTA 버튼 유지
    await waitFor(() => {
      expect(screen.queryByTestId("gated-content")).not.toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: CTA_NAME })).toBeInTheDocument();
    expect(isUnlocked(recordId)).toBe(false);

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEYS.reportUnlock) ?? "{}");
    expect(stored[recordId]).toBeUndefined();
  });
});
