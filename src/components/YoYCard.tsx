import { Paragraph, Spacing, Badge } from "@toss/tds-mobile";
import { Card } from "./Card";
import { Sparkline } from "./Sparkline";
import { diffPercent } from "@/domain/compare";
import type { UsageRecord } from "@/lib/types";

function monthLabel(yearMonth: string): string {
  const month = Number(yearMonth.split("-")[1]);
  return `${month}월`;
}

/**
 * 전년 동월 비교 카드 — 결과/히스토리 화면 삽입용.
 *
 * 작년 동월 레코드가 없으면 안내 문구만 렌더(축소). 있으면 사용량 차이 문구 +
 * 증감률 Badge, 최근 12개월 추이는 Sparkline(2건 미만이면 자동으로 숨음).
 */
export function YoYCard({
  currentYearMonth,
  currentKWh,
  yoyRecord,
  records,
  testId,
}: {
  currentYearMonth: string;
  currentKWh: number;
  yoyRecord: UsageRecord | null;
  records: UsageRecord[];
  testId?: string;
}) {
  const month = monthLabel(currentYearMonth);

  const trend = records
    .slice()
    .sort((a, b) => a.yearMonth.localeCompare(b.yearMonth))
    .slice(-12)
    .map((r) => r.kWh);

  if (!yoyRecord) {
    return (
      <Card testId={testId}>
        <Paragraph.Text typography="t4">작년 {month}과 비교</Paragraph.Text>
        <Spacing size={8} />
        <Paragraph.Text typography="st11">
          작년 {month} 기록이 없어요. 이번 달부터 쌓아볼까요?
        </Paragraph.Text>
      </Card>
    );
  }

  const kWhDelta = currentKWh - yoyRecord.kWh;
  const increased = kWhDelta >= 0;
  const message = increased
    ? `작년보다 ${kWhDelta}kWh 더 썼어요`
    : `작년보다 ${Math.abs(kWhDelta)}kWh 덜 썼어요`;
  const percent = Math.round(diffPercent(yoyRecord.kWh, currentKWh));
  const badgeLabel = `${percent > 0 ? "+" : ""}${percent}%`;

  return (
    <Card testId={testId}>
      <Paragraph.Text typography="t4">작년 {month}과 비교</Paragraph.Text>
      <Spacing size={8} />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <div>
          <Paragraph.Text typography="st11">{message}</Paragraph.Text>
          <Paragraph.Text typography="st13">전년 동월 대비 {badgeLabel}</Paragraph.Text>
        </div>
        <Badge size="medium" variant="fill" color={increased ? "red" : "blue"}>
          {badgeLabel}
        </Badge>
      </div>
      {trend.length >= 2 ? (
        <>
          <Spacing size={12} />
          <Sparkline data={trend} />
        </>
      ) : null}
    </Card>
  );
}
