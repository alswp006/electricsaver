import { useState, type ChangeEvent } from "react";
import { Top, TextField, Paragraph, Spacing, Chip, Badge, Button, TextButton, BottomSheet } from "@toss/tds-mobile";
import { ScreenScaffold } from "@/components/ScreenScaffold";
import { Card } from "@/components/Card";
import { SummaryHero } from "@/components/SummaryHero";
import { Amount } from "@/components/Amount";
import type { MeterRecord } from "@/types/domain";

/**
 * S1 홈 입력 화면 — 프레젠테이션 전용.
 *
 * 상태를 스스로 들지 않는다(월 선택 시트의 열림 여부만 지역 상태). 값·에러·핸들러는
 * 전부 props로 받고, 저장소 접근·검증·라우팅은 HomeData가 담당한다.
 */

const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

export interface HomeInputProps {
  /** 사용량 입력값(문자열 그대로 — 정규화는 HomeData가 한다) */
  kWh: string;
  onKwhChange: (value: string) => void;
  /** 검증 실패 메시지 — 있으면 입력칸 아래 인라인 에러로 노출된다 */
  kwhError?: string;
  /** 에러가 없을 때만 보이는 보조 문구(예: 직전 기록 안내) */
  helperText?: string;
  month: number;
  onMonthChange: (month: number) => void;
  /** 7·8월 하계 완화 요금 안내 Chip 노출 여부 */
  showSummerChip?: boolean;
  /** 직전 검침 기록 — 있으면 최상단 요약 히어로로 보여준다 */
  lastRecord?: MeterRecord | null;
  onSubmit: () => void;
  /** 제출 중 — 버튼을 잠가 중복 제출을 막는다 */
  submitting?: boolean;
}

export default function HomeInput({
  kWh,
  onKwhChange,
  kwhError,
  helperText,
  month,
  onMonthChange,
  showSummerChip = false,
  lastRecord = null,
  onSubmit,
  submitting = false,
}: HomeInputProps) {
  const [sheetOpen, setSheetOpen] = useState(false);

  const openSheet = () => setSheetOpen(true);
  const closeSheet = () => setSheetOpen(false);

  const selectMonth = (value: number) => {
    onMonthChange(value);
    setSheetOpen(false);
  };

  return (
    <ScreenScaffold
      top={<Top title={<Top.TitleParagraph>ElectricSaver</Top.TitleParagraph>} />}
    >
      {lastRecord ? (
        <>
          <SummaryHero
            label={`${Number(lastRecord.yearMonth.slice(5, 7))}월에 낸 요금`}
            value={<Amount value={lastRecord.total} unit="원" typography="t1" />}
            caption={`${lastRecord.kWh}kWh 사용`}
            testId="home-hero"
          />
          <Spacing size={16} />
        </>
      ) : null}

      <Card testId="usage-card">
        <Paragraph.Text typography="st11">한 달 사용량</Paragraph.Text>
        <Spacing size={12} />
        <TextField
          variant="box"
          label="사용량 (kWh)"
          placeholder="320"
          inputMode="numeric"
          enterKeyHint="done"
          value={kWh}
          onChange={(event: ChangeEvent<HTMLInputElement>) => onKwhChange(event.target.value)}
          hasError={Boolean(kwhError)}
          help={kwhError}
          data-testid="kwh-input"
        />
        {!kwhError && helperText ? (
          <>
            <Spacing size={8} />
            <Paragraph.Text typography="st13" data-testid="kwh-helper">
              {helperText}
            </Paragraph.Text>
          </>
        ) : null}
      </Card>

      <Spacing size={16} />

      <Card testId="month-card">
        {/* 행 전체를 탭 영역으로 — 실제 조작은 내부 Chip·TextButton(키보드 접근 가능) */}
        <div
          data-testid="month-row"
          onClick={openSheet}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            minHeight: 44,
          }}
        >
          <Paragraph.Text typography="t6">계산할 달</Paragraph.Text>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div data-testid="month-chip">
              <Chip onClick={openSheet}>
                <Badge size="small" variant="weak" color="blue">
                  {month}월
                </Badge>
              </Chip>
            </div>
            <TextButton size="small" onClick={openSheet}>
              바꾸기
            </TextButton>
          </div>
        </div>
        {showSummerChip ? (
          <>
            <Spacing size={10} />
            <div data-testid="summer-chip">
              <Chip>
                <Badge size="small" variant="weak" color="teal">
                  하계 완화 요금 적용
                </Badge>
              </Chip>
            </div>
          </>
        ) : null}
      </Card>

      <Spacing size={16} />

      <Paragraph.Text typography="st13">
        한국전력 공개 요금표로 계산한 예상치예요. 실제 청구서와는 조금 다를 수 있어요.
      </Paragraph.Text>

      <Spacing size={24} />

      <Button
        variant="fill"
        display="block"
        size="large"
        disabled={submitting}
        onClick={onSubmit}
        data-testid="calc-submit"
      >
        {submitting ? "계산 중" : "요금 계산하기"}
      </Button>

      <Spacing size={16} />

      <BottomSheet
        open={sheetOpen}
        onDimmerClick={closeSheet}
        header={<Paragraph.Text typography="t4">계산할 달</Paragraph.Text>}
      >
        <Spacing size={8} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
          {MONTHS.map((value) => (
            <Button
              key={value}
              variant={value === month ? "fill" : "weak"}
              display="block"
              onClick={() => selectMonth(value)}
              data-testid={`month-option-${value}`}
            >
              {value}월
            </Button>
          ))}
        </div>
        <Spacing size={16} />
      </BottomSheet>
    </ScreenScaffold>
  );
}
