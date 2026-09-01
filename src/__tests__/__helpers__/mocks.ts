/**
 * Shared test mock for TDS (@toss/tds-mobile) ONLY.
 *
 * Usage at the top of any test file:
 *   import { mockTds } from "@/__tests__/__helpers__/mocks";
 *   mockTds();
 *
 * Need the SDK / TossRewardAd / router mocked too? Use mockAll() from
 * "@/__tests__/__helpers__/mockAll" instead — that file, and NOT this one,
 * owns those vi.mock calls. Keep it that way: vi.mock is hoisted to the top
 * of whichever file it's textually written in, regardless of which function
 * wraps it — so merely importing a file that contains those calls
 * unconditionally registers them, even if you never call the function. A test
 * that wants only `mockTds()` (e.g. to supply its own controllable
 * "@apps-in-toss/web-framework" mock, or use the real TossRewardAd) must be
 * able to import this file without also getting those other mocks forced on
 * it (see packet 0012 — this is exactly the bug that broke it).
 */

import React from "react";
import { vi } from "vitest";

// ── TDS (@toss/tds-mobile) ──
// TDS components use CSS-in-JS + layout hooks that crash in jsdom.
// Replace with lightweight DOM stand-ins that preserve prop-based testing.
export function mockTds() {
  vi.mock("@toss/tds-mobile", () => ({
    Button: ({ children, onClick, ...props }: any) =>
      React.createElement("button", { onClick, ...props }, children),

    // SubmitFooter(BottomCTA.tsx)의 기반 — 스텁이 없으면 SubmitFooter를 렌더하는 테스트가
    // undefined 엘리먼트로 죽는다(적대 리뷰 2026-08-30 실측). loading은 disabled로 표현해
    // "제출 중 비활성" 단언이 가능하게 한다.
    FixedBottomCTA: ({ children, onClick, disabled, loading, ...props }: any) =>
      React.createElement("button", { onClick, disabled: disabled || loading || undefined, "data-loading": loading ? "true" : undefined, ...props }, children),

    ListRow: Object.assign(
      ({ children, onClick, left, contents, right, ...props }: any) =>
        React.createElement(
          "div",
          { onClick, role: "listitem", ...props },
          left,
          contents,
          right,
          children,
        ),
      {
        Text: ({ children }: any) => React.createElement("span", null, children),
        Texts: ({ top, bottom, type }: any) =>
          React.createElement(
            React.Fragment,
            null,
            React.createElement("span", { "data-type": type, "data-slot": "top" }, top),
            React.createElement("span", { "data-slot": "bottom" }, bottom),
          ),
      },
    ),

    Spacing: ({ size }: any) => React.createElement("div", { "data-spacing": size }),

    Paragraph: {
      Text: ({ children, typography, ...props }: any) =>
        React.createElement("span", { "data-typography": typography, ...props }, children),
    },

    Badge: ({ children }: any) => React.createElement("span", { role: "status" }, children),

    AlertDialog: Object.assign(
      ({ open, title, description, alertButton, onClose }: any) =>
        open
          ? React.createElement(
              "div",
              { role: "alertdialog", "aria-label": title },
              React.createElement("h2", null, title),
              React.createElement("p", null, description),
              alertButton,
              React.createElement("button", { onClick: onClose, "aria-label": "닫기" }, "닫기"),
            )
          : null,
      {
        AlertButton: ({ children, onClick }: any) =>
          React.createElement("button", { onClick }, children),
      },
    ),

    Toast: ({ open, text, position }: any) =>
      open
        ? React.createElement("div", { role: "status", "data-position": position }, text)
        : null,

    Tab: Object.assign(
      ({ children }: any) => React.createElement("div", { role: "tablist" }, children),
      {
        Item: ({ children, selected, onClick }: any) =>
          React.createElement(
            "button",
            { role: "tab", "aria-selected": selected, onClick },
            children,
          ),
      },
    ),

    // NOTE: TDS has NO "TabBar" export (hallucinated API). 하단 탭은 로컬
    // src/components/FloatingTabBar 를 쓰며, 그 컴포넌트는 TDS를 import하지 않아
    // 여기서 목킹할 필요가 없다(react-router/SDK 목만 있으면 jsdom에서 그대로 렌더).

    Asset: {
      Icon: ({ name, alt }: any) =>
        React.createElement("span", { "data-asset": name, role: "img", "aria-label": alt ?? name }),
      Image: ({ src, alt }: any) => React.createElement("img", { src, alt }),
      ContentIcon: ({ name, alt }: any) =>
        React.createElement("span", { "data-content-icon": name, role: "img", "aria-label": alt ?? name }),
      ContentImage: ({ src, alt }: any) => React.createElement("img", { src, alt }),
      Lottie: () => React.createElement("span", { "data-asset": "lottie" }),
      Text: ({ children }: any) => React.createElement("span", null, children),
      Video: () => React.createElement("span", { "data-asset": "video" }),
    },

    Skeleton: () => React.createElement("div", { "data-skeleton": "true", role: "presentation" }),

    Loader: () => React.createElement("div", { role: "progressbar" }),

    IconButton: ({ "aria-label": ariaLabel, name, onClick }: any) =>
      React.createElement("button", { "aria-label": ariaLabel, "data-icon": name, onClick }),

    TextButton: ({ children, onClick }: any) =>
      React.createElement("button", { onClick }, children),

    TextField: React.forwardRef(
      ({ label, help, hasError, variant, ...props }: any, ref: any) =>
        React.createElement(
          "div",
          null,
          React.createElement("label", null, label),
          React.createElement("input", { ref, "data-variant": variant, ...props }),
          hasError && help && React.createElement("span", { role: "alert" }, help),
        ),
    ),

    Top: Object.assign(
      ({ children, title }: any) =>
        React.createElement(
          "nav",
          { role: "navigation" },
          title && React.createElement("h1", null, title),
          children,
        ),
      {
        TitleParagraph: ({ children }: any) => React.createElement("h1", null, children),
      },
    ),

    Border: () => React.createElement("hr"),

    BottomCTA: ({ children }: any) =>
      React.createElement("div", { "data-slot": "bottom-cta" }, children),

    BottomSheet: Object.assign(
      ({ children, open }: any) =>
        open ? React.createElement("div", { role: "dialog" }, children) : null,
      { Header: ({ children }: any) => React.createElement("div", null, children) },
    ),

    Chip: ({ children, selected, onClick }: any) =>
      React.createElement(
        "button",
        { role: "button", "aria-pressed": selected, onClick },
        children,
      ),

    Switch: ({ checked, onChange }: any) =>
      React.createElement("input", { type: "checkbox", checked, onChange, role: "switch" }),
  }));
}
