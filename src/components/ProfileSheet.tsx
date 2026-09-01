import { BottomSheet, ListRow, Chip, Paragraph, Spacing, Button } from "@toss/tds-mobile";
import { generateHapticFeedback } from "@apps-in-toss/web-framework";
import regionAverageData from "@/data/regionAverage.json";
import type { RegionAverage, UserProfile } from "@/types/domain";

const REGIONS = regionAverageData as RegionAverage[];

const HOUSEHOLD_OPTIONS: Array<{ value: 1 | 2 | 3 | 4; label: string }> = [
  { value: 1, label: "1인" },
  { value: 2, label: "2인" },
  { value: 3, label: "3인" },
  { value: 4, label: "4인 이상" },
];

function safeHaptic() {
  try {
    generateHapticFeedback({ type: "tickWeak" });
  } catch {
    // 네이티브 브릿지가 없는 환경에서는 throw될 수 있음 — 조용히 무시
  }
}

export interface ProfileSheetProps {
  open: boolean;
  onClose: () => void;
  profile: UserProfile;
  setProfile: (patch: Partial<UserProfile>) => void;
  onChange?: (profile: UserProfile) => void;
}

export function ProfileSheet({ open, onClose, profile, setProfile, onChange }: ProfileSheetProps) {
  function handleHouseholdSelect(value: 1 | 2 | 3 | 4) {
    safeHaptic();
    setProfile({ householdSize: value });
    onChange?.({ ...profile, householdSize: value });
  }

  function handleRegionSelect(regionCode: string) {
    safeHaptic();
    setProfile({ regionCode });
    onChange?.({ ...profile, regionCode });
    onClose();
  }

  return (
    <BottomSheet open={open} onDimmerClick={onClose} header={<Paragraph.Text typography="t4">우리 집 정보</Paragraph.Text>}>
      <Spacing size={12} />
      <Paragraph.Text typography="st13">가구원수</Paragraph.Text>
      <Spacing size={8} />
      <div style={{ display: "flex", gap: 8 }}>
        {HOUSEHOLD_OPTIONS.map((option) => (
          <div
            key={option.value}
            data-testid={`household-chip-wrap-${option.value}`}
            style={{ minHeight: 44, display: "flex", alignItems: "center" }}
          >
            <Chip
              variant={profile.householdSize === option.value ? "fill" : "weak"}
              onClick={() => handleHouseholdSelect(option.value)}
            >
              <span data-testid={`household-chip-${option.value}`}>{option.label}</span>
            </Chip>
          </div>
        ))}
      </div>

      <Spacing size={16} />
      <Paragraph.Text typography="st13">지역</Paragraph.Text>
      <Spacing size={8} />
      {REGIONS.map((region) => {
        const rowTexts = <ListRow.Texts type="1RowTypeA" top={region.regionName} />;
        return (
          <ListRow
            key={region.regionCode}
            data-testid={`region-item-${region.regionCode}`}
            style={{ minHeight: 44 }}
            contents={rowTexts}
            onClick={() => handleRegionSelect(region.regionCode)}
          >
            {rowTexts}
          </ListRow>
        );
      })}

      <Spacing size={16} />
      <Button display="block" onClick={onClose}>
        저장
      </Button>
    </BottomSheet>
  );
}
