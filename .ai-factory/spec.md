# SPEC — ElectricSaver

> 앱인토스 미니앱 / Vite + React + TypeScript + TDS(@toss/tds-mobile) + React Router + localStorage
> 서버 없음. 100% 클라이언트 계산 도구.

---

## Common Principles

- **CP-1 (플랫폼)**: 모든 UI는 TDS 컴포넌트(`ListRow`, `Button`, `TextField`, `Paragraph.Text`, `Chip`, `Switch`, `AlertDialog`, `BottomSheet`, `Toast`, `Top`, `Tab`, `Spacing`, `Asset.ContentIcon`)로 조립한다. shadcn/ui·MUI·Ant Design·Chakra UI 사용 금지. 하단 탭 네비게이션은 템플릿 제공 `src/components/FloatingTabBar` 를 사용한다.
- **CP-2 (스타일)**: 색상은 `var(--tds-color-*)` CSS 변수 또는 TDS 컴포넌트 기본값만 사용한다. HEX 하드코딩(`#FFFFFF`, `#333` 등) 금지. 여백은 TDS `Spacing`(size prop 필수)만 사용하며 TDS 컴포넌트의 내장 padding/margin을 Tailwind·인라인 스타일로 덮어쓰지 않는다. 커스텀 CSS는 flex/grid 배치에만 허용한다.
- **CP-3 (AI 비해당)**: 본 앱의 모든 결과물(요금 계산, 절약 시뮬레이션, 절약 팁)은 결정론적 수식과 고정 카탈로그 문자열에서 생성된다. 생성형 AI를 호출하지 않으므로 AI 고지 의무 대상이 아니다(A-6). 대신 "예상치" 고지를 노출한다.
- **CP-4 (요금표 상수)** — 한국전력 주택용 저압 기준, `src/domain/rateTable.ts` 상수:

  | 구간 | 비하계 kWh 범위 | 하계(7·8월) kWh 범위 | 기본요금(원) | 전력량요금(원/kWh) |
  |---|---|---|---|---|
  | 1 | 0 ~ 200 | 0 ~ 300 | 910 | 120.0 |
  | 2 | 201 ~ 400 | 301 ~ 450 | 1,600 | 214.6 |
  | 3 | 401 ~ | 451 ~ | 7,300 | 307.3 |

  기후환경요금 `9.0원/kWh`, 연료비조정액 `5.0원/kWh`, 부가가치세 `10%`, 전력산업기반기금 `3.7%`.

- **CP-5 (계산 알고리즘)** — `calculateBill(kWh: number, month: number): BillBreakdown`:
  1. `isSummer = month === 7 || month === 8`
  2. `energyCharge = Σ(구간별 사용 kWh × 단가)` → `Math.round`
  3. `baseCharge = 최종 도달 구간의 기본요금`
  4. `climateCharge = Math.round(kWh × 9.0)`, `fuelCharge = Math.round(kWh × 5.0)`
  5. `subtotal = baseCharge + energyCharge + climateCharge + fuelCharge`
  6. `vat = Math.round(subtotal × 0.1)`
  7. `fund = Math.floor(subtotal × 0.037 / 10) × 10`
  8. `total = Math.floor((subtotal + vat + fund) / 10) × 10`

- **CP-6 (고정 테스트 픽스처)** — F1 유닛 테스트는 아래 5행을 그대로 사용한다:

  | # | kWh | month | baseCharge | energyCharge | subtotal | vat | fund | **total** |
  |---|---|---|---|---|---|---|---|---|
  | 1 | 1 | 3 | 910 | 120 | 1,044 | 104 | 30 | **1,170** |
  | 2 | 150 | 3 | 910 | 18,000 | 21,010 | 2,101 | 770 | **23,880** |
  | 3 | 350 | 3 | 1,600 | 56,190 | 62,690 | 6,269 | 2,310 | **71,260** |
  | 4 | 350 | 8 | 1,600 | 46,730 | 53,230 | 5,323 | 1,960 | **60,510** |
  | 5 | 500 | 3 | 7,300 | 97,650 | 111,950 | 11,195 | 4,140 | **127,280** |

- **CP-7 (터치/모바일)**: 모든 인터랙티브 요소의 터치 타깃은 최소 44px(ListRow 56px, Button 48px)이다. 숫자 입력 `TextField` 는 `inputMode="numeric"` 을 사용하고, 포커스 시 하단 고정 푸터가 키보드 위로 밀려 올라간다.
- **CP-8 (라우팅 state)**: 화면 간 전달 타입은 `src/types/navigation.ts` 단일 파일에 정의하고 송·수신 양쪽이 동일 타입을 import 한다. 인라인 타입 선언 금지. `location.state` 가 `null` 이면 각 화면에 정의된 폴백 경로로 `navigate(..., { replace: true })` 한다.
- **CP-9 (레이아웃 골격)**: 모든 화면은 `ScreenScaffold` 로 감싼다(raw `div` 골격 금지). 1차 액션은 하단 고정 `SubmitFooter` 또는 `display="block"` 버튼으로 배치한다. 결과·비교·지표는 `Card` 로 묶어 위계를 표현하고 핵심 값은 t2~t3 강조 타이포로 렌더한다.
- **CP-10 (광고)**: 배너는 `<AdSlot adGroupId={import.meta.env.VITE_TOSS_AD_GROUP_ID} />` 로, 보상형 게이트는 `<TossRewardAd slotId={import.meta.env.VITE_TOSS_AD_SLOT_ID}>` 로만 노출한다. 배너는 항상 콘텐츠 섹션 사이 또는 최하단에 배치하며 콘텐츠를 덮지 않는다.

---

## Data Models

### MeterRecord — 월별 검침 기록
```ts
export interface MeterRecord {
  yearMonth: string;   // "YYYY-MM", PK, 유일
  kWh: number;         // 정수, 1 ~ 3000
  total: number;       // 청구 예상 금액(원), 정수
  createdAt: number;   // epoch ms
}
```
- 제약: `yearMonth` 중복 저장 시 덮어쓴다. 최대 60건(5년).

### UserProfile — 가구 프로필
```ts
export interface UserProfile {
  regionCode: string;      // "11"(서울) 등 시도 코드 2자리
  householdSize: 1 | 2 | 3 | 4;  // 4는 "4인 이상"
}
```
- 기본값: `{ regionCode: "11", householdSize: 2 }`

### ApplianceItem — 시뮬레이션 대상 가전
```ts
export interface ApplianceItem {
  id: string;            // catalog id, 예: "aircon"
  name: string;          // "에어컨"
  watt: number;          // 정수, 10 ~ 5000
  hoursPerDay: number;   // 0.5 ~ 24, 0.5 단위
  reduceRatio: number;   // 0.1 | 0.2 | 0.3 | 0.5 — 사용 절감 비율
}
```
- 최대 12건.

### SimulationSummary — 시뮬레이션 결과
```ts
export interface SimulationSummary {
  baseKWh: number;        // 원래 사용량
  savedKWh: number;       // 절감 kWh(정수 반올림)
  targetKWh: number;      // baseKWh - savedKWh, 최소 0
  baseTotal: number;      // 원래 청구액
  targetTotal: number;    // 절감 후 청구액
  savedWon: number;       // baseTotal - targetTotal
  month: number;          // 1~12
  appliances: ApplianceItem[];
}
```

### ReportUnlock — 리포트 열람권
```ts
export interface ReportUnlock {
  applianceId: string;
  unlockedAt: number;   // epoch ms
  expiresAt: number;    // unlockedAt + 86_400_000 (24시간)
}
```

### AppFlags — 전역 플래그
```ts
export interface AppFlags {
  schemaVersion: 1;
  disclaimerSeenAt: number | null;  // 예상치 고지 확인 시각
}
```

### RegionAverage — 정적 번들 데이터(localStorage 아님)
```ts
export interface RegionAverage {
  regionCode: string;   // "11"
  regionName: string;   // "서울"
  avgKWh: [number, number, number, number]; // 1인, 2인, 3인, 4인 이상
}
```
- `src/data/regionAverage.json`, 17건. 서울 픽스처: `[210, 268, 312, 349]`.

### localStorage 키 맵

| key | 타입 | 최대 건수 | 최대 크기 | 정리 정책 |
|---|---|---|---|---|
| `es:records` | `MeterRecord[]` | 60 | 9KB | 61건째 저장 시 가장 오래된 `yearMonth` 1건 제거 |
| `es:profile` | `UserProfile` | 1 | 0.1KB | 없음 |
| `es:appliances` | `ApplianceItem[]` | 12 | 2KB | 13건째 추가 거부 + Toast |
| `es:report-unlocks` | `ReportUnlock[]` | 12 | 0.8KB | 만료분 진입 시 제거, 13건째 저장 시 최오래된 항목 제거 |
| `es:flags` | `AppFlags` | 1 | 0.06KB | 없음 |
| **총계** | | | **약 12KB** | 5MB 한도의 0.24% |

