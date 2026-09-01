# TASK — ElectricSaver

> SPEC 기준 워크패킷 분해. 각 Task = 코딩 세션 1회(10분 이내). 순서 엄수: 타입 → 데이터 계층 → 페이지 → 통합.

---

## Epic 1. TypeScript 타입 + 정적 데이터

**Risk Assessment**
- **Complexity**: Low
- **Risk factors**:
  - 페이지별로 `location.state` 타입을 인라인 선언하면 S1→S2→S4→S5 체인에서 필드명 불일치가 발생(실사고: SplitMate 결과 배열 undefined `.map()` 크래시).
  - `RegionAverage`/`ApplianceItem` shape이 나중에 바뀌면 이미 저장된 localStorage 데이터와 충돌.
- **Mitigation**: 모든 화면 간 전달 타입을 `src/types/navigation.ts` 1개 파일에 선(先)확정하고, 엔티티 타입에 `schemaVersion: 1` 플래그를 함께 정의한 뒤에만 데이터 계층/페이지 작업을 시작한다. 정적 데이터의 shape을 타입과 같은 Epic에서 고정해 후속 패킷이 값만 채우도록 한다.

---

### Task 1.1 엔티티 타입 + RouteState 정의
- **Description**: SPEC Data Models의 6개 엔티티 타입과 화면 간 전달 타입(RouteState)을 순수 타입 파일로 작성한다. 런타임 코드 0줄(상수·함수 금지, `interface`/`type`/`as const` 타입만).
- **DoD**:
  - `src/types/domain.ts` 에 `MeterRecord`, `UserProfile`, `ApplianceItem`, `SimulationSummary`, `ReportUnlock`, `AppFlags`, `RegionAverage`, `BillBreakdown`(`{ baseCharge, energyCharge, climateCharge, fuelCharge, subtotal, vat, fund, total, stage, stageBreakdown }`), `StageBreakdownRow`(`{ stage, kWh, unitPrice, charge }`) export.
  - `src/types/navigation.ts` 에 아래를 그대로 정의:
    ```ts
    export interface BillInput { yearMonth: string; kWh: number; month: number; }
    export type ResultRouteState   = { input: BillInput } | null;
    export type SimulateRouteState = { input: BillInput } | null;
    export type ReportRouteState   = { summary: SimulationSummary } | null;
    export type RouteState = {
      "/result": ResultRouteState;
      "/simulate": SimulateRouteState;
      "/report": ReportRouteState;
    };
    ```
  - `src/types/storage.ts` 에 키 상수 타입 `export type StorageKey = 'es:records'|'es:profile'|'es:appliances'|'es:report-unlocks'|'es:flags';`
  - `npx tsc --noEmit` 통과. 두 파일에 `import` 문 외 실행 구문 0줄(`grep -E "console\.|function |=>" src/types/*.ts` 매칭 0건).
- **Covers**: (기반 — CP-8 라우팅 state 계약 / 후속 전 Task의 선행)
- **Files**: `src/types/domain.ts`, `src/types/navigation.ts`, `src/types/storage.ts`
- **Depends on**: none

---

### Task 1.2 요금표 상수 + 정적 카탈로그 데이터
- **Description**: CP-4 요금표 상수와 가전 카탈로그·절약 팁·지역 평균 정적 데이터를 값만 채워 넣는다. 계산 로직은 포함하지 않는다.
- **DoD**:
  - `src/domain/rateTable.ts`: `RATE_TABLE`(비하계/하계 각 3구간 `{ limit, baseCharge, unitPrice }`), `CLIMATE_RATE = 9.0`, `FUEL_RATE = 5.0`, `VAT_RATE = 0.1`, `FUND_RATE = 0.037`, `MAX_KWH = 3000` export. 값은 CP-4 표와 정수 단위까지 일치.
  - `src/data/applianceCatalog.ts`: 최소 8종(`aircon/fridge/washer/tv/pc/rice-cooker/dryer/heater`) `{ id, name, watt, hoursPerDay, reduceRatio }`. `aircon` 은 `{ watt: 1800, hoursPerDay: 6, reduceRatio: 0.3 }`.
  - `src/data/savingTips.ts`: `Record<string, [string, string, string]>` — 카탈로그 전 id에 대해 팁 3줄 고정 문자열. 랜덤·날짜 의존 로직 0건.
  - `src/data/regionAverage.json`: `RegionAverage[]` 17건. `"11"` 은 `{ regionName: "서울", avgKWh: [210,268,312,349] }`.
  - `npx tsc --noEmit` 통과, `grep -nE "#[0-9a-fA-F]{3,8}\b" src/domain src/data` 매칭 0건.
- **Covers**: (기반 — CP-4 상수 / AC-1.1·AC-5.2·AC-6.5·AC-7.1의 데이터 원천)
- **Files**: `src/domain/rateTable.ts`, `src/data/applianceCatalog.ts`, `src/data/savingTips.ts`, `src/data/regionAverage.json`
- **Depends on**: Task 1.1

---

## Epic 2. 데이터 계층 (계산 엔진 + localStorage + 상태)

**Risk Assessment**
- **Complexity**: Medium
- **Risk factors**:
  - 누진 구간 경계(200/201, 400/401)와 하계 전환에서 off-by-one → 전 화면 금액이 동시에 틀림.
  - `Math.round` vs `Math.floor(x/10)*10` 순서를 바꾸면 픽스처 5행이 전부 어긋남.
  - `localStorage` JSON 파싱 실패·`QuotaExceededError` 가 페이지에서 잡히지 않으면 화이트스크린(AC-4.6, AC-3.5, AC-G2 위반).
  - 12KB 예상이라 5MB 한도 여유는 크지만, `es:records` 60건 상한 정리 정책이 없으면 무한 증가.
- **Mitigation**: CP-6 픽스처 5행 유닛 테스트를 UI보다 먼저 통과시켜 금액 회귀를 컴파일 단계에서 차단한다. storage 저수준 래퍼(2.3)를 엔티티 CRUD(2.4)보다 먼저 만들어 파싱 실패·쿼터 초과를 **단일 지점**에서 `{ ok, value }` 결과 객체로 흡수하고, 페이지 코드에서는 `try/catch`·`console.error` 를 쓰지 않게 한다. 파생 계산(2.5)을 페이지에서 분리해 UI 없이 단위 테스트 가능하게 한다.

---

