/**
 * 패킷 간 인터페이스 계약 — 자동 생성. **수정하지 마라.**
 *
 * 기반 패킷은 여기 선언된 모양 그대로 구현하고, 화면 패킷은 여기 적힌 이름·인자·반환
 * 타입을 그대로 가정해도 된다. 추측이 어긋나 병합에서 무너지는 것을 막기 위한 파일이다.
 */

/** 검침 기록 엔티티 (모든 패킷이 참조) (구현: 패킷 0001) */
export type Record = { id: string; date: string; monthYear: string; usageKwh: number; billKrw: number; region: string; householdSize: number };

/** 사용자 프로필 엔티티 (구현: 패킷 0001) */
export type Profile = { region: string; householdSize: number; unlockCount: number };

/** 가전 엔티티 (시뮬레이션/카탈로그에서 사용) (구현: 패킷 0001) */
export type Appliance = { id: string; name: string; monthlyUsageKwh: number; unlocked: boolean };

/** 리포트 열람권 엔티티 (구현: 패킷 0001) */
export type Unlock = { id: string; unlockedAt: string; expiresAt: string };

/** 라우팅 상태 (App.tsx가 관리) (구현: 패킷 0001) */
export type RouteState = { page: 'home' | 'result' | 'history' | 'simulate' | 'report' | 'region' | 'settings'; recordId?: string };

/** 요금표 구간 (calculateBill이 사용) (구현: 패킷 0002) */
export type RateSegment = { min: number; max: number; unitPriceKrw: number };

/** 월별 요금 테이블 (구현: 패킷 0002) */
export type RateTable = { season: 'summer' | 'winter' | 'other'; segments: RateSegment[]; basicFeeKrw: number };

/** 가전 카탈로그 항목 (ApplianceSheet에서 참조) (구현: 패킷 0002) */
export type ApplianceCatalogItem = { id: string; name: string; categoryKrw: string; avgMonthlyKwh: number; savingTips: string[] };

/** 지역별 평균값 (Region 화면에서 사용) (구현: 패킷 0002) */
export type RegionAverage = { region: string; avgMonthlyKwh: number; avgBillKrw: number };

/** 계산된 요금 결과 (Result 렌더링에서 사용) (구현: 패킷 0003) */
export type BillResult = { groundKwh: number; chargesBySegment: { segment: number; kwh: number; priceKrw: number }[]; basicFeeKrw: number; totalBillKrw: number; effectiveUnitPriceKrw: number };

/** 핵심 계산 엔진 (0008, 0009, 0013에서 호출) (구현: 패킷 0003) */
export type calculateBillFn = (usageKwh: number, monthYear: string, appliances: Appliance[]) => BillResult;

/** 사용량 입력 검증 (구현: 패킷 0004) */
export type validateUsageKwhFn = (usage: unknown) => { valid: boolean; error?: string };

/** 월 입력 검증 (구현: 패킷 0004) */
export type validateMonthYearFn = (month: unknown) => { valid: boolean; error?: string };

/** 사용량에 해당하는 구간 인덱스 (Result/Simulate에서 배지 렌더링) (구현: 패킷 0004) */
export type getStageIndexFn = (kwh: number, rateTable: RateTable) => number;

/** 검침 기록 CRUD (0008, 0010, 0011이 사용) (구현: 패킷 0006) */
export type RecordRepository = { create(record: Omit<Record, 'id'>): { ok: true; id: string } | { ok: false; error: string }; list(): Record[]; delete(id: string): { ok: boolean } };

/** 프로필 저장소 (0018, 0017에서 사용) (구현: 패킷 0006) */
export type ProfileRepository = { get(): Profile; set(p: Partial<Profile>): { ok: boolean } };

/** 가전 CRUD (0014, 0013에서 사용) (구현: 패킷 0006) */
export type ApplianceRepository = { list(): Appliance[]; upsert(a: Appliance): { ok: boolean }; delete(id: string): { ok: boolean } };

/** 열람권 저장소 (0016에서 사용) (구현: 패킷 0006) */
export type UnlockRepository = { list(): Unlock[]; add(unlockId: string): { ok: boolean }; isUnlocked(unlockId: string, now?: number): boolean };

/** 전월 비교 파생 계산 (YoyCompareCard에서 사용) (구현: 패킷 0007) */
export type compareWithPreviousMonthFn = (currentRecord: Record, previousRecord?: Record) => { deltaKwh: number; deltaPercentage: number; trendArrow: 'up' | 'down' | 'flat' };

/** 가전 추가/제거 시나리오 시뮬레이션 (Simulate 화면에서 사용) (구현: 패킷 0007) */
export type simulateWithAppliancesFn = (baseKwh: number, appliances: Appliance[], scenario: { addAppliances?: Appliance[]; removeApplianceIds?: string[] }) => { projectedKwh: number; projectedBillKrw: number; savingsKrw: number };

/** 지역 평균과의 비교 계산 (Region 화면에서 사용) (구현: 패킷 0007) */
export type getRegionComparisonFn = (userKwh: number, region: string) => { userPercentile: number; averageKwh: number; averageBillKrw: number };

/** Result 화면의 자동 저장 훅 (구현: 패킷 0010) */
export type useAutoSaveRecordFn = (record: Omit<Record, 'id'>) => { isSaved: boolean; error?: string };

/** Result 화면 네비게이션 보호 (recordId 검증) (구현: 패킷 0010) */
export type useResultGuardFn = (recordId: string | undefined) => { record: Record | null; isLoading: boolean; notFound: boolean };

/** 가전 목록 관리 훅 (ApplianceSheet, Simulate에서 사용) (구현: 패킷 0014) */
export type useAppliancesFn = () => { list: Appliance[]; add(a: Appliance): void; remove(id: string): void; update(id: string, patch: Partial<Appliance>): void };

/** 리포트 열람권 관리 훅 (ReportGate에서 사용) (구현: 패킷 0016) */
export type useReportUnlockFn = (unlockId: string) => { isUnlocked: boolean; remainingHours: number; unlock(): Promise<{ ok: boolean }> };

/** 프로필 편집 훅 (ProfileSheet, HomeData에서 사용) (구현: 패킷 0018) */
export type useProfileFn = () => { profile: Profile; update(p: Partial<Profile>): Promise<{ ok: boolean }>; isLoading: boolean };
