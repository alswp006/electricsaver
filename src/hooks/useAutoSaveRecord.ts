import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { upsertRecord } from "@/lib/storage";

const QUOTA_TOAST_MESSAGE = "저장 공간이 부족해요";

export interface AutoSaveRecordState {
  yearMonth: string;
  kWh: number;
  total: number;
}

function isAutoSaveRecordState(value: unknown): value is AutoSaveRecordState {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return typeof v.yearMonth === "string" && typeof v.kWh === "number" && typeof v.total === "number";
}

export interface UseAutoSaveRecordResult {
  toastMessage: string | null;
}

export function useAutoSaveRecord(): UseAutoSaveRecordResult {
  const location = useLocation();
  const savedYearMonthRef = useRef<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const state = isAutoSaveRecordState(location.state) ? location.state : null;

  // 호출 페이지가 Toast를 직접 배치하지 않아도 보이도록, 페이지 트리와 무관한 body 리전에
  // 자체적으로 알린다(React 트리 밖 — 별도 root의 동기 unmount 경합을 피한다). 페이지는
  // toastMessage 값만 참고해 TDS Toast로 다시 감싸 표시해도 된다.
  useEffect(() => {
    if (!toastMessage) return;

    const el = document.createElement("div");
    el.setAttribute("role", "status");
    el.textContent = toastMessage;
    document.body.appendChild(el);

    return () => {
      el.remove();
    };
  }, [toastMessage]);

  useEffect(() => {
    if (!state) return;
    if (savedYearMonthRef.current === state.yearMonth) return;
    savedYearMonthRef.current = state.yearMonth;

    Promise.resolve(
      upsertRecord({
        yearMonth: state.yearMonth,
        kWh: state.kWh,
        total: state.total,
        createdAt: Date.now(),
      }),
    ).then((result) => {
      if (result.ok) return;
      if (result.reason === "quota") {
        setToastMessage(QUOTA_TOAST_MESSAGE);
      }
    });
  }, [state]);

  return { toastMessage };
}
