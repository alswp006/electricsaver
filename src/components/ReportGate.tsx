import { useEffect, useState, type ReactNode } from "react";
import { Card } from "@/components/Card";
import { TossRewardAd } from "@/components/TossRewardAd";
import { useReportUnlock } from "@/hooks/useReportUnlock";
import { Asset, Paragraph, Spacing } from "@toss/tds-mobile";

interface ReportGateProps {
  applianceId: string;
  children?: ReactNode;
}

/**
 * 리포트 본문(최종 payoff)을 24시간 열람권 뒤에 두는 게이트.
 * 유효한 열람권이 있으면 광고 없이 바로 children을 보여주고,
 * 없으면 TossRewardAd로 감싸 시청 완료 시 열람권을 저장한다.
 */
export function ReportGate({ applianceId, children }: ReportGateProps) {
  const { hasValidUnlock, addUnlock, pruneUnlocks } = useReportUnlock();
  const [unlocked, setUnlocked] = useState(() => hasValidUnlock(applianceId, Date.now()));

  useEffect(() => {
    pruneUnlocks(Date.now());
    setUnlocked(hasValidUnlock(applianceId, Date.now()));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applianceId]);

  if (unlocked) {
    return <>{children}</>;
  }

  const handleRewarded = () => {
    addUnlock(applianceId, Date.now());
    setUnlocked(true);
  };

  const slotId = import.meta.env.VITE_TOSS_AD_SLOT_ID as string;

  return (
    <div data-testid="report-gate">
      <Card>
        <Asset.ContentIcon name="iconRewardAd" alt="" />
        <Paragraph.Text typography="t4">짧은 광고를 보면 상세 절약 리포트를 볼 수 있어요</Paragraph.Text>
        <Spacing size={8} />
        <Paragraph.Text typography="st12" color="tertiary">
          한 번 열면 24시간 동안 다시 볼 수 있어요
        </Paragraph.Text>
      </Card>
      <Spacing size={16} />
      <TossRewardAd slotId={slotId} onRewarded={handleRewarded}>
        {children}
      </TossRewardAd>
    </div>
  );
}
