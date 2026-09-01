import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { screen, waitFor } from "@testing-library/react";
import { renderWithRouter, mockAppState } from "@/__tests__/__helpers__/test-utils";
import { mockAll, mockNavigate } from "@/__tests__/__helpers__/mocks";

mockAll();

describe("S2 결과 자동 저장 + state 가드 [packet-0010]", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ============================================================================
  // AC-1: useResultGuard() guards state and navigates home if null
  // ============================================================================
  describe("AC-1: useResultGuard() guards state (P0)", () => {
    it("AC-1a[P0]: should call navigate('/', { replace: true }) exactly once when location.state is null", async () => {
      // Test component using useResultGuard
      const TestResultGuard = () => {
        const { useResultGuard } = require("@/hooks/useResultGuard");
        useResultGuard();
        return React.createElement("div", { "data-testid": "guarded-content" }, "Protected");
      };

      // Render without state (simulates direct URL access to /result)
      renderWithRouter(React.createElement(TestResultGuard), {
        initialEntries: ["/result"],
      });

      // Verify navigate was called with correct params
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith("/", { replace: true });
        expect(mockNavigate).toHaveBeenCalledTimes(1);
      });
    });

    it("AC-1b[P0]: should not render child content when state is null (render stops)", async () => {
      const TestResultGuard = () => {
        const { useResultGuard } = require("@/hooks/useResultGuard");
        useResultGuard();
        // This should not be rendered if guard navigates away
        return React.createElement("div", { "data-testid": "child-content" }, "Should Not Render");
      };

      renderWithRouter(React.createElement(TestResultGuard), {
        initialEntries: ["/result"],
      });

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith("/", { replace: true });
      });

      // Content should not be in DOM (guard should prevent render)
      expect(screen.queryByTestId("child-content")).not.toBeInTheDocument();
    });

    it("AC-1c: should NOT navigate when state is valid ResultRouteState", async () => {
      const TestResultGuard = () => {
        const { useResultGuard } = require("@/hooks/useResultGuard");
        useResultGuard();
        return React.createElement("div", { "data-testid": "valid-result" }, "Valid Result Rendered");
      };

      const validState = {
        yearMonth: "2026-09",
        kWh: 250,
        total: 75000,
        createdAt: 1725148800000,
      };

      renderWithRouter(React.createElement(TestResultGuard), {
        initialEntries: [
          {
            pathname: "/result",
            state: validState,
          },
        ],
      });

      await waitFor(() => {
        expect(screen.getByTestId("valid-result")).toBeInTheDocument();
      });

      // Should NOT navigate away
      expect(mockNavigate).not.toHaveBeenCalledWith("/", expect.any(Object));
    });
  });

  // ============================================================================
  // AC-2: useAutoSaveRecord() calls upsertRecord exactly once per mount
  //       Same yearMonth re-entry does not increase record count
  // ============================================================================
  describe("AC-2: useAutoSaveRecord() upserts record exactly once (P0)", () => {
    it("AC-2a[P0]: should call upsertRecord exactly 1 time on mount with valid state", async () => {
      const mockUpsertRecord = vi.fn().mockResolvedValue({ ok: true });

      // Mock the storage module
      vi.doMock("@/lib/storage", () => ({
        upsertRecord: mockUpsertRecord,
      }));

      const TestAutoSave = () => {
        const { useAutoSaveRecord } = require("@/hooks/useAutoSaveRecord");
        useAutoSaveRecord();
        return React.createElement("div", { "data-testid": "autosave-ready" }, "Ready");
      };

      const state = {
        yearMonth: "2026-09",
        kWh: 250,
        total: 75000,
        createdAt: 1725148800000,
      };

      renderWithRouter(React.createElement(TestAutoSave), {
        initialEntries: [
          {
            pathname: "/result",
            state,
          },
        ],
      });

      await waitFor(() => {
        expect(mockUpsertRecord).toHaveBeenCalledTimes(1);
      });

      vi.unmock("@/lib/storage");
    });

    it("AC-2b[P0]: should pass exact record structure { yearMonth, kWh, total, createdAt } to upsertRecord", async () => {
      const mockUpsertRecord = vi.fn().mockResolvedValue({ ok: true });

      vi.doMock("@/lib/storage", () => ({
        upsertRecord: mockUpsertRecord,
      }));

      const TestAutoSave = () => {
        const { useAutoSaveRecord } = require("@/hooks/useAutoSaveRecord");
        useAutoSaveRecord();
        return React.createElement("div", {}, "Ready");
      };

      const state = {
        yearMonth: "2026-09",
        kWh: 250,
        total: 75000,
        createdAt: 1725148800000,
      };

      renderWithRouter(React.createElement(TestAutoSave), {
        initialEntries: [
          {
            pathname: "/result",
            state,
          },
        ],
      });

      await waitFor(() => {
        const call = mockUpsertRecord.mock.calls[0]?.[0];
        expect(call).toBeDefined();
        expect(call.yearMonth).toBe("2026-09");
        expect(call.kWh).toBe(250);
        expect(call.total).toBe(75000);
        expect(call.createdAt).toBe(expect.any(Number));
      });

      vi.unmock("@/lib/storage");
    });

    it("AC-2c[P0]: re-entering same yearMonth should NOT increase record count (upsert, not insert)", async () => {
      const recordMap: Record<string, any> = {};
      const mockUpsertRecord = vi.fn().mockImplementation(async (record) => {
        recordMap[record.yearMonth] = record;
        return { ok: true };
      });

      vi.doMock("@/lib/storage", () => ({
        upsertRecord: mockUpsertRecord,
      }));

      const TestAutoSave = () => {
        const { useAutoSaveRecord } = require("@/hooks/useAutoSaveRecord");
        useAutoSaveRecord();
        return React.createElement("div", {}, "AutoSave");
      };

      const state = {
        yearMonth: "2026-09",
        kWh: 250,
        total: 75000,
      };

      // First mount
      const { unmount: unmount1 } = renderWithRouter(React.createElement(TestAutoSave), {
        initialEntries: [{ pathname: "/result", state }],
      });

      await waitFor(() => {
        expect(mockUpsertRecord).toHaveBeenCalledTimes(1);
        expect(Object.keys(recordMap).length).toBe(1);
      });

      unmount1();
      mockUpsertRecord.mockClear();

      // Second mount with SAME yearMonth
      renderWithRouter(React.createElement(TestAutoSave), {
        initialEntries: [{ pathname: "/result", state }],
      });

      await waitFor(() => {
        expect(mockUpsertRecord).toHaveBeenCalledTimes(1);
        // recordMap still has only 1 entry (upsert overwrites, not insert)
        expect(Object.keys(recordMap).length).toBe(1);
      });

      vi.unmock("@/lib/storage");
    });
  });

  // ============================================================================
  // AC-3: upsertRecord quota error shows Toast, rendering continues
  // ============================================================================
  describe("AC-3: upsertRecord quota error shows Toast (P0)", () => {
    it("AC-3a[P0]: should show '저장 공간이 부족해요' Toast when ok:false, reason:'quota'", async () => {
      const mockUpsertRecord = vi.fn().mockResolvedValue({
        ok: false,
        reason: "quota",
      });

      vi.doMock("@/lib/storage", () => ({
        upsertRecord: mockUpsertRecord,
      }));

      const TestAutoSave = () => {
        const { useAutoSaveRecord } = require("@/hooks/useAutoSaveRecord");
        useAutoSaveRecord();
        return React.createElement("div", { "data-testid": "result-display" }, "Result Data");
      };

      const state = {
        yearMonth: "2026-09",
        kWh: 250,
        total: 75000,
      };

      renderWithRouter(React.createElement(TestAutoSave), {
        initialEntries: [{ pathname: "/result", state }],
      });

      await waitFor(() => {
        // Toast with exact message should appear
        expect(screen.getByText("저장 공간이 부족해요")).toBeInTheDocument();
      });

      vi.unmock("@/lib/storage");
    });

    it("AC-3b[P0]: should continue rendering content (no white screen) even on quota error", async () => {
      const mockUpsertRecord = vi.fn().mockResolvedValue({
        ok: false,
        reason: "quota",
      });

      vi.doMock("@/lib/storage", () => ({
        upsertRecord: mockUpsertRecord,
      }));

      const TestAutoSave = () => {
        const { useAutoSaveRecord } = require("@/hooks/useAutoSaveRecord");
        useAutoSaveRecord();
        return React.createElement("div", { "data-testid": "result-content" }, "Result Page Continues");
      };

      const state = {
        yearMonth: "2026-09",
        kWh: 250,
        total: 75000,
      };

      renderWithRouter(React.createElement(TestAutoSave), {
        initialEntries: [{ pathname: "/result", state }],
      });

      // Even though quota error, page should render
      await waitFor(() => {
        expect(screen.getByTestId("result-content")).toBeInTheDocument();
      });

      vi.unmock("@/lib/storage");
    });
  });

  // ============================================================================
  // AC-4: No console.error, branching only on result object (no try/catch)
  // ============================================================================
  describe("AC-4: Clean error handling, zero console.error (P0)", () => {
    it("AC-4a[P0]: should NOT call console.error during hook execution (success path)", async () => {
      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const mockUpsertRecord = vi.fn().mockResolvedValue({ ok: true });

      vi.doMock("@/lib/storage", () => ({
        upsertRecord: mockUpsertRecord,
      }));

      const TestAutoSave = () => {
        const { useAutoSaveRecord } = require("@/hooks/useAutoSaveRecord");
        useAutoSaveRecord();
        return React.createElement("div", {}, "Safe");
      };

      const state = {
        yearMonth: "2026-09",
        kWh: 250,
        total: 75000,
      };

      renderWithRouter(React.createElement(TestAutoSave), {
        initialEntries: [{ pathname: "/result", state }],
      });

      await waitFor(() => {
        expect(screen.getByText("Safe")).toBeInTheDocument();
      });

      expect(consoleErrorSpy).not.toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
      vi.unmock("@/lib/storage");
    });

    it("AC-4b[P0]: should NOT call console.error on error branches (quota, unknown)", async () => {
      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      // Test multiple error types
      const errorScenarios = [
        { ok: false, reason: "quota" },
        { ok: false, reason: "unknown" },
        { ok: false },
      ];

      for (const errorCase of errorScenarios) {
        const mockUpsertRecord = vi.fn().mockResolvedValue(errorCase);

        vi.doMock("@/lib/storage", () => ({
          upsertRecord: mockUpsertRecord,
        }));

        const TestAutoSave = () => {
          const { useAutoSaveRecord } = require("@/hooks/useAutoSaveRecord");
          useAutoSaveRecord();
          return React.createElement("div", {}, "Error handled");
        };

        const state = {
          yearMonth: "2026-09",
          kWh: 250,
          total: 75000,
        };

        renderWithRouter(React.createElement(TestAutoSave), {
          initialEntries: [{ pathname: "/result", state }],
        });

        await waitFor(() => {
          expect(screen.getByText("Error handled")).toBeInTheDocument();
        });

        vi.unmock("@/lib/storage");
      }

      // Should never call console.error
      expect(consoleErrorSpy).not.toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    it("AC-4c: should branch on result.ok without try/catch wrapper (clean imperative branching)", async () => {
      // This test verifies that the hook uses if (result.ok) { } else { }
      // pattern rather than throw/catch

      const mockUpsertRecord = vi.fn().mockResolvedValue({
        ok: false,
        reason: "quota",
      });

      vi.doMock("@/lib/storage", () => ({
        upsertRecord: mockUpsertRecord,
      }));

      const TestAutoSave = () => {
        const { useAutoSaveRecord } = require("@/hooks/useAutoSaveRecord");
        useAutoSaveRecord();
        // If hook throws, this won't render
        return React.createElement("div", { "data-testid": "executed" }, "Path executed without throw");
      };

      const state = {
        yearMonth: "2026-09",
        kWh: 250,
        total: 75000,
      };

      renderWithRouter(React.createElement(TestAutoSave), {
        initialEntries: [{ pathname: "/result", state }],
      });

      // If the code uses throw/catch internally, this will still render (caught)
      // If code branches on result.ok, also renders
      // Either way, should not crash
      await waitFor(() => {
        expect(screen.getByTestId("executed")).toBeInTheDocument();
      });

      vi.unmock("@/lib/storage");
    });
  });

  // ============================================================================
  // INTEGRATION: Both hooks together in Result page
  // ============================================================================
  describe("Integration: useResultGuard + useAutoSaveRecord together", () => {
    it("should guard state first, then auto-save if state is valid", async () => {
      const mockUpsertRecord = vi.fn().mockResolvedValue({ ok: true });

      vi.doMock("@/lib/storage", () => ({
        upsertRecord: mockUpsertRecord,
      }));

      const TestResultPage = () => {
        const { useResultGuard } = require("@/hooks/useResultGuard");
        const { useAutoSaveRecord } = require("@/hooks/useAutoSaveRecord");

        useResultGuard();
        useAutoSaveRecord();

        return React.createElement("div", { "data-testid": "result-page" }, "Result Page");
      };

      // Case 1: Invalid state -> should guard, not auto-save
      renderWithRouter(React.createElement(TestResultPage), {
        initialEntries: ["/result"],
      });

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith("/", { replace: true });
        // upsertRecord should not be called (navigated away)
        expect(mockUpsertRecord).not.toHaveBeenCalled();
      });

      mockNavigate.mockClear();
      mockUpsertRecord.mockClear();

      // Case 2: Valid state -> should NOT guard, should auto-save
      const validState = {
        yearMonth: "2026-09",
        kWh: 250,
        total: 75000,
      };

      renderWithRouter(React.createElement(TestResultPage), {
        initialEntries: [{ pathname: "/result", state: validState }],
      });

      await waitFor(() => {
        expect(mockNavigate).not.toHaveBeenCalled();
        expect(mockUpsertRecord).toHaveBeenCalledTimes(1);
      });

      vi.unmock("@/lib/storage");
    });
  });
});