### Task 2.1 calculateBill 계산 엔진 + CP-6 픽스처 테스트
- **Description**: CP-5 알고리즘 8단계를 그대로 구현한 순수 함수 `calculateBill(kWh, month)` 을 작성하고 CP-6 픽스처 5행 유닛 테스트를 붙인다.
- **DoD**:
  - `calculateBill(kWh, month): BillBreakdown` 이 CP-5 1~8 순서대로 계산(`fund = Math.floor(subtotal*0.037/10)*10`, `total = Math.floor((subtotal+vat+fund)/10)*10`).
  - 반환 객체에 `stage: 1|2|3`, `stageBreakdown: StageBreakdownRow[]` 포함.
  - `src/domain/__tests__/calculateBill.test.ts` — CP-6 5행 각각에 대해 `baseCharge/energyCharge/subtotal/vat/fund/total` 6필드 `toBe` 단정. 5행 전량 green.
  - `expect(calculateBill(350,7).total).toBe(calculateBill(350,8).total)` 통과, `calculateBill(350,8).total === 60510`, `calculateBill(350,3).total === 71260`, 두 경우 모두 `stage === 2`.
  - `calculateBill(500,3).stageBreakdown.length === 3` 이고 `stageBreakdown[2]` 가 `{ stage:3, kWh:100, unitPrice:307.3, charge:30730 }` 와 deep-equal, `baseCharge === 7300`.
  - 성능/순수성 테스트: `(350,8)` 1,000회 호출 총 소요 < 50ms, 전 결과가 첫 호출과 `toEqual`, 테스트 내 `localStorage`/`fetch` 스파이 호출 0회.
  - 함수 본문에 `localStorage`/`fetch`/`Date.now` 참조 0건.
- **Covers**: [AC-1.1, AC-1.2, AC-1.4, AC-1.7]
- **Files**: `src/domain/calculateBill.ts`, `src/domain/__tests__/calculateBill.test.ts`
- **Depends on**: Task 1.1, Task 1.2

---

### Task 2.2 구간 헬퍼 + 입력 검증 (getStage / getNextStageGap / 방어)
- **Description**: 구간 판정·다음 구간 잔여량 함수와 `calculateBill` 공용 입력 검증기를 구현한다.
- **DoD**:
  - `getStage(200,3)===1`, `getStage(201,3)===2`, `getStage(400,3)===2`, `getStage(401,3)===3` 테스트 green. 하계는 300/301, 450/451 경계로 동일 검증.
  - `getNextStageGap(180,3)===20`, `getNextStageGap(500,3)===0` 테스트 green.
  - `assertBillInput(kWh, month)` 가 `calculateBill`/`getStage`/`getNextStageGap` 진입부에서 호출되며 아래 `RangeError` 메시지를 **정확히** throw:
    - `kWh < 0` → `"kWh must be 0 or greater"`
    - `Number.isNaN(kWh) || typeof kWh !== 'number'` → `"kWh must be a number"`
    - `month < 1 || month > 12` → `"month must be 1-12"`
    - `kWh > 3000` → `"kWh must be 3000 or less"`
  - `calculateBill(3000,3)` 은 throw 하지 않고 `Number.isInteger(total) && total > 0`.
  - 검증 테스트에서 `console.error` 스파이 호출 횟수 === 0.
- **Covers**: [AC-1.3, AC-1.5, AC-1.6]
- **Files**: `src/domain/stage.ts`, `src/domain/validate.ts`, `src/domain/calculateBill.ts`(검증 호출 추가), `src/domain/__tests__/stage.test.ts`
- **Depends on**: Task 2.1

---

### Task 2.3 localStorage 저수준 래퍼 + 스키마 마이그레이션
- **Description**: 모든 `es:*` 키 접근을 단일 래퍼로 통일한다. JSON 파싱 실패·쿼터 초과를 예외 대신 결과 객체로 반환하고, 부팅 시 `AppFlags` 마이그레이션을 수행한다.
- **DoD**:
  - `readJSON<T>(key, fallback): { ok: true; value: T } | { ok: false; reason: 'corrupt'; value: T }` — 파싱 실패 시 해당 키를 `fallback` 으로 **재초기화 저장**하고 `ok:false, reason:'corrupt'` 반환. `console.error` 호출 0건.
  - `writeJSON<T>(key, value): { ok: true } | { ok: false; reason: 'quota' }` — `setItem` 이 throw 하면 잡아서 `reason:'quota'` 반환, 재throw 금지, `console.error` 0건.
  - `removeKeys(keys: StorageKey[]): void`.
  - `getStorageBytes(): number` — `es:` 접두 키의 `key.length + value.length` 합. 마운트 시 1회 호출 기준 5ms 미만(테스트에서 `performance.now()` 측정).
  - `migrateFlags()` — `es:flags` 가 없거나 `schemaVersion !== 1` 이면 `{ schemaVersion: 1, disclaimerSeenAt: null }` 로 생성/갱신하고 **`es:records` 는 건드리지 않음**(마이그레이션 전후 records 건수 동일 테스트). `console.error` 0건.
  - 테스트: 손상 문자열 `"{{broken"` 주입 → `readJSON` 이 `ok:false` + 키가 `[]` 로 리셋됨을 단정.
- **Covers**: [AC-4.6, AC-8.4, AC-8.7, AC-3.5(저장 실패 감지 경로)]
- **Files**: `src/lib/storage.ts`, `src/lib/__tests__/storage.test.ts`
- **Depends on**: Task 1.1

---

### Task 2.4 엔티티 CRUD 리포지토리 (records / profile / appliances / unlocks)
- **Description**: 2.3 래퍼 위에 엔티티별 CRUD와 SPEC의 정리 정책(상한·덮어쓰기·만료)을 구현한다. React 의존 0.
- **DoD**:
  - `records.ts`: `getRecords()`(yearMonth 내림차순 정렬 반환), `upsertRecord(r)`(동일 `yearMonth` 는 덮어쓰기 → 건수 유지, 값 갱신), `deleteRecord(yearMonth)`, 61건째 저장 시 가장 오래된 `yearMonth` 1건 제거 후 60건 유지. `upsertRecord` 는 `writeJSON` 결과를 그대로 반환해 호출부가 `quota` 를 알 수 있음.
  - `profile.ts`: `getProfile()` 기본값 `{ regionCode: "11", householdSize: 2 }`, `setProfile(patch)` 부분 갱신 후 저장.
  - `appliances.ts`: `getAppliances()`, `addAppliance(item)` — 이미 12건이면 저장하지 않고 `{ ok:false, reason:'limit' }` 반환, `updateAppliance(id, patch)`, `removeAppliance(id)`.
  - `unlocks.ts`: `pruneUnlocks(now)` — `expiresAt < now` 항목 제거 후 남은 배열 반환, `hasValidUnlock(id, now)`, `addUnlock(id, now)` — `expiresAt = now + 86_400_000`, 저장 결과 길이가 13이 되면 `unlockedAt` 최소 항목 1건 먼저 제거.
  - `resetAll()` — `es:records`, `es:appliances`, `es:report-unlocks` 만 삭제하고 `es:profile`·`es:flags` 는 잔존(테스트로 5개 키 상태 단정).
  - 각 함수에 대한 유닛 테스트 green, `console.error` 0건.