---

## Feature List

### F1. 누진세 요금 계산 엔진

- **Description**: 월 사용량(kWh)과 월(month)을 입력받아 누진 구간별 전력량요금·기본요금·기후환경요금·연료비조정액·부가세·기반기금을 계산해 청구 예상 금액을 반환하는 순수 함수 계층이다. 7·8월은 하계 완화 구간표를 자동 적용한다. UI 없이 `src/domain/` 에만 존재하며 F2~F7이 모두 이 계층을 호출한다.
- **Data**: 없음(순수 함수). 상수 `RATE_TABLE`(CP-4) 참조.
- **API**: 없음(외부 호출 없음).
- **Requirements**: `calculateBill(kWh, month) → BillBreakdown`, `getStage(kWh, month) → 1|2|3`, `getNextStageGap(kWh, month) → number`.

- **AC-1.1 [U][P0]**: Scenario: 픽스처 5행 전량 일치
  Given `src/domain/rateTable.ts` 의 CP-4 상수가 로드되어 있을 때
  When CP-6 픽스처 5행 각각을 `calculateBill(kWh, month)` 에 전달
  Then 반환된 `baseCharge`, `energyCharge`, `subtotal`, `vat`, `fund`, `total` 6개 필드가 픽스처 표의 값과 정수 단위까지 일치함
  And 반환 객체에 `stage`(1|2|3)와 `stageBreakdown: { stage, kWh, unitPrice, charge }[]` 이 포함됨

- **AC-1.2 [E][P0]**: Scenario: 하계 완화 구간 자동 적용
  Given 사용량 350kWh가 주어졌을 때
  When `calculateBill(350, 8)` 과 `calculateBill(350, 3)` 을 각각 호출
  Then 8월 결과는 `total: 60510`, `stage: 2`, 3월 결과는 `total: 71260`, `stage: 2` 를 반환함
  And `calculateBill(350, 7).total === calculateBill(350, 8).total` 이 참임

- **AC-1.3 [E][P0]**: Scenario: 구간 경계값 계산
  Given 비하계(month=3) 조건일 때
  When `getStage(200, 3)`, `getStage(201, 3)`, `getStage(400, 3)`, `getStage(401, 3)` 을 호출
  Then 각각 `1`, `2`, `2`, `3` 을 반환함
  And `getNextStageGap(180, 3)` 은 `20`, `getNextStageGap(500, 3)` 은 `0` 을 반환함

- **AC-1.4 [S][P0]**: Scenario: 3구간 진입 시 기본요금 점프
  Given 사용량이 3구간(비하계 401kWh 이상)에 있을 때
  When `calculateBill(500, 3)` 을 호출
  Then `baseCharge === 7300`, `stageBreakdown.length === 3` 이며
  And `stageBreakdown[2]` 는 `{ stage: 3, kWh: 100, unitPrice: 307.3, charge: 30730 }` 임

- **AC-1.5 [W][P1]**: Scenario: 잘못된 입력 방어
  Given 계산 엔진이 로드되어 있을 때
  When `calculateBill(-10, 3)`, `calculateBill(NaN, 3)`, `calculateBill(100, 13)` 을 각각 호출
  Then 모두 `RangeError` 를 throw 하며 에러 메시지는 각각 `"kWh must be 0 or greater"`, `"kWh must be a number"`, `"month must be 1-12"` 임
  And `console.error` 는 호출되지 않음

- **AC-1.6 [W][P1]**: Scenario: 상한 초과 사용량 처리
  Given 계산 엔진이 로드되어 있을 때
  When `calculateBill(3001, 3)` 을 호출
  Then `RangeError("kWh must be 3000 or less")` 를 throw 함
  And `calculateBill(3000, 3)` 은 throw 하지 않고 `total > 0` 인 정수를 반환함

- **AC-1.7 [U][P1]**: Scenario: 계산 성능 및 순수성
  Given 동일 인자 `(350, 8)` 이 주어졌을 때
  When `calculateBill` 을 1,000회 연속 호출
  Then 1,000회 총 소요 시간이 50ms 미만이며 모든 반환값이 첫 호출 결과와 deep-equal 함
  And 함수 실행 중 `localStorage` 및 `fetch` 접근이 0회임

---

### F2. 사용량 입력 홈 화면 (S1)

- **Description**: 앱 진입 시 첫 화면으로, 검침 월과 사용량(kWh)을 입력받아 결과 화면으로 이동시킨다. 직전 기록이 있으면 사용량 필드에 프리필하고, 하계 월 선택 시 완화 요금 적용 안내 Chip을 노출한다. 최초 진입 시 "예상치 안내" 다이얼로그를 1회 표시한다.
- **Data**: `es:records`(읽기 — 프리필), `es:flags`(읽기/쓰기 — `disclaimerSeenAt`)
- **API**: 없음.
- **Requirements**: TDS `Top`, `TextField`, `Chip`, `Button`(`display="block"`), `AlertDialog`, `Toast`.

- **AC-2.1 [E][P0]**: Scenario: 사용량 입력 후 계산 이동
  Given 사용자가 홈 화면 `/` 에 있을 때
  When 월 `8`, 사용량 `350` 을 입력하고 `data-testid="calc-submit"` 버튼을 탭
  Then `navigate('/result', { state: { input: { yearMonth: "2026-08", kWh: 350, month: 8 } } })` 가 호출됨
  And 페이지 이동 전 `localStorage` 쓰기는 발생하지 않음

- **AC-2.2 [E][P1]**: Scenario: 직전 기록 프리필
  Given `es:records` 에 `[{ yearMonth: "2026-07", kWh: 412, total: 92340, createdAt: 1 }]` 이 저장되어 있을 때
  When 홈 화면이 마운트됨
  Then 사용량 `TextField` 의 초기값이 `"412"` 로 채워지고 보조 텍스트에 `"지난달 412kWh"` 가 표시됨
  And 월 선택 필드 기본값은 현재 시각 기준 직전 달임

- **AC-2.3 [S][P1]**: Scenario: 하계 안내 Chip 노출
  Given 사용자가 홈 화면에 있을 때
  When 월 선택을 `7` 또는 `8` 로 변경
  Then `data-testid="summer-chip"` Chip에 `"하계 완화 요금 적용"` 이 표시됨
  And 월을 `3` 으로 변경하면 해당 Chip이 DOM에서 제거됨

- **AC-2.4 [W][P1]**: Scenario: 빈 사용량 거부
  Given 사용자가 홈 화면에 있을 때
  When 사용량을 비운 채(`""`) 또는 `0` 으로 제출 버튼을 탭
  Then `TextField` 하단에 에러 메시지 `"사용량을 1kWh 이상 입력해주세요"` 가 표시됨
  And `navigate` 는 호출되지 않음

- **AC-2.5 [W][P1]**: Scenario: 비정상 사용량 거부
  Given 사용자가 홈 화면에 있을 때
  When 사용량에 `3500` 또는 `12.5` 또는 `abc` 를 입력하고 제출
  Then 각각 에러 메시지 `"사용량은 3000kWh 이하로 입력해주세요"`, `"사용량은 정수로 입력해주세요"`, `"숫자만 입력해주세요"` 가 표시됨
  And 입력 필드는 `inputMode="numeric"` 이라 모바일에서 숫자 키패드가 열림

- **AC-2.6 [E][P1]**: Scenario: 예상치 고지 1회 표시
  Given `es:flags.disclaimerSeenAt === null` 인 상태로 앱에 처음 진입했을 때
  When 홈 화면이 마운트됨
  Then TDS `AlertDialog` 에 `"이 계산 결과는 예상치입니다. 실제 청구액은 한국전력 고지서를 확인해주세요."` 가 표시됨
  And `"확인"` 버튼을 탭하면 `es:flags.disclaimerSeenAt` 에 현재 epoch ms가 저장되고 이후 재진입 시 다이얼로그가 표시되지 않음

- **AC-2.7 [U][P1]**: Scenario: 키보드와 하단 버튼 공존
  Given 사용자가 홈 화면에 있을 때
  When 사용량 `TextField` 를 탭해 모바일 키보드가 열림
  Then `data-testid="calc-submit"` 버튼이 키보드 위 영역에 계속 보이며 입력 필드를 가리지 않음
  And 버튼 높이는 48px 이상임

