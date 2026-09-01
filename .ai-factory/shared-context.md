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
// Domain types — add your app-specific types here
export {};

```

## Existing Codebase (import and use these — do NOT recreate)
### File Tree (src/)
  App.tsx
  components/
    AdSlot.tsx
    Amount.tsx
    BottomCTA.tsx
    Card.tsx
    CountUp.tsx
    FloatingTabBar.tsx
    MiniBar.tsx
    PageShell.tsx
    ScreenScaffold.tsx
    Sparkline.tsx
    StateView.tsx
    SummaryHero.tsx
    TossPurchase.tsx
    TossRewardAd.tsx
  data/
    applianceCatalog.ts
    regionAverage.json
    savingTips.ts
  domain/
    rateTable.ts
  hooks/
  lib/
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
- storage.ts: export function getItem<T>(key: string): T | null; export function setItem<T>(key: string, value: T): void; export function removeItem(key: string): void
- utils.ts: export function cn(...classes: (string | boolean | undefined | null)[]): string; export function formatNumber(n: number): string; export function formatCurrency(n: number, currency = 'KRW'): string

### Components (src/components/)
- AdSlot.tsx: AdSlot
- Amount.tsx: Amount
- BottomCTA.tsx: SubmitFooter, ButtonStack
- Card.tsx: Card
- CountUp.tsx: CountUp
- FloatingTabBar.tsx: FloatingTabBar
- MiniBar.tsx: MiniBar
- PageShell.tsx: PageShell
- ScreenScaffold.tsx: ScreenScaffold
- Sparkline.tsx: Sparkline
- StateView.tsx: EmptyState, LoadingState
- SummaryHero.tsx: SummaryHero
- TossPurchase.tsx: TossPurchase
- TossRewardAd.tsx: TossRewardAd
CRITICAL: Before creating any new function, type, or component, check the list above. If something similar exists, import and use it.

## Already Implemented (do NOT duplicate or overwrite)
- 0001: 엔티티 타입 + RouteState 계약 정의 (files: src/types/domain.ts, src/types/navigation.ts, src/types/storage.ts)
- 0002: 요금표 상수 + 정적 카탈로그 데이터 (files: src/domain/rateTable.ts, src/data/applianceCatalog.ts, src/data/savingTips.ts, src/data/regionAverage.json)