- **Covers**: [AC-3.2, AC-4.4, AC-5.2, AC-5.6, AC-6.4, AC-8.1, AC-8.2, AC-8.5]
- **Files**: `src/lib/repo/records.ts`, `src/lib/repo/profile.ts`, `src/lib/repo/appliances.ts`, `src/lib/repo/unlocks.ts`, `src/lib/repo/__tests__/repo.test.ts`
- **Depends on**: Task 2.3

---

### Task 2.5 파생 계산 로직 (YoY 비교 / 시뮬레이션 / 지역 비교)
- **Description**: 화면에서 쓰는 순수 파생 계산 3종을 UI와 분리해 구현한다.
- **DoD**:
  - `compareYoY(records, yearMonth): { deltaKWh, deltaWon } | null` — 전년 동월 미존재 시 **`null` 반환(throw 금지)**. `2026-08(350,60510)` vs `2025-08(402,76140)` → `{ deltaKWh: -52, deltaWon: -15630 }`.
  - `simulate(input, appliances): SimulationSummary` — `savedKWh = Math.round(Σ(watt × hoursPerDay × 30 / 1000 × reduceRatio))`, `targetKWh = Math.max(0, baseKWh - savedKWh)`, `savedWon = Math.max(0, baseTotal - targetTotal)`. 테스트: `(350,8)` + `[{watt:1800,hoursPerDay:6,reduceRatio:0.3}]` → `savedKWh===97 && targetKWh===253`; `hoursPerDay:3` → `savedKWh===49`.
  - 클램프 테스트: `baseKWh:100`, 절감합 140 → `targetKWh===0 && savedWon >= 0` 이고 `summary.clamped === true`.
  - 구간 하락 판정 `isStageDown(summary): boolean` — `getStage(350,8)=2 → getStage(253,8)=1` 이면 `true`, 동일 구간이면 `false`.
  - `compareRegion(avgKWh, myKWh): { diffKWh, diffPercent }` — `diffPercent` 는 소수 1자리 반올림. `(268, 350)` → `{ diffKWh: 82, diffPercent: 30.6 }`, `(349, 350)` → `{ diffKWh: 1, diffPercent: 0.3 }`.
  - `resolveRegion(regionCode, table)` — 미존재 코드는 `"11"` 폴백 + `{ fellBack: true }` 반환.
  - 전 함수 유닛 테스트 green, 내부에서 `localStorage`/`fetch` 접근 0건.
- **Covers**: [AC-4.3, AC-5.1, AC-5.3, AC-5.8, AC-7.1, AC-7.6]
- **Files**: `src/domain/compare.ts`, `src/domain/simulate.ts`, `src/domain/__tests__/compare.test.ts`, `src/domain/__tests__/simulate.test.ts`
- **Depends on**: Task 2.1, Task 2.2, Task 1.2

---

## Epic 3. 코어 UI 페이지

**Risk Assessment**
- **Complexity**: High
- **Risk factors**:
  - **`location.state` 가 없는 채 `/result`·`/simulate`·`/report` 에 직접 진입/새로고침 → `as` 캐스팅은 런타임 방어가 아니므로 즉시 크래시(AC-G2 위반, 사용자 완주율 0%).**
  - TDS 컴포넌트에 Tailwind/인라인 스타일로 padding을 덮어써 검수 반려.
  - 시뮬레이션 재계산이 매 입력마다 전 화면 리렌더 → 200ms 갱신 기준(AC-5.4) 미달.
  - 60건 기록 렌더 100ms 초과(AC-4.7).
- **Mitigation**: state를 받는 3개 화면 각각에 **"state 없이 직접 진입해도 크래시하지 않고 폴백한다"** DoD를 별도로 넣고, `const s = (useLocation().state as RouteState["/x"]) ?? null; if (!s) { toast; navigate(fallback,{replace:true}); return null; }` 패턴을 고정한다. 화면 진입 전 Epic 2에서 계산·저장을 모두 검증해 두므로 페이지 패킷은 렌더링·인터랙션만 담당해 10분 내 완료 가능하다. 무거운 화면(S2·S3·S4·S5·S6)은 렌더 / 인터랙션 두 패킷으로 쪼갠다.

---

### Task 3.1 S1 홈 화면 — 입력·검증·고지 다이얼로그 (`/`)
- **Description**: 검침 월·사용량 입력 화면. 프리필, 하계 Chip, 인라인 검증, 최초 1회 예상치 고지.
- **DoD**:
  - `ScreenScaffold` > `Top`("전기요금 계산") > 월 선택 `ListRow`(56px) > 사용량 `TextField`(`inputMode="numeric"`) > `Spacing size={16}` > 안내 `Paragraph.Text` > 하단 고정 `SubmitFooter` 내 `display="block"` `Button`(`data-testid="calc-submit"`, 높이 ≥48px) 순서로 렌더. 좌측 글자폭 버튼 0개, `AdSlot` 0개, `SummaryHero`/`Sparkline` 미사용.
  - 제출 성공 시 `navigate('/result', { state: { input: { yearMonth, kWh, month } } })` 호출되고, 제출 전 `localStorage.setItem` 스파이 호출 0회.
  - 프리필: `es:records` 최신 1건이 `{yearMonth:"2026-07",kWh:412}` 이면 `TextField` 초기값 `"412"`, 보조 텍스트 `"지난달 412kWh"`. 기록 0건이면 보조 텍스트 `"첫 사용량을 입력해보세요"`. 월 기본값은 현재 시각 기준 직전 달.
  - 월을 7 또는 8로 바꾸면 `data-testid="summer-chip"` 에 `"하계 완화 요금 적용"` 표시, 3으로 바꾸면 해당 노드가 DOM에서 제거(`queryByTestId` === null).
  - 검증 에러 문구 정확 일치 및 `navigate` 미호출: `""`/`0` → `"사용량을 1kWh 이상 입력해주세요"`, `3500` → `"사용량은 3000kWh 이하로 입력해주세요"`, `12.5` → `"사용량은 정수로 입력해주세요"`, `abc` → `"숫자만 입력해주세요"`.
  - `es:flags.disclaimerSeenAt === null` 이면 마운트 시 `AlertDialog` 에 `"이 계산 결과는 예상치입니다. 실제 청구액은 한국전력 고지서를 확인해주세요."` 표시 → `"확인"` 탭 시 epoch ms 저장, 재마운트 시 미표시.
  - `TextField` 포커스 시 `SubmitFooter` 가 키보드 위로 올라가 입력 필드를 가리지 않음(푸터 `position: fixed` + `env(safe-area-inset-bottom)`).
  - HEX 하드코딩 0건, TDS 컴포넌트에 인라인 padding/margin 오버라이드 0건.