- **AC-2.8 [U][P2]**: Scenario: 홈 레이아웃 계약
  Given 홈 화면이 렌더링될 때
  Then `ScreenScaffold` 내부에 `Top`(제목 `"전기요금 계산"`) → 월 선택 `ListRow` → 사용량 `TextField` → `Spacing size={16}` → 안내 `Paragraph.Text` 순으로 배치되고
  And 1차 액션은 하단 고정 `SubmitFooter` 안의 `display="block"` `Button` 이며 좌측 글자폭 버튼이 존재하지 않음

---

### F3. 요금 계산 결과 화면 (S2)

- **Description**: 홈에서 전달받은 입력으로 F1 엔진을 호출해 청구 예상 금액을 히어로로 강조하고, 누진 구간별 사용량·요금을 카드로 시각화한다. 다음 구간까지 남은 kWh를 안내해 절약 동기를 만든다. 결과는 자동으로 `es:records` 에 저장된다.
- **Data**: `es:records`(쓰기), `es:profile`(읽기)
- **API**: 없음.
- **Requirements**: TDS `Top`, `Card`, `Paragraph.Text`, `Chip`, `Button`, `Toast` + 템플릿 `SummaryHero`(CountUp), `MiniBar`, `AdSlot`.

- **AC-3.1 [E][P0]**: Scenario: 계산 결과 렌더링
  Given `location.state = { input: { yearMonth: "2026-08", kWh: 350, month: 8 } }` 로 `/result` 에 진입했을 때
  When 화면이 마운트됨
  Then `data-testid="bill-hero"` 에 `"60,510원"` 이 CountUp으로 표시되고
  And `data-testid="stage-card"` 카드 안에 1구간 `300kWh / 36,000원`, 2구간 `50kWh / 10,730원` 2행이 표시됨

- **AC-3.2 [E][P0]**: Scenario: 결과 자동 저장
  Given `es:records` 가 빈 배열일 때
  When `/result` 가 `{ input: { yearMonth: "2026-08", kWh: 350, month: 8 } }` 로 마운트됨
  Then `es:records` 에 `{ yearMonth: "2026-08", kWh: 350, total: 60510, createdAt: <number> }` 1건이 저장됨
  And 동일 `yearMonth` 로 재진입하면 건수는 1건을 유지하고 값만 갱신됨

- **AC-3.3 [S][P1]**: Scenario: 다음 구간까지 남은 사용량 안내
  Given `{ kWh: 290, month: 8 }` 로 결과 화면에 있을 때
  When 화면이 렌더링됨
  Then `data-testid="next-stage-hint"` 에 `"2구간까지 10kWh 남았어요"` 가 표시됨
  And `{ kWh: 500, month: 3 }` 인 경우 해당 요소 대신 `"이미 최고 구간이에요"` 가 표시됨

- **AC-3.4 [W][P1]**: Scenario: state 없이 직접 진입
  Given `location.state === null` 인 상태로 `/result` URL에 직접 진입했을 때
  When 화면이 마운트됨
  Then Toast `"사용량을 먼저 입력해주세요"` 가 표시되고 `navigate('/', { replace: true })` 가 실행됨
  And `console.error` 는 호출되지 않음

- **AC-3.5 [W][P1]**: Scenario: 저장 공간 초과
  Given `localStorage.setItem` 이 `QuotaExceededError` 를 던지는 상태일 때
  When 결과 자동 저장이 시도됨
  Then Toast `"저장 공간이 부족해 기록을 남기지 못했어요"` 가 표시되고 화면은 계산 결과를 그대로 렌더링함
  And 앱이 크래시하지 않고 `console.error` 출력이 0건임

- **AC-3.6 [S][P1]**: Scenario: 계산 중 로딩 상태
  Given 결과 화면이 마운트 직후 계산 전 상태일 때
  When 렌더링이 1프레임 발생
  Then `data-testid="bill-hero"` 자리에 TDS 스켈레톤이 표시되고 계산 완료 후 200ms 이내에 금액으로 교체됨
  And 스켈레톤과 실제 금액 영역의 높이가 동일해 레이아웃 시프트가 발생하지 않음

- **AC-3.7 [U][P1]**: Scenario: 결과 화면 레이아웃 계약
  Given 결과 화면이 정상 렌더링될 때
  Then `ScreenScaffold` 내부에 `SummaryHero`(`data-testid="bill-hero"`) 1개, `Card` 2개(`data-testid="stage-card"`, `data-testid="detail-card"`)가 존재하고
  And `detail-card` 는 기본요금·전력량요금·기후환경요금·연료비조정액·부가세·기반기금 6행을 `ListRow` 로 표시하며
  And 구간별 비중은 `MiniBar`(`data-testid="stage-minibar"`)로 시각화됨

- **AC-3.8 [U][P2]**: Scenario: 광고 배치 및 예상치 고지
  Given 결과 화면이 렌더링될 때
  Then `detail-card` 아래·하단 액션 버튼 위에 `<AdSlot adGroupId={import.meta.env.VITE_TOSS_AD_GROUP_ID} />` 1개가 배치되어 어떤 카드도 덮지 않고
  And 화면 최하단에 `"이 금액은 주택용 저압 기준 예상치예요"` 문구가 표시됨

---

### F4. 검침 기록 & 전년 동월 비교 (S3)

- **Description**: 저장된 월별 검침 기록을 최신순 목록으로 보여주고, 각 기록의 전년 동월 대비 사용량·요금 증감을 계산해 비교 카드로 표시한다. 기록 스와이프/롱프레스 없이 명시적 삭제 버튼으로 개별 삭제할 수 있다.
- **Data**: `es:records`(읽기/삭제)
- **API**: 없음.
- **Requirements**: TDS `Top`, `ListRow`, `Card`, `Chip`, `AlertDialog`, `Toast`, `Asset.ContentIcon` + 템플릿 `Sparkline`, `AdSlot`.

- **AC-4.1 [E][P0]**: Scenario: 기록 목록 렌더링
  Given `es:records` 에 `[{ yearMonth: "2026-08", kWh: 350, total: 60510 }, { yearMonth: "2025-08", kWh: 402, total: 76140 }]` 이 있을 때
  When `/history` 에 진입
  Then `data-testid="record-row"` 가 2개 렌더링되고 첫 행이 `"2026년 8월"`, `"350kWh · 60,510원"` 을 표시함
  And 목록은 `yearMonth` 내림차순으로 정렬됨

- **AC-4.2 [E][P0]**: Scenario: 전년 동월 비교 계산
  Given 위 AC-4.1의 데이터가 있을 때
  When `2026-08` 행이 렌더링됨
  Then `data-testid="yoy-chip"` 에 `"작년 대비 -52kWh (-15,630원)"` 이 표시되고 감소 톤(`var(--tds-color-blue-500)` 계열 TDS 토큰) Chip이 사용됨
  And 증가한 경우에는 `"작년 대비 +N kWh (+N원)"` 형식으로 표시됨

- **AC-4.3 [S][P1]**: Scenario: 전년 동월 데이터 없음
  Given `es:records` 에 `2026-08` 만 있고 `2025-08` 이 없을 때
  When `/history` 가 렌더링됨
  Then 해당 행의 `data-testid="yoy-chip"` 대신 `"작년 기록 없음"` 텍스트가 표시됨
  And 비교 계산 함수는 `null` 을 반환하고 예외를 던지지 않음

- **AC-4.4 [E][P0]**: Scenario: 기록 삭제
  Given 기록이 2건 있을 때
  When `data-testid="record-delete-2026-08"` 을 탭하고 `AlertDialog` 의 `"삭제"` 를 탭
  Then `es:records` 에서 `yearMonth === "2026-08"` 항목이 제거되어 1건이 남고 Toast `"기록을 삭제했어요"` 가 표시됨
  And `"취소"` 를 탭한 경우 건수는 2건을 유지함

- **AC-4.5 [S][P1]**: Scenario: 빈 상태
  Given `es:records` 가 빈 배열일 때
  When `/history` 에 진입
  Then `Asset.ContentIcon` 과 함께 `"아직 저장된 검침 기록이 없어요"` 및 `"사용량 입력하러 가기"` 버튼이 표시됨
  And 해당 버튼 탭 시 `navigate('/')` 가 호출됨

- **AC-4.6 [W][P1]**: Scenario: 손상된 저장 데이터 복구
  Given `localStorage.getItem('es:records')` 가 `"{{broken"` 인 상태일 때
  When `/history` 에 진입
  Then 목록은 빈 상태 UI를 표시하고 `es:records` 는 `[]` 로 재초기화됨
  And Toast `"저장된 기록을 읽지 못해 초기화했어요"` 가 1회 표시되며 `console.error` 출력은 0건임

- **AC-4.7 [U][P1]**: Scenario: 목록 스크롤 및 성능
  Given `es:records` 에 60건이 저장되어 있을 때
  When `/history` 를 렌더링
  Then 60행이 가상 스크롤 없이 네이티브 세로 스크롤로 표시되고 초기 렌더가 100ms 미만에 완료됨
  And 각 `record-row` 의 높이는 56px 이상임

