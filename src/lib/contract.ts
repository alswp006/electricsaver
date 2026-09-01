/**
 * 패킷 간 인터페이스 계약 — 자동 생성. **수정하지 마라.**
 *
 * 기반 패킷은 여기 선언된 모양 그대로 구현하고, 화면 패킷은 여기 적힌 이름·인자·반환
 * 타입을 그대로 가정해도 된다. 추측이 어긋나 병합에서 무너지는 것을 막기 위한 파일이다.
 */

export type Bill = { id: string; recordedAt: string; usageKwh: number; amountKrw: number; monthKey: MonthKey };

export type Profile = { id: string; region: string; memberCount: number; updatedAt: string };

export type Appliance = { id: string; category: string; estimatedMonthlyKwh: number; isActive: boolean };

export type RateStage = { min: number; max: number; unitPrice: number; rangeKwh: number; chargeKrw: number };

export type MonthKey = string;

export type RouteState = { pathname: "/" | "/result" | "/history" | "/simulate" | "/report" | "/region" | "/settings"; params?: Record<string, unknown> };

export type CalculateBillInput = { usageKwh: number; rateTable: RateTableRow[] };

export type CalculateBillResult = { totalKrw: number; breakdown: RateStage[] };

export type calculateBillFn = (input: CalculateBillInput) => CalculateBillResult;

export type ValidateAmountResult = { isValid: boolean; error?: string };

export type validateAmountFn = (value: unknown) => ValidateAmountResult;

export type validateUsageKwhFn = (value: unknown) => ValidateAmountResult;

export type StorageResult = { ok: true; data: T } | { ok: false; error: string };

export type getItemFn = <T>(key: string, schema?: object) => StorageResult<T>;

export type setItemFn = <T>(key: string, value: T) => StorageResult<void>;

export type removeItemFn = (key: string) => StorageResult<void>;

export type RecordsRepository = { create(bill: Omit<Bill, "id" | "recordedAt">): Promise<Bill>; getAll(): Promise<Bill[]>; getByMonth(monthKey: MonthKey): Promise<Bill | null>; delete(id: string): Promise<boolean> };

export type ProfileRepository = { get(): Promise<Profile | null>; upsert(data: Omit<Profile, "id" | "updatedAt">): Promise<Profile> };

export type AppliancesRepository = { create(app: Omit<Appliance, "id">): Promise<Appliance>; getAll(): Promise<Appliance[]>; update(id: string, data: Partial<Appliance>): Promise<Appliance>; delete(id: string): Promise<boolean> };

export type UnlocksRepository = { getReportUnlockTime(): Promise<string | null>; setReportUnlockTime(isoString: string): Promise<void> };

export type YoyCompareResult = { currentMonthKrw: number; lastYearMonthKrw: number; ratioPercent: number };

export type compareBillYoYFn = (currentBill: Bill, lastYearBill?: Bill) => YoyCompareResult;

export type SimulateInput = { baseUsageKwh: number; appliances: Appliance[]; rateTable: RateTableRow[] };

export type SimulateResult = { estimatedKrw: number; savedComparedToBase: number };

export type simulateBillFn = (input: SimulateInput) => SimulateResult;