- **Covers**: [AC-2.1, AC-2.2, AC-2.3, AC-2.4, AC-2.5, AC-2.6, AC-2.7, AC-2.8]
- **Files**: `src/pages/HomePage.tsx`, `src/components/SubmitFooter.tsx`
- **Depends on**: Task 2.2, Task 2.4

---

### Task 3.2 S2 결과 화면 렌더링 — 히어로·구간 카드·내역 카드 (`/result`)
- **Description**: 전달받은 입력으로 `calculateBill` 을 호출해 금액 히어로와 구간/내역 카드를 렌더링한다. (저장·가드는 Task 3.3)
- **DoD**:
  - `state = { input: { yearMonth:"2026-08", kWh:350, month:8 } }` 진입 시 `data-testid="bill-hero"` 에 `"60,510원"` CountUp 표시.
  - `data-testid="stage-card"` 안에 1구간 `300kWh / 36,000원`, 2구간 `50kWh / 10,730원` 2행 표시, `data-testid="stage-minibar"` MiniBar 렌더.
  - `data-testid="detail-card"` 안에 기본요금·전력량요금·기후환경요금·연료비조정액·부가세·기반기금 **6행**이 `ListRow`(56px)로 표시.
  - `{kWh:290,month:8}` → `data-testid="next-stage-hint"` 에 `"2구간까지 10kWh 남았어요"`; `{kWh:500,month:3}` → 동일 testid에 `"이미 최고 구간이에요"`.
  - 마운트 직후 1프레임 동안 `bill-hero` 자리에 TDS 스켈레톤 표시 → 계산 완료 후 200ms 이내 금액 교체. 스켈레톤과 금액 영역의 `offsetHeight` 가 동일해 CLS 0.
  - 레이아웃: `ScreenScaffold` 내 `SummaryHero` 1개 + `Card` 2개 존재, 하단 `SubmitFooter` 에 `"절약 시뮬레이션"` 버튼(≥48px) → `navigate('/simulate', { state: { input } })`.
  - `console.error` 0건, React `Warning:` 0건.
- **Covers**: [AC-3.1, AC-3.3, AC-3.6, AC-3.7]
- **Files**: `src/pages/ResultPage.tsx`, `src/components/StageCard.tsx`, `src/components/DetailCard.tsx`
- **Depends on**: Task 2.1, Task 2.2, Task 3.1

---

### Task 3.3 S2 결과 자동 저장 + state 가드
- **Description**: 결과 화면 마운트 시 `es:records` 자동 upsert, 쿼터 초과 대응, state 없는 직접 진입 방어.
- **DoD**:
  - `{yearMonth:"2026-08",kWh:350,month:8}` 마운트 시 `es:records` 에 `{ yearMonth:"2026-08", kWh:350, total:60510, createdAt:<number> }` 1건 저장. 동일 `yearMonth` 로 재마운트 시 건수 1건 유지, 값만 갱신(`createdAt` 갱신 허용).
  - **state 없이 `/result` 직접 진입/새로고침 시**: `const s = (useLocation().state as RouteState["/result"]) ?? null;` 로 읽고 `s === null` 이면 Toast `"사용량을 먼저 입력해주세요"` 표시 + `navigate('/', { replace: true })` 실행, 렌더는 `null` 반환. **크래시 0건, `console.error` 0건**(`.map()`/구조분해가 state 확인 이전에 실행되지 않음을 코드 리뷰 및 테스트로 확인).
  - `writeJSON` 이 `{ ok:false, reason:'quota' }` 를 반환하면 Toast `"저장 공간이 부족해 기록을 남기지 못했어요"` 표시하고 히어로·카드는 그대로 렌더 유지. 앱 크래시 0건, `console.error` 0건.
  - 저장은 마운트당 1회만 수행(`useRef` 가드) — `setItem` 스파이 호출 1회 단정.
- **Covers**: [AC-3.2, AC-3.4, AC-3.5]
- **Files**: `src/pages/ResultPage.tsx`, `src/hooks/useRouteState.ts`
- **Depends on**: Task 2.4, Task 3.2

---

### Task 3.4 S3 기록 화면 — 목록·삭제·빈 상태 (`/history`)
- **Description**: 저장된 검침 기록 목록, 개별 삭제, 빈 상태/손상 복구 UI.
- **DoD**:
  - 기록 2건 시 `data-testid="record-row"` 2개 렌더, 첫 행에 `"2026년 8월"`, `"350kWh · 60,510원"` 표시, 목록은 `yearMonth` 내림차순.
  - `data-testid="record-delete-2026-08"`(44px) 탭 → `AlertDialog` → `"삭제"` 탭 시 해당 항목 제거(2건 → 1건) + Toast `"기록을 삭제했어요"`. `"취소"` 탭 시 건수 2건 유지, localStorage 미변경.
  - 기록 0건: `Asset.ContentIcon` + `"아직 저장된 검침 기록이 없어요"` + `"사용량 입력하러 가기"` `Button` → 탭 시 `navigate('/')`.
  - `localStorage['es:records'] === "{{broken"` 인 상태로 진입 → 빈 상태 UI 표시, 키가 `[]` 로 재초기화, Toast `"저장된 기록을 읽지 못해 초기화했어요"` **1회만** 표시, `console.error` 0건.
  - 60건 렌더: 가상 스크롤 없이 네이티브 스크롤, 초기 렌더 100ms 미만(`performance.now()` 측정), 각 `record-row` 높이 ≥56px.
  - 행 탭 시 `navigate('/result', { state: { input: { yearMonth, kWh, month } } })`.
  - 목록 하단 `Spacing size={64}` 로 `FloatingTabBar` 겹침 방지.
