import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Top, ListRow, Paragraph, Spacing, Badge, Button, BottomSheet, Chip, ChipItem } from "@toss/tds-mobile";
import { BarChart3, Calculator, History as HistoryIcon, MapPin } from "lucide-react";
import { generateHapticFeedback } from "@apps-in-toss/web-framework";
import { ScreenScaffold } from "@/components/ScreenScaffold";
import { Card } from "@/components/Card";
import { MiniBar } from "@/components/MiniBar";
import { EmptyState } from "@/components/StateView";
import { AdSlot } from "@/components/AdSlot";
import { FloatingTabBar } from "@/components/FloatingTabBar";
import { getLatestRecord } from "@/lib/recordStore";
import { getSettings, saveSettings } from "@/lib/settingsStore";
import { getRegionAverage, listRegions } from "@/lib/regionAverage";
import type { AppSettings } from "@/lib/types";

const TAB_ITEMS = [
  { label: "계산", icon: <Calculator size={22} aria-hidden />, path: "/" },
  { label: "기록", icon: <HistoryIcon size={22} aria-hidden />, path: "/history" },
  { label: "내 동네", icon: <MapPin size={22} aria-hidden />, path: "/compare" },
];

const HOUSEHOLD_SIZES = [1, 2, 3, 4] as const;

function fireHaptic() {
  try {
    Promise.resolve(generateHapticFeedback({ type: "tickWeak" })).catch(() => {});
  } catch {
    /* WebView 밖(브라우저/검수자 PC/jsdom)에서는 throw — 무시 */
  }
}

export default function Compare() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<AppSettings>(() => getSettings());
  const [sheetOpen, setSheetOpen] = useState(false);

  const latest = useMemo(() => getLatestRecord(), []);
  const regions = useMemo(() => listRegions(), []);
  const currentRegion = regions.find((r) => r.regionCode === settings.regionCode) ?? regions[0];

  const handleSelectRegion = (regionCode: string) => {
    fireHaptic();
    setSettings(saveSettings({ regionCode }));
    setSheetOpen(false);
  };

  const handleSelectHousehold = (size: (typeof HOUSEHOLD_SIZES)[number]) => {
    fireHaptic();
    setSettings(saveSettings({ householdSize: size }));
  };

  if (!latest) {
    return (
      <ScreenScaffold top={<Top title={<Top.TitleParagraph>우리 동네 비교</Top.TitleParagraph>} />}>
        <EmptyState
          testId="compare-empty"
          icon={<BarChart3 size={40} color="var(--adaptiveGrey400)" aria-hidden />}
          title="비교할 기록이 없어요"
          description="사용량을 계산하면 우리 동네 평균과 비교해드려요"
          action={
            <Button variant="weak" display="block" onClick={() => navigate("/")}>
              요금 계산하러 가기
            </Button>
          }
        />
        <Spacing size={16} />
        <AdSlot adGroupId={import.meta.env.VITE_TOSS_AD_GROUP_ID ?? ""} />
        <Spacing size={96} />
        <FloatingTabBar items={TAB_ITEMS} />
      </ScreenScaffold>
    );
  }

  const avg = getRegionAverage(currentRegion.regionCode, latest.yearMonth) ?? 0;
  const diff = latest.kWh - avg;
  const percent = avg > 0 ? Math.round((diff / avg) * 100) : 0;
  const compareText =
    diff === 0
      ? "지역 평균과 같아요"
      : diff > 0
        ? `평균보다 ${diff}kWh 더 썼어요 (+${percent}%)`
        : `평균보다 ${Math.abs(diff)}kWh 덜 썼어요 (${percent}%)`;
  const maxUsage = Math.max(latest.kWh, avg, 1);
  const monthLabel = `${Number(latest.yearMonth.split("-")[1])}월`;

  return (
    <ScreenScaffold top={<Top title={<Top.TitleParagraph>우리 동네 비교</Top.TitleParagraph>} />}>
      <ListRow
        data-testid="region-row"
        onClick={() => setSheetOpen(true)}
        contents={<ListRow.Texts type="2RowTypeA" top="지역" bottom={currentRegion.regionName} />}
        right={<Paragraph.Text typography="st11" color="var(--adaptiveGrey600)">변경</Paragraph.Text>}
      />
      <Spacing size={12} />
      <Chip kind="select" wrap>
        {HOUSEHOLD_SIZES.map((n) => (
          <ChipItem
            key={n}
            data-testid={`household-chip-${n}`}
            selected={settings.householdSize === n}
            onClick={() => handleSelectHousehold(n)}
          >
            {`${n}인`}
          </ChipItem>
        ))}
      </Chip>

      <Spacing size={24} />
      <Paragraph.Text typography="t4">{`${monthLabel} 사용량 비교`}</Paragraph.Text>
      <Spacing size={12} />
      <Card testId="compare-card">
        <ListRow
          contents={
            <ListRow.Texts type="2RowTypeA" top={`우리집 ${latest.kWh}kWh`} bottom={compareText} />
          }
          right={
            <Badge size="medium" variant="weak" color={diff > 0 ? "red" : "blue"}>
              {`${diff > 0 ? "+" : ""}${percent}%`}
            </Badge>
          }
        />
        <Spacing size={12} />
        <Paragraph.Text typography="st13">우리집</Paragraph.Text>
        <Spacing size={4} />
        <MiniBar testId="usage-bar-mine" ratio={latest.kWh / maxUsage} />
        <Spacing size={12} />
        <Paragraph.Text typography="st13">{`${currentRegion.regionName} 평균`}</Paragraph.Text>
        <Spacing size={4} />
        <MiniBar testId="usage-bar-avg" ratio={avg / maxUsage} />
      </Card>

      <Spacing size={16} />
      <AdSlot adGroupId={import.meta.env.VITE_TOSS_AD_GROUP_ID ?? ""} />
      <Spacing size={12} />
      <Paragraph.Text typography="st13" color="var(--adaptiveGrey600)">
        공개 통계를 가공한 참고용 수치예요
      </Paragraph.Text>
      <Spacing size={96} />

      <BottomSheet
        open={sheetOpen}
        onDimmerClick={() => setSheetOpen(false)}
        header={<Paragraph.Text typography="t5">지역 선택</Paragraph.Text>}
      >
        <div style={{ maxHeight: "50vh", overflowY: "auto" }}>
          {regions.map((r) => (
            <ListRow
              key={r.regionCode}
              data-testid={`region-option-${r.regionCode}`}
              onClick={() => handleSelectRegion(r.regionCode)}
              contents={<ListRow.Texts type="1RowTypeA" top={r.regionName} />}
            />
          ))}
        </div>
      </BottomSheet>

      <FloatingTabBar items={TAB_ITEMS} />
    </ScreenScaffold>
  );
}
