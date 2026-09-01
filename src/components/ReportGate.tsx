import { useEffect, useRef, useState, type ReactNode } from "react";
import { loadFullScreenAd, showFullScreenAd } from "@apps-in-toss/web-framework";
import { Asset, Button, Paragraph, Spacing } from "@toss/tds-mobile";
import { unlock, isUnlocked } from "@/lib/unlockStore";

interface ReportGateProps {
  recordId: string;
  children?: ReactNode;
}

const SLOT_ID = import.meta.env.VITE_TOSS_AD_SLOT_ID as string;

/**
 * 리포트 화면의 리워드 광고 게이팅 상태머신.
 * unlockStore의 24시간 캐시가 살아있으면 children을 바로 렌더하고,
 * 아니면 잠금 화면(설명 + 광고 CTA)을 보여준 뒤 시청 완료 시에만 unlock한다.
 *
 * loadFullScreenAd/showFullScreenAd를 직접 호출한다 — 로드 실패·중도 이탈 시
 * 잠금을 유지해야 하므로(TossRewardAd는 두 경우 모두 자동 언락) 여기서는 쓰지 않는다.
 */
export function ReportGate({ recordId, children }: ReportGateProps) {
  const [unlocked, setUnlocked] = useState(() => isUnlocked(recordId));
  const [adLoaded, setAdLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [isShowing, setIsShowing] = useState(false);

  const load = useRef(() => {
    setLoadError(false);
    try {
      loadFullScreenAd({
        slotId: SLOT_ID,
        onEvent: () => setAdLoaded(true),
        onError: () => setLoadError(true),
      } as Parameters<typeof loadFullScreenAd>[0]);
    } catch {
      setLoadError(true);
    }
  });

  useEffect(() => {
    if (unlocked) return;
    load.current();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unlocked]);

  if (unlocked) {
    return <>{children}</>;
  }

  const handleWatch = () => {
    setIsShowing(true);
    try {
      showFullScreenAd({
        slotId: SLOT_ID,
        onEvent: (event: { type?: string }) => {
          setIsShowing(false);
          if (event?.type === "rewarded" || event?.type === "completed") {
            unlock(recordId);
            setUnlocked(true);
          }
          // dismissed/other — 잠금 유지, 재시도 가능
        },
        onError: () => setIsShowing(false),
      } as Parameters<typeof showFullScreenAd>[0]);
    } catch {
      setIsShowing(false);
    }
  };

  if (loadError) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", padding: "32px 16px" }}>
        <Paragraph.Text typography="st13">광고를 불러오지 못했어요</Paragraph.Text>
        <Spacing size={16} />
        <Button variant="weak" onClick={() => load.current()}>
          다시 시도
        </Button>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", padding: "32px 16px" }}>
      <Asset.ContentIcon name="iconGiftRegular" alt="절약 리포트 준비 완료" />
      <Spacing size={12} />
      <Paragraph.Text typography="t4">절약 리포트가 준비됐어요</Paragraph.Text>
      <Spacing size={8} />
      <Paragraph.Text typography="st13">광고를 시청하면 맞춤 절약 팁을 볼 수 있어요</Paragraph.Text>
      <Spacing size={16} />
      <Button
        variant="fill"
        size="large"
        display="block"
        disabled={isShowing || !adLoaded}
        onClick={handleWatch}
      >
        {isShowing ? "광고 재생 중..." : "광고 보고 리포트 열기"}
      </Button>
    </div>
  );
}
