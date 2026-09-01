# Shared Context (auto-generated — do NOT modify)


## 패킷 간 계약 (src/lib/contract.ts — 자동 생성, 수정 금지)
여기 선언된 이름·인자·반환 타입은 확정이다. 기반 패킷은 이대로 구현하고,
화면 패킷은 이대로 호출하라. 다르게 만들지 마라.

```typescript
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

```

## Shared Types Contract (IMPORT these, do NOT redefine)
```typescript
// Bill calculation types
export interface StageBreakdown {
  stage: 1 | 2 | 3;
  kWh: number;
  unitPrice: number;
  charge: number;
}

export interface BillBreakdown {
  baseCharge: number;
  energyCharge: number;
  subtotal: number;
  vat: number;
  fund: number;
  total: number;
  stage: 1 | 2 | 3;
  stageBreakdown: StageBreakdown[];
}

// Storage types
export interface AppFlags {
  schemaVersion: 1;
  disclaimerSeenAt: string | null;
}

```

## Existing Codebase (import and use these — do NOT recreate)
### File Tree (src/)
  App.tsx
  components/
    AdSlot.tsx
    Amount.tsx
    ApplianceSheet.tsx
    BottomCTA.tsx
    Card.tsx
    CountUp.tsx
    FloatingTabBar.tsx
    MiniBar.tsx
    PageShell.tsx
    ProfileSheet.tsx
    ReportGate.tsx
    ScreenScaffold.tsx
    Sparkline.tsx
    StateView.tsx
    SummaryHero.tsx
    TossPurchase.tsx
    TossRewardAd.tsx
    TrendCard.tsx
    YoyCompareCard.tsx
  data/
    applianceCatalog.ts
    regionAverage.json
    savingTips.ts
  domain/
    __tests__/
    calculateBill.ts
    compare.ts
    rateTable.ts
    simulate.ts
    stage.ts
    validate.ts
  hooks/
    useAppliances.ts
    useAutoSaveRecord.ts
    useProfile.ts
    useReportUnlock.ts
    useResultGuard.ts
  lib/
    __tests__/
    contract.ts
    storage.ts
    types.ts
    utils.ts
  main.tsx
  pages/
    History.tsx
    Home.tsx
    Region.tsx
    Report.tsx
    Result.tsx
    Settings.tsx
    Simulate.tsx
    __TdsGallery.tsx
  styles/
    globals.css
    reward-ad.css
  types/
    domain.ts
    navigation.ts
    storage.ts
  vite-env.d.ts

### Exports (src/lib/)
- contract.ts: export type BillRecord =; export type Profile =; export type Appliance =; export type RouteState =; export type RateTable =; export type calculateBillFn = (usageKwh: number, profile: Profile, rate: RateTable) =>; export type validateUsageFn = (value: string | number) =>; export type regionAverages =
- storage.ts: export function readJSON<T>(key: string, fallback: T): ReadResult<T>; export function writeJSON<T>(key: string, value: T): WriteResult; export function removeKeys(keys: string[]): void; export function getStorageBytes(): number; export function migrateFlags(): void; export function upsertRecord(record: MeterRecord): WriteResult; export function getItem<T>(key: string): T | null; export function setItem<T>(key: string, value: T): void
- types.ts: export interface StageBreakdown; export interface BillBreakdown; export interface AppFlags
- utils.ts: export function cn(...classes: (string | boolean | undefined | null)[]): string; export function formatNumber(n: number): string; export function formatCurrency(n: number, currency = 'KRW'): string

### Components (src/components/)
- AdSlot.tsx: AdSlot
- Amount.tsx: Amount
- ApplianceSheet.tsx: ApplianceSheet
- BottomCTA.tsx: SubmitFooter, ButtonStack
- Card.tsx: Card
- CountUp.tsx: CountUp
- FloatingTabBar.tsx: FloatingTabBar
- MiniBar.tsx: MiniBar
- PageShell.tsx: PageShell
- ProfileSheet.tsx: ProfileSheet
- ReportGate.tsx: ReportGate
- ScreenScaffold.tsx: ScreenScaffold
- Sparkline.tsx: Sparkline
- StateView.tsx: EmptyState, LoadingState
- SummaryHero.tsx: SummaryHero
- TossPurchase.tsx: TossPurchase
- TossRewardAd.tsx: TossRewardAd
- TrendCard.tsx: TrendCard
- YoyCompareCard.tsx: YoyCompareCard