- **AC-4.8 [U][P2]**: Scenario: 기록 화면 레이아웃 계약
  Given 기록이 3건 이상 있을 때
  Then 목록 상단에 `Card`(`data-testid="trend-card"`)가 있고 그 안에 최근 12개월 사용량 `Sparkline`(`data-testid="kwh-sparkline"`)이 표시되며
  And 목록 하단에 `AdSlot` 1개가 마지막 행 아래에 배치되어 행을 덮지 않음

---

### F5. 가전별 절약 시뮬레이션 (S4)

- **Description**: 에어컨·냉장고·세탁기 등 가전을 추가하고 소비전력·일 사용시간·절감 비율을 조절하면, 줄어드는 kWh와 그에 따른 청구액 감소분을 F1 엔진으로 재계산해 비교 카드로 보여준다. 누진 구간이 내려가는 경우 절감 효과가 급증하는 것을 강조한다. 가전 구성은 `es:appliances` 에 영속화된다.
- **Data**: `es:appliances`(읽기/쓰기), `src/data/applianceCatalog.ts`(정적)
- **API**: 없음.
- **Requirements**: TDS `Top`, `BottomSheet`, `ListRow`, `Chip`, `TextField`, `Card`, `Button`, `Toast` + 템플릿 `SummaryHero`, `MiniBar`.

- **AC-5.1 [E][P0]**: Scenario: 절감 kWh 및 금액 계산
  Given `location.state = { input: { kWh: 350, month: 8, yearMonth: "2026-08" } }` 이고 가전이 `[{ id: "aircon", watt: 1800, hoursPerDay: 6, reduceRatio: 0.3 }]` 일 때
  When 시뮬레이션이 실행됨
  Then `savedKWh = Math.round(1800 × 6 × 30 / 1000 × 0.3) = 97`, `targetKWh = 253` 이 계산되고
  And `savedWon = calculateBill(350,8).total - calculateBill(253,8).total` 값이 `data-testid="saved-hero"` 에 `"N원 절약"` 형식으로 CountUp 표시됨

- **AC-5.2 [E][P0]**: Scenario: 가전 추가 및 영속화
  Given 가전 목록이 비어 있을 때
  When `"가전 추가"` 버튼 탭 → `BottomSheet` 에서 `"에어컨"` 선택
  Then 카탈로그 기본값 `{ id: "aircon", name: "에어컨", watt: 1800, hoursPerDay: 6, reduceRatio: 0.3 }` 이 목록에 추가되고 `es:appliances` 에 저장됨
  And 화면 재진입 시 동일 항목이 복원됨

- **AC-5.3 [S][P0]**: Scenario: 구간 하락 강조
  Given 시뮬레이션 결과가 `baseKWh: 350`(하계 2구간) → `targetKWh: 253`(하계 1구간)일 때
  When 비교 카드가 렌더링됨
  Then `data-testid="stage-down-badge"` 에 `"2구간 → 1구간"` 배지가 표시됨
  And 구간이 동일한 경우 해당 배지는 DOM에 존재하지 않음

- **AC-5.4 [E][P1]**: Scenario: 가전 값 수정
  Given `"에어컨"` 항목이 목록에 있을 때
  When 해당 행을 탭해 `BottomSheet` 에서 `hoursPerDay` 를 `3` 으로 변경하고 `"적용"` 탭
  Then `savedKWh` 가 `49` 로 재계산되어 200ms 이내 히어로 값이 갱신되고 `es:appliances` 가 갱신됨
  And 절감 비율 Chip은 `10% / 20% / 30% / 50%` 4개만 선택 가능함

- **AC-5.5 [W][P1]**: Scenario: 잘못된 소비전력 입력 거부
  Given 가전 편집 `BottomSheet` 가 열려 있을 때
  When `watt` 에 `0` 또는 `9000` 또는 `""` 을 입력하고 `"적용"` 탭
  Then 각각 에러 메시지 `"소비전력은 10W 이상 입력해주세요"`, `"소비전력은 5000W 이하로 입력해주세요"`, `"소비전력을 입력해주세요"` 가 표시되고 시트가 닫히지 않음

- **AC-5.6 [W][P1]**: Scenario: 가전 개수 상한
  Given `es:appliances` 에 12건이 저장되어 있을 때
  When `"가전 추가"` 를 탭
  Then Toast `"가전은 최대 12개까지 추가할 수 있어요"` 가 표시되고 `BottomSheet` 가 열리지 않음
  And 저장된 건수는 12건을 유지함

- **AC-5.7 [S][P1]**: Scenario: 가전 없음 빈 상태
  Given `es:appliances` 가 빈 배열일 때
  When `/simulate` 에 진입
  Then `Asset.ContentIcon` 과 `"절약할 가전을 추가해보세요"` 가 표시되고 히어로 값은 `"0원"` 으로 렌더링됨
  And `"리포트 보기"` 버튼은 disabled 상태임

- **AC-5.8 [W][P1]**: Scenario: 절감량이 사용량을 초과
  Given `baseKWh: 100` 이고 가전 절감 합계가 `140kWh` 로 계산될 때
  When 시뮬레이션이 실행됨
  Then `targetKWh` 는 `0` 으로 클램프되고 `data-testid="clamp-note"` 에 `"입력한 사용량보다 절감량이 커요. 사용량을 확인해주세요"` 가 표시됨
  And `savedWon` 은 음수가 되지 않음

---

### F6. 절약 팁 상세 리포트 — 리워드 광고 게이트 (S5)

- **Description**: 시뮬레이션 결과를 바탕으로 가전별 구체적 절약 실행 팁(고정 카탈로그 문장)과 월 예상 절감액을 리포트로 제공한다. 리포트 본문은 `TossRewardAd` 로 게이팅하며, 광고 시청 완료 시 24시간 열람권(`es:report-unlocks`)이 부여된다.
- **Data**: `es:report-unlocks`(읽기/쓰기), `src/data/savingTips.ts`(정적)
- **API**: 없음.
- **Requirements**: 템플릿 `TossRewardAd`, `AdSlot` + TDS `Top`, `Card`, `ListRow`, `Button`, `Chip`, `Toast`.

- **AC-6.1 [E][P0]**: Scenario: 결과 보기 전 보상형 광고
  Given 사용자가 `/simulate` 에서 `"절약 리포트 보기"` 버튼을 탭해 `/report` 에 진입했고 유효 열람권이 없을 때
  When `TossRewardAd` 광고 시청이 완료됨
  Then 리포트 본문(`data-testid="report-body"`)이 표시되고
  And `es:report-unlocks` 에 `{ applianceId: "__report__", unlockedAt: <now>, expiresAt: <now + 86400000> }` 가 저장됨

- **AC-6.2 [S][P0]**: Scenario: 광고 시청 전 게이트 상태
  Given 유효 열람권이 없는 상태로 `/report` 에 진입했을 때
  When 화면이 렌더링됨
  Then `data-testid="report-body"` 는 DOM에 존재하지 않고 `data-testid="report-gate"` 에 `"짧은 광고를 보면 상세 절약 리포트를 볼 수 있어요"` 와 48px 이상 높이의 `Button` 이 표시됨
  And 게이트 상태에서도 절감액 요약(히어로)은 잠금 없이 보임

- **AC-6.3 [S][P1]**: Scenario: 유효 열람권 재사용
  Given `es:report-unlocks` 에 `expiresAt > Date.now()` 인 항목이 있을 때
  When `/report` 에 재진입
  Then 광고 없이 즉시 `data-testid="report-body"` 가 표시되고
  And `data-testid="unlock-remain"` 에 `"열람권 N시간 남음"` 이 표시됨

- **AC-6.4 [E][P1]**: Scenario: 만료 열람권 정리
  Given `es:report-unlocks` 에 `expiresAt < Date.now()` 인 항목이 2건 있을 때
  When `/report` 에 진입
  Then 만료 항목 2건이 `es:report-unlocks` 에서 제거되고 게이트 화면이 표시됨
  And 배열 길이가 13이 되는 저장 시도에서는 `unlockedAt` 이 가장 오래된 1건이 먼저 제거됨

- **AC-6.5 [E][P0]**: Scenario: 가전별 팁 렌더링
  Given 열람권이 유효하고 가전이 `[{ id: "aircon", ... }, { id: "fridge", ... }]` 일 때
  When 리포트 본문이 렌더링됨
  Then `data-testid="tip-card"` 카드가 2개 표시되고 각 카드는 가전명, 월 절감 kWh, 월 절감액, 실행 팁 3줄을 포함함
  And 팁 문장은 `savingTips[id]` 고정 문자열이며 매 렌더 동일함

