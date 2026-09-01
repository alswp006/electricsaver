import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

export interface ResultPageState {
  yearMonth: string;
  kWh: number;
  total: number;
  createdAt?: number;
}

function isResultPageState(value: unknown): value is ResultPageState {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return typeof v.yearMonth === "string" && typeof v.kWh === "number" && typeof v.total === "number";
}

export function useResultGuard(): ResultPageState | null {
  const location = useLocation();
  const navigate = useNavigate();
  const state = isResultPageState(location.state) ? location.state : null;

  useEffect(() => {
    if (!state) {
      navigate("/", { replace: true });
    }
  }, [state, navigate]);

  return state;
}
