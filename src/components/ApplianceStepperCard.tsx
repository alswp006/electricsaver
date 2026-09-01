import { useState } from "react";
import { flushSync } from "react-dom";
import { Button, ListRow, Paragraph, Spacing } from "@toss/tds-mobile";
import { generateHapticFeedback } from "@apps-in-toss/web-framework";
import { Card } from "./Card";
import { APPLIANCES } from "@/domain/appliances";
import type { ApplianceCut } from "@/lib/types";

const MIN_HOURS = 0;
const MAX_HOURS = 12;
const STEP = 0.5;

function tickHaptic() {
  try {
    generateHapticFeedback({ type: "tickWeak" });
  } catch {
    // 토스 WebView 밖(브라우저 미리보기 등)에서는 throw — 무시하고 진행
  }
}

/**
 * 가전 8행 스텝퍼 카드 — 시뮬레이션 화면 삽입용.
 *
 * cuts에 없는 가전은 감축 0h로 취급. -/+는 0.5h 단위로 0~12h 범위 내에서만 동작하고,
 * 범위를 벗어나는 클릭은 onChange를 호출하지 않는다(버튼도 disabled).
 */
export function ApplianceStepperCard({
  cuts,
  onChange,
  testId,
}: {
  cuts: ApplianceCut[];
  onChange: (applianceId: string, hours: number) => void;
  testId?: string;
}) {
  // 로컬 상태로 즉시 반영(클릭 즉시 숫자가 바뀌어야 함) + onChange로 상위에도 통지.
  const [overrides, setOverrides] = useState<Record<string, number>>(() => {
    const map: Record<string, number> = {};
    for (const cut of cuts) map[cut.applianceId] = cut.cutHoursPerDay;
    return map;
  });

  const hoursOf = (applianceId: string) =>
    overrides[applianceId] ??
    cuts.find((c) => c.applianceId === applianceId)?.cutHoursPerDay ??
    0;

  const step = (applianceId: string, delta: number) => {
    const next = hoursOf(applianceId) + delta;
    if (next < MIN_HOURS || next > MAX_HOURS) return;
    // flushSync: 테스트가 네이티브 DOM .click()으로 즉시 반영된 숫자를 검증한다 —
    // React 18 자동 배칭으로는 그 시점까지 재렌더가 안 끝나 있을 수 있어 동기 플러시 필요.
    flushSync(() => setOverrides((prev) => ({ ...prev, [applianceId]: next })));
    onChange(applianceId, next);
    tickHaptic();
  };

  return (
    <Card testId={testId}>
      <Paragraph.Text typography="st13">일반적인 제품 기준 추정치예요</Paragraph.Text>
      <Spacing size={12} />
      {APPLIANCES.map((appliance) => {
        const hours = hoursOf(appliance.id);
        return (
          <ListRow
            key={appliance.id}
            contents={
              <ListRow.Texts
                type="2RowTypeA"
                top={`${appliance.name} · ${appliance.watt}W`}
                bottom={`하루 ${appliance.defaultHours}시간 사용 가정`}
              />
            }
            right={
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <Button
                  aria-label={`${appliance.name} 사용시간 줄이기`}
                  variant="weak"
                  size="small"
                  disabled={hours <= MIN_HOURS}
                  style={{ minWidth: 44, minHeight: 44 }}
                  onClick={() => step(appliance.id, -STEP)}
                >
                  −
                </Button>
                <Paragraph.Text
                  typography="st11"
                  style={{ minWidth: 36, textAlign: "center" }}
                >
                  {`${hours}h`}
                </Paragraph.Text>
                <Button
                  aria-label={`${appliance.name} 사용시간 늘리기`}
                  variant="weak"
                  size="small"
                  disabled={hours >= MAX_HOURS}
                  style={{ minWidth: 44, minHeight: 44 }}
                  onClick={() => step(appliance.id, STEP)}
                >
                  +
                </Button>
              </div>
            }
          />
        );
      })}
    </Card>
  );
}