- **AC-6.6 [W][P1]**: Scenario: 광고 로드 실패
  Given 광고 SDK가 로드 실패 또는 시청 중단(`onFailure`)을 반환할 때
  When 사용자가 광고 시청 버튼을 탭
  Then Toast `"광고를 불러오지 못했어요. 잠시 후 다시 시도해주세요"` 가 표시되고 게이트 화면이 유지됨
  And 열람권은 저장되지 않으며 `console.error` 출력은 0건임

- **AC-6.7 [W][P1]**: Scenario: state 없이 리포트 직접 진입
  Given `location.state === null` 인 상태로 `/report` 에 직접 진입했을 때
  When 화면이 마운트됨
  Then Toast `"시뮬레이션을 먼저 실행해주세요"` 가 표시되고 `navigate('/simulate', { replace: true })` 가 실행됨

- **AC-6.8 [S][P1]**: Scenario: 광고 로딩 상태
  Given 사용자가 광고 시청 버튼을 탭한 직후일 때
  When 광고가 아직 표시되지 않은 상태
  Then 버튼이 disabled 되고 라벨이 `"광고 불러오는 중"` 으로 바뀌며 중복 탭이 무시됨
  And 로드 완료 또는 실패 시 버튼이 다시 활성화됨

---

### F7. 우리 동네 평균 익명 비교 (S6)

- **Description**: 설정된 시도·가구원수를 기준으로 번들된 정적 통계 데이터의 평균 사용량과 내 최근 사용량을 비교해 백분율 차이와 순위 문구를 보여준다. 서버 전송이 전혀 없는 완전 로컬 익명 비교다.
- **Data**: `es:profile`(읽기), `es:records`(읽기), `src/data/regionAverage.json`(정적 동적 import)
- **API**: 없음.
- **Requirements**: TDS `Top`, `Card`, `Chip`, `BottomSheet`, `ListRow` + 템플릿 `SummaryHero`, `MiniBar`, `AdSlot`.

- **AC-7.1 [E][P0]**: Scenario: 평균 대비 비교 계산
  Given `es:profile = { regionCode: "11", householdSize: 2 }`, 서울 평균 `[210, 268, 312, 349]`, 최근 기록 `kWh: 350` 일 때
  When `/region` 에 진입
  Then `data-testid="region-hero"` 에 `"평균보다 82kWh 많아요"` 가 표시되고
  And `data-testid="diff-percent"` 에 `"+30.6%"` (소수 1자리 반올림)가 표시됨

- **AC-7.2 [E][P0]**: Scenario: 프로필 변경 즉시 반영
  Given `/region` 화면에 있을 때
  When `BottomSheet` 에서 가구원수를 `4` 로 변경
  Then 기준 평균이 `349` 로 바뀌어 `region-hero` 가 `"평균보다 1kWh 많아요"`, `diff-percent` 가 `"+0.3%"` 로 300ms 이내 갱신되고
  And `es:profile.householdSize` 가 `4` 로 저장됨

- **AC-7.3 [S][P1]**: Scenario: 기록 없음 빈 상태
  Given `es:records` 가 빈 배열일 때
  When `/region` 에 진입
  Then `Asset.ContentIcon` 과 `"비교할 내 사용량이 없어요"`, `"사용량 입력하기"` 버튼이 표시되고 히어로 숫자는 렌더링되지 않음

- **AC-7.4 [S][P1]**: Scenario: 통계 데이터 로딩 상태
  Given `regionAverage.json` 을 동적 `import()` 로 로드 중일 때
  When 화면이 마운트됨
  Then `data-testid="region-hero"` 자리에 TDS 스켈레톤이 표시되고 로드 완료 시 값으로 교체됨
  And 로딩 중에도 화면 골격(Top, Card 테두리)이 유지되어 레이아웃 시프트가 없음

- **AC-7.5 [W][P1]**: Scenario: 통계 로드 실패
  Given 동적 `import('../data/regionAverage.json')` 이 reject 될 때
  When 화면이 마운트됨
  Then `"동네 평균 데이터를 불러오지 못했어요"` 와 `"다시 시도"` 버튼이 표시되고
  And `console.error` 출력이 0건이며 앱이 크래시하지 않음

- **AC-7.6 [W][P1]**: Scenario: 알 수 없는 지역 코드
  Given `es:profile.regionCode = "99"` (통계에 없는 코드)일 때
  When 화면이 마운트됨
  Then 기본값 `"11"`(서울)로 폴백해 비교를 수행하고 `data-testid="fallback-note"` 에 `"지역이 설정되지 않아 서울 기준으로 보여드려요"` 가 표시됨

- **AC-7.7 [U][P1]**: Scenario: 동네 비교 레이아웃 계약
  Given 비교 결과가 정상 렌더링될 때
  Then `ScreenScaffold` 내부에 `SummaryHero`(`data-testid="region-hero"`) 1개와 `Card` 2개(`data-testid="compare-card"`, `data-testid="profile-card"`)가 존재하고
  And `compare-card` 안에 내 사용량 대 평균 사용량을 나란히 표시하는 `MiniBar`(`data-testid="region-minibar"`) 2개가 렌더링되며
  And `compare-card` 하단에 `AdSlot` 1개가 배치됨

- **AC-7.8 [U][P0]**: Scenario: 데이터 외부 전송 없음
  Given 사용자가 `/region` 에서 프로필을 변경하고 비교를 수행할 때
  When 네트워크 요청을 관찰
  Then `fetch` 및 `XMLHttpRequest` 호출이 0건이며 사용량·지역 정보가 외부로 전송되지 않음
  And 화면에 `"내 정보는 기기에만 저장돼요"` 문구가 표시됨

---

### F8. 설정 · 데이터 관리 · 탭 네비게이션 (S7)

- **Description**: 지역·가구원수 프로필, 적용 요금표 버전 확인, 저장 공간 사용량 표시, 전체 데이터 초기화를 제공한다. 또한 앱 전역의 `FloatingTabBar`(홈/기록/동네/설정) 라우팅을 담당한다.
- **Data**: `es:profile`(읽기/쓰기), `es:records`·`es:appliances`·`es:report-unlocks`·`es:flags`(읽기/삭제)
- **API**: 없음.
- **Requirements**: 템플릿 `FloatingTabBar` + TDS `Top`, `ListRow`, `BottomSheet`, `AlertDialog`, `Toast`, `Paragraph.Text`, `Spacing`.

- **AC-8.1 [E][P0]**: Scenario: 지역 설정 저장
  Given `/settings` 화면에 있을 때
  When `data-testid="setting-row-region"` 탭 → `BottomSheet` 에서 `"부산"` 선택
  Then `es:profile.regionCode` 가 `"26"` 으로 저장되고 ListRow 우측 값이 `"부산"` 으로 갱신됨
  And Toast `"지역을 저장했어요"` 가 표시됨

- **AC-8.2 [E][P0]**: Scenario: 전체 데이터 초기화
  Given `es:records` 3건, `es:appliances` 2건이 있을 때
  When `data-testid="setting-row-reset"` 탭 → `AlertDialog` 의 `"초기화"` 탭
  Then `es:records`, `es:appliances`, `es:report-unlocks` 3개 키가 삭제되고 `es:profile`·`es:flags` 는 유지되며
  And Toast `"모든 기록을 삭제했어요"` 표시 후 `navigate('/', { replace: true })` 가 실행됨

- **AC-8.3 [E][P0]**: Scenario: 탭 네비게이션 이동
  Given 사용자가 `/settings` 에 있을 때
  When `FloatingTabBar` 의 `"기록"` 탭을 탭
  Then `/history` 로 이동하고 해당 탭이 활성 상태로 표시됨
  And 탭 4개(`홈` `/`, `기록` `/history`, `동네` `/region`, `설정` `/settings`)의 각 터치 타깃 높이가 44px 이상임

- **AC-8.4 [U][P1]**: Scenario: 저장 공간 표시
  Given `es:*` 키 총 바이트가 8,192일 때
  When `/settings` 가 마운트됨
  Then `data-testid="setting-row-storage"` 우측에 `"8KB / 5MB"` 가 표시되고
  And 계산은 마운트 시 1회만 수행되어 5ms 미만에 완료됨

- **AC-8.5 [S][P1]**: Scenario: 삭제할 데이터 없음
  Given `es:records`, `es:appliances`, `es:report-unlocks` 가 모두 비어 있을 때
  When `/settings` 가 렌더링됨
  Then `data-testid="setting-row-reset"` 이 disabled 되고 우측에 `"삭제할 데이터 없음"` 이 표시됨
  And 탭해도 `AlertDialog` 가 열리지 않음

