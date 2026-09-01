import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Top, Paragraph, Spacing, ListRow, Chip, Toast } from "@toss/tds-mobile";
import { ScreenScaffold } from "@/components/ScreenScaffold";
import { SummaryHero } from "@/components/SummaryHero";
import { Amount } from "@/components/Amount";
import { Card } from "@/components/Card";
import { MiniBar } from "@/components/MiniBar";
import { SubmitFooter } from "@/components/BottomCTA";
import { calculateBill } from "@/domain/calculateBill";
import { getNextStageGap } from "@/domain/stage";
import { CLIMATE_RATE, FUEL_RATE } from "@/domain/rateTable";
import { formatNumber } from "@/lib/utils";
import { upsertRecord } from "@/lib/storage";
import type { BillBreakdown } from "@/lib/types";
import type { ResultRouteState, SimulateRouteState } from "@/types/navigation";

function won(value: number): string {
  return `${formatNumber(value)}원`;
}

function titleFor(yearMonth: string | undefined): string {
  if (!yearMonth) return "요금 계산";
  const [year, month] = yearMonth.split("-");
  return `${year}년 ${Number(month)}월 요금`;
}

export default function Result() {
  const location = useLocation();
  const navigate = useNavigate();
  const routeState = (location.state as ResultRouteState | null) ?? null;
  const input = routeState?.input ?? null;

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const savedYearMonthRef = useRef<string | null>(null);

  const bill = useMemo<BillBreakdown | null>(() => {
    if (!input) return null;
    try {
      return calculateBill(input.kWh, input.month);
    } catch {
      return null;
    }
  }, [input]);

  useEffect(() => {
    if (!input) {
      navigate("/", { replace: true });
      return;
    }
    if (!bill) {
      setErrorMessage("사용량을 다시 입력해 주세요");
    }
  }, [input, bill, navigate]);

  // 결과 자동 저장(AC-3.2) — 같은 yearMonth 재진입 시 덮어쓰기, 저장 공간 부족 시 Toast만 띄우고 결과는 유지.
  useEffect(() => {
    if (!input || !bill) return;
    if (savedYearMonthRef.current === input.yearMonth) return;
    savedYearMonthRef.current = input.yearMonth;

    const result = upsertRecord({
      yearMonth: input.yearMonth,
      kWh: input.kWh,
      total: bill.total,
      createdAt: Date.now(),
    });
    if (!result.ok) {
      setErrorMessage("저장 공간이 부족해 기록을 남기지 못했어요");
    }
  }, [input, bill]);

  if (!input || !bill) {
    return (
      <ScreenScaffold top={<Top title={<Top.TitleParagraph>{titleFor(input?.yearMonth)}</Top.TitleParagraph>} />}>
        <Toast
          open={!!errorMessage}
          text={errorMessage ?? ""}
          position="bottom"
          onClose={() => setErrorMessage(null)}
        />
      </ScreenScaffold>
    );
  }

  const isSummer = input.month === 7 || input.month === 8;
  const climateCharge = Math.round(input.kWh * CLIMATE_RATE);
  const fuelCharge = Math.round(input.kWh * FUEL_RATE);
  const gap = getNextStageGap(input.kWh, input.month);

  const detailRows: Array<{ key: string; label: string; value: number }> = [
    { key: "base", label: "기본요금", value: bill.baseCharge },
    { key: "energy", label: "전력량요금", value: bill.energyCharge },
    { key: "climate", label: "기후환경요금", value: climateCharge },
    { key: "fuel", label: "연료비조정액", value: fuelCharge },
    { key: "vat", label: "부가가치세", value: bill.vat },
    { key: "fund", label: "전력산업기반기금", value: bill.fund },
  ];

  function goSimulate() {
    if (!input) return;
    navigate("/simulate", { state: { input } as SimulateRouteState });
  }

  return (
    <ScreenScaffold
      top={<Top title={<Top.TitleParagraph>{titleFor(input.yearMonth)}</Top.TitleParagraph>} />}
      bottom={<SubmitFooter label="절약 시뮬레이션" onClick={goSimulate} />}
    >
      <SummaryHero
        testId="bill-hero"
        label="청구 예상 금액"
        value={<Amount value={bill.total} unit="원" typography="t1" testId="bill-total" />}
        caption={`${input.kWh}kWh · ${isSummer ? "하계 완화 요금 적용" : "일반 요금 적용"}`}
      />

      <Spacing size={16} />

      <Card testId="stage-card">
        <Paragraph.Text typography="t4">누진 구간별 사용량</Paragraph.Text>
        <Spacing size={12} />
        {bill.stageBreakdown.map((s) => {
          const rowTexts = (
            <ListRow.Texts
              type="2RowTypeA"
              top={`${s.stage}구간`}
              bottom={`${formatNumber(s.kWh)}kWh · ${formatNumber(s.unitPrice)}원/kWh`}
            />
          );
          const rowRight = <Paragraph.Text typography="st9">{won(s.charge)}</Paragraph.Text>;
          return (
            <div key={s.stage}>
              <MiniBar ratio={s.kWh / input.kWh} testId={`stage-minibar-${s.stage}`} />
              <Spacing size={8} />
              <ListRow contents={rowTexts} right={rowRight}>
                {rowTexts}
                {rowRight}
              </ListRow>
            </div>
          );
        })}
        <Spacing size={12} />
        <div data-testid="next-stage-hint">
          <Chip variant="weak">
            {gap > 0 ? `${bill.stage + 1}구간까지 ${gap}kWh 남았어요` : "이미 최고 구간이에요"}
          </Chip>
        </div>
      </Card>

      <Spacing size={16} />

      <Card testId="detail-card">
        {detailRows.map((row) => {
          const rowTexts = <ListRow.Texts type="1RowTypeA" top={row.label} />;
          const rowRight = <Paragraph.Text typography="st9">{won(row.value)}</Paragraph.Text>;
          return (
            <ListRow key={row.key} contents={rowTexts} right={rowRight}>
              {rowTexts}
              {rowRight}
            </ListRow>
          );
        })}
      </Card>

      <Spacing size={16} />

      <Paragraph.Text typography="st12">이 금액은 주택용 저압 기준 예상치예요</Paragraph.Text>

      <Spacing size={32} />

      <Toast
        open={!!errorMessage}
        text={errorMessage ?? ""}
        position="bottom"
        onClose={() => setErrorMessage(null)}
      />
    </ScreenScaffold>
  );
}
