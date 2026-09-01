import { useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Top, ListRow, Paragraph, Spacing, Badge } from "@toss/tds-mobile";
import { ScreenScaffold } from "@/components/ScreenScaffold";
import { ReportGate } from "@/components/ReportGate";
import { SummaryHero } from "@/components/SummaryHero";
import { Amount } from "@/components/Amount";
import { Card } from "@/components/Card";
import { SubmitFooter } from "@/components/BottomCTA";
import { AdSlot } from "@/components/AdSlot";
import { simulate } from "@/domain/simulate";
import { APPLIANCES } from "@/domain/appliances";
import { TIPS } from "@/domain/tips";
import { getLatestRecord } from "@/lib/recordStore";
import { getLastSim } from "@/lib/simStore";
import { formatNumber } from "@/lib/utils";
import type { ApplianceCut, BillBreakdown, BillInput, RouteState } from "@/lib/types";

/** tiers 배열에서 실제 사용량(kWh>0)이 있는 가장 높은 누진 구간 번호를 구한다(calcBill.ts와 동일 로직) */
function currentTier(bill: BillBreakdown): number {
  const applied = [...bill.tiers].reverse().find((t) => t.kWh > 0);
  return applied ? applied.tier : 1;
}

export default function Report() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state as RouteState["/report"]) ?? null;

  const fallbackRecord = useMemo(() => (state ? null : getLatestRecord()), [state]);
  const recordId = state?.recordId ?? fallbackRecord?.id ?? null;
  const input: BillInput | null =
    state?.input ??
    (fallbackRecord
      ? { kWh: fallbackRecord.kWh, yearMonth: fallbackRecord.yearMonth, contractType: fallbackRecord.contractType }
      : null);
  const cuts: ApplianceCut[] =
    state?.cuts ??
    (recordId
      ? (() => {
          const lastSim = getLastSim();
          return lastSim && lastSim.baseRecordId === recordId ? lastSim.cuts : [];
        })()
      : []);

  useEffect(() => {
    if (!recordId || !input) {
      navigate("/", { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recordId, input]);

  const result = useMemo(() => (input ? simulate(input, cuts, 30) : null), [input, cuts]);

  if (!recordId || !input || !result) {
    return null;
  }

  const { savedWon, baseBill, afterBill } = result;
  const annualWon = savedWon * 12;
  const baseTier = currentTier(baseBill);
  const afterTier = currentTier(afterBill);
  const tierDropped = afterTier < baseTier;

  return (
    <ScreenScaffold top={<Top title={<Top.TitleParagraph>절약 리포트</Top.TitleParagraph>} />}>
      <ReportGate recordId={recordId}>
        <SummaryHero
          label="이만큼 아낄 수 있어요"
          value={<Amount value={savedWon} unit="원" typography="t1" />}
          caption={`월 ${formatNumber(savedWon)}원 · 1년이면 ${formatNumber(annualWon)}원`}
        />

        {tierDropped && (
          <>
            <Spacing size={8} />
            <Badge size="medium" variant="weak" color="blue">
              {`${baseTier}구간에서 ${afterTier}구간으로 내려가요`}
            </Badge>
          </>
        )}

        <Spacing size={24} />
        <Paragraph.Text typography="t4">맞춤 절약 팁</Paragraph.Text>
        <Spacing size={12} />
        {cuts.map((cut) => {
          const appliance = APPLIANCES.find((a) => a.id === cut.applianceId);
          const tips = TIPS[cut.applianceId];
          if (!appliance || !tips) return null;
          return (
            <div key={cut.applianceId}>
              <Card testId="tip-section">
                <Paragraph.Text typography="t5">{appliance.name}</Paragraph.Text>
                <Spacing size={8} />
                <ListRow contents={<ListRow.Texts type="2RowTypeA" top={tips[0]} bottom={tips[1]} />} />
              </Card>
              <Spacing size={12} />
            </div>
          );
        })}

        <Spacing size={4} />
        <AdSlot adGroupId={import.meta.env.VITE_TOSS_AD_GROUP_ID ?? ""} />
        <Spacing size={12} />
        <Paragraph.Text typography="st13">일반적인 제품 기준 추정치예요</Paragraph.Text>
        <Spacing size={80} />
        <SubmitFooter label="기록 보러 가기" onClick={() => navigate("/history")} />
      </ReportGate>
    </ScreenScaffold>
  );
}
