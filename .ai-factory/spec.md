PRD를 SPEC으로 확장했습니다. 외부 서버 없이 100% 클라이언트 계산 + localStorage로 설계했고, 요금표는 버전 상수로 분리해 단가 개정 시 코드 1곳만 바꾸면 되게 했습니다.

---

# SPEC — ElectricSaver (앱인토스)

## Common Principles

- **플랫폼**: Vite + React + TypeScript, `@toss/tds-mobile`(TDS), `react-router-dom`, localStorage.
- **인증**: 토스 앱이 세션을 자동 제공. 로그인 호출 코드 없음. 사용자 식별이 필요한 경우에만 `getIsTossLoginIntegratedService()`로 연동 여부 확인 (MVP에서는 기기 로컬 저장만 사용하므로 호출하지 않음).
- **서버 없음**: 모든 요금 계산은 클라이언트 순수 함수. 외부 API 호출 0건 → CORS 이슈 원천 차단.
- **생성형 AI 미사용**: 절약 팁/리포트는 전부 사전 정의된 정적 문자열 템플릿 + 규칙 기반 계산 결과. LLM 호출 0건이므로 생성형 AI 고지 의무 대상 아님 (CC-10 참조).
- **UI 규칙**: 모든 UI는 TDS 컴포넌트 조립. 여백은 TDS `Spacing`(size 필수)만 사용, TDS 컴포넌트에 Tailwind/인라인 padding·margin 덮어쓰기 금지. 커스텀 CSS는 flex/grid 배치에만 허용. 하단 탭은 템플릿 제공 `src/components/FloatingTabBar` 사용.
- **페이지 골격**: 모든 라우트 컴포넌트는 `ScreenScaffold`로 감싼다 (raw `div` 골격 금지). 1차 액션은 `SubmitFooter`(하단 고정) 또는 `display="block"` Button.
- **금액 표기**: 모든 금액은 `toLocaleString('ko-KR')` + "원" 접미. 사용량은 정수 + "kWh".
- **반올림 규칙(전 계산 공통, 한전 청구 방식)**:
  - `floor1(x)` = 원 미만 절사 → 기본요금·전력량요금·기후환경요금·연료비조정액·전기요금계
  - `vat = Math.round(전기요금계 × 0.1)` (원 미만 반올림)
  - `fund = floor10(전기요금계 × 0.037)` (10원 미만 절사)
  - `total = floor10(전기요금계 + vat + fund)` (10원 미만 절사)
- **테마**: HEX 하드코딩 금지. 색상은 TDS 컴포넌트 기본값 또는 `var(--tds-color-*)` CSS 변수만 사용(다크모드 필수).
- **터치 타깃**: 모든 인터랙티브 요소 실제 히트영역 ≥ 44×44px.

### 공통 컴플라이언스 AC (모든 화면에 적용)

- **CC-1 [W][P0]**: Scenario: 외부 도메인 이탈 차단
  Given 앱 코드 전체를 정적 스캔할 때
  When `window.location.href = "http(s)://..."` 또는 `window.open(...)` 패턴을 검색
  Then 매칭 결과가 0건이다 (테스트: 소스 grep 기반 유닛 테스트)
- **CC-2 [U][P0]**: 프로덕션 빌드(`vite build` 결과)를 로드해 전체 라우트를 순회하는 동안 `console.error` 호출 횟수가 0이다.
- **CC-3 [U][P1]**: 앱은 외부 네트워크 요청을 발생시키지 않는다. 테스트에서 `globalThis.fetch`/`XMLHttpRequest`를 스파이로 감싸고 전 화면 순회 시 호출 0건이어야 한다 (CORS 에러 0건 보장).
- **CC-4 [U][P1]**: 소스에 `Array.prototype.at`, `Object.groupBy`, `structuredClone`, 옵셔널 체이닝 할당(`??=` 제외 대상 아님) 등 iOS 16 / Android 7 WebView 미지원 API를 사용하지 않는다. 빌드 타깃은 `es2020`, browserslist는 `iOS >= 16, Android >= 7`.
- **CC-5 [W][P0]**: 앱 내 어떤 텍스트/배너/링크도 "설치", "다운로드", "앱스토어", "플레이스토어" 문자열을 포함하지 않는다 (i18n 문자열 사전 전체 스캔 0건).
- **CC-6 [W][P0]**: 외부 링크는 존재하지 않는다. 요금 단가 출처 표기는 텍스트로만 노출하며 앵커(`<a href>`)를 생성하지 않는다.
- **CC-7 [W][P0]**: Google Analytics, Amplitude 등 외부 분석 SDK를 `package.json` 의존성 및 소스 import에 포함하지 않는다 (스캔 0건).
- **CC-8 [U][P0]**: 소스 전체에서 `#RRGGBB` / `#RGB` 리터럴 매칭이 0건이다 (`.css`, `.tsx` 포함).
- **CC-9 [W][P1]**: `grantPromotionReward`는 MVP에서 사용하지 않는다. 소스 스캔 시 호출 0건 (사용 시 `amount ≤ 5000` 검증 필수).
- **CC-10 [U][P1]**: 앱은 생성형 AI를 사용하지 않는다. 절약 팁 문자열은 `src/domain/tips.ts` 정적 상수에서만 로드되며, 소스 내 LLM/AI API 호출(`anthropic`, `openai`, `fetch(.../v1/chat...)`) 매칭이 0건이다.
- **CC-11 [U][P1]**: 모든 인터랙티브 요소(Button, ListRow, Stepper, Chip, Tab)의 렌더 결과 높이가 44px 이상이다 (jsdom 스타일 계산 또는 컴포넌트 size prop 검증).
- **CC-12 [W][P1]**: Scenario: localStorage 쓰기 실패
  Given `localStorage.setItem`이 `QuotaExceededError`를 던지는 환경
  When 사용자가 계산 결과를 저장
  Then Toast "저장 공간이 부족해요. 오래된 기록을 삭제해주세요"가 표시되고 앱은 크래시하지 않으며 계산 결과 화면은 그대로 유지된다

---

## Data Models

### TariffTable (정적 상수 — 저장 안 함)

```ts
export type ContractType = 'low' | 'high'; // 저압 / 고압

export interface TariffTier {
  /** 이 구간의 상한 누적 kWh. null이면 무제한(최종 구간) */
  limitKWh: number | null;
  /** 원/kWh */
  rate: number;
  /** 이 구간이 최종 적용 구간일 때의 기본요금(원) */
  baseFee: number;
}

export interface TariffTable {
  version: string;            // 'v2024.01'
  effectiveFrom: string;      // 'YYYY-MM-DD'
  sourceLabel: string;        // '한국전력 주택용 전력(저압/고압) 기준'
  summerMonths: number[];     // [7, 8]
  climateRate: number;        // 원/kWh
  fuelAdjRate: number;        // 원/kWh
  vatRate: number;            // 0.1
  fundRate: number;           // 0.037
  normal: Record<ContractType, TariffTier[]>; // 3구간
  summer: Record<ContractType, TariffTier[]>; // 여름 완화 3구간
}
```