- **AC-8.6 [W][P1]**: Scenario: 초기화 취소
  Given 초기화 `AlertDialog` 가 열려 있을 때
  When `"취소"` 를 탭
  Then 어떤 localStorage 키도 삭제되지 않고 다이얼로그만 닫힘
  And 화면의 저장 공간 표시 값이 변경되지 않음

- **AC-8.7 [W][P1]**: Scenario: 스키마 버전 불일치 마이그레이션
  Given `es:flags` 가 `{ schemaVersion: 0 }` 이거나 키 자체가 없을 때
  When 앱이 부팅됨
  Then `es:flags` 가 `{ schemaVersion: 1, disclaimerSeenAt: null }` 로 자동 생성/갱신되고 기존 `es:records` 는 보존됨
  And `console.error` 출력이 0건임

- **AC-8.8 [U][P2]**: Scenario: 설정 화면 레이아웃 계약
  Given `/settings` 가 렌더링될 때
  Then `ScreenScaffold` 내부에 `ListRow` 5행(`data-testid="setting-row-region|household|rate|storage|reset"`) → `Spacing size={24}` → `"ElectricSaver v1.0.0"` `Paragraph.Text` → `Spacing size={64}` 순으로 배치되고
  And 설정 화면에는 `AdSlot` 이 배치되지 않으며 `SummaryHero`/`Sparkline` 을 사용하지 않음

---

## 전역 컴플라이언스 요구사항 (검수 통과 — 모든 화면 공통)

- **AC-G1 [W][P0]**: Scenario: 외부 도메인 이탈 차단
  Given 앱 소스 전체가 빌드되었을 때
  When `window.location.href = <외부 URL>` 또는 `window.open` 사용 여부를 정적 검사
  Then 매칭 건수가 0건이며 앱 내 모든 이동은 React Router `navigate` 로만 수행됨
  And 외부 웹/앱 링크, `"앱을 설치하세요"`·`"다운로드"` 문구·배너가 소스와 화면에 존재하지 않음

- **AC-G2 [U][P0]**: Scenario: 콘솔 에러 0건
  Given 프로덕션 빌드(`vite build`) 산출물이 실행 중일 때
  When S1→S2→S4→S5→S3→S6→S7 전 화면을 순회
  Then `console.error` 호출 횟수가 0이고 React 경고(`Warning:`)도 0건임

- **AC-G3 [U][P0]**: Scenario: 네트워크 호출 없음 / CORS 무관
  Given 앱이 실행 중일 때
  When 전 화면을 순회하며 네트워크 탭을 관찰
  Then 앱 자체 코드가 발생시킨 `fetch`/`XMLHttpRequest` 요청이 0건이며 CORS 에러가 0건임
  And 정적 데이터는 번들 청크(`import()`)로만 로드됨

- **AC-G4 [U][P0]**: Scenario: 외부 분석 솔루션 미사용
  Given `package.json` 과 `src/**` 를 정적 검사할 때
  When `google-analytics`, `gtag`, `amplitude`, `mixpanel`, `sentry` 키워드를 검색
  Then 매칭 건수가 0건임

- **AC-G5 [W][P0]**: Scenario: HEX 색상 하드코딩 금지
  Given `src/**/*.{ts,tsx,css}` 를 정적 검사할 때
  When 정규식 `#[0-9a-fA-F]{3,8}\b` 로 검색
  Then 매칭 건수가 0건이며 모든 색상이 `var(--tds-color-*)` 또는 TDS 컴포넌트 기본값으로 지정됨
  And 다크모드 전환 시 전 화면의 텍스트 대비비가 4.5:1 이상을 유지함

- **AC-G6 [U][P0]**: Scenario: Android 7+ / iOS 16+ 호환
  Given 빌드 타깃이 `es2020` 으로 설정되어 있을 때
  When 번들 산출물에서 `Array.prototype.at`, `Object.hasOwn`, `structuredClone`, `??=` 사용 여부를 검사
  Then 폴리필 없이 사용된 건수가 0건이며 iOS 16 Safari에서 전 화면이 렌더링됨

- **AC-G7 [U][P1]**: Scenario: 광고가 콘텐츠를 덮지 않음
  Given `AdSlot` 이 배치된 화면(S2, S3, S5, S6)이 렌더링될 때
  When 각 화면의 DOM 박스를 측정
  Then `AdSlot` 영역과 어떤 `Card`/`ListRow`/`Button` 영역도 겹치지 않고(overlap = 0px)
  And 광고 영역은 항상 콘텐츠 섹션 사이 또는 최하단에 위치함

- **AC-G8 [U][P1]**: Scenario: 생성형 AI 미사용 확인
  Given 앱의 모든 결과물(요금·시뮬레이션·팁)이 생성될 때
  When 동일 입력으로 10회 반복 실행
  Then 10회 결과가 모두 동일하며 LLM/AI API 호출이 0건임
  And 따라서 AI 고지 문구·라벨을 노출하지 않고 대신 `"예상치"` 고지를 표시함(AC-2.6, AC-3.8)

- **AC-G9 [O][P2]**: Scenario: 프로모션 리워드 지급 한도
  Given `grantPromotionReward` 를 사용하는 캠페인이 활성화된 경우
  When `grantPromotionReward({ promotionCode, amount })` 를 호출
  Then 호출 전 `amount <= 5000` 검증을 통과한 경우에만 호출되고 초과 시 Toast `"지급 가능한 금액을 초과했어요"` 표시 후 호출이 차단됨
  And 캠페인이 비활성인 경우 해당 코드 경로가 실행되지 않음

- **AC-G10 [S][P1]**: Scenario: 환경변수 미주입 대응
  Given `VITE_TOSS_AD_GROUP_ID` 또는 `VITE_TOSS_AD_SLOT_ID` 가 `undefined` 일 때
  When 광고가 배치된 화면이 렌더링됨
  Then `AdSlot`/`TossRewardAd` 는 렌더링을 건너뛰고 레이아웃 자리표시만 유지하며 `console.error` 를 호출하지 않음
  And `TossRewardAd` 미주입 시 F6 리포트는 게이트 없이 본문을 표시함

---

## Screen Definitions

### S1. 홈 — 사용량 입력 | `/`
- **TDS 컴포넌트**: TDS `Top`(제목 `"전기요금 계산"`), TDS `ListRow`(검침 월 선택), TDS `TextField`(사용량, `inputMode="numeric"`), TDS `Chip`(하계 안내), TDS `Button`(`display="block"`, 하단 `SubmitFooter`), TDS `AlertDialog`(예상치 고지), TDS `Paragraph.Text`, TDS `Spacing`
- **Loading**: `es:records` 동기 읽기 — 스켈레톤 없음. 초기 렌더 50ms 미만
- **Empty**: 기록 없음 시 프리필 미적용, 보조 텍스트 `"첫 사용량을 입력해보세요"`
- **Error**: 입력 검증 실패 시 `TextField` 하단 인라인 에러(AC-2.4, AC-2.5)
- **Touch**: 월 선택 `ListRow` 56px, 제출 `Button` 48px, Chip 44px
- **Scroll**: 단일 화면 — 스크롤 없음. 키보드 오픈 시 푸터가 키보드 위로 이동
- **Layout 계약**: `ScreenScaffold` > `Top` > 월 `ListRow` > 사용량 `TextField` > `Spacing size={16}` > 안내 `Paragraph.Text` > 하단 `SubmitFooter`(`data-testid="calc-submit"`). 광고 없음(입력 화면). 단순 입력 화면이므로 `SummaryHero`/`Sparkline` 미사용
- **Navigation 계약**
  - Incoming: 없음
  - Outgoing: 계산 버튼 → `navigate('/result', { state: { input: BillInput } })`

### S2. 계산 결과 | `/result`
- **TDS 컴포넌트**: TDS `Top`(뒤로가기), TDS `Card` × 2, TDS `ListRow`(내역 6행), TDS `Chip`(구간 배지), TDS `Paragraph.Text`, TDS `Button`(`"절약 시뮬레이션"`), TDS `Toast` + 템플릿 `SummaryHero`, `MiniBar`, `AdSlot`
- **Loading**: 마운트 직후 1프레임 스켈레톤(AC-3.6), 높이 고정으로 시프트 없음
- **Empty**: 해당 없음(state 없으면 홈으로 리다이렉트)
- **Error**: `state === null` → Toast + `/` 리다이렉트(AC-3.4). 저장 실패 → Toast 후 결과 유지(AC-3.5)
- **Touch**: 하단 `Button` 48px, 내역 `ListRow` 56px, `Top` 뒤로가기 44px
- **Scroll**: 세로 스크롤 1개. 히어로는 스크롤 시 상단에 고정되지 않음(일반 스크롤)
- **Layout 계약**: `ScreenScaffold` > `SummaryHero`(`data-testid="bill-hero"`, CountUp) > `Card`(`data-testid="stage-card"` + `MiniBar` `data-testid="stage-minibar"`) > `Spacing size={16}` > `Card`(`data-testid="detail-card"`, 6행) > `AdSlot` > 예상치 고지 > 하단 `SubmitFooter`
- **Navigation 계약**
  - Incoming: `location.state: ResultRouteState = { input: BillInput } | null`
  - Outgoing: `"절약 시뮬레이션"` → `navigate('/simulate', { state: { input: BillInput } })`

