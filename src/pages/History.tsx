import { useState } from 'react';
import { Top, Paragraph, Spacing, ListRow, Button, AlertDialog, Toast, Asset } from '@toss/tds-mobile';
import { useNavigate } from 'react-router-dom';
import { ScreenScaffold } from '../components/ScreenScaffold';
import { Card } from '../components/Card';
import { EmptyState } from '../components/StateView';
import { YoyCompareCard } from '../components/YoyCompareCard';
import { readJSON, writeJSON } from '../lib/storage';
import type { MeterRecord } from '../types/domain';

const RECORDS_KEY = 'es:records';

function won(n: number): string {
  return `${n.toLocaleString('ko-KR')}원`;
}

function formatYearMonth(yearMonth: string): string {
  const [year, month] = yearMonth.split('-');
  return `${year}년 ${Number(month)}월`;
}

function loadRecords(): MeterRecord[] {
  const { value } = readJSON<MeterRecord[]>(RECORDS_KEY, []);
  return Array.isArray(value) ? value : [];
}

export default function History() {
  const navigate = useNavigate();
  const [records, setRecords] = useState<MeterRecord[]>(() => loadRecords());
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [toastOpen, setToastOpen] = useState(false);

  const sorted = [...records].sort((a, b) => b.yearMonth.localeCompare(a.yearMonth));

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    const next = records.filter((r) => r.yearMonth !== deleteTarget);
    setRecords(next);
    writeJSON(RECORDS_KEY, next);
    setDeleteTarget(null);
    setToastOpen(true);
  };

  return (
    <ScreenScaffold top={<Top title={<Top.TitleParagraph>검침 기록</Top.TitleParagraph>} />}>
      {sorted.length === 0 ? (
        <EmptyState
          icon={<Asset.ContentIcon name="iconFileRegular" alt="" />}
          title="아직 기록이 없어요"
          description="이번 달 사용량을 입력하면 여기에 쌓여요"
          action={
            <Button variant="fill" display="block" onClick={() => navigate('/')}>
              요금 계산하러 가기
            </Button>
          }
          testId="history-empty"
        />
      ) : (
        <Card testId="history-list" style={{ padding: 0 }}>
          {sorted.map((r) => {
            const rowTexts = (
              <ListRow.Texts type="2RowTypeA" top={formatYearMonth(r.yearMonth)} bottom={`${r.kWh}kWh`} />
            );
            const rightContent = (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Paragraph.Text typography="st9">{won(r.total)}</Paragraph.Text>
                <Button
                  variant="weak"
                  aria-label={`${r.yearMonth} 기록 삭제`}
                  data-testid={`record-delete-${r.yearMonth}`}
                  onClick={() => setDeleteTarget(r.yearMonth)}
                >
                  삭제
                </Button>
              </div>
            );
            return (
              <ListRow
                key={`${r.yearMonth}-${r.createdAt}`}
                data-testid="record-row"
                style={{ minHeight: 56 }}
                contents={rowTexts}
                right={rightContent}
              >
                {rowTexts}
                {rightContent}
              </ListRow>
            );
          })}
        </Card>
      )}

      <Spacing size={32} />

      <AlertDialog
        open={deleteTarget !== null}
        title="기록을 삭제할까요?"
        description="삭제한 기록은 복구할 수 없어요"
        alertButton={<AlertDialog.AlertButton onClick={handleConfirmDelete}>삭제</AlertDialog.AlertButton>}
        onClose={() => setDeleteTarget(null)}
      />

      <Toast open={toastOpen} text="기록을 지웠어요" position="bottom" onClose={() => setToastOpen(false)} />
    </ScreenScaffold>
  );
}