확정 값 (`src/domain/tariff.ts`):

| 구분 | 구간1 | 구간2 | 구간3 |
|---|---|---|---|
| 저압 평시 상한 | 200kWh | 400kWh | 무제한 |
| 저압 여름(7·8월) 상한 | 300kWh | 450kWh | 무제한 |
| 저압 단가(원/kWh) | 120.0 | 214.6 | 307.3 |
| 저압 기본요금(원) | 910 | 1,600 | 7,300 |
| 고압 단가(원/kWh) | 105.0 | 174.0 | 242.3 |
| 고압 기본요금(원) | 730 | 1,260 | 6,060 |

공통: `climateRate = 9.0`, `fuelAdjRate = 5.0`, `vatRate = 0.1`, `fundRate = 0.037`.

### BillInput / BillBreakdown (계산 I/O)

```ts
export interface BillInput {
  kWh: number;            // 정수, 1~10000
  yearMonth: string;      // 'YYYY-MM'
  contractType: ContractType;
}

export interface TierUsage {
  tier: 1 | 2 | 3;
  kWh: number;            // 이 구간에 배분된 사용량
  rate: number;           // 원/kWh
  fee: number;            // 원 (절사 전 소수 허용, 표시 시 floor1)
}

export interface BillBreakdown {
  input: BillInput;
  isSummerRelief: boolean;  // 7·8월 여부
  tariffVersion: string;
  baseFee: number;
  tiers: TierUsage[];       // 항상 길이 3 (미사용 구간은 kWh=0, fee=0)
  energyFee: number;        // floor1
  climateFee: number;       // floor1
  fuelAdjFee: number;       // floor1
  subtotal: number;         // 전기요금계, floor1
  vat: number;              // round
  fund: number;             // floor10
  total: number;            // 청구금액, floor10
  marginalRate: number;     // 현재 적용 최고 구간 단가(원/kWh)
}
```

### UsageRecord (localStorage 저장)

```ts
export interface UsageRecord {
  id: string;             // `${yearMonth}` 기준 유니크. 형식: 'rec_' + yearMonth
  yearMonth: string;      // 'YYYY-MM'
  kWh: number;            // 1~10000 정수
  contractType: ContractType;
  total: number;          // 계산된 청구금액(원)
  tariffVersion: string;
  createdAt: number;      // epoch ms
  updatedAt: number;      // epoch ms
}
```

- key: `es:records:v1`
- shape: `UsageRecord[]` — `yearMonth` 내림차순 정렬 유지, 동일 `yearMonth` 재계산 시 **덮어쓰기(upsert)**
- 상한: 60건(5년). 초과 시 `yearMonth` 오래된 순으로 삭제.
- 크기: 1건 ≈ 150 bytes → 60건 ≈ 9KB

### AppSettings

```ts
export interface AppSettings {
  contractType: ContractType;      // 기본 'low'
  regionCode: string;              // 기본 'KR-11' (서울)
  householdSize: 1 | 2 | 3 | 4;    // 기본 1
  lastYearMonth: string | null;    // 마지막 입력 'YYYY-MM'
}
```

- key: `es:settings:v1` / shape: `AppSettings` / 크기 ≈ 120 bytes

### SimulationInput

```ts
export interface ApplianceCut {
  applianceId: string;   // ApplianceCatalog id
  cutHoursPerDay: number; // 0~12, 0.5 단위
}
export interface SimulationInput {
  baseRecordId: string;
  cuts: ApplianceCut[];  // 최대 8개
  days: number;          // 고정 30
}
```

- key: `es:sim:last:v1` / shape: `SimulationInput` / 크기 ≈ 300 bytes

### ReportUnlock (리워드 광고 해제 캐시)

```ts
export interface ReportUnlock {
  [recordId: string]: number; // unlockedAt epoch ms, TTL 24h
}
```

- key: `es:report_unlock:v1` / 크기 ≈ 60건 × 30 bytes ≈ 2KB

### ApplianceCatalog (정적 상수)

```ts
export interface Appliance {
  id: string;
  name: string;
  watt: number;          // 정격 소비전력 W
  defaultHours: number;  // 하루 평균 사용시간(가정)
  icon: string;          // TDS Asset.ContentIcon name
}
```

| id | name | watt | defaultHours |
|---|---|---|---|
| `aircon` | 에어컨 | 1800 | 8 |
| `dryer` | 건조기 | 1600 | 1 |
| `microwave` | 전자레인지 | 1000 | 0.5 |
| `washer` | 세탁기 | 500 | 1 |
| `heatmat` | 전기장판 | 300 | 8 |
| `dehumid` | 제습기 | 300 | 4 |
| `tv` | TV | 150 | 4 |
| `ricecooker` | 전기밥솥(보온) | 100 | 12 |

### RegionAverage (정적 번들 JSON, 서버 없음)

```ts
export interface RegionAverageEntry {
  regionCode: string;   // 'KR-11'
  regionName: string;   // '서울'
  /** 월(1~12) → 가구당 월평균 사용량 kWh */
  monthly: Record<string, number>;
}
```

- 파일: `src/data/region-average.json` (17개 시도 × 12개월)
- 저장소 사용 없음(번들 정적 자산), 크기 ≈ 8KB
- **총 localStorage 사용량 추정: 약 12KB / 5MB (0.3%)**

---

## Feature List

### F1. 누진요금 계산 엔진 & 요금표 데이터

- **Description**: 사용량(kWh)·연월·계약종별을 입력받아 누진 3구간 배분, 기본요금, 기후환경요금, 연료비조정액, 부가세, 전력산업기반기금을 순수 함수로 계산한다. 7·8월은 여름철 완화 구간표를 자동 적용한다. UI 없는 도메인 레이어로 100% 유닛 테스트 대상이다.
- **Data**: `TariffTable`(정적), `BillInput`, `BillBreakdown`
- **API**: 없음 (클라이언트 순수 함수)
- **Requirements**: `calcBill(input: BillInput): BillBreakdown`, `validateUsageInput(raw: string): { ok: true; kWh: number } | { ok: false; message: string }`

**Acceptance Criteria**

- **AC-1.1 [U][P0]**: Scenario: 평시 300kWh 저압 계산
  Given `TariffTable v2024.01`이 로드되어 있을 때
  When `calcBill({ kWh: 300, yearMonth: '2026-05', contractType: 'low' })` 호출
  Then 결과는 `{ baseFee: 1600, energyFee: 45460, climateFee: 2700, fuelAdjFee: 1500, subtotal: 51260, vat: 5126, fund: 1890, total: 58270, isSummerRelief: false, marginalRate: 214.6 }`
  And `tiers`는 `[{tier:1,kWh:200,fee:24000},{tier:2,kWh:100,fee:21460},{tier:3,kWh:0,fee:0}]`
