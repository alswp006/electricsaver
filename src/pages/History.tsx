import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Top, ListRow, Paragraph, Spacing, Button, AlertDialog, Toast } from "@toss/tds-mobile";
import { Clock } from "lucide-react";
import { generateHapticFeedback } from "@apps-in-toss/web-framework";
import { ScreenScaffold } from "@/components/ScreenScaffold";
import { Sparkline } from "@/components/Sparkline";
import { EmptyState } from "@/components/StateView";
import { AdSlot } from "@/components/AdSlot";
import { listRecords, removeRecord } from "@/lib/recordStore";
import { useQuotaToast } from "@/hooks/useQuotaToast";
import type { RouteState, UsageRecord } from "@/lib/types";

const PAGE_SIZE = 30;

function monthLabel(yearMonth: string): string {
  const [year, month] = yearMonth.split("-");
  return `${year}년 ${Number(month)}월`;
}

function fireHaptic() {
  try {
    Promise.resolve(generateHapticFeedback({ type: "tickWeak" })).catch(() => {});
  } catch {
    /* WebView 밖(브라우저/검수자 PC/jsdom)에서는 throw — 무시 */
  }
}

export default function History() {
  const navigate = useNavigate();
  const [records, setRecords] = useState<UsageRecord[]>(() => listRecords());
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const { toastProps, showToast } = useQuotaToast();

  const visibleRecords = records.slice(0, visibleCount);
  const hasMore = records.length > visibleCount;

  const trend = useMemo(() => {
    const lastTwelve = records.slice(0, 12);
    return [...lastTwelve].reverse().map((r) => r.total);
  }, [records]);

  const handleRowClick = (r: UsageRecord) => {
    fireHaptic();
    navigate("/result", {
      state: {
        input: { kWh: r.kWh, yearMonth: r.yearMonth, contractType: r.contractType },
      } satisfies RouteState["/result"],
    });
  };

  const handleDeleteClick = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteTargetId(id);
  };

  const handleConfirmDelete = () => {
    const id = deleteTargetId;
    if (!id) return;
    const result = removeRecord(id);
    setDeleteTargetId(null);
    if (result.ok) {
      setRecords(listRecords());
      showToast("기록을 삭제했어요");
    } else {
      showToast("삭제하지 못했어요. 다시 시도해주세요");
    }
  };

  return (
    <ScreenScaffold top={<Top title={<Top.TitleParagraph>계산 기록</Top.TitleParagraph>} />}>
      {records.length === 0 ? (
        <EmptyState
          testId="history-empty"
          icon={<Clock size={40} color="var(--adaptiveGrey400)" aria-hidden />}
          title="아직 계산 기록이 없어요"
          action={
            <Button variant="weak" display="block" onClick={() => navigate("/")}>
              요금 계산하러 가기
            </Button>
          }
        />
      ) : (
        <>
          <Sparkline data={trend} testId="history-trend-sparkline" />
          <Spacing size={16} />
          <Paragraph.Text typography="t4">전체 기록</Paragraph.Text>
          <Spacing size={8} />
          <div data-testid="history-list" role="list">
            {visibleRecords.map((r) => (
              <ListRow
                key={r.id}
                onClick={() => handleRowClick(r)}
                contents={
                  <ListRow.Texts
                    type="2RowTypeA"
                    top={`${monthLabel(r.yearMonth)} · ${r.kWh}kWh`}
                    bottom={`${r.total.toLocaleString("ko-KR")}원`}
                  />
                }
                right={
                  <Button variant="weak" size="small" onClick={(e: React.MouseEvent) => handleDeleteClick(r.id, e)}>
                    삭제
                  </Button>
                }
              />
            ))}
          </div>
          {hasMore && (
            <>
              <Spacing size={12} />
              <Button
                variant="weak"
                display="block"
                onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}
              >
                더 보기
              </Button>
            </>
          )}
        </>
      )}

      <Spacing size={16} />
      <AdSlot adGroupId={import.meta.env.VITE_TOSS_AD_GROUP_ID ?? ""} />

      <Spacing size={96} />

      <AlertDialog
        open={deleteTargetId !== null}
        title="이 기록을 삭제할까요?"
        description="삭제하면 되돌릴 수 없어요"
        onClose={() => setDeleteTargetId(null)}
        alertButton={
          <AlertDialog.AlertButton onClick={handleConfirmDelete}>삭제</AlertDialog.AlertButton>
        }
      />

      <Toast {...toastProps} />
    </ScreenScaffold>
  );
}
