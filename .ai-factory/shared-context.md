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

export type Bill = { id: string; recordedAt: string; usageKwh: number; amountKrw: number; monthKey: MonthKey };

export type Profile = { id: string; region: string; memberCount: number; updatedAt: string };

export type Appliance = { id: string; category: string; estimatedMonthlyKwh: number; isActive: boolean };

export type RateStage = { min: number; max: number; unitPrice: number; rangeKwh: number; chargeKrw: number };

export type RateTableRow = RateStage;

export type MonthKey = string;

export type RouteState = { pathname: "/" | "/result" | "/history" | "/simulate" | "/report" | "/region" | "/settings"; params?: Record<string, unknown> };

export type CalculateBillInput = { usageKwh: number; rateTable: RateTableRow[] };

export type CalculateBillResult = { totalKrw: number; breakdown: RateStage[] };

export type calculateBillFn = (input: CalculateBillInput) => CalculateBillResult;

export type ValidateAmountResult = { isValid: boolean; error?: string };

export type validateAmountFn = (value: unknown) => ValidateAmountResult;

export type validateUsageKwhFn = (value: unknown) => ValidateAmountResult;

export type StorageResult<T> = { ok: true; data: T } | { ok: false; error: string };

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
    appliances.ts
    contract.ts
    profile.ts
    records.ts
    storage.ts
    types.ts
    unlocks.ts
    utils.ts
  main.tsx
  pages/
    History.tsx
    Home.tsx
    HomeData.tsx
    HomeInput.tsx
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
- appliances.ts: export type AddApplianceResult =; export function getAppliances(): ApplianceItem[]; export function addAppliance(appliance: ApplianceItem): AddApplianceResult; export function updateAppliance(id: string, patch: Partial<ApplianceItem>); export function removeAppliance(id: string)
- contract.ts: export type Bill =; export type Profile =; export type Appliance =; export type RateStage =; export type RateTableRow = RateStage; export type MonthKey = string; export type RouteState =; export type CalculateBillInput =
- profile.ts: export function getProfile(): UserProfile; export function setProfile(patch: Partial<UserProfile>)
- records.ts: export function getRecords(): MeterRecord[]; export function upsertRecord(record: MeterRecord); export function deleteRecord(yearMonth: string)
- storage.ts: export function readJSON<T>(key: string, fallback: T): ReadResult<T>; export function writeJSON<T>(key: string, value: T): WriteResult; export function removeKeys(keys: string[]): void; export function getStorageBytes(): number; export function migrateFlags(): void; export function upsertRecord(record: MeterRecord): WriteResult; export function getItem<T>(key: string): T | null; export function setItem<T>(key: string, value: T): void
- types.ts: export interface StageBreakdown; export interface BillBreakdown; export interface AppFlags
- unlocks.ts: export function getUnlocks(): ReportUnlock[]; export function addUnlock(id: string, now: number); export function pruneUnlocks(now: number); export function hasValidUnlock(id: string, now: number): boolean
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
  lib/appliances.ts → imports: types/domain
  lib/profile.ts → imports: types/domain
  lib/records.ts → imports: types/domain
  lib/unlocks.ts → imports: types/domain
  pages/HomeData.tsx → imports: lib/records, lib/storage, domain/validate, types/domain, types/navigation
  pages/HomeInput.tsx → imports: components/ScreenScaffold, components/Card, components/SummaryHero, components/Amount, types/domain
  pages/Report.tsx → imports: components/ScreenScaffold, components/Card, components/SummaryHero, components/ReportGate, data/savingTips, lib/utils, types/domain
  pages/Result.tsx → imports: components/ScreenScaffold, components/SummaryHero, components/Amount, components/Card, components/MiniBar, components/BottomCTA, domain/calculateBill, domain/stage, domain/rateTable, lib/utils, lib/storage, lib/types, types/navigation
  pages/Settings.tsx → imports: components/ScreenScaffold, components/ProfileSheet, hooks/useProfile, lib/storage, data/regionAverage.json, types/domain
  pages/Simulate.tsx → imports: components/ScreenScaffold, components/SummaryHero, components/Card, components/StateView, components/BottomCTA, components/ApplianceSheet, hooks/useAppliances, domain/simulate, domain/stage, lib/utils, types/navigation
CRITICAL: Before creating any new function, type, or component, check the list above. If something similar exists, import and use it.

