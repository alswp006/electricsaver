import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Top, TextField, Tab, ListRow, BottomSheet, Paragraph, Spacing } from "@toss/tds-mobile";
import { generateHapticFeedback } from "@apps-in-toss/web-framework";
import { ScreenScaffold } from "@/components/ScreenScaffold";
import { SubmitFooter } from "@/components/BottomCTA";
import { AdSlot } from "@/components/AdSlot";
import { LoadingState } from "@/components/StateView";
import { getSettings, saveSettings } from "@/lib/settingsStore";
import { validateUsageInput, validateYearMonth } from "@/domain/validation";
import type { BillInput, ContractType, RouteState } from "@/lib/types";

function fireHaptic(type: "tickWeak") {
  try {
    Promise.resolve(generateHapticFeedback({ type })).catch(() => {});
  } catch {
    /* WebView 밖(브라우저/검수자 PC/jsdom)에서는 throw — 무시 */
  }
}

function formatYearMonth(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function recentYearMonths(count: number): string[] {
  const now = new Date();
  const result: string[] = [];
  for (let i = 0; i < count; i++) {
    result.push(formatYearMonth(new Date(now.getFullYear(), now.getMonth() - i, 1)));
  }
  return result;
}

export default function Home() {
  const navigate = useNavigate();
  const [settingsLoading, setSettingsLoading] = useState(true);
  const [contractType, setContractType] = useState<ContractType>("low");
  const [kWhText, setKWhText] = useState("");
  const [kWhError, setKWhError] = useState<string | null>(null);
  const [yearMonth, setYearMonth] = useState(() => formatYearMonth(new Date()));
  const [monthSheetOpen, setMonthSheetOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      const settings = getSettings();
      setContractType(settings.contractType);
      setYearMonth(settings.lastYearMonth ?? formatYearMonth(new Date()));
      setSettingsLoading(false);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const recentMonths = useMemo(() => recentYearMonths(24), []);
  const monthValidation = useMemo(
    () => validateYearMonth(yearMonth, new Date()),
    [yearMonth],
  );
  const monthError = monthValidation.ok ? null : monthValidation.message;

  const handleContractChange = (next: ContractType) => {
    if (next === contractType) return;
    fireHaptic("tickWeak");
    setContractType(next);
    saveSettings({ contractType: next });
  };

  const handleSelectMonth = (ym: string) => {
    fireHaptic("tickWeak");
    setYearMonth(ym);
    saveSettings({ lastYearMonth: ym });
    setMonthSheetOpen(false);
  };

  const handleSubmit = () => {
    const usage = validateUsageInput(kWhText);
    if (!usage.ok) {
      setKWhError(usage.message);
      return;
    }
    setKWhError(null);

    if (monthError) {
      return;
    }

    const input: BillInput = { kWh: usage.kWh, yearMonth, contractType };
    navigate("/result", { state: { input } satisfies RouteState["/result"] });
  };

  return (
    <ScreenScaffold
      top={<Top title={<Top.TitleParagraph>우리집 전기요금</Top.TitleParagraph>} />}
      bottom={<SubmitFooter label="요금 계산하기" onClick={handleSubmit} disabled={settingsLoading} />}
    >
      {settingsLoading ? (
        <LoadingState rows={3} testId="home-skeleton" />
      ) : (
        <>
          <Tab onChange={(index) => handleContractChange(index === 0 ? "low" : "high")}>
            <Tab.Item selected={contractType === "low"} onClick={() => handleContractChange("low")}>
              저압
            </Tab.Item>
            <Tab.Item selected={contractType === "high"} onClick={() => handleContractChange("high")}>
              고압
            </Tab.Item>
          </Tab>
          <Spacing size={4} />
          <Paragraph.Text typography="st13">아파트는 대부분 고압이에요</Paragraph.Text>

          <Spacing size={16} />
          <TextField
            variant="box"
            label="이번 달 사용량 (kWh)"
            placeholder="예: 320"
            value={kWhText}
            inputMode="numeric"
            enterKeyHint="done"
            pattern="[0-9]*"
            hasError={!!kWhError}
            help={kWhError ?? "검침표의 kWh를 그대로 넣어주세요"}
            onChange={(e) => {
              setKWhText(e.target.value);
              if (kWhError) setKWhError(null);
            }}
          />

          <Spacing size={12} />
          <ListRow
            data-testid="home-yearmonth-row"
            onClick={() => setMonthSheetOpen(true)}
            contents={<ListRow.Texts type="2RowTypeA" top="검침 연월" bottom={yearMonth} />}
            right={<Paragraph.Text typography="st11">변경</Paragraph.Text>}
          />
          {monthError && (
            <>
              <Spacing size={8} />
              <Paragraph.Text typography="st12">{monthError}</Paragraph.Text>
            </>
          )}

          <Spacing size={16} />
          <AdSlot adGroupId={import.meta.env.VITE_TOSS_AD_GROUP_ID ?? ""} />

          <Spacing size={12} />
          <Paragraph.Text typography="st13">
            한국전력 주택용 전력 기준 · v2024.01 · 기록은 이 기기에만 저장돼요
          </Paragraph.Text>
          <Spacing size={80} />

          <BottomSheet
            open={monthSheetOpen}
            onDimmerClick={() => setMonthSheetOpen(false)}
            header={<Paragraph.Text typography="t5">검침 연월 선택</Paragraph.Text>}
          >
            <div style={{ maxHeight: "50vh", overflowY: "auto" }}>
              {recentMonths.map((ym) => (
                <ListRow
                  key={ym}
                  data-testid={`month-option-${ym}`}
                  onClick={() => handleSelectMonth(ym)}
                  contents={<ListRow.Texts type="1RowTypeA" top={ym} />}
                />
              ))}
            </div>
          </BottomSheet>
        </>
      )}
    </ScreenScaffold>
  );
}