### Module Dependencies (import graph)
  pages/Report.tsx → imports: components/ScreenScaffold, components/Card, data/savingTips, lib/utils, types/domain
  pages/Result.tsx → imports: components/ScreenScaffold, components/SummaryHero, components/Amount, components/Card, components/MiniBar, components/BottomCTA, domain/calculateBill, domain/stage, domain/rateTable, lib/utils, lib/types, types/navigation
  pages/Settings.tsx → imports: components/ScreenScaffold, components/ProfileSheet, hooks/useProfile, lib/storage, data/regionAverage.json, types/domain
  pages/Simulate.tsx → imports: components/ScreenScaffold, components/SummaryHero, components/Card, components/StateView, components/BottomCTA, components/ApplianceSheet, hooks/useAppliances, domain/simulate, domain/stage, lib/utils, types/navigation
CRITICAL: Before creating any new function, type, or component, check the list above. If something similar exists, import and use it.

## Already Implemented (do NOT duplicate or overwrite)
- 0001: 엔티티 타입 + RouteState 계약 정의 (files: src/types/domain.ts, src/types/navigation.ts, src/types/storage.ts)
- 0002: 요금표 상수 + 정적 카탈로그 데이터 (files: src/domain/rateTable.ts, src/data/applianceCatalog.ts, src/data/savingTips.ts, src/data/regionAverage.json)
- 0003: calculateBill 계산 엔진 + CP-6 픽스처 테스트 (files: src/domain/calculateBill.ts, src/domain/__tests__/calculateBill.test.ts)
- 0004: 구간 헬퍼 + 입력 검증기 (files: src/domain/stage.ts, src/domain/validate.ts, src/domain/calculateBill.ts, src/domain/__tests__/stage.test.ts)
- 0007: 파생 계산 (YoY 비교 / 시뮬레이션 / 지역 비교) (files: src/domain/compare.ts, src/domain/simulate.ts, src/domain/__tests__/derive.test.ts)
- 0009: S2 결과 화면 렌더링 — 히어로·구간 카드·내역 카드 (/result) (files: src/pages/Result.tsx)
- 0010: S2 결과 자동 저장 + state 가드 (files: src/hooks/useResultGuard.ts, src/hooks/useAutoSaveRecord.ts)
- 0011: S3 검침 기록 화면 — 목록·삭제·빈 상태 (/history) (files: src/pages/History.tsx)
- 0012: S3 전년 동월 비교 Chip + 추이 카드 (files: src/components/YoyCompareCard.tsx, src/components/TrendCard.tsx)
- 0013: S4 시뮬레이션 화면 — 히어로·비교 카드·구간 하락 배지 (/simulate) (files: src/pages/Simulate.tsx)
- 0014: S4 가전 추가/편집 BottomSheet + 영속화 (files: src/components/ApplianceSheet.tsx, src/hooks/useAppliances.ts)
- 0015: S5 리포트 본문 — 팁 카드 + state 가드 (/report) (files: src/pages/Report.tsx)
- 0016: S5 TossRewardAd 게이트 + 24시간 열람권 (files: src/components/ReportGate.tsx, src/hooks/useReportUnlock.ts)
- 0017: S6 우리 동네 비교 — 지연 로더 + 히어로 (/region) (files: src/pages/Region.tsx)
- 0018: S6 프로필 BottomSheet (지역·가구원수) (files: src/components/ProfileSheet.tsx, src/hooks/useProfile.ts)
- 0019: S7 설정 화면 — 데이터 관리 · 저장 용량 · 고지 (/settings) (files: src/pages/Settings.tsx)
- 0020: 라우팅 배선 + FloatingTabBar + 전역 Provider (App.tsx 단독 소유) (files: src/App.tsx, src/components/FloatingTabBar.tsx)
- heal-1-01: 0005 storage 래퍼 완성 — 결과객체 기반 localStorage 계층 (files: src/lib/storage.ts, src/lib/__tests__/storage.test.ts)