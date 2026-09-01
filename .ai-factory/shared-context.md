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

```

## Shared Types Contract (IMPORT these, do NOT redefine)
```typescript
export type ContractType = "low" | "high";

export interface TariffTier {
  limitKWh: number | null;
  rate: number;
  baseFee: number;
}

export interface TariffTable {
  version: string;
  effectiveFrom: string;
  sourceLabel: string;
  summerMonths: number[];
  climateRate: number;
  fuelAdjRate: number;
  vatRate: number;
  fundRate: number;
  normal: Record<ContractType, TariffTier[]>;
  summer: Record<ContractType, TariffTier[]>;
}

export interface BillInput {
  kWh: number;
  yearMonth: string;
  contractType: ContractType;
}

export interface TierUsage {
  tier: 1 | 2 | 3;
  kWh: number;
  rate: number;
  fee: number;
}

export interface BillBreakdown {
  input: BillInput;
  isSummerRelief: boolean;
  tariffVersion: string;
  baseFee: number;
  tiers: TierUsage[];
  energyFee: number;
  climateFee: number;
  fuelAdjFee: number;
  subtotal: number;
  vat: number;
  fund: number;
  total: number;
  marginalRate: number;
}

export interface UsageRecord {
  id: string;
  yearMonth: string;
  kWh: number;
  contractType: ContractType;
  total: number;
  tariffVersion: string;
  createdAt: number;
  updatedAt: number;
}

export interface AppSettings {
  contractType: ContractType;
  regionCode: string;
  householdSize: 1 | 2 | 3 | 4;
  lastYearMonth: string | null;
}

export interface ApplianceCut {
  applianceId: string;
  cutHoursPerDay: number;
}

export interface SimulationInput {
  baseRecordId: string;
  cuts: ApplianceCut[];
  days: number;
}

export type ReportUnlock = Record<string, number>;

export interface Appliance {
  id: string;
  name: string;
  watt: number;
  defaultHours: number;
  icon: string;
}

export interface RegionAverageEntry {
  regionCode: string;
  regionName: string;
  monthly: Record<string, number>;
}

export type RouteState = {
  "/": void;
  "/result": { input: BillInput } | null;
  "/simulate": { recordId: string; input: BillInput } | null;
  "/report": {
    recordId: string;
    input: BillInput;
    cuts: ApplianceCut[];
    savedWon: number;
  } | null;
  "/history": void;
  "/compare": void;
};

export const STORAGE_KEYS = {
  records: "es:records:v1",
  settings: "es:settings:v1",
  sim: "es:sim:last:v1",
  reportUnlock: "es:report_unlock:v1",
} as const;

