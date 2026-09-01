import { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Top, Paragraph, Spacing, Badge } from "@toss/tds-mobile";
import { generateHapticFeedback } from "@apps-in-toss/web-framework";
import { ScreenScaffold } from "@/components/ScreenScaffold";
import { SummaryHero } from "@/components/SummaryHero";
import { Amount } from "@/components/Amount";
import { ApplianceStepperCard } from "@/components/ApplianceStepperCard";
import { SubmitFooter } from "@/components/BottomCTA";
import { AdSlot } from "@/components/AdSlot";
import { simulate } from "@/domain/simulate";
import { getLatestRecord } from "@/lib/recordStore";
import { getLastSim, saveSim } from "@/lib/simStore";
import type { ApplianceCut, BillInput, RouteState } from "@/lib/types";

function fireHaptic() {
  try {
    Promise.resolve(generateHapticFeedback({ type: "success" })).catch(() => {});
  } catch {
    /* WebView 밖(브라우저/검수자 PC/jsdom)에서는 throw — 무시 */
  }
}

export default function Simulate() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state as RouteState["/simulate"]) ?? null;

  const fallbackRecord = useMemo(() => (state ? null : getLatestRecord()), [state]);
  const recordId = state?.recordId ?? fallbackRecord?.id ?? null;
  const input: BillInput | null =
    state?.input ??
    (fallbackRecord
      ? { kWh: fallbackRecord.kWh, yearMonth: fallbackRecord.yearMonth, contractType: fallbackRecord.contractType }
      : null);

  useEffect(() => {
    if (!recordId || !input) {
      navigate("/", { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recordId, input]);

  const [cuts, setCuts] = useState<ApplianceCut[]>(() => {
    const last = getLastSim();
    if (last && recordId && last.baseRecordId === recordId) return last.cuts;
    return [];
  });

  const handleChange = (applianceId: string, hours: number) => {
    setCuts((prev) => {
      const next =
        hours > 0
          ? [...prev.filter((c) => c.applianceId !== applianceId), { applianceId, cutHoursPerDay: hours }]
          : prev.filter((c) => c.applianceId !== applianceId);
      if (recordId) {
        saveSim({ baseRecordId: recordId, cuts: next, days: 30 });
      }
      return next;
    });
  };

  const result = useMemo(() => (input ? simulate(input, cuts, 30) : null), [input, cuts]);

  if (!recordId || !input || !result) {
    return null;
  }

  const { savedKWh, savedWon, afterKWh, clamped } = result;

  const caption =
    savedKWh === 0
      ? "줄일 가전을 골라주세요"
      : clamped
        ? "더 줄일 수 없어요"
        : `월 ${savedKWh}kWh 덜 써요`;

  const handleSubmit = () => {
    fireHaptic();
    navigate("/report", {
      state: { recordId, input, cuts, savedWon } satisfies RouteState["/report"],
    });
  };

  return (
    <ScreenScaffold
      top={<Top title={<Top.TitleParagraph>절약 시뮬레이션</Top.TitleParagraph>} />}
      bottom={<SubmitFooter label="리포트 보기" onClick={handleSubmit} disabled={savedKWh === 0} />}
    >
      <SummaryHero
        testId="sim-hero"
        label="이렇게 아껴요"
        value={<Amount value={savedWon} unit="원" typography="t1" />}
        caption={caption}
      />

      {savedKWh > 0 && (
        <>
          <Spacing size={8} />
          <Badge size="medium" variant="weak" color="blue">
            {`${afterKWh}kWh로 줄어요`}
          </Badge>
        </>
      )}

      <Spacing size={24} />
      <Paragraph.Text typography="t4">줄일 가전 고르기</Paragraph.Text>
      <Spacing size={12} />
      <ApplianceStepperCard testId="appliance-stepper" cuts={cuts} onChange={handleChange} />

      <Spacing size={12} />
      <Paragraph.Text typography="st13">일반적인 제품 기준 추정치예요 · 30일 기준</Paragraph.Text>
      <Spacing size={16} />
      <AdSlot adGroupId={import.meta.env.VITE_TOSS_AD_GROUP_ID ?? ""} />
      <Spacing size={80} />
    </ScreenScaffold>
  );
}
