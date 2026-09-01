import { Paragraph, Spacing, Chip } from "@toss/tds-mobile";
import { Card } from "@/components/Card";
import type { MeterRecord } from "@/types/domain";

function parseYearMonth(yearMonth: string): { year: number; month: string } {
  const [year, month] = yearMonth.split("-");
  return { year: Number(year), month };
}

/**
 * 최신 기록 vs 전년 동월 증감 Chip. 전년 기록이 없으면 안내 문구로 대체.
 *
 * Pre-built 아님 — records prop만 사용, localStorage 직접 접근 금지.
 */
export function YoyCompareCard({ records }: { records: MeterRecord[] }) {
  const sorted = [...records].sort((a, b) => a.yearMonth.localeCompare(b.yearMonth));
  const latest = sorted[sorted.length - 1];

  let previous: MeterRecord | undefined;
  if (latest) {
    const { year, month } = parseYearMonth(latest.yearMonth);
    const previousYearMonth = `${year - 1}-${month}`;
    previous = records.find((r) => r.yearMonth === previousYearMonth);
  }

  const diffKWh = latest && previous ? latest.kWh - previous.kWh : null;

  return (
    <Card>
      <Paragraph.Text typography="t4">작년 같은 달과 비교</Paragraph.Text>
      <Spacing size={12} />
      {diffKWh !== null ? (
        <div data-testid="yoy-chip" data-tone={diffKWh > 0 ? "warning" : "success"}>
          <Chip variant="fill">
            {`작년 같은 달보다 ${Math.abs(diffKWh)}kWh ${diffKWh > 0 ? "늘었어요" : "줄었어요"}`}
          </Chip>
        </div>
      ) : (
        <Paragraph.Text typography="st12">작년 기록이 쌓이면 비교해드릴게요</Paragraph.Text>
      )}
    </Card>
  );
}
