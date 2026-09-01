import { useCallback, useEffect, useRef, useState } from "react";

/** @toss/tds-mobile Toast.ToastProps 부분집합 — 훅은 스프레드용 props만 반환한다 */
export interface QuotaToastProps {
  open: boolean;
  position: "bottom";
  text: string;
  duration: number;
  onClose: () => void;
}

export const QUOTA_TOAST_MESSAGE =
  "저장 공간이 부족해요. 오래된 기록을 삭제해주세요";
const TOAST_DURATION_MS = 3000;

export function useQuotaToast() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleClose = useCallback(() => {
    setOpen(false);
  }, []);

  const showToast = useCallback((message: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setText(message);
    setOpen(true);
    timerRef.current = setTimeout(() => {
      setOpen(false);
    }, TOAST_DURATION_MS);
  }, []);

  const showQuotaToast = useCallback(() => {
    showToast(QUOTA_TOAST_MESSAGE);
  }, [showToast]);

  const toastProps: QuotaToastProps = {
    open,
    position: "bottom",
    text,
    duration: TOAST_DURATION_MS,
    onClose: handleClose,
  };

  return { toastProps, showQuotaToast, showToast };
}
