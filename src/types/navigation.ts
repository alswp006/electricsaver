export interface BillInput {
  yearMonth: string;
  kWh: number;
  month: number;
}

export interface ResultRouteState {
  input: BillInput;
}

export interface SimulateRouteState {
  input: BillInput;
}

export interface ReportRouteState {
  input: BillInput;
}

export type RouteState = ResultRouteState | SimulateRouteState | ReportRouteState;
