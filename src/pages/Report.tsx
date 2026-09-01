import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Top, Paragraph, Spacing, ListRow } from "@toss/tds-mobile";
import { ScreenScaffold } from "@/components/ScreenScaffold";
import { Card } from "@/components/Card";
import { SummaryHero } from "@/components/SummaryHero";
import { ReportGate } from "@/components/ReportGate";
import { SAVING_TIPS } from "@/data/savingTips";
import { formatNumber } from "@/lib/utils";
import type { SimulationSummary } from "@/types/domain";

interface ReportLocationState {
  summary: SimulationSummary;
}

function won(value: number): string {
  return `${formatNumber(value)}원`;
}

function isReportLocationState(value: unknown): value is ReportLocationState {
  if (!value || typeof value !== "object") return false;
  const summary = (value as Record<string, unknown>).summary;
  return !!summary && typeof summary === "object";
}

export default function Report() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = isReportLocationState(location.state) ? location.state : null;

  useEffect(() => {
    if (!state) {
      navigate("/simulate", { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, navigate]);

  const top = <Top title={<Top.TitleParagraph>절약 팁 리포트</Top.TitleParagraph>} />;

  if (!state) {
    return <ScreenScaffold top={top}>{null}</ScreenScaffold>;
  }

  const { summary } = state;
  const avgWonPerKWh = summary.savedKWh > 0 ? summary.savedWon / summary.savedKWh : 0;

  return (
    <ScreenScaffold top={top}>
      <SummaryHero
        testId="saved-summary-hero"
        label="이번 달 절약 예상액"
        value={<Paragraph.Text typography="t1">{won(summary.savedWon)}</Paragraph.Text>}
        caption={`월 ${summary.savedKWh}kWh 절약`}
      />
      <Spacing size={16} />
      <ReportGate applianceId="__report__">
      <div data-testid="report-body">
        {summary.appliances.map((appliance) => {
          const savedKWh = Math.round(
            ((appliance.watt * appliance.hoursPerDay * 30) / 1000) * appliance.reduceRatio,
          );
          const savedWon = Math.round(savedKWh * avgWonPerKWh);
          const tips = SAVING_TIPS[appliance.id] ?? [];

          return (
            <div key={appliance.id}>
              <Card testId="tip-card">
                <Paragraph.Text typography="t4">{appliance.name}</Paragraph.Text>
                <Spacing size={4} />
                <Paragraph.Text typography="st12" color="secondary">
                  {`월 ${savedKWh}kWh · ${won(savedWon)} 절약`}
                </Paragraph.Text>
                <Spacing size={12} />
                {tips.map((tip) => {
                  const rowTexts = <ListRow.Texts type="1RowTypeA" top={tip} />;
                  return (
                    <ListRow key={tip} contents={rowTexts}>
                      {rowTexts}
                    </ListRow>
                  );
                })}
              </Card>
              <Spacing size={16} />
            </div>
          );
        })}

        <Paragraph.Text typography="st12" color="tertiary">
          예상치예요. 실제 청구액은 한국전력 고지서를 확인해주세요
        </Paragraph.Text>
        <Spacing size={32} />
      </div>
      </ReportGate>
    </ScreenScaffold>
  );
}