- **AC-1.2 [E][P0]**: Scenario: 여름철 완화 자동 적용
  Given 동일 요금표일 때
  When `calcBill({ kWh: 450, yearMonth: '2026-08', contractType: 'low' })` 호출
  Then `isSummerRelief === true`이고 결과는 `{ baseFee: 1600, energyFee: 68190, subtotal: 76090, vat: 7609, fund: 2810, total: 86500 }`
  And 같은 450kWh를 `yearMonth: '2026-05'`로 계산하면 `total === 109010`이며 두 값의 차이는 22,510원이다
- **AC-1.3 [S][P0]**: Scenario: 최종 구간 진입 시 한계단가
  Given 저압 평시일 때
  When `kWh = 500`으로 계산
  Then `tiers[2].kWh === 100`, `marginalRate === 307.3`, `baseFee === 7300`
- **AC-1.4 [O][P1]**: Scenario: 고압 계약 선택
  Given `contractType: 'high'`일 때
  When `calcBill({ kWh: 300, yearMonth: '2026-05', contractType: 'high' })` 호출
  Then `baseFee === 1260`이고 `energyFee === floor1(200×105.0 + 100×174.0) === 38400`
- **AC-1.5 [W][P1]**: Scenario: 0 또는 빈 입력 거부
  Given 입력 검증기를 호출할 때
  When `validateUsageInput('')` 또는 `validateUsageInput('0')`
  Then `{ ok: false, message: '사용량을 1kWh 이상 입력해주세요' }` 반환
- **AC-1.6 [W][P1]**: Scenario: 상한 초과·비정수 입력 거부
  Given 입력 검증기를 호출할 때
  When `validateUsageInput('10001')`
  Then `{ ok: false, message: '10,000kWh 이하로 입력해주세요' }` 반환
  And `validateUsageInput('12.5')`는 `{ ok: false, message: '숫자만 입력해주세요' }` 반환
  And `validateUsageInput('-5')`는 `{ ok: false, message: '숫자만 입력해주세요' }` 반환
- **AC-1.7 [U][P1]**: Scenario: 요금표 버전 각인
  Given 어떤 입력이든 계산할 때
  Then `BillBreakdown.tariffVersion === 'v2024.01'`이고, 화면 하단에 "한국전력 주택용 전력 기준 · v2024.01" 텍스트가 표시된다

---

### F2. 사용량 입력 홈 화면

- **Description**: 앱 진입 첫 화면에서 검침 연월, 월 사용량(kWh), 계약종별을 입력받아 계산 결과 화면으로 이동한다. 모바일 숫자 키보드와 하단 고정 제출 버튼을 제공하며, 마지막 설정값을 자동 복원한다.
- **Data**: `AppSettings`(`es:settings:v1`), `validateUsageInput`
- **API**: 없음
- **Requirements**: 라우트 `/`, TDS TextField(inputMode numeric) + Tab(계약종별) + SubmitFooter

**Acceptance Criteria**

- **AC-2.1 [E][P0]**: Scenario: 정상 입력 후 계산
  Given 홈 화면에서 계약종별 "저압"이 선택되어 있을 때
  When 사용량 필드에 `450`, 연월 `2026-08`을 입력하고 "요금 계산하기" 버튼 탭
  Then `navigate('/result', { state: { input: { kWh: 450, yearMonth: '2026-08', contractType: 'low' } } })`가 호출된다
  And `es:settings:v1`의 `contractType`, `lastYearMonth`가 갱신된다
- **AC-2.2 [E][P1]**: Scenario: 모바일 키보드 대응
  Given 사용량 TextField를 탭했을 때
  Then `inputMode="numeric"`, `type="text"`, `pattern="[0-9]*"` 속성이 적용되어 숫자 키패드가 뜬다
  And 키보드 표시 중 `SubmitFooter`는 `visualViewport.height` 기준으로 키보드 위에 고정되어 가려지지 않는다
  And 키보드 "완료" 입력(keydown Enter) 시 필드가 blur되고 제출이 1회만 실행된다
- **AC-2.3 [W][P1]**: Scenario: 빈 사용량 제출 거부
  Given 사용량 필드가 비어 있을 때
  When "요금 계산하기" 버튼 탭
  Then TextField 하단에 "사용량을 1kWh 이상 입력해주세요" 에러 텍스트가 표시되고 navigate는 호출되지 않는다
- **AC-2.4 [W][P1]**: Scenario: 미래 연월 거부
  Given 오늘이 `2026-09-02`일 때
  When 연월 `2026-10`을 선택하고 제출
  Then "아직 오지 않은 달이에요" 에러 텍스트가 표시되고 navigate는 호출되지 않는다
- **AC-2.5 [S][P1]**: Scenario: 설정 복원 로딩 상태
  Given `es:settings:v1` 읽기가 완료되기 전일 때
  Then 입력 폼 자리에 TDS Skeleton 3개(`data-testid="home-skeleton"`)가 표시되고 제출 버튼은 `disabled`이다
  And 읽기 완료 후 저장된 `contractType`과 `lastYearMonth`가 필드에 채워진다
- **AC-2.6 [W][P1]**: Scenario: 손상된 설정 JSON 복구
  Given `es:settings:v1` 값이 `'{{broken'`일 때
  When 홈 화면 진입
  Then 앱은 크래시하지 않고 기본값 `{ contractType: 'low', regionCode: 'KR-11', householdSize: 1, lastYearMonth: null }`으로 렌더되며 해당 키를 기본값으로 덮어쓴다
- **AC-2.7 [U][P2]**: Scenario: 홈 레이아웃 계약
  Given 홈 화면이 렌더될 때
  Then 최상위는 `ScreenScaffold`이고, 1차 액션은 `SubmitFooter` 내부의 `display="block"` TDS Button이며 높이 ≥ 52px이다
  And 배너 광고 `AdSlot`은 `data-testid="home-ad"`로 입력 카드 아래·SubmitFooter 위에 위치하고 폼 요소와 겹치지 않는다

---

### F3. 요금 결과 화면 (누진 구간 브레이크다운)

- **Description**: 계산된 청구금액을 히어로 숫자로 보여주고, 누진 1·2·3구간에 배분된 사용량과 요금을 카드로 시각화한다. 여름철 완화가 적용된 달에는 완화 배지와 절감액을 함께 표기한다.
- **Data**: `BillBreakdown`, `UsageRecord` 저장(F4 연계)
- **API**: 없음
- **Requirements**: 라우트 `/result`, TDS Top·Card·ListRow·Badge·Button, SummaryHero(CountUp), MiniBar

**Acceptance Criteria**

- **AC-3.1 [E][P0]**: Scenario: 결과 렌더
  Given `location.state = { input: { kWh: 450, yearMonth: '2026-08', contractType: 'low' } }`로 진입할 때
  Then `data-testid="bill-hero"` SummaryHero에 CountUp으로 "86,500원"이 표시된다
  And `data-testid="tier-card"` Card 안에 구간 ListRow 3개가 있고 각각 "1구간 300kWh · 36,000원", "2구간 150kWh · 32,190원", "3구간 0kWh · 0원"을 표기한다
  And 각 구간 행에는 사용량 비율(300/450=67%, 150/450=33%, 0%)을 나타내는 `MiniBar`가 렌더된다
