/**
 * 패킷 간 인터페이스 계약 — 자동 생성. **수정하지 마라.**
 *
 * 기반 패킷은 여기 선언된 모양 그대로 구현하고, 화면 패킷은 여기 적힌 이름·인자·반환
 * 타입을 그대로 가정해도 된다. 추측이 어긋나 병합에서 무너지는 것을 막기 위한 파일이다.
 */

/** 누진요금 계산 결과 및 히스토리 저장의 기본 단위 (구현: 패킷 0001) */
export type Bill = { id: string; date: string; usage: number; amountKrw: number; tariffTier: string; breakdown?: Record<string, number> };

/** 사용자 입력 정규화된 형태 (구현: 패킷 0001) */
export type DomainInput = { usageKwh: number; appliances?: Record<string, number>; month?: string; regionCode?: string };

/** 라우터가 관리하는 앱 전역 상태 (구현: 패킷 0001) */
export type RouteState = { currentRoute: 'home' | 'result' | 'history' | 'simulate' | 'report' | 'compare'; bill?: Bill; simResult?: Bill[] };

/** 핵심 누진요금 계산 엔진 (구현: 패킷 0003) */
export type calcBillFn = (input: DomainInput) => Bill;

/** 반올림 유틸, calcBill 내부 + 외부 포맷팅에서 재사용 (구현: 패킷 0003) */
export type roundToNearestFn = (value: number, unit?: number) => number;

/** 입력값 검증 (구현: 패킷 0004) */
export type validateUsageFn = (value: number) => { valid: boolean; error?: string };

/** 전년 동월 비교 계산 (구현: 패킷 0004) */
export type compareYoYFn = (currentMonth: Bill, previousYearMonth: Bill) => { delta: number; percent: number };

/** 히스토리 저장/조회 퍼블릭 API (구현: 패킷 0006) */
export type recordStoreFn = { list: () => Promise<Bill[]>; upsert: (b: Bill) => Promise<void>; remove: (id: string) => Promise<void>; prune: (daysOld: number) => Promise<void>; latest: () => Promise<Bill | null> };

/** 사용자 설정 저장소 퍼블릭 API (구현: 패킷 0007) */
export type settingsStoreFn = { get: (key: string) => Promise<any>; set: (key: string, val: any) => Promise<void> };

/** 저장 실패 공통 처리 훅 (구현: 패킷 0008) */
export type useQuotaToastFn = () => (error: Error) => void;

/** 요약 영웅 컴포넌트 props (구현: 패킷 0009) */
export type SummaryHero = { bill: Bill; loading?: boolean };

/** 전년 동월 비교 카드 props (구현: 패킷 0010) */
export type YoYCard = { current: Bill; previous: Bill };

/** 가전 스텝퍼 카드 props (구현: 패킷 0011) */
export type ApplianceStepperCard = { applianceId: string; current: number; onUpdate: (val: number) => void };
