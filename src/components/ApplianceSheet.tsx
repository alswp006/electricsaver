import { useState } from "react";
import { BottomSheet, ListRow, Chip, Paragraph, Spacing, Toast, TextButton, Button } from "@toss/tds-mobile";
import { generateHapticFeedback } from "@apps-in-toss/web-framework";
import { APPLIANCES } from "@/data/applianceCatalog";
import type { ApplianceItem } from "@/types/domain";
import type { AddApplianceResult } from "@/hooks/useAppliances";

const MAX_APPLIANCES = 12;
const LIMIT_MESSAGE = "가전은 12개까지 담을 수 있어요";

const HOURS_OPTIONS = Array.from({ length: 48 }, (_, i) => Number(((i + 1) * 0.5).toFixed(1)));
const RATIO_OPTIONS: Array<{ percent: number; value: ApplianceItem["reduceRatio"] }> = [
  { percent: 10, value: 0.1 },
  { percent: 20, value: 0.2 },
  { percent: 30, value: 0.3 },
  { percent: 50, value: 0.5 },
];

function safeHaptic() {
  try {
    generateHapticFeedback({ type: "tickWeak" });
  } catch {
    // 네이티브 브릿지가 없는 환경에서는 throw될 수 있음 — 조용히 무시
  }
}

export interface ApplianceSheetProps {
  open: boolean;
  mode: "catalog" | "edit";
  editingAppliance?: ApplianceItem;
  onClose: () => void;
  appliances: ApplianceItem[];
  addAppliance: (item: ApplianceItem) => AddApplianceResult;
  updateAppliance: (id: string, patch: Partial<ApplianceItem>) => void;
  removeAppliance: (id: string) => void;
}

export function ApplianceSheet({
  open,
  mode,
  editingAppliance,
  onClose,
  appliances,
  addAppliance,
  updateAppliance,
  removeAppliance,
}: ApplianceSheetProps) {
  const [toastText, setToastText] = useState<string | null>(null);

  function handleSelectCatalog(item: (typeof APPLIANCES)[number]) {
    const result = addAppliance({
      id: item.id,
      name: item.name,
      watt: item.watt,
      hoursPerDay: item.hoursPerDay,
      reduceRatio: item.reduceRatio as ApplianceItem["reduceRatio"],
    });
    if (result.ok) {
      onClose();
    } else if (result.reason === "limit") {
      setToastText(LIMIT_MESSAGE);
    }
  }

  function handleHoursSelect(hours: number) {
    if (!editingAppliance) return;
    safeHaptic();
    updateAppliance(editingAppliance.id, { hoursPerDay: hours });
  }

  function handleRatioSelect(value: ApplianceItem["reduceRatio"]) {
    if (!editingAppliance) return;
    safeHaptic();
    updateAppliance(editingAppliance.id, { reduceRatio: value });
  }

  function handleDelete() {
    if (!editingAppliance) return;
    removeAppliance(editingAppliance.id);
    onClose();
  }

  const title =
    mode === "catalog"
      ? `가전 추가 (${appliances.length}/${MAX_APPLIANCES})`
      : (editingAppliance?.name ?? "가전 편집");

  return (
    <>
      <BottomSheet open={open} onDimmerClick={onClose} header={<Paragraph.Text typography="t4">{title}</Paragraph.Text>}>
        {mode === "catalog" &&
          APPLIANCES.map((item) => {
            const rowTexts = <ListRow.Texts type="2RowTypeA" top={item.name} bottom={`${item.watt}W`} />;
            return (
              <ListRow
                key={item.id}
                data-testid="catalog-item"
                onClick={() => handleSelectCatalog(item)}
                contents={rowTexts}
              >
                {rowTexts}
              </ListRow>
            );
          })}

        {mode === "edit" && editingAppliance && (
          <div>
            <Paragraph.Text typography="st13">사용 시간</Paragraph.Text>
            <Spacing size={8} />
            <div style={{ display: "flex", gap: 8, overflowX: "auto" }}>
              {HOURS_OPTIONS.map((hours) => (
                <Chip
                  key={hours}
                  variant={editingAppliance.hoursPerDay === hours ? "fill" : "weak"}
                  onClick={() => handleHoursSelect(hours)}
                >
                  <span data-testid={`hours-chip-${hours}`}>{hours}시간</span>
                </Chip>
              ))}
            </div>

            <Spacing size={20} />
            <Paragraph.Text typography="st13">절감 비율</Paragraph.Text>
            <Spacing size={8} />
            <div style={{ display: "flex", gap: 8 }}>
              {RATIO_OPTIONS.map((ratio) => (
                <Chip
                  key={ratio.percent}
                  variant={editingAppliance.reduceRatio === ratio.value ? "fill" : "weak"}
                  onClick={() => handleRatioSelect(ratio.value)}
                >
                  <span data-testid={`ratio-chip-${ratio.percent}`}>{ratio.percent}%</span>
                </Chip>
              ))}
            </div>

            <Spacing size={24} />
            <Button display="block" onClick={onClose}>
              저장
            </Button>
            <Spacing size={12} />
            <TextButton size="medium" onClick={handleDelete}>
              삭제
            </TextButton>
          </div>
        )}
      </BottomSheet>
      <Toast
        open={toastText !== null}
        text={toastText ?? ""}
        position="bottom"
        onClose={() => setToastText(null)}
      />
    </>
  );
}