```

## Existing Codebase (import and use these — do NOT recreate)
### File Tree (src/)
  App.tsx
  components/
    AdSlot.tsx
    Amount.tsx
    ApplianceStepperCard.tsx
    BottomCTA.tsx
    Card.tsx
    CountUp.tsx
    FloatingTabBar.tsx
    MiniBar.tsx
    PageShell.tsx
    ReportGate.tsx
    ScreenScaffold.tsx
    Sparkline.tsx
    StateView.tsx
    SummaryHero.tsx
    TossPurchase.tsx
    TossRewardAd.tsx
    YoYCard.tsx
    __tests__/
  data/
    region-average.json
  domain/
    __tests__/
    appliances.ts
    calcBill.ts
    compare.ts
    rounding.ts
    simulate.ts
    tariff.ts
    tips.ts
    validation.ts
  hooks/
    __tests__/
    useQuotaToast.ts
  lib/
    __tests__/
    contract.ts
    recordStore.ts
    safeStorage.ts
    settingsStore.ts
    simStore.ts
    storage.ts
    types.ts
    unlockStore.ts
    utils.ts
  main.tsx
  pages/
    History.tsx
    Home.tsx
    Result.tsx
    __TdsGallery.tsx
  styles/
    globals.css
    reward-ad.css
  types/
  vite-env.d.ts

### Exports (src/lib/)
- contract.ts: export type Bill =; export type DomainInput =; export type RouteState =; export type calcBillFn = (input: DomainInput) => Bill; export type roundToNearestFn = (value: number, unit?: number) => number; export type validateUsageFn = (value: number) =>; export type compareYoYFn = (currentMonth: Bill, previousYearMonth: Bill) =>; export type recordStoreFn =
- recordStore.ts: export function listRecords(): UsageRecord[]; export function getLatestRecord(): UsageRecord | null; export type UpsertResult = WriteResult & UsageRecord; export function upsertRecord(rec: UsageRecord): UpsertResult; export function removeRecord(id: string): WriteResult; export function pruneRecords(): WriteResult; export const recordStore: recordStoreFn =
- safeStorage.ts: export type WriteResult =; export function readJson<T = unknown>(key: string, fallback: T): any; export function writeJson<T = unknown>(key: string, value: T): WriteResult
- settingsStore.ts: export function getSettings(): AppSettings; export function saveSettings(patch: Partial<AppSettings>): AppSettings
- simStore.ts: export function getLastSim(): SimulationInput | null; export function saveSim(input: SimulationInput): SimulationInput
- storage.ts: export function getItem<T>(key: string): T | null; export function setItem<T>(key: string, value: T): void; export function removeItem(key: string): void
- types.ts: export type ContractType = "low" | "high"; export interface TariffTier; export interface TariffTable; export interface BillInput; export interface TierUsage; export interface BillBreakdown; export interface UsageRecord; export interface AppSettings
- unlockStore.ts: export function isUnlocked(recordId: string): boolean; export function unlock(recordId: string): void
- utils.ts: export function cn(...classes: (string | boolean | undefined | null)[]): string; export function formatNumber(n: number): string; export function formatCurrency(n: number, currency = 'KRW'): string

### Components (src/components/)
- AdSlot.tsx: AdSlot
- Amount.tsx: Amount
- ApplianceStepperCard.tsx: ApplianceStepperCard
- BottomCTA.tsx: SubmitFooter, ButtonStack
- Card.tsx: Card
- CountUp.tsx: CountUp
- FloatingTabBar.tsx: FloatingTabBar
- MiniBar.tsx: MiniBar
- PageShell.tsx: PageShell
- ReportGate.tsx: ReportGate
- ScreenScaffold.tsx: ScreenScaffold
- Sparkline.tsx: Sparkline
- StateView.tsx: EmptyState, LoadingState
- SummaryHero.tsx: SummaryHero
- TossPurchase.tsx: TossPurchase
- TossRewardAd.tsx: TossRewardAd
- YoYCard.tsx: YoYCard

### Module Dependencies (import graph)
  lib/recordStore.ts → imports: lib/types, lib/types, lib/safeStorage, lib/contract, domain/tariff
  lib/settingsStore.ts → imports: lib/types, lib/types, lib/safeStorage
  lib/simStore.ts → imports: lib/types, lib/types, lib/safeStorage
  lib/unlockStore.ts → imports: lib/types, lib/types, lib/safeStorage
  pages/History.tsx → imports: components/ScreenScaffold, components/Sparkline, components/StateView, components/AdSlot, components/FloatingTabBar, lib/recordStore, hooks/useQuotaToast, lib/types
  pages/Home.tsx → imports: components/ScreenScaffold, components/BottomCTA, components/AdSlot, components/StateView, lib/settingsStore, domain/validation, lib/types
  pages/Result.tsx → imports: components/ScreenScaffold, components/SummaryHero, components/Amount, components/MiniBar, components/YoYCard, components/BottomCTA, components/AdSlot, domain/calcBill, domain/compare, lib/recordStore, hooks/useQuotaToast, lib/types
CRITICAL: Before creating any new function, type, or component, check the list above. If something similar exists, import and use it.

## Already Implemented (do NOT duplicate or overwrite)
- 0001: 도메인 타입 + RouteState 계약 정의 (files: src/lib/types.ts)
- 0002: 정적 데이터 상수 (요금표·가전·팁·지역평균) (files: src/domain/tariff.ts, src/domain/appliances.ts, src/domain/tips.ts, src/data/region-average.json)
- 0003: 누진요금 계산 엔진 calcBill + 반올림 유틸 (files: src/domain/calcBill.ts, src/domain/rounding.ts, src/domain/__tests__/calcBill.test.ts)
- 0004: 입력 검증 + 비교/시뮬레이션 순수 함수 (files: src/domain/validation.ts, src/domain/compare.ts, src/domain/simulate.ts, src/domain/__tests__/simulate.test.ts)
- 0005: safeStorage 기반 계층 (CC-12 대응) (files: src/lib/safeStorage.ts, src/lib/__tests__/safeStorage.test.ts)
- 0006: recordStore (list/upsert/remove/prune/latest) (files: src/lib/recordStore.ts, src/lib/__tests__/recordStore.test.ts)
- 0007: settingsStore · simStore · unlockStore (files: src/lib/settingsStore.ts, src/lib/simStore.ts, src/lib/unlockStore.ts, src/lib/__tests__/stores.test.ts)
- 0008: useQuotaToast 훅 (저장 실패 공통 처리) (files: src/hooks/useQuotaToast.ts, src/hooks/__tests__/useQuotaToast.test.tsx)
- 0009: SummaryHero · Amount · MiniBar · Sparkline 컴포넌트 (files: src/components/SummaryHero.tsx, src/components/Amount.tsx, src/components/MiniBar.tsx, src/components/Sparkline.tsx)
- 0010: YoYCard (전년 동월 비교 카드) (files: src/components/YoYCard.tsx, src/components/__tests__/YoYCard.test.tsx)
- 0011: ApplianceStepperCard (가전 8행 스텝퍼) (files: src/components/ApplianceStepperCard.tsx, src/components/__tests__/ApplianceStepperCard.test.tsx)
- 0012: ReportGate (리워드 광고 게이팅 상태머신) (files: src/components/ReportGate.tsx, src/components/__tests__/ReportGate.test.tsx)
- 0013: 홈 화면 `/` (사용량 입력) (files: src/pages/Home.tsx)
- 0014: 결과 화면 `/result` (files: src/pages/Result.tsx)
- 0015: 히스토리 화면 `/history` (files: src/pages/History.tsx)

## Available exports from existing files
// src/App.tsx
export default function App() {

// src/components/AdSlot.tsx
export function AdSlot({ adGroupId, className, variant, theme }: AdSlotProps) {

// src/components/Amount.tsx
export function Amount({

// src/components/ApplianceStepperCard.tsx
export function ApplianceStepperCard({

// src/components/BottomCTA.tsx
export function SubmitFooter({
export function ButtonStack({

// src/components/Card.tsx
export function Card({

// src/components/CountUp.tsx
export function CountUp({

// src/components/FloatingTabBar.tsx
export type TabItem = {
export function FloatingTabBar({ items }: { items: TabItem[] }) {

// src/components/MiniBar.tsx
export function MiniBar({

// src/components/PageShell.tsx
export function PageShell({ children, style }: { children: ReactNode; style?: CSSProperties }) {

// src/components/ReportGate.tsx
export function ReportGate({ recordId, children }: ReportGateProps) {

// src/components/ScreenScaffold.tsx
export function ScreenScaffold({

// src/components/Sparkline.tsx
export function Sparkline({

// src/components/StateView.tsx
export function EmptyState({
export function LoadingState({

// src/components/SummaryHero.tsx
export function SummaryHero({

// src/components/TossPurchase.tsx
export interface TossPurchaseResult {
export function TossPurchase({

// src/components/TossRewardAd.tsx
export function TossRewardAd({

// src/components/YoYCard.tsx
export function YoYCard({

// src/domain/appliances.ts
export const APPLIANCES: Appliance[] = [

// src/domain/calcBill.ts
export function calcBill(input: BillInput): BillBreakdown {

// src/domain/compare.ts
export function findYoY(records: UsageRecord[], yearMonth: string): UsageRecord | null {
export function diffPercent(prev: number, curr: number): number {
export function compareYoY(currentMonth: Bill, previousYearMonth: Bill): { delta: number; percent: number } {

// src/domain/rounding.ts
export function floor1(value: number): number {
export function floor10(value: number): nu

## Memory Index (자동 학습 — 힌트로만 사용, 실제 코드 확인 필수)

Available topics: deploy(1), general(10), testing(1), ui(1)

Key lessons (verify against actual code before applying):
- [general] 저장·데이터 접근 등 기반 계층 패킷은 이를 import 하는 화면 패킷보다 반드시 먼저 완료·병합하고, 미완료면 상위 화면 패킷 병합을 차단하라 — 빈 기반 모듈 하나가 전 라우트 스모크를 무너뜨린다. (60% · 타 앱 1회 — 맹신 금지)
- [general] 외부에서 들어온 모든 값(라우터 state, 로컬 저장소, 부분 입력 폼)은 사용 직전에 배열·객체 기본값으로 정규화하고, 테이블/맵 조회 결과는 존재 확인 후에만 하위 속성이나 length에 접근하라. (60% · 타 앱 1회 — 맹신 금지)
- [general] 의존 그래프 최하층의 타입·계약 파일은 런타임 코드 0줄의 순수 선언으로 가장 먼저 단독 타입체크를 통과시키고, 파일 생성은 셸 명령이 아닌 허용된 편집 도구로만 하게 강제하라. (60% · 타 앱 1회 — 맹신 금지)
- [general] 영속 저장소에서 읽은 값은 항상 스키마 기본값으로 정규화해 배열·객체 타입을 보장한 뒤 반환하고, 화면은 빈/손상/부분 데이터에서도 렌더되도록 방어하라. (60% · 타 앱 1회 — 맹신 금지)
- [general] 정책·기능 제거형 리팩터링은 화면과 도메인 로직 레이어에서만 수행하고, package.json의 플랫폼 필수 의존성(디자인 시스템·플랫폼 SDK·프레임워크 코어)은 어떤 경우에도 삭제하지 말 것 — 필수 패키지 화이트리스트를 빌드 전 가드로 검증하라. (60% · 타 앱 1회 — 맹신 금지)