- **AC-3.2 [U][P0]**: Scenario: 요금 상세 카드
  Given 결과 화면이 렌더될 때
  Then `data-testid="detail-card"` Card에 "기본요금 1,600원 / 전력량요금 68,190원 / 기후환경요금 4,050원 / 연료비조정액 2,250원 / 부가가치세 7,609원 / 전력기금 2,810원" 6개 ListRow가 순서대로 표시된다
- **AC-3.3 [S][P0]**: Scenario: 여름 완화 배지
  Given `isSummerRelief === true`일 때
  Then 히어로 하단에 TDS Badge "여름철 완화 적용"이 표시되고, "완화 덕분에 22,510원 아꼈어요" 텍스트가 표시된다
  And `isSummerRelief === false`이면 해당 Badge와 텍스트가 DOM에 존재하지 않는다
- **AC-3.4 [E][P0]**: Scenario: 결과 저장
  Given 결과 화면이 마운트될 때
  Then `es:records:v1`에 `{ id: 'rec_2026-08', yearMonth: '2026-08', kWh: 450, total: 86500 }` 레코드가 upsert된다
  And 동일 `yearMonth`가 이미 있으면 배열 길이는 증가하지 않고 값만 갱신된다
- **AC-3.5 [W][P1]**: Scenario: state 없이 직접 진입
  Given `location.state`가 `null`인 상태로 `/result`에 직접 진입할 때
  Then 계산을 시도하지 않고 "계산할 사용량이 없어요" 빈 상태(Asset.ContentIcon + Paragraph.Text)와 "사용량 입력하러 가기" Button이 표시되며, 탭 시 `navigate('/', { replace: true })`
- **AC-3.6 [W][P1]**: Scenario: 저장 실패해도 결과 유지
  Given `localStorage.setItem`이 `QuotaExceededError`를 던질 때
  When 결과 화면이 마운트
  Then Toast "저장 공간이 부족해요. 오래된 기록을 삭제해주세요"가 표시되고 `data-testid="bill-hero"`는 정상 렌더된다
- **AC-3.7 [S][P1]**: Scenario: 계산 중 로딩
  Given 계산 결과가 아직 준비되지 않은 첫 프레임일 때
  Then `data-testid="result-skeleton"` Skeleton이 히어로 자리에 표시되고, 계산 완료 후 200ms 이내에 실제 값으로 교체된다
- **AC-3.8 [U][P2]**: Scenario: 결과 화면 레이아웃/광고 계약
  Given 결과 화면이 렌더될 때
  Then 최상위는 `ScreenScaffold`, 핵심 정보는 Card 3개(`bill-hero` 영역, `tier-card`, `detail-card`)로 묶이며 raw div 나열이 없다
  And 청구금액은 t2 이상 강조 타이포로 렌더된다
  And `AdSlot`(`data-testid="result-ad"`)은 `detail-card` 아래에 위치하고 하단 CTA(`절약 시뮬레이션 하기`)와 겹치지 않는다

---

### F4. 계산 기록 저장 & 히스토리 화면

- **Description**: 계산할 때마다 월별 레코드를 localStorage에 upsert하고, 히스토리 탭에서 최신순 목록으로 조회·삭제할 수 있게 한다. 저장 상한(60건)과 손상 데이터 복구를 담당하는 저장소 레이어를 포함한다.
- **Data**: `UsageRecord[]` (`es:records:v1`)
- **API**: 없음
- **Requirements**: 라우트 `/history`, 저장소 모듈 `recordStore.ts` (`list/upsert/remove/prune`)

**Acceptance Criteria**

- **AC-4.1 [U][P0]**: Scenario: 목록 정렬
  Given `es:records:v1`에 `['2026-06','2026-08','2026-07']` 레코드가 있을 때
  When `/history` 진입
  Then ListRow 순서가 `2026-08 → 2026-07 → 2026-06`이고 각 행에 "2026년 8월 · 450kWh"와 우측 "86,500원"이 표시된다
- **AC-4.2 [E][P0]**: Scenario: 기록 삭제
  Given 히스토리에 3건이 있을 때
  When `2026-07` 행의 삭제 아이콘(44×44px) 탭 → TDS AlertDialog "이 기록을 삭제할까요?"에서 "삭제" 탭
  Then 해당 레코드가 `es:records:v1`에서 제거되고 목록이 2건으로 갱신되며 Toast "기록을 삭제했어요"가 표시된다
- **AC-4.3 [E][P1]**: Scenario: 60건 상한 프루닝
  Given `es:records:v1`에 60건이 있고 가장 오래된 값이 `2021-01`일 때
  When `2026-09` 레코드를 upsert
  Then 배열 길이는 60을 유지하고 `2021-01` 레코드가 제거된다
- **AC-4.4 [S][P1]**: Scenario: 빈 상태
  Given `es:records:v1`이 없거나 빈 배열일 때
  When `/history` 진입
  Then `data-testid="history-empty"` 영역에 `Asset.ContentIcon`과 "아직 계산한 기록이 없어요" 텍스트, "지금 계산하기" Button이 표시되고 ListRow는 0개다
- **AC-4.5 [W][P1]**: Scenario: 손상된 레코드 배열 복구
  Given `es:records:v1` 값이 `'null'` 또는 `'{"a":1}'`(배열 아님)일 때
  When 목록을 읽음
  Then `list()`는 `[]`를 반환하고 콘솔 에러 없이 빈 상태 UI가 표시된다
  And 스키마에 맞지 않는 개별 항목(`kWh` 누락 등)은 필터링되어 유효 항목만 반환된다
- **AC-4.6 [U][P1]**: Scenario: 스크롤 동작
  Given 목록이 최대 60건일 때
  Then 일반 세로 스크롤을 사용하며 가상 스크롤은 적용하지 않는다 (항목 100개 초과 시에만 윈도 가상화 도입 — MVP 해당 없음)
  And 목록 컨테이너는 `overflow-y: auto`, `-webkit-overflow-scrolling: touch`를 사용하고 FloatingTabBar 높이만큼 하단 여백을 확보해 마지막 행이 가려지지 않는다
- **AC-4.7 [E][P2]**: Scenario: 기록에서 결과 재조회
  Given 히스토리 행을 탭할 때
  Then `navigate('/result', { state: { input: { kWh, yearMonth, contractType } } })`가 호출된다

---

### F5. 전년 동월 대비 비교

- **Description**: 결과 화면에서 같은 달의 전년 기록을 찾아 사용량·요금 증감을 카드로 보여준다. 최근 12개월 청구금액 추이를 Sparkline으로 시각화해 계절성을 인지시킨다.
- **Data**: `UsageRecord[]`
- **API**: 없음
- **Requirements**: `findYoY(records, yearMonth): UsageRecord | null`, `data-testid="yoy-card"`

**Acceptance Criteria**

