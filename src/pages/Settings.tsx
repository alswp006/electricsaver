import { useMemo, useState } from "react";
import { Top, ListRow, Paragraph, Spacing, AlertDialog, Toast } from "@toss/tds-mobile";
import { ScreenScaffold } from "@/components/ScreenScaffold";
import { ProfileSheet } from "@/components/ProfileSheet";
import { useProfile } from "@/hooks/useProfile";
import { getStorageBytes, removeKeys } from "@/lib/storage";
import regionAverageData from "@/data/regionAverage.json";
import type { RegionAverage } from "@/types/domain";
import packageJson from "../../package.json";

const REGIONS = regionAverageData as RegionAverage[];
const ALL_KEYS = ["es:records", "es:profile", "es:appliances", "es:report-unlocks", "es:flags"];

function regionNameOf(regionCode: string): string {
  return REGIONS.find((r) => r.regionCode === regionCode)?.regionName ?? "서울";
}

export default function Settings() {
  const { profile, setProfile } = useProfile();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [toastOpen, setToastOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const storageKB = useMemo(() => Math.round(getStorageBytes() / 1024), [refreshKey]);

  function handleConfirmDelete() {
    removeKeys(ALL_KEYS);
    setDeleteDialogOpen(false);
    setToastOpen(true);
    setRefreshKey((k) => k + 1);
  }

  const profileTexts = (
    <ListRow.Texts
      type="2RowTypeA"
      top="우리 집 정보"
      bottom={`${regionNameOf(profile.regionCode)} · ${profile.householdSize}인 가구`}
    />
  );
  const profileRight = (
    <Paragraph.Text typography="st11" color="secondary">
      변경
    </Paragraph.Text>
  );
  const storageTexts = (
    <ListRow.Texts type="2RowTypeA" top="저장 공간" bottom={`${storageKB} KB 사용 중`} />
  );
  const deleteTexts = <ListRow.Texts type="1RowTypeA" top="모든 데이터 삭제" />;

  return (
    <ScreenScaffold top={<Top title={<Top.TitleParagraph>설정</Top.TitleParagraph>} />}>
      <ListRow
        data-testid="settings-profile-row"
        onClick={() => setSheetOpen(true)}
        contents={profileTexts}
        right={profileRight}
      >
        {profileTexts}
        {profileRight}
      </ListRow>

      <ListRow data-testid="settings-storage-row" contents={storageTexts}>
        {storageTexts}
      </ListRow>

      <ListRow
        data-testid="settings-delete-row"
        onClick={() => setDeleteDialogOpen(true)}
        contents={deleteTexts}
      >
        {deleteTexts}
      </ListRow>

      <Spacing size={24} />
      <Paragraph.Text typography="st12" color="tertiary" data-testid="settings-footer-disclaimer">
        주택용 저압 기준 예상치예요
      </Paragraph.Text>
      <Spacing size={4} />
      <Paragraph.Text typography="st12" color="tertiary" data-testid="settings-footer-version">
        {`v${packageJson.version}`}
      </Paragraph.Text>
      <Spacing size={32} />

      <ProfileSheet open={sheetOpen} onClose={() => setSheetOpen(false)} profile={profile} setProfile={setProfile} />

      <AlertDialog
        open={deleteDialogOpen}
        title="모든 데이터를 삭제할까요?"
        description="검침 기록, 가전, 프로필이 모두 사라져요. 되돌릴 수 없어요."
        alertButton={
          <AlertDialog.AlertButton onClick={handleConfirmDelete}>삭제</AlertDialog.AlertButton>
        }
        onClose={() => setDeleteDialogOpen(false)}
      />

      <Toast open={toastOpen} text="데이터를 모두 지웠어요" position="bottom" onClose={() => setToastOpen(false)} />
    </ScreenScaffold>
  );
}