- **Covers**: [AC-4.1, AC-4.4, AC-4.5, AC-4.6, AC-4.7]
- **Files**: `src/pages/HistoryPage.tsx`, `src/components/RecordRow.tsx`
- **Depends on**: Task 2.4

---

### Task 3.5 S3 전년 동월 비교 Chip + 추이 카드
- **Description**: 각 행에 YoY 비교 Chip을, 목록 상단에 최근 12개월 Sparkline 추이 카드를 추가한다.
- **DoD**:
  - `2026-08(350/60510)` + `2025-08(402/76140)` → `data-testid="yoy-chip"` 에 `"작년 대비 -52kWh (-15,630원)"` 표시, Chip 색상은 `var(--tds-color-blue-500)` 계열 TDS 토큰(HEX 하드코딩 0건).
  - 증가 케이스는 `"작년 대비 +N kWh (+N원)"` 형식(부호 `+` 포함) 표시.
  - 전년 동월 기록 없음 → `yoy-chip` 노드 없음(`queryByTestId === null`)이고 대신 `"작년 기록 없음"` 텍스트 표시. `compareYoY` 는 `null` 반환, 예외 0건.
  - 기록 3건 이상 시 목록 상단에 `Card`(`data-testid="trend-card"`) + `Sparkline`(`data-testid="kwh-sparkline"`), 최근 12개월 데이터만 사용.
  - 기록 3건 미만이면 `trend-card` 미렌더(레이아웃 깨짐 없음).
- **Covers**: [AC-4.2, AC-4.3, AC-4.8]
- **Files**: `src/pages/HistoryPage.tsx`, `src/components/TrendCard.tsx`
- **Depends on**: Task 2.5, Task 3.4

---

### Task 3.6 S4 시뮬레이션 화면 — 히어로·비교 카드·구간 하락 배지 (`/simulate`)
- **Description**: 가전 구성 기반 절감 계산 결과 표시 화면의 렌더링 부분. (가전 추가/편집 시트는 Task 3.7)
- **DoD**:
  - `state = { input: { kWh:350, month:8, yearMonth:"2026-08" } }` + 가전 `[{id:"aircon",watt:1800,hoursPerDay:6,reduceRatio:0.3}]` → `data-testid="saved-hero"` 에 `savedWon` 값이 `"N원 절약"` 형식으로 CountUp 표시.
  - `data-testid="compare-card"` 안에 현재/절약 후 `MiniBar` 2개 렌더.
  - 350(2구간) → 253(1구간) 시 `data-testid="stage-down-badge"` 에 `"2구간 → 1구간"` 표시. 구간 동일 시 해당 노드 DOM에 없음.
  - 절감량 > 사용량(예: base 100, 절감 140) → `targetKWh` 0 클램프, `data-testid="clamp-note"` 에 `"입력한 사용량보다 절감량이 커요. 사용량을 확인해주세요"` 표시, `savedWon >= 0`.
  - 가전 0건: `Asset.ContentIcon` + `"절약할 가전을 추가해보세요"`, 히어로 `"0원"`, `"절약 리포트 보기"` 버튼 `disabled`.
  - **state 없이 직접 진입**: `?? null` 확인 후 `es:records[0]` 로 폴백, 그것도 없으면 `navigate('/', { replace: true })`. 크래시 0건, `console.error` 0건.
  - 하단 `SubmitFooter` 의 `"절약 리포트 보기"` → `navigate('/report', { state: { summary } })`(SimulationSummary 전체 전달).
- **Covers**: [AC-5.1, AC-5.3, AC-5.7, AC-5.8]
- **Files**: `src/pages/SimulatePage.tsx`, `src/components/CompareCard.tsx`
- **Depends on**: Task 2.5, Task 3.2

---

### Task 3.7 S4 가전 추가/편집 BottomSheet + 영속화
- **Description**: 카탈로그 선택 시트, 가전 값 편집·검증, `es:appliances` 영속화.
- **DoD**:
  - `"가전 추가"` → `BottomSheet` 카탈로그 목록(시트 내부 독립 스크롤) → `"에어컨"` 선택 시 `{ id:"aircon", name:"에어컨", watt:1800, hoursPerDay:6, reduceRatio:0.3 }` 목록 추가 + `es:appliances` 저장. 화면 재진입 시 동일 항목 복원.
  - 가전 행(56px) 탭 → 편집 시트에서 `hoursPerDay` 를 `3` 으로 변경 후 `"적용"` → `savedKWh === 49` 로 재계산되어 히어로가 200ms 이내 갱신되고 `es:appliances` 갱신.
  - 절감 비율 `Chip`(44px)은 `10% / 20% / 30% / 50%` **4개만** 렌더(5번째 옵션 없음).
  - `watt` 검증 — 에러 문구 정확 일치 + 시트 미닫힘: `0` → `"소비전력은 10W 이상 입력해주세요"`, `9000` → `"소비전력은 5000W 이하로 입력해주세요"`, `""` → `"소비전력을 입력해주세요"`.
  - `es:appliances` 12건 상태에서 `"가전 추가"` 탭 → Toast `"가전은 최대 12개까지 추가할 수 있어요"`, `BottomSheet` 미오픈(`queryByRole('dialog') === null`), 저장 건수 12건 유지.
  - `TextField` 는 `inputMode="numeric"`, 적용 `Button` ≥48px.
- **Covers**: [AC-5.2, AC-5.4, AC-5.5, AC-5.6]
- **Files**: `src/pages/SimulatePage.tsx`, `src/components/ApplianceSheet.tsx`
- **Depends on**: Task 2.4, Task 3.6

---

### Task 3.8 S5 리포트 본문 — 팁 카드 + state 가드 (`/report`)
- **Description**: 절감 요약 히어로와 가전별 팁 카드 본문. (광고 게이트는 Task 3.9 — 이 패킷에서는 본문이 항상 보이는 상태로 구현)
- **DoD**:
  - `state = { summary }` 이고 가전 2건(`aircon`, `fridge`)일 때 `data-testid="report-body"` 안에 `data-testid="tip-card"` `Card` 2개 렌더. 각 카드는 가전명 / 월 절감 kWh / 월 절감액 / 실행 팁 3줄(`ListRow` 56px)을 포함.
  - 팁 문장은 `savingTips[id]` 고정 문자열 — 동일 입력 10회 렌더 시 텍스트 전량 동일(스냅샷 테스트).
  - `SummaryHero`(절감액)는 게이트 여부와 무관하게 항상 렌더.
  - 가전 0건 방어: `"표시할 팁이 없어요"` 표시, 크래시 0건.
  - **state 없이 `/report` 직접 진입/새로고침**: `?? null` 확인 → Toast `"시뮬레이션을 먼저 실행해주세요"` + `navigate('/simulate', { replace: true })`, 렌더 `null` 반환. `summary.appliances` 에 대한 `.map()` 이 null 확인 이후에만 실행됨. `console.error` 0건.
  - `"시뮬레이션 수정"` → `navigate('/simulate', { state: { input } })`.