### S3. 검침 기록 | `/history`
- **TDS 컴포넌트**: TDS `Top`, TDS `Card`(추이), TDS `ListRow`(기록 행), TDS `Chip`(전년 비교), TDS `AlertDialog`(삭제 확인), TDS `Toast`, TDS `Asset.ContentIcon`(빈 상태) + 템플릿 `Sparkline`, `AdSlot`, `FloatingTabBar`
- **Loading**: localStorage 동기 읽기 — 스켈레톤 없음. 60건 렌더 100ms 미만(AC-4.7)
- **Empty**: `Asset.ContentIcon` + `"아직 저장된 검침 기록이 없어요"` + `"사용량 입력하러 가기"` `Button`(AC-4.5)
- **Error**: JSON 파싱 실패 → 빈 상태 + Toast + 자동 재초기화(AC-4.6)
- **Touch**: 기록 행 56px, 삭제 아이콘 버튼 44px, `AlertDialog` 버튼 48px
- **Scroll**: 최대 60행 네이티브 세로 스크롤. 60행 상한이 있어 가상 스크롤 미적용. 하단 `FloatingTabBar` 높이만큼 `Spacing size={64}` 로 여백 확보
- **Layout 계약**: `ScreenScaffold` > `Card`(`data-testid="trend-card"` + `Sparkline` `data-testid="kwh-sparkline"`) > 기록 `ListRow`(`data-testid="record-row"`) 목록 > `AdSlot` > `Spacing size={64}` > `FloatingTabBar`
- **Navigation 계약**
  - Incoming: 없음
  - Outgoing: 기록 행 탭 → `navigate('/result', { state: { input: BillInput } })`; 빈 상태 버튼 → `navigate('/')`

### S4. 절약 시뮬레이션 | `/simulate`
- **TDS 컴포넌트**: TDS `Top`, TDS `Card` × 2, TDS `ListRow`(가전 행), TDS `Chip`(절감률 4종), TDS `BottomSheet`(가전 추가/편집), TDS `TextField`(watt, hoursPerDay), TDS `Button`, TDS `Toast`, TDS `Asset.ContentIcon` + 템플릿 `SummaryHero`, `MiniBar`
- **Loading**: 재계산 중 히어로에 200ms 이내 갱신. 별도 스피너 없음
- **Empty**: 가전 0건 시 `Asset.ContentIcon` + `"절약할 가전을 추가해보세요"`, 리포트 버튼 disabled(AC-5.7)
- **Error**: 입력 검증 실패 시 `BottomSheet` 내 인라인 에러(AC-5.5), 상한 초과 Toast(AC-5.6), 절감량 초과 시 `clamp-note`(AC-5.8)
- **Touch**: 가전 `ListRow` 56px, 절감률 `Chip` 44px, `BottomSheet` 적용 `Button` 48px
- **Scroll**: 가전 최대 12행 — 네이티브 스크롤. `BottomSheet` 내부 카탈로그 목록은 독립 스크롤
- **Layout 계약**: `ScreenScaffold` > `SummaryHero`(`data-testid="saved-hero"`, CountUp) > `Card`(`data-testid="compare-card"`: 현재 vs 절약 후 `MiniBar` 2개, `data-testid="stage-down-badge"`) > `Card`(`data-testid="appliance-card"`: 가전 목록 + `"가전 추가"`) > 하단 `SubmitFooter`(`"절약 리포트 보기"`)
- **Navigation 계약**
  - Incoming: `location.state: SimulateRouteState = { input: BillInput } | null` — `null` 이면 `es:records[0]` 폴백, 그것도 없으면 `navigate('/', { replace: true })`
  - Outgoing: `"절약 리포트 보기"` → `navigate('/report', { state: { summary: SimulationSummary } })`

### S5. 절약 팁 리포트 | `/report`
- **TDS 컴포넌트**: TDS `Top`, TDS `Card`(팁 카드 N개), TDS `ListRow`(팁 3줄), TDS `Chip`(열람권 잔여), TDS `Button`, TDS `Toast` + 템플릿 `TossRewardAd`(게이트), `SummaryHero`, `AdSlot`
- **Loading**: 광고 로드 중 버튼 disabled + 라벨 `"광고 불러오는 중"`(AC-6.8)
- **Empty**: 가전 0건이면 진입 자체가 차단됨(S4 버튼 disabled). 방어적으로 `"표시할 팁이 없어요"` 표시
- **Error**: 광고 실패 Toast + 게이트 유지(AC-6.6), state 없음 → `/simulate` 리다이렉트(AC-6.7)
- **Touch**: 광고 시청 `Button` 48px 이상, 팁 카드 내 `ListRow` 56px
- **Scroll**: 팁 카드 최대 12개 — 네이티브 세로 스크롤
- **Layout 계약**: `ScreenScaffold` > `SummaryHero`(절감액, 게이트와 무관하게 노출) > 게이트 미해제 시 `data-testid="report-gate"` / 해제 시 `data-testid="report-body"`(내부 `data-testid="tip-card"` `Card` N개) > `AdSlot`(본문 하단) > `Spacing size={32}`
- **Navigation 계약**
  - Incoming: `location.state: ReportRouteState = { summary: SimulationSummary } | null`
  - Outgoing: `"시뮬레이션 수정"` → `navigate('/simulate', { state: { input: BillInput } })`

### S6. 우리 동네 비교 | `/region`
- **TDS 컴포넌트**: TDS `Top`, TDS `Card` × 2, TDS `ListRow`(지역/가구원수), TDS `BottomSheet`(선택), TDS `Chip`, TDS `Asset.ContentIcon` + 템플릿 `SummaryHero`, `MiniBar`, `AdSlot`, `FloatingTabBar`
- **Loading**: 정적 JSON 동적 import 동안 히어로 스켈레톤(AC-7.4)
- **Empty**: 기록 0건 시 `Asset.ContentIcon` + `"비교할 내 사용량이 없어요"` + `"사용량 입력하기"`(AC-7.3)
- **Error**: import 실패 시 `"동네 평균 데이터를 불러오지 못했어요"` + `"다시 시도"` `Button`(AC-7.5), 미지원 지역 코드 폴백 노트(AC-7.6)
- **Touch**: 지역/가구원수 `ListRow` 56px, `BottomSheet` 항목 56px
- **Scroll**: 단일 스크롤. `BottomSheet` 지역 17개는 시트 내부 스크롤
- **Layout 계약**: `ScreenScaffold` > `SummaryHero`(`data-testid="region-hero"`) > `Card`(`data-testid="compare-card"` + `MiniBar` `data-testid="region-minibar"` 2개 + `data-testid="diff-percent"`) > `AdSlot` > `Card`(`data-testid="profile-card"`: 지역·가구원수 `ListRow`) > `"내 정보는 기기에만 저장돼요"` > `Spacing size={64}` > `FloatingTabBar`
- **Navigation 계약**
  - Incoming: 없음
  - Outgoing: 빈 상태 버튼 → `navigate('/')`

### S7. 설정 | `/settings`
- **TDS 컴포넌트**: TDS `Top`, TDS `ListRow` × 5, TDS `BottomSheet`(지역/가구원수 선택), TDS `AlertDialog`(초기화 확인), TDS `Toast`, TDS `Chip`, TDS `Spacing`, TDS `Paragraph.Text` + 템플릿 `FloatingTabBar`
- **Loading**: localStorage 동기 읽기 — 스켈레톤 없음. 저장 공간 계산은 마운트 시 1회, 5ms 미만(AC-8.4)
- **Empty**: 삭제할 데이터 0건 시 `"데이터 초기화"` `ListRow` disabled + 우측 `"삭제할 데이터 없음"`(AC-8.5)
- **Error**: 스키마 버전 불일치 시 자동 마이그레이션, `console.error` 0건(AC-8.7)
- **Touch**: 모든 `ListRow` 56px, `BottomSheet` 항목 56px, `AlertDialog` 버튼 48px
- **Scroll**: 5행 고정 — 스크롤 없음
- **Layout 계약**: `ScreenScaffold` > `ListRow` 5행(`data-testid="setting-row-region|household|rate|storage|reset"`) > `Spacing size={24}` > `"ElectricSaver v1.0.0"` `Paragraph.Text` > `Spacing size={64}` > `FloatingTabBar`. 광고 없음(설정 화면). 단순 유틸리티 화면이므로 `SummaryHero`/`Sparkline` 미사용
- **Navigation 계약**
  - Incoming: 없음
  - Outgoing: 초기화 완료 → `navigate('/', { replace: true })`; `FloatingTabBar` → `/`, `/history`, `/region`

