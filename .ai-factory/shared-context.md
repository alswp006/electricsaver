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

export type UsageRecord = { id: string; date: string; usageKwh: number; amountKrw: number; region?: string };

export type Appliance = { id: string; name: string; categoryId: string; estimatedKwhPerMonth?: number; color?: string };

export type Profile = { region: string; householdSize: number; lastUpdated?: string };

export type BillBreakdown = { totalKrw: number; stages: Array<{ from: number; to: number; rateKrw: number; usageKwh: number; costKrw: number }>; appliances?: Record<string, number> };

export type Unlock = { reportViewable: boolean; lastRewardAdAt?: string; monthlyViewCount: number };

export type RateTable = { year: number; region: string; stages: Array<{ from: number; to: number; rateKrw: number }> };

export type RouteState = { view: 'home' | 'result' | 'history' | 'simulate' | 'report' | 'region' | 'settings'; queryParams?: Record<string, string> };

export type calculateBillFn = (usageKwh: number, rate: RateTable) => BillBreakdown;

export type validateUsageFn = (value: string | number) => { valid: boolean; error?: string; normalized?: number };

export type getRecordsFn = () => UsageRecord[];

export type saveRecordFn = (record: UsageRecord) => void;

export type deleteRecordFn = (recordId: string) => void;

export type getProfileFn = () => Profile;

export type setProfileFn = (profile: Profile) => void;

export type getAppliancesFn = () => Appliance[];

export type setAppliancesFn = (appliances: Appliance[]) => void;

export type compareYoYFn = (currentRecord: UsageRecord, previousYearRecord?: UsageRecord) => { percentChange: number; kwh: number; krw: number };

export type canViewReportFn = () => boolean;

export type unlockReportFn = () => void;

export type useAutoSaveRecordFn = (record: UsageRecord | null) => void;

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
    Home.tsx
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
- contract.ts: export type UsageRecord =; export type Appliance =; export type Profile =; export type BillBreakdown =; export type Unlock =; export type RateTable =; export type RouteState =; export type calculateBillFn = (usageKwh: number, rate: RateTable) => BillBreakdown
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
- ReportGate.tsx: ReportGate
- ScreenScaffold.tsx: ScreenScaffold
- Sparkline.tsx: Sparkline
- StateView.tsx: EmptyState, LoadingState
- SummaryHero.tsx: SummaryHero
- TossPurchase.tsx: TossPurchase
- TossRewardAd.tsx: TossRewardAd
- TrendCard.tsx: TrendCard
- YoyCompareCard.tsx: YoyCompareCard
CRITICAL: Before creating any new function, type, or component, check the list above. If something similar exists, import and use it.

## Already Implemented (do NOT duplicate or overwrite)
- 0001: 엔티티 타입 + RouteState 계약 정의 (files: src/types/domain.ts, src/types/navigation.ts, src/types/storage.ts)
- 0002: 요금표 상수 + 정적 카탈로그 데이터 (files: src/domain/rateTable.ts, src/data/applianceCatalog.ts, src/data/savingTips.ts, src/data/regionAverage.json)
- 0003: calculateBill 계산 엔진 + CP-6 픽스처 테스트 (files: src/domain/calculateBill.ts, src/domain/__tests__/calculateBill.test.ts)
- 0004: 구간 헬퍼 + 입력 검증기 (files: src/domain/stage.ts, src/domain/validate.ts, src/domain/calculateBill.ts, src/domain/__tests__/stage.test.ts)
- 0007: 파생 계산 (YoY 비교 / 시뮬레이션 / 지역 비교) (files: src/domain/compare.ts, src/domain/simulate.ts, src/domain/__tests__/derive.test.ts)
- 0010: S2 결과 자동 저장 + state 가드 (files: src/hooks/useResultGuard.ts, src/hooks/useAutoSaveRecord.ts)
- 0012: S3 전년 동월 비교 Chip + 추이 카드 (files: src/components/YoyCompareCard.tsx, src/components/TrendCard.tsx)
- 0014: S4 가전 추가/편집 BottomSheet + 영속화 (files: src/components/ApplianceSheet.tsx, src/hooks/useAppliances.ts)
- 0016: S5 TossRewardAd 게이트 + 24시간 열람권 (files: src/components/ReportGate.tsx, src/hooks/useReportUnlock.ts)

## Available exports from existing files
// src/App.tsx
export default function App() {

// src/components/AdSlot.tsx
export function AdSlot({ adGroupId, className, variant, theme }: AdSlotProps) {

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
export function calculateBill(kWh: number, month: number): BillBreakdown {

// src/do

## Memory Index (자동 학습 — 힌트로만 사용, 실제 코드 확인 필수)

Available topics: deploy(1), general(9), testing(1), ui(1)

Key lessons (verify against actual code before applying):
- [general] 외부에서 들어온 모든 값(라우터 state, 로컬 저장소, 부분 입력 폼)은 사용 직전에 배열·객체 기본값으로 정규화하고, 테이블/맵 조회 결과는 존재 확인 후에만 하위 속성이나 length에 접근하라. (60% · 타 앱 1회 — 맹신 금지)
- [general] 의존 그래프 최하층의 타입·계약 파일은 런타임 코드 0줄의 순수 선언으로 가장 먼저 단독 타입체크를 통과시키고, 파일 생성은 셸 명령이 아닌 허용된 편집 도구로만 하게 강제하라. (60% · 타 앱 1회 — 맹신 금지)
- [general] 영속 저장소에서 읽은 값은 항상 스키마 기본값으로 정규화해 배열·객체 타입을 보장한 뒤 반환하고, 화면은 빈/손상/부분 데이터에서도 렌더되도록 방어하라. (60% · 타 앱 1회 — 맹신 금지)
- [general] 정책·기능 제거형 리팩터링은 화면과 도메인 로직 레이어에서만 수행하고, package.json의 플랫폼 필수 의존성(디자인 시스템·플랫폼 SDK·프레임워크 코어)은 어떤 경우에도 삭제하지 말 것 — 필수 패키지 화이트리스트를 빌드 전 가드로 검증하라. (60% · 타 앱 1회 — 맹신 금지)
- [general] 공용 기반 모듈(상수·저장소·계산 유틸)이 실제로 머지되기 전에는 이를 import하는 화면·훅 패킷을 머지하지 말고, 모든 머지 게이트에 타입체크와 프로덕션 빌드 통과(미해결 import 0건)를 필수로 걸어라. (60% · 타 앱 1회 — 맹신 금지)