- **Covers**: [AC-6.5, AC-6.7]
- **Files**: `src/pages/ReportPage.tsx`, `src/components/TipCard.tsx`
- **Depends on**: Task 1.2, Task 3.7

---

### Task 3.9 S5 TossRewardAd 게이트 + 24시간 열람권
- **Description**: 리포트 본문을 보상형 광고로 게이팅하고 열람권을 저장·재사용·만료 처리한다.
- **DoD**:
  - 유효 열람권 없음 → `data-testid="report-body"` DOM에 **없음**, `data-testid="report-gate"` 에 `"짧은 광고를 보면 상세 절약 리포트를 볼 수 있어요"` + `Button`(≥48px) 표시. 게이트 상태에서도 `SummaryHero` 절감액은 노출.
  - `TossRewardAd` 시청 완료 → `report-body` 표시 + `es:report-unlocks` 에 `{ applianceId:"__report__", unlockedAt:<now>, expiresAt:<now+86400000> }` 저장.
  - `expiresAt > Date.now()` 항목 존재 시 재진입하면 광고 없이 즉시 `report-body` 표시, `data-testid="unlock-remain"` 에 `"열람권 N시간 남음"` 표시.
  - 만료 항목 2건 존재 상태로 진입 → 2건 제거되고 게이트 화면 표시. 13번째 저장 시 `unlockedAt` 최소 항목 1건 선삭제(길이 12 유지).
  - `onFailure`(로드 실패/시청 중단) → Toast `"광고를 불러오지 못했어요. 잠시 후 다시 시도해주세요"`, 게이트 유지, 열람권 미저장, `console.error` 0건.
  - 시청 버튼 탭 직후 버튼 `disabled` + 라벨 `"광고 불러오는 중"`, 중복 탭 무시(핸들러 호출 1회). 로드 완료/실패 시 다시 활성화.
- **Covers**: [AC-6.1, AC-6.2, AC-6.3, AC-6.4, AC-6.6, AC-6.8]
- **Files**: `src/pages/ReportPage.tsx`, `src/components/ReportGate.tsx`
- **Depends on**: Task 2.4, Task 3.8

---

### Task 3.10 S6 동네 비교 — 정적 데이터 지연 로더 + 히어로 (`/region`)
- **Description**: `regionAverage.json` 동적 import, 평균 대비 비교 히어로, 로딩·실패·빈 상태.
- **DoD**:
  - `es:profile = {regionCode:"11",householdSize:2}`, 최근 기록 `kWh:350` → `data-testid="region-hero"` 에 `"평균보다 82kWh 많아요"`, `data-testid="diff-percent"` 에 `"+30.6%"`.
  - 로딩 중 `region-hero` 자리에 TDS 스켈레톤, 로드 완료 시 값 교체. 로딩 중에도 `Top`·`Card` 골격 유지되어 CLS 0.
  - `import('../data/regionAverage.json')` reject 시 `"동네 평균 데이터를 불러오지 못했어요"` + `"다시 시도"` `Button` 표시, 재시도 시 다시 import 시도. `console.error` 0건, 크래시 0건.
  - `es:records` 빈 배열 → `Asset.ContentIcon` + `"비교할 내 사용량이 없어요"` + `"사용량 입력하기"`(탭 시 `navigate('/')`), 히어로 숫자 미렌더.
  - `regionCode:"99"` → `"11"` 폴백 비교 수행 + `data-testid="fallback-note"` 에 `"지역이 설정되지 않아 서울 기준으로 보여드려요"` 표시.
  - 데이터 로드에 `fetch`/`XMLHttpRequest` 미사용(동적 import 청크만).
- **Covers**: [AC-7.1, AC-7.3, AC-7.4, AC-7.5, AC-7.6]
- **Files**: `src/pages/RegionPage.tsx`, `src/lib/loadRegionAverage.ts`
- **Depends on**: Task 2.5, Task 2.4

---

### Task 3.11 S6 프로필 BottomSheet + 비교 카드 레이아웃
- **Description**: 가구원수/지역 변경 시트, MiniBar 비교 카드, 로컬 저장 고지.
- **DoD**:
  - `BottomSheet` 에서 가구원수 `4` 선택 → 기준 평균 `349` 적용되어 `region-hero` `"평균보다 1kWh 많아요"`, `diff-percent` `"+0.3%"` 로 **300ms 이내** 갱신, `es:profile.householdSize === 4` 저장.
  - 레이아웃: `ScreenScaffold` 안에 `SummaryHero`(`region-hero`) 1개 + `Card` 2개(`data-testid="compare-card"`, `data-testid="profile-card"`) 존재.
  - `compare-card` 안에 내 사용량/평균 사용량 `MiniBar`(`data-testid="region-minibar"`) **2개** 렌더.
  - `profile-card` 안에 지역·가구원수 `ListRow`(각 56px), 시트 항목 56px.
  - 화면에 `"내 정보는 기기에만 저장돼요"` 문구 표시. 프로필 변경·비교 전 과정에서 `fetch`/`XMLHttpRequest` 스파이 호출 0건.
  - 하단 `Spacing size={64}` 로 `FloatingTabBar` 겹침 방지.
- **Covers**: [AC-7.2, AC-7.7, AC-7.8]
- **Files**: `src/pages/RegionPage.tsx`, `src/components/ProfileSheet.tsx`
- **Depends on**: Task 3.10

---

