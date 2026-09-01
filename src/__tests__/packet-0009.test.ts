import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";
import React from "react";
import { render, screen } from "@testing-library/react";
import { mockAll } from "@/__tests__/__helpers__/mockAll";
import { Amount } from "@/components/Amount";
import { MiniBar } from "@/components/MiniBar";
import { Sparkline } from "@/components/Sparkline";
import { SummaryHero } from "@/components/SummaryHero";

mockAll();

describe("SummaryHero · Amount · MiniBar · Sparkline 컴포넌트", () => {
  it("AC-1[P0]: Amount는 value=86500, unit='원'을 '86,500원'으로 렌더한다", () => {
    render(React.createElement(Amount, { value: 86500, unit: "원", testId: "amt" }));
    const el = screen.getByTestId("amt");
    expect(el.textContent).toBe("86,500원");
  });

  it("AC-1: Amount는 value=0을 '0원'으로 렌더한다 (falsy 값 누락 방지)", () => {
    render(React.createElement(Amount, { value: 0, testId: "amt-zero" }));
    expect(screen.getByTestId("amt-zero").textContent).toBe("0원");
  });

  it("AC-2[P0]: MiniBar는 ratio=0.67일 때 채움 요소 width가 '67%'다", () => {
    render(React.createElement(MiniBar, { ratio: 0.67, testId: "bar" }));
    const bar = screen.getByTestId("bar");
    const fill = bar.firstElementChild as HTMLElement;
    expect(fill.style.width).toBe("67%");
    expect(bar.getAttribute("aria-valuenow")).toBe("67");
  });

  it("AC-2[P0]: MiniBar는 범위 밖 ratio를 0~100%로 클램프한다 (음수/1초과)", () => {
    render(React.createElement(MiniBar, { ratio: -1, testId: "bar-neg" }));
    const fillNeg = screen.getByTestId("bar-neg").firstElementChild as HTMLElement;
    expect(fillNeg.style.width).toBe("0%");

    render(React.createElement(MiniBar, { ratio: 2.5, testId: "bar-over" }));
    const fillOver = screen.getByTestId("bar-over").firstElementChild as HTMLElement;
    expect(fillOver.style.width).toBe("100%");
  });

  it("AC-3[P0]: Sparkline은 2개 이상 데이터에서 svg를 렌더한다", () => {
    render(React.createElement(Sparkline, { data: [1, 2, 3], testId: "spark" }));
    const svg = screen.getByTestId("spark");
    expect(svg.tagName.toLowerCase()).toBe("svg");
    expect(svg.querySelectorAll("path").length).toBeGreaterThanOrEqual(1);
  });

  it("AC-3[P0]: Sparkline은 빈 배열이면 null을 반환해 크래시하지 않는다", () => {
    const { container } = render(React.createElement(Sparkline, { data: [], testId: "spark-empty" }));
    expect(container.querySelector('[data-testid="spark-empty"]')).toBeNull();
    expect(container.innerHTML).toBe("");
  });

  it("AC-4: 컴포넌트 4종 소스에 #RRGGBB 하드코딩 리터럴이 0건이다", () => {
    const files = [
      "src/components/Amount.tsx",
      "src/components/MiniBar.tsx",
      "src/components/Sparkline.tsx",
      "src/components/SummaryHero.tsx",
    ];
    const hexPattern = /#[0-9A-Fa-f]{3,8}\b/;
    for (const f of files) {
      const src = readFileSync(f, "utf-8");
      expect(hexPattern.test(src), `${f} contains hardcoded hex color`).toBe(false);
    }
  });

  it("AC-5[P0]: SummaryHero는 label/value/caption을 모두 렌더한다", () => {
    render(
      React.createElement(SummaryHero, {
        label: "이번 달 예상 요금",
        value: React.createElement(Amount, { value: 86500, typography: "t1" }),
        caption: "지난달 대비 12% 절감",
        testId: "hero",
      }),
    );
    const hero = screen.getByTestId("hero");
    expect(hero.textContent).toContain("이번 달 예상 요금");
    expect(hero.textContent).toContain("86,500원");
    expect(hero.textContent).toContain("지난달 대비 12% 절감");
  });

  it("AC-5: SummaryHero 소스는 TDS 컴포넌트에 인라인 padding/margin 오버라이드가 없다", () => {
    const src = readFileSync("src/components/SummaryHero.tsx", "utf-8");
    expect(/style=\{\{[^}]*(padding|margin)/i.test(src)).toBe(false);
  });
});
