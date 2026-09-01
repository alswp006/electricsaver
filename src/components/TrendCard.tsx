import { Paragraph, Spacing } from "@toss/tds-mobile";
import { Card } from "@/components/Card";
import type { MeterRecord } from "@/types/domain";

const TREND_WINDOW_MONTHS = 12;

function monthsBetween(later: string, earlier: string): number {
  const [laterYear, laterMonth] = later.split("-").map(Number);
  const [earlierYear, earlierMonth] = earlier.split("-").map(Number);
  return (laterYear - earlierYear) * 12 + (laterMonth - earlierMonth);
}

/**
 * 최근 12개월(존재하는 기록만) 사용량 추이 막대. 최대값 막대가 100% 폭.
 *
 * Pre-built 아님 — records prop만 사용, localStorage 직접 접근 금지.
 */
export function TrendCard({ records }: { records: MeterRecord[] }) {
  const sorted = [...records].sort((a, b) => a.yearMonth.localeCompare(b.yearMonth));
  const latest = sorted[sorted.length - 1];

  const inRange = latest
    ? sorted.filter((r) => {
        const diff = monthsBetween(latest.yearMonth, r.yearMonth);
        return diff >= 0 && diff < TREND_WINDOW_MONTHS;
      })
    : [];

  const maxKWh = inRange.reduce((max, r) => Math.max(max, r.kWh), 0);

  return (
    <Card>
      <Paragraph.Text typography="t4">최근 12개월 추이</Paragraph.Text>
      <Spacing size={12} />
      {inRange.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {inRange.map((r) => {
            const widthPercent = maxKWh === 0 ? 0 : Math.round((r.kWh / maxKWh) * 1000) / 10;
            return (
              <div key={r.yearMonth} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Paragraph.Text typography="st12" style={{ color: "var(--adaptiveGrey500)", width: 36, flexShrink: 0 }}>
                  {r.yearMonth.slice(5)}월
                </Paragraph.Text>
                <div
                  data-testid="trend-bar"
                  data-yearmonth={r.yearMonth}
                  style={{
                    width: `${widthPercent}%`,
                    height: 12,
                    borderRadius: 6,
                    backgroundColor: "var(--adaptiveBlue500)",
                  }}
                />
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