### Task 3.12 S7 설정 화면 (`/settings`)
- **Description**: 지역·가구원수 설정, 요금표 버전, 저장 공간 표시, 전체 초기화.
- **DoD**:
  - `ListRow` 5행(`data-testid="setting-row-region|household|rate|storage|reset"`, 각 56px) → `Spacing size={24}` → `"ElectricSaver v1.0.0"` `Paragraph.Text` → `Spacing size={64}` 순서로 배치. `AdSlot` 0개, `SummaryHero`/`Sparkline` 0개.
  - `setting-row-region` 탭 → `BottomSheet`(17개, 시트 내부 스크롤)에서 `"부산"` 선택 → `es:profile.regionCode === "26"`, 행 우측 값 `"부산"` 갱신, Toast `"지역을 저장했어요"`.
  - `setting-row-reset` 탭 → `AlertDialog` → `"초기화"` 탭 시 `es:records`/`es:appliances`/`es:report-unlocks` 삭제, `es:profile`·`es:flags` 잔존, Toast `"모든 기록을 삭제했어요"` 후 `navigate('/', { replace: true })`.
  - `"취소"` 탭 → localStorage 키 5개 전부 변경 없음(삭제 0건), 다이얼로그만 닫힘, `setting-row-storage` 우측 값 불변.
  - 3개 키 모두 비어 있으면 `setting-row-reset` `disabled` + 우측 `"삭제할 데이터 없음"`, 탭해도 `AlertDialog` 미오픈.
  - `es:*` 총 8,192바이트일 때 `setting-row-storage` 우측에 `"8KB / 5MB"` 표시. `getStorageBytes` 는 마운트당 1회 호출(스파이 단정), 5ms 미만.
  - `setting-row-rate` 우측에 요금표 버전 문자열 표시(예: `"2026년 저압 기준"`).
- **Covers**: [AC-8.1, AC-8.2, AC-8.4, AC-8.5, AC-8.6, AC-8.8]
- **Files**: `src/pages/SettingsPage.tsx`, `src/components/RegionSheet.tsx`
- **Depends on**: Task 2.3, Task 2.4

---

## Epic 4. 통합 + 폴리시

**Risk Assessment**
- **Complexity**: Medium
- **Risk factors**:
  - 라우터 등록 누락으로 `/report` 등 딥링크 진입 시 빈 화면.
  - `AdSlot` 이 카드/버튼 위에 겹쳐 배치 → 검수 반려(AC-G7).
  - `VITE_TOSS_AD_GROUP_ID`/`VITE_TOSS_AD_SLOT_ID` 미주입 시 SDK 호출이 throw → `console.error` 발생(AC-G2, AC-G10 동시 위반).
  - HEX 하드코딩·`window.open`·분석 SDK 잔존이 배포 직전에야 발견됨.
- **Mitigation**: 라우팅·탭바를 페이지 완성 후 배선해 각 페이지가 독립적으로 테스트 가능한 상태를 유지한다. 광고는 별도 패킷으로 마지막에 삽입해 **콘텐츠 섹션 사이/최하단**에만 들어가도록 오버랩 측정 DoD를 붙인다. 정적 검사 스크립트를 CI 훈련용으로 먼저 만들고(4.3) 전 화면 E2E 순회(4.4)로 마감해, 개별 페이지 패킷이 컴플라이언스 부담을 지지 않게 한다.

---

### Task 4.1 라우팅 배선 + FloatingTabBar + ScreenScaffold 통합
- **Description**: React Router 라우트 6개 등록, 탭바 4개 연결, 부팅 시 마이그레이션 호출.
- **DoD**:
  - `createBrowserRouter`(또는 `<Routes>`)에 `/`, `/result`, `/simulate`, `/report`, `/history`, `/region`, `/settings` 등록 + `*` NotFound → `navigate('/', { replace: true })`.
  - `FloatingTabBar` 탭 4개(`홈` `/`, `기록` `/history`, `동네` `/region`, `설정` `/settings`), 각 터치 타깃 높이 ≥44px. `/settings` 에서 `"기록"` 탭 → `/history` 이동 + 해당 탭 활성 표시.
  - 탭바는 `/`, `/history`, `/region`, `/settings` 에서만 렌더되고 `/result`, `/simulate`, `/report` 에서는 미렌더.
  - 앱 부팅 시 `migrateFlags()` 1회 호출(`es:flags` 없거나 `schemaVersion:0` → `{schemaVersion:1,disclaimerSeenAt:null}`, `es:records` 보존).
  - 모든 페이지가 `ScreenScaffold` 로 감싸짐(`grep -L "ScreenScaffold" src/pages/*.tsx` 결과 0건), raw `div` 최상위 골격 0건.
  - `npm run build` 성공, 7개 경로 직접 진입 시 크래시 0건.
- **Covers**: [AC-8.3, AC-8.7]
- **Files**: `src/App.tsx`, `src/main.tsx`, `src/components/ScreenScaffold.tsx`, `src/components/FloatingTabBar.tsx`(연결만)
- **Depends on**: Task 3.1, Task 3.4, Task 3.11, Task 3.12

---

### Task 4.2 AdSlot 배치 + 예상치 고지 + 환경변수 미주입 폴백
- **Description**: S2/S3/S5/S6에 배너 광고를 배치하고, env 미주입 시 안전 폴백을 구현한다.
- **DoD**:
  - S2: `detail-card` 아래 · 하단 액션 버튼 위에 `<AdSlot adGroupId={import.meta.env.VITE_TOSS_AD_GROUP_ID} />` **1개**. 화면 최하단에 `"이 금액은 주택용 저압 기준 예상치예요"` 표시.
  - S3: 마지막 `record-row` 아래에 `AdSlot` 1개. S5: `report-body` 하단 + `Spacing size={32}`. S6: `compare-card` 하단, `profile-card` 위.
  - S1(`/`)과 S7(`/settings`)에는 `AdSlot` 0개(`grep -c AdSlot` === 0).
  - 오버랩 검증: 4개 화면에서 `AdSlot` 의 `getBoundingClientRect()` 가 모든 `Card`/`ListRow`/`Button` 박스와 교집합 0px.
  - `VITE_TOSS_AD_GROUP_ID` 또는 `VITE_TOSS_AD_SLOT_ID` 가 `undefined` 이면 `AdSlot`/`TossRewardAd` 가 `null` 반환(SDK 미호출), 레이아웃 자리표시(고정 높이 박스)만 유지, `console.error` 0건.
  - `VITE_TOSS_AD_SLOT_ID` 미주입 시 `/report` 는 게이트 없이 `report-body` 를 즉시 표시.
- **Covers**: [AC-3.8, AC-4.8, AC-7.7, AC-G7, AC-G10]
- **Files**: `src/pages/ResultPage.tsx`, `src/pages/HistoryPage.tsx`, `src/pages/ReportPage.tsx`, `src/pages/RegionPage.tsx`, `src/components/AdSlot.tsx`(폴백만 보강)
- **Depends on**: Task 4.1, Task 3.9

