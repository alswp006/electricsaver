import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertDialog } from "@toss/tds-mobile";
import { generateHapticFeedback } from "@apps-in-toss/web-framework";
import HomeInput from "./HomeInput";
import { getRecords } from "@/lib/records";
import { readJSON, writeJSON } from "@/lib/storage";
import { validateUsage } from "@/domain/validate";
import type { AppFlags, MeterRecord } from "@/types/domain";
import type { ResultRouteState } from "@/types/navigation";

/**
 * S1 홈 라우트 컴포넌트 — 데이터·검증·이동만 담당한다.
 * 화면 골격(ScreenScaffold)과 입력 UI는 프레젠테이션 컴포넌트 HomeInput이 소유한다.
 */

const FLAGS_KEY = "es:flags";
const DEFAULT_FLAGS: AppFlags = { schemaVersion: 1, disclaimerSeenAt: null };

/** 지금 기준 직전 달(1~12). 1월이면 작년 12월. */
function previousMonth(now: Date): number {
  const zeroBased = now.getMonth();
  return zeroBased === 0 ? 12 : zeroBased;
}

/** 선택한 달의 가장 가까운 과거 연·월 — 직전 달보다 뒤면 작년으로 본다. */
function toYearMonth(month: number, now: Date): string {
  const prev = previousMonth(now);
  const prevYear = prev === 12 ? now.getFullYear() - 1 : now.getFullYear();
  const year = month <= prev ? prevYear : prevYear - 1;
  return `${year}-${String(month).padStart(2, "0")}`;
}

function latestRecord(): MeterRecord | null {
  try {
    const records = getRecords();
    return records.length > 0 ? records[0] : null;
  } catch {
    return null;
  }
}

function readFlags(): AppFlags {
  const { value } = readJSON<AppFlags>(FLAGS_KEY, DEFAULT_FLAGS);
  return value && typeof value === "object" ? { ...DEFAULT_FLAGS, ...value } : DEFAULT_FLAGS;
}

/** SDK는 WebView 밖에서 throw한다 — 가드 없이 부르면 화면이 통째로 날아간다. */
function safeHaptic() {
  try {
    Promise.resolve(generateHapticFeedback({ type: "success" })).catch(() => {});
  } catch {
    /* 브라우저·테스트 환경에서는 무시 */
  }
}

export default function HomeData() {
  const navigate = useNavigate();

  const [prefill] = useState(() => latestRecord());
  const [kWh, setKWh] = useState(() => (prefill ? String(prefill.kWh) : ""));
  const [month, setMonth] = useState(() => previousMonth(new Date()));
  const [kwhError, setKwhError] = useState<string | undefined>(undefined);
  const [errorDialogOpen, setErrorDialogOpen] = useState(false);
  const [disclaimerOpen, setDisclaimerOpen] = useState(() => readFlags().disclaimerSeenAt == null);

  function handleKwhChange(value: string) {
    setKWh(value);
    setKwhError(undefined);
    setErrorDialogOpen(false);
  }

  function handleSubmit() {
    const result = validateUsage(kWh);

    if (!result.valid) {
      setKwhError(result.error);
      setErrorDialogOpen(true);
      return;
    }

    safeHaptic();
    const state: ResultRouteState = {
      input: { yearMonth: toYearMonth(month, new Date()), kWh: result.normalized, month },
    };
    navigate("/result", { state });
  }

  function acknowledgeDisclaimer() {
    const flags = readFlags();
    writeJSON<AppFlags>(FLAGS_KEY, { ...flags, disclaimerSeenAt: Date.now() });
    setDisclaimerOpen(false);
  }

  // 한 번에 하나의 다이얼로그만 — 검증 에러가 고지보다 앞선다(사용자가 방금 한 행동이 우선).
  const dialog = errorDialogOpen
    ? {
        title: "다시 확인해 주세요",
        description: kwhError ?? "",
        onConfirm: () => setErrorDialogOpen(false),
      }
    : disclaimerOpen
      ? {
          title: "계산 결과는 예상치입니다",
          description:
            "한국전력 공개 요금표로 계산해요. 할인·미납 등 개별 조건은 반영되지 않아 실제 청구서와 차이가 날 수 있어요.",
          onConfirm: acknowledgeDisclaimer,
        }
      : null;

  return (
    <>
      <HomeInput
        kWh={kWh}
        onKwhChange={handleKwhChange}
        kwhError={kwhError}
        helperText={prefill ? `지난달 ${prefill.kWh}kWh 기록을 불러왔어요` : undefined}
        month={month}
        onMonthChange={setMonth}
        showSummerChip={month === 7 || month === 8}
        lastRecord={prefill}
        onSubmit={handleSubmit}
      />
      <AlertDialog
        open={dialog !== null}
        title={dialog?.title}
        description={dialog?.description}
        alertButton={
          <AlertDialog.AlertButton onClick={() => dialog?.onConfirm()}>확인</AlertDialog.AlertButton>
        }
        onClose={() => dialog?.onConfirm()}
      />
    </>
  );
}