## Already Implemented (do NOT duplicate or overwrite)
- 0001: 엔티티 타입 + RouteState 계약 정의 (files: src/types/domain.ts, src/types/navigation.ts, src/types/storage.ts)
- 0002: 요금표 상수 + 정적 카탈로그 데이터 (files: src/domain/rateTable.ts, src/data/applianceCatalog.ts, src/data/savingTips.ts, src/data/regionAverage.json)
- 0003: calculateBill 계산 엔진 + CP-6 픽스처 테스트 (files: src/domain/calculateBill.ts, src/domain/__tests__/calculateBill.test.ts)
- 0004: 구간 헬퍼 + 입력 검증기 (files: src/domain/stage.ts, src/domain/validate.ts, src/domain/calculateBill.ts, src/domain/__tests__/stage.test.ts)
- 0005: localStorage 저수준 래퍼 + 플래그 마이그레이션 (files: src/lib/storage.ts, src/lib/__tests__/storage.test.ts)
- 0006: 엔티티 CRUD 리포지토리 (records/profile/appliances/unlocks) (files: src/lib/records.ts, src/lib/profile.ts, src/lib/appliances.ts, src/lib/unlocks.ts, src/lib/__tests__/repos.test.ts)
- 0007: 파생 계산 (YoY 비교 / 시뮬레이션 / 지역 비교) (files: src/domain/compare.ts, src/domain/simulate.ts, src/domain/__tests__/derive.test.ts)
- 0008: S1 홈 화면 — 사용량 입력 · 월 선택 · 예상치 고지 (/) (files: src/pages/HomeInput.tsx, src/pages/HomeData.tsx)
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
- heal-1-02: 0006 엔티티 CRUD 리포지토리 완성 — records/profile/appliances/unlocks (files: src/lib/records.ts, src/lib/profile.ts, src/lib/appliances.ts, src/lib/unlocks.ts, src/lib/__tests__/repos.test.ts)
- heal-1-03: 0008 홈 화면(/) 완성 — HomeInput/HomeData 분할 구현 및 전 라우트 스모크 복구 (files: src/pages/HomeInput.tsx, src/pages/HomeData.tsx, src/types/navigation.ts)

## Available exports from existing files
// src/App.tsx
export default function App() {

// src/components/Amount.tsx
export function Amount({

// src/components/ApplianceSheet.tsx
export interface ApplianceSheetProps {
export function ApplianceSheet({

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

// src/components/ProfileSheet.tsx
export interface ProfileSheetProps {
export function ProfileSheet({ open, onClose, profile, setProfile, onChange }: ProfileSheetProps) {

// src/components/ReportGate.tsx
export function ReportGate({ applianceId, children }: ReportGateProps) {

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

// src/components/TrendCard.tsx
export function TrendCard({ records }: { records: MeterRecord[] }) {

// src/components/YoyCompareCard.tsx
export function YoyCompareCard({ records }: { records: MeterRecord[] }) {

// src/data/applianceCatalog.ts
export interface ApplianceCatalogItem {
export const APPLIANCES: ApplianceCatalogItem[] = [

// src/data/savingTips.ts
export const SAVING_TIPS: Record<string, [string, string, string]> = {

// src/domain/calculateBill.ts
export { getStage, getNextStageGap };
export function calcul

## Memory Index (자동 학습 — 힌트로만 사용, 실제 코드 확인 필수)

Available topics: deploy(1), general(10), testing(1), ui(1)

Key lessons (verify against actual code before applying):
- [general] 저장·데이터 접근 등 기반 계층 패킷은 이를 import 하는 화면 패킷보다 반드시 먼저 완료·병합하고, 미완료면 상위 화면 패킷 병합을 차단하라 — 빈 기반 모듈 하나가 전 라우트 스모크를 무너뜨린다. (60% · 이 앱)
- [general] 외부에서 들어온 모든 값(라우터 state, 로컬 저장소, 부분 입력 폼)은 사용 직전에 배열·객체 기본값으로 정규화하고, 테이블/맵 조회 결과는 존재 확인 후에만 하위 속성이나 length에 접근하라. (60% · 타 앱 1회 — 맹신 금지)
- [general] 의존 그래프 최하층의 타입·계약 파일은 런타임 코드 0줄의 순수 선언으로 가장 먼저 단독 타입체크를 통과시키고, 파일 생성은 셸 명령이 아닌 허용된 편집 도구로만 하게 강제하라. (60% · 타 앱 1회 — 맹신 금지)
- [general] 영속 저장소에서 읽은 값은 항상 스키마 기본값으로 정규화해 배열·객체 타입을 보장한 뒤 반환하고, 화면은 빈/손상/부분 데이터에서도 렌더되도록 방어하라. (60% · 타 앱 1회 — 맹신 금지)
- [general] 정책·기능 제거형 리팩터링은 화면과 도메인 로직 레이어에서만 수행하고, package.json의 플랫폼 필수 의존성(디자인 시스템·플랫폼 SDK·프레임워크 코어)은 어떤 경우에도 삭제하지 말 것 — 필수 패키지 화이트리스트를 빌드 전 가드로 검증하라. (60% · 타 앱 1회 — 맹신 금지)