import { useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Top, ListRow, Badge, Paragraph, Spacing, Toast } from "@toss/tds-mobile";
import { generateHapticFeedback } from "@apps-in-toss/web-framework";
import { ScreenScaffold } from "@/components/ScreenScaffold";
import { SummaryHero } from "@/components/SummaryHero";
import { Amount } from "@/components/Amount";
import { MiniBar } from "@/components/MiniBar";
import { YoYCard } from "@/components/YoYCard";
import { SubmitFooter } from "@/components/BottomCTA";
import { AdSlot } from "@/components/AdSlot";
import { calcBill } from "@/domain/calcBill";
import { findYoY } from "@/domain/compare";
import { upsertRecord, listRecords } from "@/lib/recordStore";
import { useQuotaToast } from "@/hooks/useQuotaToast";
import type { BillInput, ContractType, RouteState, UsageRecord } from "@/lib/types";

function contractLabel(contractType: ContractType): string {
  return contractType === "low" ? "저압" : "고압";
}

function monthLabel(yearMonth: string): string {
  const [year, month] = yearMonth.split("-");
  return `${year}년 ${Number(month)}월`;
}

function fireHaptic() {
  try {
    Promise.resolve(generateHapticFeedback({ type: "success" })).catch(() => {});
  } catch {
    /* WebView 밖(브라우저/검수자 PC/jsdom)에서는 throw — 무시 */
  }
}

export default function Result() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state as RouteState["/result"]) ?? null;
  const input = state?.input ?? null;
  const { toastProps, showQuotaToast } = useQuotaToast();

  useEffect(() => {
    if (!state) {
      navigate("/", { replace: true });
    }
  }, [state, navigate]);

  const breakdown = useMemo(() => (input ? calcBill(input) : null), [input]);

  // 여름철 완화 절감액 = 같은 kWh/계약을 비-여름 달(1월)로 계산한 금액과의 차이 — calcBill만 호출
  const reliefSavings = useMemo(() => {
    if (!input || !breakdown || !breakdown.isSummerRelief) return 0;
    const [year] = input.yearMonth.split("-");
    const nonSummerInput: BillInput = { ...input, yearMonth: `${year}-01` };
    const nonSummerBreakdown = calcBill(nonSummerInput);
    return nonSummerBreakdown.total - breakdown.total;
  }, [input, breakdown]);

  useEffect(() => {
    if (!input || !breakdown) return;
    const record: UsageRecord = {
      id: `rec_${input.yearMonth}`,
      yearMonth: input.yearMonth,
      kWh: input.kWh,
      contractType: input.contractType,
      total: breakdown.total,
      tariffVersion: breakdown.tariffVersion,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    const result = upsertRecord(record);
    if (!result.ok) {
      showQuotaToast();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input?.yearMonth, input?.kWh, input?.contractType, breakdown?.total, breakdown?.tariffVersion]);

  if (!state || !input || !breakdown) {
    return null;
  }

  const records = listRecords();
  const yoyRecord = findYoY(records, input.yearMonth);

  const handleSimulate = () => {
    fireHaptic();
    navigate("/simulate", {
      state: { recordId: `rec_${input.yearMonth}`, input } satisfies RouteState["/simulate"],
    });
  };

  return (
    <ScreenScaffold
      top={<Top title={<Top.TitleParagraph>{monthLabel(input.yearMonth)} 요금</Top.TitleParagraph>} />}
      bottom={<SubmitFooter label="절약 시뮬레이션 해보기" onClick={handleSimulate} />}
    >
      <SummaryHero
        testId="bill-hero"
        label="예상 청구금액"
        value={<Amount value={breakdown.total} unit="원" typography="t1" />}
        caption={`${input.kWh}kWh · ${contractLabel(input.contractType)}`}
      />

      {breakdown.isSummerRelief && (
        <>
          <Spacing size={12} />
          <Badge size="medium" variant="weak" color="blue">
            여름철 완화 적용
          </Badge>
          <Spacing size={4} />
          <Paragraph.Text typography="st11">
            {`완화 덕분에 ${reliefSavings.toLocaleString("ko-KR")}원 아꼈어요`}
          </Paragraph.Text>
        </>
      )}

      <Spacing size={24} />
      <Paragraph.Text typography="t4">누진 구간</Paragraph.Text>
      <Spacing size={12} />
      <div data-testid="tier-card" role="list">
        {breakdown.tiers.map((tier) => (
          <ListRow
            key={tier.tier}
            contents={
              <ListRow.Texts
                type="2RowTypeA"
                top={`${tier.tier}구간 ${tier.kWh}kWh`}
                bottom={`${tier.fee.toLocaleString("ko-KR")}원`}
              />
            }
            right={
              <MiniBar
                ratio={input.kWh > 0 ? tier.kWh / input.kWh : 0}
                testId={`tier-bar-${tier.tier}`}
              />
            }
          />
        ))}
      </div>

      <Spacing size={24} />
      <div data-testid="yoy-card">
        <YoYCard
          currentYearMonth={input.yearMonth}
          currentKWh={input.kWh}
          yoyRecord={yoyRecord}
          records={records}
        />
      </div>

      <Spacing size={24} />
      <AdSlot adGroupId={import.meta.env.VITE_TOSS_AD_GROUP_ID ?? ""} />

      <Spacing size={12} />
      <Paragraph.Text typography="st13">
        한국전력 주택용 전력 기준 · {breakdown.tariffVersion} · 복지·다자녀 등 할인은 반영하지 않았어요
      </Paragraph.Text>
      <Spacing size={80} />

      <Toast {...toastProps} />
    </ScreenScaffold>
  );
}