- **AC-5.1 [E][P0]**: Scenario: 전년 동월 비교 표시
  Given `es:records:v1`에 `{ yearMonth: '2025-08', kWh: 380, total: 68000 }`이 있을 때
  When `2026-08` 결과(450kWh, 86,500원) 화면 진입
  Then `data-testid="yoy-card"` Card에 "작년 8월보다 70kWh 더 썼어요"와 "요금 +18,500원 (+27%)"이 표시된다
  And 증가일 때 값은 TDS `color="red"` 계열 토큰, 감소일 때 `color="blue"` 계열 토큰을 사용한다(HEX 금지)
- **AC-5.2 [U][P0]**: Scenario: 증감률 계산 규칙
  Given 전년 total이 68,000원, 올해 total이 86,500원일 때
  Then 증감률은 `Math.round((86500-68000)/68000*100) === 27`로 계산되며 소수점을 표시하지 않는다
- **AC-5.3 [S][P1]**: Scenario: 전년 기록 없음
  Given `2025-08` 레코드가 없을 때
  When `2026-08` 결과 화면 진입
  Then `data-testid="yoy-card"`에 "작년 8월 기록이 없어요. 다음 해에 비교해드릴게요" 텍스트가 표시되고 증감 수치는 렌더되지 않는다
- **AC-5.4 [S][P1]**: Scenario: Sparkline 표시 조건
  Given 저장된 레코드가 2건 이상일 때
  Then `data-testid="trend-sparkline"` Sparkline이 최근 12개월 `total` 배열로 렌더된다
  And 레코드가 1건 이하이면 Sparkline은 DOM에 존재하지 않고 "기록이 2개 이상 쌓이면 추이를 보여드려요" 텍스트가 대신 표시된다
- **AC-5.5 [W][P1]**: Scenario: 전년 요금 0원 방어
  Given 전년 레코드의 `total`이 `0`일 때
  Then 증감률 계산에서 0으로 나누지 않고 "비교할 수 없어요" 텍스트를 표시한다 (NaN/Infinity가 화면에 노출되지 않음)
- **AC-5.6 [W][P1]**: Scenario: 계약종별 불일치 고지
  Given 전년 레코드 `contractType === 'high'`, 올해 `'low'`일 때
  Then 비교 수치와 함께 "계약 종별이 달라 참고용이에요" 캡션이 표시된다

---

### F6. 가전별 절약 시뮬레이션

- **Description**: 8종 가전 카탈로그에서 하루 사용시간을 줄이는 시나리오를 조합해 월 절감 kWh와 실제 요금 절감액(누진 역행 반영)을 즉시 재계산한다. 슬라이더 대신 0.5시간 단위 스텝퍼로 조작해 모바일 정밀도 문제를 없앤다.
- **Data**: `SimulationInput`(`es:sim:last:v1`), `ApplianceCatalog`, `calcBill`
- **API**: 없음
- **Requirements**: 라우트 `/simulate`, `simulate(base: BillInput, cuts: ApplianceCut[]): { savedKWh, afterBill, savedWon }`

**Acceptance Criteria**

- **AC-6.1 [E][P0]**: Scenario: 에어컨 2시간 감축 시뮬레이션
  Given 기준 레코드가 `{ kWh: 450, yearMonth: '2026-08', contractType: 'low', total: 86500 }`일 때
  When `aircon`(1800W)의 감축 시간을 `2`로 설정
  Then `savedKWh === 108` (1800/1000 × 2 × 30)
  And `afterBill.total === 58440`이고 `data-testid="saving-hero"`에 "28,060원 절약"이 CountUp으로 표시된다
- **AC-6.2 [U][P0]**: Scenario: 복수 가전 합산
  Given 동일 기준일 때
  When `aircon: 1`(54kWh)과 `dryer: 0.5`(24kWh)를 설정
  Then `savedKWh === 78`이고 시뮬레이션 후 사용량은 `372kWh`로 계산된다
- **AC-6.3 [S][P1]**: Scenario: 감축량이 사용량을 초과
  Given 기준 사용량이 `100kWh`일 때
  When 총 감축량이 `108kWh`가 되도록 설정
  Then 시뮬레이션 후 사용량은 `1kWh`로 하한 클램프되고 "실제 사용량보다 많이 줄일 수는 없어요" 캡션이 표시된다
- **AC-6.4 [W][P1]**: Scenario: 스텝퍼 경계값
  Given 감축 시간이 `0`일 때 "－" 버튼을 탭
  Then 값은 `0` 미만으로 내려가지 않고 "－" 버튼은 `disabled`이다
  And 값이 `12`일 때 "＋" 버튼은 `disabled`이며 `12`를 초과하지 않는다
- **AC-6.5 [S][P1]**: Scenario: 아무 것도 선택하지 않은 빈 상태
  Given 모든 `cutHoursPerDay`가 `0`일 때
  Then `data-testid="saving-hero"`는 "0원"을 표시하고, 하단 "절약 팁 리포트 보기" Button은 `disabled`이며 "줄일 가전을 하나 이상 선택해주세요" 캡션이 표시된다
- **AC-6.6 [E][P1]**: Scenario: 시뮬레이션 상태 복원
  Given 사용자가 `aircon: 2`로 설정한 뒤 앱을 나갔다 다시 `/simulate`에 진입할 때
  Then `es:sim:last:v1`에서 값이 복원되어 `aircon` 스텝퍼가 `2`를 표시한다
  And 기준 `baseRecordId`가 현재 레코드와 다르면 모든 값은 `0`으로 초기화된다
- **AC-6.7 [W][P1]**: Scenario: 기준 결과 없이 직접 진입
  Given `location.state`가 없고 `es:records:v1`도 비어 있을 때
  When `/simulate` 직접 진입
  Then "먼저 이번 달 사용량을 계산해주세요" 빈 상태와 "계산하러 가기" Button이 표시되고 스텝퍼는 렌더되지 않는다
- **AC-6.8 [U][P2]**: Scenario: 시뮬레이션 레이아웃 계약
  Given `/simulate`가 렌더될 때
  Then 최상위는 `ScreenScaffold`이고 `data-testid="saving-hero"` SummaryHero + `data-testid="appliance-card"` Card(내부 8개 `data-testid="appliance-row-{id}"` ListRow) 구조를 가진다
  And 각 스텝퍼 버튼의 히트영역은 44×44px 이상이며, 1차 액션은 SubmitFooter의 `display="block"` Button이다

---

### F7. 절약 팁 상세 리포트 (리워드 광고 게이팅)

- **Description**: 시뮬레이션 결과를 바탕으로 감축량 상위 3개 가전에 대한 구체적 절약 행동 팁과 예상 연간 절감액을 리포트로 제공한다. 리포트 본문은 `TossRewardAd`로 게이팅하며, 시청 완료 시 해당 기록에 대해 24시간 동안 재시청 없이 열람 가능하다.
- **Data**: `ReportUnlock`(`es:report_unlock:v1`), `SimulationInput`, 정적 `tips.ts`
- **API**: 없음 (광고는 템플릿 `TossRewardAd` 컴포넌트가 SDK 호출 담당)
- **Requirements**: 라우트 `/report`

