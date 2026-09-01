/**
 * 패킷 간 인터페이스 계약 — 자동 생성. **수정하지 마라.**
 *
 * 기반 패킷은 여기 선언된 모양 그대로 구현하고, 화면 패킷은 여기 적힌 이름·인자·반환
 * 타입을 그대로 가정해도 된다. 추측이 어긋나 병합에서 무너지는 것을 막기 위한 파일이다.
 */

export type Record = { id: string; date: string; usageKwh: number; amountKrw: number; region?: string };

export type Appliance = { id: string; name: string; categoryId: string; estimatedKwhPerMonth?: number; color?: string };

export type Profile = { region: string; householdSize: number; lastUpdated?: string };

export type BillBreakdown = { totalKrw: number; stages: Array<{ from: number; to: number; rateKrw: number; usageKwh: number; costKrw: number }>; appliances?: Record<string, number> };

export type Unlock = { reportViewable: boolean; lastRewardAdAt?: string; monthlyViewCount: number };

export type RateTable = { year: number; region: string; stages: Array<{ from: number; to: number; rateKrw: number }> };

export type RouteState = { view: 'home' | 'result' | 'history' | 'simulate' | 'report' | 'region' | 'settings'; queryParams?: Record<string, string> };

export type calculateBillFn = (usageKwh: number, rate: RateTable) => BillBreakdown;

export type validateUsageFn = (value: string | number) => { valid: boolean; error?: string; normalized?: number };

export type getRecordsFn = () => Record[];

export type saveRecordFn = (record: Record) => void;

export type deleteRecordFn = (recordId: string) => void;

export type getProfileFn = () => Profile;

export type setProfileFn = (profile: Profile) => void;

export type getAppliancesFn = () => Appliance[];

export type setAppliancesFn = (appliances: Appliance[]) => void;

export type compareYoYFn = (currentRecord: Record, previousYearRecord?: Record) => { percentChange: number; kwh: number; krw: number };

export type canViewReportFn = () => boolean;

export type unlockReportFn = () => void;

export type useAutoSaveRecordFn = (record: Record | null) => void;