---

### Task 4.3 컴플라이언스 정적 검사 스크립트
- **Description**: 검수 반려 항목을 CI에서 자동 검출하는 npm 스크립트를 작성한다. 위반 1건이라도 있으면 exit code 1.
- **DoD**:
  - `npm run check:compliance` 가 아래 5개 검사를 수행하고 위반 시 파일:라인과 함께 실패:
    1. `src/**` 에서 `window.location.href =`, `window.open`, `<a href="http` 매칭 0건 / `"앱을 설치"`·`"다운로드"` 문자열 0건.
    2. `package.json` + `src/**` 에서 `google-analytics|gtag|amplitude|mixpanel|sentry` 매칭 0건.
    3. `src/**/*.{ts,tsx,css}` 에서 `#[0-9a-fA-F]{3,8}\b` 매칭 0건.
    4. 빌드 산출물(`dist/**/*.js`)에서 `.at(`, `Object.hasOwn`, `structuredClone`, `??=` 매칭 0건 + `vite.config.ts` 의 `build.target === 'es2020'`.
    5. `src/**` 에서 `fetch(`, `XMLHttpRequest`, `axios` 매칭 0건.
  - `grantPromotionReward` 사용 시 호출 직전 `amount <= 5000` 검증이 존재하고 초과 시 Toast `"지급 가능한 금액을 초과했어요"` 후 호출 차단(캠페인 미사용 시 해당 코드 경로가 소스에 없어야 하며 검사 스크립트가 이를 확인).
  - 다크모드 대비 확인: TDS 토큰만 사용하므로 다크 테마 스냅샷에서 텍스트 대비비 ≥4.5:1(수동 확인 체크리스트 문서화).
  - 스크립트 자체 실행 시간 10초 미만.
- **Covers**: [AC-G1, AC-G4, AC-G5, AC-G6, AC-G9]
- **Files**: `scripts/check-compliance.mjs`, `package.json`(scripts), `vite.config.ts`
- **Depends on**: Task 4.2

---

### Task 4.4 전 화면 순회 E2E + 콘솔/네트워크 0건 검증
- **Description**: 프로덕션 빌드 산출물로 S1→S2→S4→S5→S3→S6→S7 전 화면을 순회하며 런타임 컴플라이언스를 검증한다.
- **DoD**:
  - `vite build` 산출물을 preview 서버로 띄우고 순회 시나리오 1개 작성: 홈 입력(350/8) → 결과 → 시뮬(에어컨 추가) → 리포트(광고 게이트) → 기록 → 동네 → 설정.
  - 순회 전 구간에서 `console.error` 호출 횟수 === 0, `console.warn` 중 `Warning:` 로 시작하는 React 경고 === 0.
  - 순회 중 앱 코드 발생 `fetch`/`XMLHttpRequest` 요청 === 0, CORS 에러 === 0. 정적 데이터는 `import()` 청크(`.js`) 로드로만 관찰됨.
  - 결정론 검증: 동일 입력(350/8 + 동일 가전 구성)으로 요금·시뮬레이션·팁 생성을 10회 반복 → 10회 결과 문자열이 전부 동일, LLM/AI API 호출 0건.
  - AI 고지 문구·라벨이 화면에 존재하지 않고, 대신 `"예상치"` 고지가 S1 다이얼로그와 S2 최하단에 노출됨.
  - `/result`, `/simulate`, `/report` 각각에 state 없이 직접 진입하는 3개 케이스 추가 — 전부 크래시 없이 폴백 경로로 이동.
- **Covers**: [AC-G2, AC-G3, AC-G8, AC-3.4, AC-6.7]
- **Files**: `e2e/full-flow.spec.ts`, `package.json`(scripts)
- **Depends on**: Task 4.3

---

## AC Coverage

- **Total ACs in SPEC**: 73 (F1 7 + F2 8 + F3 8 + F4 8 + F5 8 + F6 8 + F7 8 + F8 8 + 전역 10)
- **Covered by tasks**: 73

| AC | Task |
|---|---|
| AC-1.1, 1.2, 1.4, 1.7 | 2.1 |
| AC-1.3, 1.5, 1.6 | 2.2 |
| AC-2.1 ~ 2.8 (8건) | 3.1 |
| AC-3.1, 3.3, 3.6, 3.7 | 3.2 |
| AC-3.2 | 2.4, 3.3 |
| AC-3.4 | 3.3, 4.4 |
| AC-3.5 | 2.3, 3.3 |
| AC-3.8 | 4.2 |
| AC-4.1, 4.4, 4.5, 4.7 | 3.4 |
| AC-4.2 | 3.5 |
| AC-4.3 | 2.5, 3.5 |
| AC-4.6 | 2.3, 3.4 |
| AC-4.8 | 3.5, 4.2 |
| AC-5.1, 5.3, 5.8 | 2.5, 3.6 |
| AC-5.2, 5.6 | 2.4, 3.7 |
| AC-5.4, 5.5 | 3.7 |
| AC-5.7 | 3.6 |
| AC-6.1, 6.2, 6.3, 6.6, 6.8 | 3.9 |
| AC-6.4 | 2.4, 3.9 |
| AC-6.5 | 3.8 |
| AC-6.7 | 3.8, 4.4 |
| AC-7.1, 7.6 | 2.5, 3.10 |
| AC-7.3, 7.4, 7.5 | 3.10 |
| AC-7.2, 7.8 | 3.11 |
| AC-7.7 | 3.11, 4.2 |
| AC-8.1, 8.2, 8.5 | 2.4, 3.12 |
| AC-8.3 | 4.1 |
| AC-8.4 | 2.3, 3.12 |
| AC-8.6, 8.8 | 3.12 |
| AC-8.7 | 2.3, 4.1 |
| AC-G1, G4, G5, G6, G9 | 4.3 |
| AC-G2, G3, G8 | 4.4 |
| AC-G7, G10 | 4.2 |

- **Uncovered**: 0

---

## 실행 순서 요약

```
1.1 → 1.2 → 2.1 → 2.2 → 2.3 → 2.4 → 2.5
   → 3.1 → 3.2 → 3.3 → 3.4 → 3.5 → 3.6 → 3.7 → 3.8 → 3.9 → 3.10 → 3.11 → 3.12
   → 4.1 → 4.2 → 4.3 → 4.4
```

각 Task 완료 시점마다 `npx tsc --noEmit` + `npm run build` 가 성공해야 하며, Epic 2 완료 이후에는 `npm test` 도 green 이어야 한다.