**Acceptance Criteria**

- **AC-7.1 [E][P0]**: Scenario: 결과 보기 전 보상형 광고
  Given 사용자가 시뮬레이션 후 "절약 팁 리포트 보기" 버튼 탭으로 `/report`에 진입했고 해당 `recordId`가 잠금 상태일 때
  When `TossRewardAd`(`slotId={import.meta.env.VITE_TOSS_AD_SLOT_ID}`) 광고 시청이 완료됨
  Then 리포트 본문(`data-testid="report-body"`)이 표시되고 `es:report_unlock:v1[recordId] = Date.now()`가 저장된다
- **AC-7.2 [S][P0]**: Scenario: 잠금 상태 UI
  Given `recordId`가 잠금 상태일 때
  Then `data-testid="report-body"`는 DOM에 렌더되지 않고, 잠금 카드에 "짧은 광고 보고 상세 리포트 열기" Button(높이 ≥ 52px)과 "예상 연간 절감액을 확인할 수 있어요" 설명이 표시된다
- **AC-7.3 [U][P0]**: Scenario: 리포트 내용
  Given 시뮬레이션이 `aircon: 2`(108kWh), `dryer: 0.5`(24kWh)이고 월 절감액이 28,060원일 때
  Then 리포트에 상위 가전 카드가 감축량 내림차순(`aircon` → `dryer`)으로 표시되고, 각 카드에 해당 가전의 정적 팁 문자열 2개가 표시된다
  And `data-testid="annual-saving"`에 "연간 336,720원" (28,060 × 12)이 표시된다
- **AC-7.4 [S][P1]**: Scenario: 24시간 내 재진입은 광고 없이 열람
  Given `es:report_unlock:v1['rec_2026-08']`가 현재 시각 -1시간일 때
  When `/report`에 재진입
  Then 광고 없이 즉시 `data-testid="report-body"`가 표시된다
  And 저장 시각이 -25시간이면 다시 잠금 상태로 전환되고 해당 키는 삭제된다
- **AC-7.5 [W][P1]**: Scenario: 광고 로드 실패
  Given `TossRewardAd`가 로드 실패 콜백을 반환할 때
  Then Toast "지금은 광고를 불러올 수 없어요. 잠시 후 다시 시도해주세요"가 표시되고 화면은 잠금 상태를 유지하며 `console.error`를 호출하지 않는다
  And "다시 시도" Button이 표시된다
- **AC-7.6 [W][P1]**: Scenario: 광고 중도 이탈
  Given 사용자가 광고를 끝까지 보지 않고 닫았을 때
  Then `es:report_unlock:v1`에 키가 저장되지 않고 리포트 본문은 표시되지 않는다
- **AC-7.7 [S][P1]**: Scenario: 광고 로딩 상태
  Given 광고 로드 요청 직후 응답 전일 때
  Then 버튼은 `disabled`가 되고 TDS Loader(`data-testid="ad-loading"`)가 표시되며, 중복 탭으로 광고 요청이 2회 발생하지 않는다
- **AC-7.8 [U][P2]**: Scenario: 리포트 문구는 정적 데이터
  Given 리포트가 표시될 때
  Then 모든 팁 문자열은 `src/domain/tips.ts` 상수에서 로드되며 런타임 네트워크 호출이 0건이다 (생성형 AI 미사용 → AI 고지 라벨 비대상)

---

### F8. 우리 동네 평균 사용량 익명 비교

- **Description**: 사용자가 선택한 시/도의 월별 가구 평균 사용량(번들 정적 데이터)과 본인 사용량을 비교해 상대적 위치를 보여준다. 위치 권한이나 서버 전송 없이 100% 로컬에서 계산해 개인정보를 수집하지 않는다.
- **Data**: `region-average.json`(정적), `AppSettings.regionCode`, 최신 `UsageRecord`
- **API**: 없음 (데이터는 번들 JSON)
- **Requirements**: 라우트 `/compare`, TDS Chip(지역 선택 BottomSheet), MiniBar

**Acceptance Criteria**

- **AC-8.1 [E][P0]**: Scenario: 평균 대비 비교
  Given `regionCode = 'KR-11'`이고 해당 지역 8월 평균이 `320kWh`, 최신 레코드가 `2026-08 / 450kWh`일 때
  When `/compare` 진입
  Then `data-testid="region-compare-card"`에 "서울 8월 평균보다 130kWh 많아요 (+41%)"가 표시된다
  And 내 사용량과 평균을 나타내는 `MiniBar` 2개(`data-testid="bar-mine"`, `data-testid="bar-avg"`)가 렌더되며 길이 비율은 450:320이다
- **AC-8.2 [E][P0]**: Scenario: 지역 변경
  Given 지역 Chip을 탭해 TDS BottomSheet가 열렸을 때
  When 목록에서 "부산"을 선택
  Then `es:settings:v1.regionCode`가 `'KR-26'`으로 저장되고 비교 수치가 부산 8월 평균 기준으로 즉시 재계산된다
  And BottomSheet의 각 지역 항목 높이는 ≥ 48px이다
- **AC-8.3 [U][P0]**: Scenario: 서버 전송 없음
  Given `/compare`에서 지역 변경과 비교를 수행하는 동안
  Then `fetch`/`XMLHttpRequest` 호출은 0건이며 사용량 데이터는 기기 외부로 전송되지 않는다
  And 화면 하단에 "내 사용량은 기기에만 저장되며 어디에도 전송되지 않아요" 캡션이 표시된다
- **AC-8.4 [S][P1]**: Scenario: 비교할 기록 없음
  Given `es:records:v1`이 비어 있을 때
  When `/compare` 진입
  Then `Asset.ContentIcon`과 "비교하려면 먼저 사용량을 계산해주세요" 빈 상태, "계산하러 가기" Button이 표시되고 MiniBar는 렌더되지 않는다
- **AC-8.5 [W][P1]**: Scenario: 지역/월 데이터 누락
  Given `region-average.json`에 `regionCode='KR-99'` 또는 해당 월 키가 없을 때
  Then "이 지역의 평균 데이터가 아직 없어요" 텍스트가 표시되고 앱은 크래시하지 않으며 `NaN`이 화면에 노출되지 않는다
- **AC-8.6 [S][P1]**: Scenario: 데이터 로딩 상태
  Given 정적 JSON을 dynamic import로 로드 중일 때
  Then `data-testid="compare-skeleton"` Skeleton이 표시되고, 로드 완료 후 비교 카드로 교체된다
- **AC-8.7 [U][P2]**: Scenario: 비교 화면 레이아웃/광고 계약
  Given `/compare`가 렌더될 때
  Then 최상위는 `ScreenScaffold`, 핵심 값(차이 kWh)은 t2~t3 강조 타이포로 표기되고 "+41%"는 TDS Badge로 표시된다
  And `AdSlot`(`data-testid="compare-ad"`)은 비교 카드 아래에 배치되어 FloatingTabBar와 겹치지 않는다

---

## Screen Definitions