### 화면 간 state 타입 정합성 매트릭스

| From → To | 보내는 타입 | 받는 쪽 `location.state` 타입 | null 처리 |
|---|---|---|---|
| S1 `/` → S2 `/result` | `{ input: BillInput }` | `ResultRouteState` | `navigate('/', { replace: true })` + Toast |
| S3 `/history` → S2 `/result` | `{ input: BillInput }` | `ResultRouteState` | 동일 |
| S2 `/result` → S4 `/simulate` | `{ input: BillInput }` | `SimulateRouteState` | `es:records[0]` 폴백 → 없으면 `/` |
| S4 `/simulate` → S5 `/report` | `{ summary: SimulationSummary }` | `ReportRouteState` | `navigate('/simulate', { replace: true })` + Toast |
| S5 `/report` → S4 `/simulate` | `{ input: BillInput }` | `SimulateRouteState` | 동일 |
| S6 `/region` → S1 `/` | 없음 | 없음 | — |

```ts
// src/types/navigation.ts — 송·수신 양쪽이 이 파일만 import (인라인 타입 선언 금지)
export interface BillInput { yearMonth: string; kWh: number; month: number; }
export type ResultRouteState   = { input: BillInput } | null;
export type SimulateRouteState = { input: BillInput } | null;
export type ReportRouteState   = { summary: SimulationSummary } | null;
```

---

## API Contract

**N/A — 외부 API 호출 없음.**

- 본 앱은 100% 클라이언트 사이드 계산 도구다. `fetch`/`XMLHttpRequest` 를 사용하는 코드가 소스에 존재하지 않는다(AC-G3, AC-7.8로 검증).
- 지역 평균 데이터는 빌드 시 번들되는 정적 JSON(`src/data/regionAverage.json`)을 동적 `import()` 로 지연 로드한다 — 네트워크 요청이 아닌 코드 스플리팅 청크 로드다.
- 요금표(`RATE_TABLE`)는 소스 상수이며 요금 개정 시 코드 배포로 갱신한다.
- 향후 외부 API가 필요해질 경우(예: 실시간 요금표 동기화) 별도 Railway 배포 API 서버를 신설하고 에러 응답은 통일 형태 `{ error: string }` 를 사용한다. **MVP 범위 밖.**

### 환경변수 (앱인토스 콘솔에서 주입, 재빌드 불필요)

| 변수 | 타입 | 용도 | 사용 위치 |
|---|---|---|---|
| `VITE_TOSS_AD_GROUP_ID` | `string \| undefined` | 배너 광고 그룹 ID | `<AdSlot adGroupId={...} />` — S2, S3, S5, S6 |
| `VITE_TOSS_AD_SLOT_ID` | `string \| undefined` | 보상형 광고 슬롯 ID | `<TossRewardAd slotId={...}>` — S5 |

- `VITE_TOSS_IAP_SKU` 는 사용하지 않는다(결제 미도입).
- 미주입 시 동작은 AC-G10에 정의됨.

---

## Assumptions

- **A-1**: CP-4 요금표는 한국전력 주택용 저압 기준 명시 상수다. 실제 고시 요금과의 일치 여부는 배포 전 소유자가 검증·갱신한다. 값이 바뀌어도 CP-5 알고리즘과 테스트 구조는 픽스처 숫자만 교체하면 유효하다.
- **A-2**: 하계 완화 구간은 7·8월 2개월에만 적용한다.
- **A-3**: 필수사용량 보장공제, 복지 할인(장애인·다자녀·대가족), 주택용 고압 요금제는 MVP 범위 밖이다. 결과 화면 고지 문구(AC-3.8)로 예상치임을 명시한다.
- **A-4**: `regionAverage.json` 의 시도별·가구원수별 평균 kWh는 배포 전 소유자가 공개 통계로 채워야 하는 검증 필요 데이터다. 스펙은 shape(`RegionAverage[]`, 17건)과 비교 계산식만 확정하며, 값 미확정 상태에서는 서울 `[210, 268, 312, 349]` 를 테스트 픽스처로 사용한다.
- **A-5**: `applianceCatalog` 소비전력 기본값은 참고값이며 사용자가 화면에서 수정 가능하다.
- **A-6**: 절약 팁 문장은 `savingTips.ts` 고정 카탈로그의 정적 문자열이다. 생성형 AI를 사용하지 않으므로 AI 고지 의무 비해당(CP-3, AC-G8).
- **A-7**: 토스 앱이 세션을 자동 제공하므로 로그인 화면·인증 로직을 구현하지 않는다. 사용자 식별이 필요 없는 완전 로컬 앱이므로 `getIsTossLoginIntegratedService()` 도 호출하지 않는다.
- **A-8**: 사용 빈도가 검침 주기(월 1~2회)에 몰리므로 재방문 유도 푸시 알림은 MVP 범위 밖이다.
- **A-9**: 다크모드는 TDS 토큰으로 자동 대응하며 별도 테마 토글 UI를 만들지 않는다.
- **A-10**: 기록 60건(5년) 상한은 localStorage 5MB 한도 대비 충분히 여유롭고 가상 스크롤 없이 렌더 성능 기준(AC-4.7)을 만족한다.

---

## Open Questions

- **Q-1**: 기후환경요금(9.0원/kWh)·연료비조정액(5.0원/kWh)을 현행 고시 기준으로 확정해줄 수 있는가? 변경 시 CP-6 픽스처 5행을 함께 갱신해야 한다.
- **Q-2**: 주택용 **고압**(아파트 다수) 요금제를 v1.1에서 지원할 것인가? 지원 시 S1에 저압/고압 `Chip` 이 추가되고 `RATE_TABLE` 이 2벌로 늘어난다.
- **Q-3**: 지역 평균 데이터(A-4) 출처를 어디로 확정할 것인가? 확정 전까지 S6에 `"참고용 예시 데이터"` 배지를 노출해야 하는가?
- **Q-4**: 보상형 광고 열람권 유효기간을 24시간으로 잡았는데, 검침 주기 특성상 `"해당 검침 월 내 무제한"` 이 더 적절한가?
- **Q-5**: 복지 할인(다자녀·대가족·장애인) 옵션을 설정 화면에 추가할 필요가 있는가? 대상 가구는 예상 요금 오차가 크다.
- **Q-6**: 프로모션 리워드(`grantPromotionReward`)를 초기 사용자 확보에 사용할 계획이 있는가? 사용한다면 `promotionCode` 발급이 선행되어야 하며 AC-G9가 활성화된다.

---

## 워크패킷 매핑 가이드 (다운스트림 참고)

| 패킷 | 범위 | 선행 |
|---|---|---|
| WP-1 | F1 요금 계산 엔진 + `RATE_TABLE` 상수 + CP-6 픽스처 유닛 테스트 | — |
| WP-2 | 타입 정의(`src/types/*`) + `storage.ts` 래퍼 + `AppFlags` 마이그레이션(AC-8.7) | — |
| WP-3 | F2 홈 화면(S1) — 입력·검증·고지 다이얼로그 | WP-1, WP-2 |
| WP-4 | F3 결과 화면(S2) — 히어로·구간 카드·내역 카드 | WP-1, WP-3 |
| WP-5 | F3 결과 자동 저장 + `AdSlot` 배치 + F4 데이터 계층 | WP-2, WP-4 |
| WP-6 | F4 기록 화면(S3) — 목록·삭제·빈 상태 | WP-5 |
| WP-7 | F4 전년 동월 비교 Chip + `Sparkline` 추이 카드 | WP-6 |
| WP-8 | F5 시뮬레이션 계산 로직 + 가전 카탈로그/영속화 | WP-1, WP-2 |
| WP-9 | F5 시뮬레이션 화면(S4) — 입력 UI·비교 카드·구간 하락 배지 | WP-8 |
| WP-10 | F6 리포트 화면(S5) + `TossRewardAd` 게이트 + 열람권 만료 처리 | WP-9 |
| WP-11 | F7 동네 비교(S6) + 정적 데이터셋 지연 로더 | WP-2, WP-5 |
| WP-12 | F8 설정 화면(S7) + `FloatingTabBar` 라우팅 통합 | WP-2, WP-6 |
| WP-13 | 전역 컴플라이언스 검증(AC-G1~G10 정적 검사 스크립트 + 전 화면 순회 E2E) | 전체 |