import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Top, Paragraph, Spacing, ListRow, Chip, Asset, Button } from "@toss/tds-mobile";
import { ScreenScaffold } from "@/components/ScreenScaffold";
import { SummaryHero } from "@/components/SummaryHero";
import { Card } from "@/components/Card";
import { EmptyState } from "@/components/StateView";
import { SubmitFooter } from "@/components/BottomCTA";
import { ApplianceSheet } from "@/components/ApplianceSheet";
import { useAppliances } from "@/hooks/useAppliances";
import { simulate } from "@/domain/simulate";
import { getStage } from "@/domain/stage";
import { formatNumber } from "@/lib/utils";
import type { SimulateRouteState } from "@/types/navigation";

function won(value: number): string {
  return `${formatNumber(value)}원`;
}

export default function Simulate() {
  const location = useLocation();
  const navigate = useNavigate();
  const routeState = (location.state as SimulateRouteState | null) ?? null;
  const input = routeState?.input ?? null;

  const { appliances, addAppliance, updateAppliance, removeAppliance } = useAppliances();
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    if (!input) {
      navigate("/", { replace: true });
    }
  }, [input, navigate]);

  const summary = useMemo(() => {
    if (!input) return null;
    return simulate(input.kWh, input.month, appliances);
  }, [input, appliances]);

  if (!input || !summary) {
    return <ScreenScaffold top={<Top title={<Top.TitleParagraph>절약 시뮬레이션</Top.TitleParagraph>} />}>{null}</ScreenScaffold>;
  }

  const baseStage = getStage(summary.baseKWh, input.month);
  const targetStage = getStage(summary.targetKWh, input.month);
  const stageDropped = targetStage < baseStage;

  function goReport() {
    navigate("/report", { state: { summary } });
  }

  return (
    <ScreenScaffold
      top={<Top title={<Top.TitleParagraph>절약 시뮬레이션</Top.TitleParagraph>} />}
      bottom={<SubmitFooter label="절약 팁 리포트 보기" onClick={goReport} />}
    >
      <SummaryHero
        testId="save-hero"
        label="이렇게 하면"
        value={<Paragraph.Text typography="t1">{`월 ${formatNumber(summary.savedWon)}원 아껴요`}</Paragraph.Text>}
        caption={`월 ${summary.savedKWh}kWh 절약`}
      />

      <Spacing size={16} />

      <Card testId="compare-card">
        {(() => {
          const nowTexts = <ListRow.Texts type="2RowTypeA" top="지금" bottom={`${summary.baseKWh}kWh`} />;
          const nowRight = <Paragraph.Text typography="st9">{won(summary.baseTotal)}</Paragraph.Text>;
          const nextTexts = <ListRow.Texts type="2RowTypeA" top="절약하면" bottom={`${summary.targetKWh}kWh`} />;
          const nextRight = <Paragraph.Text typography="st9">{won(summary.targetTotal)}</Paragraph.Text>;
          return (
            <>
              <ListRow contents={nowTexts} right={nowRight}>
                {nowTexts}
                {nowRight}
              </ListRow>
              <ListRow contents={nextTexts} right={nextRight}>
                {nextTexts}
                {nextRight}
              </ListRow>
            </>
          );
        })()}
        {stageDropped ? (
          <>
            <Spacing size={12} />
            <div data-testid="stage-drop-badge">
              <Chip variant="fill">{`${baseStage}구간 → ${targetStage}구간 내려가요`}</Chip>
            </div>
          </>
        ) : null}
      </Card>

      <Spacing size={16} />

      {appliances.length === 0 ? (
        <EmptyState
          testId="appliance-empty"
          icon={<Asset.ContentIcon name="iconFileRegular" alt="" />}
          title="절약할 가전을 추가해보세요"
          action={
            <Button variant="weak" onClick={() => setSheetOpen(true)}>
              가전 추가
            </Button>
          }
        />
      ) : (
        <Card testId="appliance-card">
          {appliances.map((item, idx) => {
            const texts = (
              <ListRow.Texts
                type="2RowTypeA"
                top={item.name}
                bottom={`${item.watt}W · 하루 ${item.hoursPerDay}시간 · ${item.reduceRatio * 100}% 줄이기`}
              />
            );
            return (
              <div key={item.id}>
                {idx > 0 ? <Spacing size={8} /> : null}
                <ListRow contents={texts}>{texts}</ListRow>
              </div>
            );
          })}
        </Card>
      )}

      <ApplianceSheet
        open={sheetOpen}
        mode="catalog"
        onClose={() => setSheetOpen(false)}
        appliances={appliances}
        addAppliance={addAppliance}
        updateAppliance={updateAppliance}
        removeAppliance={removeAppliance}
      />
    </ScreenScaffold>
  );
}