### S1. 홈 — 사용량 입력 (`/`)

- **TDS 컴포넌트**: `Top`(타이틀 "우리집 전기요금"), `TextField`(사용량 kWh), `ListRow`(연월 선택 → `BottomSheet`), `Tab`(저압/고압 전환), `Paragraph.Text`(요금표 버전 캡션), `Button`(SubmitFooter 내부, `display="block"`), `Spacing`, `Toast`
- **레이아웃 계약**: `ScreenScaffold` > `Top` > 입력 `Card` > `AdSlot(home-ad)` > `SubmitFooter(Button)`. FloatingTabBar 탭 1번.
- **로딩**: 설정 복원 중 `data-testid="home-skeleton"` Skeleton 3개, 제출 버튼 disabled
- **빈 상태**: 해당 없음(입력 폼)
- **에러**: TextField 하단 인라인 에러 텍스트 ("사용량을 1kWh 이상 입력해주세요" / "10,000kWh 이하로 입력해주세요" / "숫자만 입력해주세요" / "아직 오지 않은 달이에요")
- **터치**: TextField 높이 56px, Tab 아이템 48px, 연월 ListRow 56px, 제출 Button 52px
- **키보드**: `inputMode="numeric"`, 포커스 시 SubmitFooter가 `visualViewport` 기준 키보드 위로 이동, Enter 시 blur 후 1회 제출
- **Navigation state**
  - Outgoing: "요금 계산하기" → `navigate('/result', { state: { input: BillInput } })`
  - Incoming: 없음 (`location.state` 사용 안 함)

### S2. 결과 (`/result`)

- **TDS 컴포넌트**: `Top`(뒤로가기), `Card`×3, `ListRow`(구간/상세 항목), `Badge`("여름철 완화 적용"), `Paragraph.Text`, `Button`(하단 "절약 시뮬레이션 하기"), `Toast`, `Spacing`
- **커스텀 프레젠테이션**: `SummaryHero`(CountUp, `data-testid="bill-hero"`), `MiniBar`(구간 비율), `Sparkline`(`data-testid="trend-sparkline"`)
- **레이아웃 계약**: `ScreenScaffold` > `SummaryHero` > `tier-card` > `yoy-card` > `detail-card` > `AdSlot(result-ad)` > `SubmitFooter(Button)`
- **로딩**: `data-testid="result-skeleton"`
- **빈 상태**: state 없이 직접 진입 시 `Asset.ContentIcon` + "계산할 사용량이 없어요" + "사용량 입력하러 가기" Button
- **에러**: 저장 실패 시 Toast (화면은 유지)
- **터치**: 하단 Button 52px, Top 뒤로가기 44×44px
- **스크롤**: 세로 일반 스크롤, 하단 SubmitFooter 높이만큼 `padding-bottom` 확보
- **Navigation state**
  - Incoming: `location.state = { input: BillInput } | null`
  - Outgoing: "절약 시뮬레이션 하기" → `navigate('/simulate', { state: { recordId: string, input: BillInput } })`

### S3. 절약 시뮬레이션 (`/simulate`)

- **TDS 컴포넌트**: `Top`, `Card`, `ListRow`(가전 행 + 우측 스텝퍼), `Button`(＋/－, 44×44px), `Chip`(프리셋 "에어컨 1시간 줄이기"), `Paragraph.Text`, `Spacing`, `Button`(SubmitFooter)
- **커스텀 프레젠테이션**: `SummaryHero`(`data-testid="saving-hero"`, CountUp 절감액), `MiniBar`(가전별 절감 기여도)
- **레이아웃 계약**: `ScreenScaffold` > `SummaryHero` > `appliance-card`(8행) > `AdSlot` 없음(조작 화면 — 광고 미배치) > `SubmitFooter("절약 팁 리포트 보기")`
- **로딩**: 기준 레코드 조회 중 Skeleton 1개(`data-testid="simulate-skeleton"`)
- **빈 상태**: 기준 레코드 없음 → "먼저 이번 달 사용량을 계산해주세요" + "계산하러 가기" Button / 모든 감축 0 → 히어로 "0원" + disabled CTA
- **에러**: 감축량 초과 시 인라인 캡션 "실제 사용량보다 많이 줄일 수는 없어요"
- **스크롤**: 8행 고정 → 일반 스크롤 (가상 스크롤 불필요)
- **Navigation state**
  - Incoming: `location.state = { recordId: string, input: BillInput } | null` (null이면 `es:records:v1` 최신 레코드로 폴백)
  - Outgoing: "절약 팁 리포트 보기" → `navigate('/report', { state: { recordId: string, input: BillInput, cuts: ApplianceCut[], savedWon: number } })`

### S4. 절약 팁 리포트 (`/report`)

- **TDS 컴포넌트**: `Top`, `Card`(가전별 팁), `ListRow`(팁 항목), `Button`("광고 보고 열기"), `Badge`, `Loader`, `Toast`, `Spacing`
- **게이팅**: `<TossRewardAd slotId={import.meta.env.VITE_TOSS_AD_SLOT_ID}>` 로 `data-testid="report-body"` 전체를 감싼다. 게이팅 대상 = 상위 3개 가전 상세 팁 + 연간 절감액
- **레이아웃 계약**: `ScreenScaffold` > 잠금 Card 또는 `report-body`(상위 가전 Card 3개 + `data-testid="annual-saving"` 강조 타이포 t2) > `AdSlot(report-ad)` 본문 최하단
- **로딩**: `data-testid="ad-loading"` Loader, CTA disabled
- **빈 상태**: `cuts`가 전부 0이거나 state 없음 → "시뮬레이션 결과가 없어요" + "시뮬레이션 하러 가기" Button
- **에러**: 광고 실패 Toast + "다시 시도" Button
- **터치**: 잠금 CTA 52px, "다시 시도" 44px
- **Navigation state**
  - Incoming: `location.state = { recordId: string, input: BillInput, cuts: ApplianceCut[], savedWon: number } | null`
  - Outgoing: "시뮬레이션 하러 가기" → `navigate('/simulate', { replace: true })`

### S5. 기록 히스토리 (`/history`)

- **TDS 컴포넌트**: `Top`, `ListRow`(월/사용량/요금 + 우측 삭제 아이콘), `AlertDialog`(삭제 확인), `Toast`, `Spacing`, `Button`(빈 상태 CTA)
- **레이아웃 계약**: `ScreenScaffold` > `data-testid="history-list"` > `AdSlot(history-ad)`(목록 최하단, 마지막 행 아래) . FloatingTabBar 탭 2번
- **로딩**: 최초 읽기 중 Skeleton 행 3개(`data-testid="history-skeleton"`)
- **빈 상태**: `data-testid="history-empty"` — `Asset.ContentIcon` + "아직 계산한 기록이 없어요" + "지금 계산하기"
- **에러**: 삭제 실패 시 Toast "삭제하지 못했어요. 다시 시도해주세요"
- **스크롤**: 일반 스크롤(최대 60행), FloatingTabBar 높이만큼 하단 패딩
- **터치**: ListRow 56px, 삭제 아이콘 히트영역 44×44px
- **Navigation state**
  - Incoming: 없음
  - Outgoing: 행 탭 → `navigate('/result', { state: { input: BillInput } })` / 빈 상태 CTA → `navigate('/')`

