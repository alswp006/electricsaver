/**
 * 패킷 간 인터페이스 계약 — 자동 생성. **수정하지 마라.**
 *
 * 기반 패킷은 여기 선언된 모양 그대로 구현하고, 화면 패킷은 여기 적힌 이름·인자·반환
 * 타입을 그대로 가정해도 된다. 추측이 어긋나 병합에서 무너지는 것을 막기 위한 파일이다.
 */

/** 검침 기록 엔티티 (구현: 패킷 0001) */
export type BillRecord = { id: string; date: string; usageKwh: number; billKrw: number; memo?: string };

/** 사용자 프로필 (구현: 패킷 0001) */
export type Profile = { regionCode: string; householdCount: number; updated: string };

/** 가전 엔티티 (구현: 패킷 0001) */
export type Appliance = { id: string; name: string; category: string; powerW: number; monthlyHourEst: number };

/** 라우트 상태 (구현: 패킷 0001) */
export type RouteState = { page: 'home'|'result'|'history'|'simulate'|'report'|'region'|'settings'; params?: { [key: string]: any } };

/** 요금 구간 테이블 (구현: 패킷 0002) */
export type RateTable = { name: string; stages: Array<{ upperKwh: number; unitKrw: number }> };

/** 월 요금 계산 엔진 (구현: 패킷 0003) */
export type calculateBillFn = (usageKwh: number, profile: Profile, rate: RateTable) => { baseKrw: number; discountKrw: number; totalKrw: number };

/** 사용량 입력 검증 (구현: 패킷 0004) */
export type validateUsageFn = (value: string | number) => { valid: boolean; error?: string; normalized?: number };

/** 지역별 평균 사용량·요금 (상수) (구현: 패킷 0002) */
export type regionAverages = { [key: string]: { avgKwh: number; avgKrw: number } };

/** 가전 카탈로그 (상수) (구현: 패킷 0002) */
export type applianceCatalog = Appliance[];

/** 절감 팁 카드 콘텐츠 (상수) (구현: 패킷 0002) */
export type savingTips = Array<{ title: string; desc: string; icon: string }>;

/** 전년 동월 비교 계산 (구현: 패킷 0007) */
export type compareYoYFn = (current: BillRecord, previous: BillRecord) => { diffKwh: number; diffPercent: number; trendIcon: 'up'|'down'|'flat' };

/** 가전 추가 후 사용량 시뮬레이션 (구현: 패킷 0007) */
export type simulateUsageFn = (baseUsage: Omit<BillRecord, 'id'>, appliances: Appliance[], reduction: number) => { projectedKwh: number; projectedKrw: number };

/** 검침 기록 CRUD 훅 (구현: 패킷 0006) */
export type useRecordsFn = () => { list: () => BillRecord[]; save: (r: BillRecord) => void; delete: (id: string) => void };

/** 프로필 CRUD 훅 (구현: 패킷 0006) */
export type useProfileFn = () => { get: () => Profile|null; set: (p: Partial<Profile>) => void };

/** 가전 CRUD 훅 (구현: 패킷 0006) */
export type useAppliancesFn = () => { list: () => Appliance[]; add: (a: Appliance) => void; update: (id: string, a: Partial<Appliance>) => void; delete: (id: string) => void };

/** 검침 기록 자동 저장 (구현: 패킷 0010) */
export type useAutoSaveRecordFn = (record: BillRecord) => void;

/** 리포트 열람권 관리 (구현: 패킷 0016) */
export type useReportUnlockFn = () => { canView: boolean; unlock: () => Promise<void>; resetAt?: string };