### S6. 우리 동네 비교 (`/compare`)

- **TDS 컴포넌트**: `Top`, `Chip`(지역 선택), `BottomSheet`(17개 시도 목록), `Card`, `Badge`(증감률), `Paragraph.Text`(비전송 고지), `Spacing`
- **커스텀 프레젠테이션**: `MiniBar`×2(`bar-mine`, `bar-avg`)
- **레이아웃 계약**: `ScreenScaffold` > 지역 Chip 행 > `region-compare-card` > `AdSlot(compare-ad)`. FloatingTabBar 탭 3번
- **로딩**: `data-testid="compare-skeleton"`
- **빈 상태**: 기록 없음 → `Asset.ContentIcon` + "비교하려면 먼저 사용량을 계산해주세요"
- **에러**: 지역/월 데이터 없음 → "이 지역의 평균 데이터가 아직 없어요"
- **터치**: Chip 44px, BottomSheet 항목 48px
- **스크롤**: BottomSheet 내부 17개 항목 일반 스크롤
- **Navigation state**
  - Incoming: 없음 (`es:records:v1` 최신 레코드 사용)
  - Outgoing: 빈 상태 CTA → `navigate('/')`

### 공통 내비게이션

- `FloatingTabBar` 3탭: 계산(`/`) · 기록(`/history`) · 내 동네(`/compare`). `/result`, `/simulate`, `/report`에서는 TabBar를 숨기고 `Top` 뒤로가기를 노출한다.
- 라우터: `createBrowserRouter` 또는 `<BrowserRouter>` + `<Routes>`. 정의되지 않은 경로는 `<Navigate to="/" replace />`.

---

## Data Storage

| key | shape | 최대 크기 | 비고 |
|---|---|---|---|
| `es:records:v1` | `UsageRecord[]` (max 60) | ~9KB | yearMonth 내림차순, upsert |
| `es:settings:v1` | `AppSettings` | ~120B | 기본값 병합 후 저장 |
| `es:sim:last:v1` | `SimulationInput` | ~300B | baseRecordId 불일치 시 폐기 |
| `es:report_unlock:v1` | `ReportUnlock` | ~2KB | TTL 24h, 만료 키는 읽을 때 삭제 |
| **합계** | | **~12KB / 5MB (0.3%)** | |

- 모든 읽기는 `safeParse<T>(key, schemaGuard, fallback)`를 거쳐 JSON 파싱 실패·타입 불일치 시 fallback을 반환하고 손상 키를 fallback으로 덮어쓴다.
- 모든 쓰기는 `try/catch`로 `QuotaExceededError`를 잡아 CC-12의 Toast를 띄운다.

---

## API Contract

**외부 API 없음.** ElectricSaver MVP는 서버 통신이 없다.

- 요금표: `src/domain/tariff.ts` 정적 상수
- 지역 평균: `src/data/region-average.json` 번들 정적 자산 (dynamic import, 네트워크 요청 아님)
- 광고/결제: 템플릿 제공 `AdSlot`, `TossRewardAd` 컴포넌트가 앱인토스 SDK를 호출 (직접 fetch 없음). ID는 `VITE_TOSS_AD_GROUP_ID`, `VITE_TOSS_AD_SLOT_ID` 환경변수로 주입
- 결제(IAP) 미사용

향후 실제 지역 통계 API를 붙일 경우에만 아래 계약을 적용한다(비MVP, 별도 Railway 서버):

```
GET /v1/region-average?regionCode=KR-11&month=8
→ 200 { regionCode: string; regionName: string; month: number; avgKWh: number; sampleSize: number }
→ 400 { error: string }   // 'INVALID_REGION_CODE' | 'INVALID_MONTH'
→ 404 { error: string }   // 'REGION_DATA_NOT_FOUND'
→ 500 { error: string }   // 'INTERNAL_ERROR'
```

모든 에러 응답은 `{ error: string }` 단일 형태를 사용한다.

---

## Assumptions

1. 요금표는 한국전력 주택용 전력(저압/고압) 기준이며, 필수사용량 보장공제·복지할인·다자녀할인 등 감면 제도는 MVP 범위에서 제외한다(결과 화면에 "할인 미반영" 캡션 표기).
2. 여름철 완화는 7·8월 2개월에만 적용한다고 가정한다.
3. 검침 주기 차이(월중 검침)는 무시하고 사용자가 입력한 kWh를 해당 월 전체 사용량으로 간주한다.
4. 절약 시뮬레이션의 월 일수는 30일 고정이다.
5. 가전 소비전력은 카탈로그의 대표값(정격)이며 실제 기기별 차이는 반영하지 않는다 — 화면에 "일반적인 제품 기준 추정치" 캡션 표기.
6. 지역 평균 데이터는 공개 통계를 가공한 정적 스냅샷이며 실시간 갱신되지 않는다.
7. 사용자 식별이 필요 없으므로 `getIsTossLoginIntegratedService()`를 호출하지 않으며, 데이터는 기기 localStorage에만 존재한다(기기 변경 시 이관 없음 — 홈 하단 캡션으로 고지).
8. 리워드 광고 언락은 기기 로컬 캐시이며 서버 검증하지 않는다.

## Open Questions

1. 요금표 단가(120.0 / 214.6 / 307.3원, 기본요금 910 / 1,600 / 7,300원)와 기후환경요금 9.0원, 연료비조정액 5.0원, 전력산업기반기금 3.7%가 **2026년 9월 시점의 최신 고시값인지 확인 필요**. 변경 시 `tariff.ts`의 `version`/`effectiveFrom`만 갱신하면 되도록 설계했으나, 구버전 레코드 재계산 정책(그대로 보존 vs 재계산)이 미정.
2. 필수사용량 보장공제(200kWh 이하 할인)의 현행 존치 여부 — 존치라면 F1에 감면 로직 추가 필요.
3. `region-average.json`의 17개 시도 × 12개월 실제 수치 출처와 라이선스 확보 필요. 미확보 시 F8을 "1~4인 가구 규모별 전국 평균" 비교로 대체할지 결정 필요.
4. 리워드 광고 언락 TTL 24시간이 적정한지(수익 vs UX) — 콘솔 지표 확인 후 조정.
5. 배너 `AdSlot`을 홈 화면에도 노출할지, 결과/기록/비교 3개 화면으로 제한할지 — 검수 가이드상 입력 폼 방해 여부 확인 필요.
6. 계약종별(저압/고압)을 사용자가 직접 알기 어려운 문제 — "아파트는 대부분 고압" 같은 안내 텍스트 문구 확정 필요.

---

**Feature → 예상 work packet 매핑**: F1(2) · F2(1) · F3(2) · F4(2) · F5(1) · F6(2) · F7(2) · F8(1) = 총 13 packets.