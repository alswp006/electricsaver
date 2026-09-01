# TASK — ElectricSaver

**총 21 packets** (Epic 1: 2 · Epic 2: 2 · Epic 3: 4 · Epic 4: 4 · Epic 5: 6 · Epic 6: 3). SPEC 말미의 "예상 13 packets"는 기능(F1~F8) 단위 추정치이며, 실제 실행 단위는 파일 소유권 분리와 10분 패킷 제약을 반영해 21개로 분할되었다(공통 인프라 Epic 1·3·6 8개 + 컴포넌트 분리 3개 증가).

**파일 소유권 1:1 원칙** — 모든 소스 파일은 정확히 한 패킷에서만 생성/수정된다(페이지에 삽입되는 공용 로직은 페이지보다 앞선 컴포넌트/훅 패킷으로 분리). 검증 오류로 지적된 5건의 파일 충돌(ResultPage / HistoryPage / SimulatePage / ReportPage / ComparePage)을 이 원칙으로 해소했다.

**패킷 수 산정 근거 (13 → 21 차이 해소)**

| 구분 | 패킷 | 비고 |
|---|---|---|
| SPEC 기능 단위 추정 | 13 | F1(2)·F2(1)·F3(2)·F4(2)·F5(1)·F6(2)·F7(2)·F8(1) |
| ＋ 공통 타입/정적 데이터 (Epic 1) | +2 | 전 기능 공유 → 선행 분리 필수 |
| ＋ 저장소 기반 계층 (Epic 3.1, 3.4) | +2 | safeStorage·useQuotaToast는 CC-12 공통 |
| ＋ 라우팅·컴플라이언스·QA (Epic 6) | +3 | CC-1~CC-12 검증 및 셸 |
| ＋ 컴포넌트 분리 (4.2 YoY, 4.3 Stepper, 4.4 ReportGate) | +3 | 파일 충돌 해소 + 10분 패킷 제약 |
| － 기능 패킷 통합 (F3·F4·F6·F7의 페이지 2패킷 → 1패킷) | -2 | 페이지 파일 단독 소유화 |
| **합계** | **21** | 아래 목록과 일치 |

**충돌 해소 요약**
| 충돌 파일 | 이전 | 수정 후 |
|---|---|---|
| `ResultPage.tsx` | 5.2, 5.3, 6.3 | **5.2 단독** (YoY는 Task 4.2 `YoYCard.tsx`로 분리, quota Toast는 Task 3.4 `useQuotaToast.ts`로 선행 제작) |
| `HistoryPage.tsx` | 5.4, 6.3 | **5.3 단독** (6.3은 테스트 파일만 소유) |
| `SimulatePage.tsx` | 5.5, 5.6, 6.3 | **5.4 단독** (스텝퍼 UI는 Task 4.3 `ApplianceStepperCard.tsx`로 분리, 저장/복원은 Task 3.3 스토어에서 완결) |
| `ReportPage.tsx` | 5.7, 5.8 | **5.5 단독** (광고 로딩/실패/중도이탈 상태머신은 Task 4.4 `ReportGate.tsx`로 분리) |
| `ComparePage.tsx` | 5.9, 6.3 | **5.6 단독** |

---

## Epic 1. Types & Static Data (2 packets)

**Risk Assessment**
- Complexity: Low
- Risk factors: RouteState가 실제 navigate 페이로드와 어긋나면 F3/F6/F7 전 구간 런타임 크래시. 요금표 상수 오타 시 F1 전 AC 실패.
- Mitigation: 타입을 최초 패킷에 고정하고 이후 모든 페이지가 이를 import하도록 강제. 요금표는 계산 로직(2.1)보다 먼저 확정해 단일 소스로 사용.

### Task 1.1 도메인 타입 + RouteState 정의
- Description: 모든 엔티티 타입과 페이지 간 navigate state 계약을 순수 타입 파일로 작성한다. 런타임 코드는 `STORAGE_KEYS` 상수 1개를 제외하고 0줄.
  ```ts
  export type ContractType = 'low' | 'high';
  export interface TariffTier { limitKWh: number | null; rate: number; baseFee: number; }
  export interface TariffTable { version: string; effectiveFrom: string; sourceLabel: string; summerMonths: number[]; climateRate: number; fuelAdjRate: number; vatRate: number; fundRate: number; normal: Record<ContractType, TariffTier[]>; summer: Record<ContractType, TariffTier[]>; }
  export interface BillInput { kWh: number; yearMonth: string; contractType: ContractType; }
  export interface TierUsage { tier: 1 | 2 | 3; kWh: number; rate: number; fee: number; }
  export interface BillBreakdown { input: BillInput; isSummerRelief: boolean; tariffVersion: string; baseFee: number; tiers: TierUsage[]; energyFee: number; climateFee: number; fuelAdjFee: number; subtotal: number; vat: number; fund: number; total: number; marginalRate: number; }
  export interface UsageRecord { id: string; yearMonth: string; kWh: number; contractType: ContractType; total: number; tariffVersion: string; createdAt: number; updatedAt: number; }
  export interface AppSettings { contractType: ContractType; regionCode: string; householdSize: 1|2|3|4; lastYearMonth: string | null; }
  export interface ApplianceCut { applianceId: string; cutHoursPerDay: number; }
  export interface SimulationInput { baseRecordId: string; cuts: ApplianceCut[]; days: number; }
  export type ReportUnlock = Record<string, number>;
  export interface Appliance { id: string; name: string; watt: number; defaultHours: number; icon: string; }
  export interface RegionAverageEntry { regionCode: string; regionName: string; monthly: Record<string, number>; }

  export type RouteState = {
    '/': null;
    '/result': { input: BillInput } | null;
    '/simulate': { recordId: string; input: BillInput } | null;
    '/report': { recordId: string; input: BillInput; cuts: ApplianceCut[]; savedWon: number } | null;
    '/history': null;
    '/compare': null;
  };
  export const STORAGE_KEYS = { records: 'es:records:v1', settings: 'es:settings:v1', sim: 'es:sim:last:v1', reportUnlock: 'es:report_unlock:v1' } as const;
  ```
- DoD:
  - `npx tsc --noEmit` 통과.
  - `RouteState`의 `/result`, `/simulate`, `/report` 키가 각각 `| null`을 포함한다(수신 측 null 가드 강제).
  - 파일 내 `#RRGGBB` 리터럴 0건, 외부 import 0건.
- Covers: [AC-1.7(타입 `tariffVersion` 필드), CC-8(부분)]
- Files: `src/lib/types.ts`
- Depends on: none

### Task 1.2 정적 데이터 상수 (요금표 · 가전 · 팁 · 지역평균)
- Description: SPEC 확정 수치를 그대로 상수화한다. `tariff.ts`에 `TARIFF_V2024_01: TariffTable`(저압 평시 200/400/∞ = 120.0/214.6/307.3원, 기본요금 910/1,600/7,300원; 저압 여름 300/450/∞ 동일 단가·기본요금; 고압 105.0/174.0/242.3원, 기본요금 730/1,260/6,060원; climateRate 9.0, fuelAdjRate 5.0, vatRate 0.1, fundRate 0.037, summerMonths [7,8], version 'v2024.01', sourceLabel '한국전력 주택용 전력(저압/고압) 기준'). `appliances.ts`에 8종 카탈로그(aircon 1800W/8h, dryer 1600/1, microwave 1000/0.5, washer 500/1, heatmat 300/8, dehumid 300/4, tv 150/4, ricecooker 100/12). `tips.ts`에 가전 id별 정적 팁 문자열 2개씩(총 16개). `region-average.json`에 17개 시도 × 12개월 평균 kWh(KR-11 서울 8월 320, KR-26 부산 포함).
- DoD:
  - `TARIFF_V2024_01.normal.low[1].rate === 214.6`, `.summer.low[0].limitKWh === 300`, `.normal.high[2].baseFee === 6060`.
  - `APPLIANCES.length === 8`이고 모든 id에 대해 `TIPS[id].length === 2`.
  - `region-average.json` 최상위 배열 길이 17, 각 엔트리 `monthly` 키가 `'1'`~`'12'` 12개.
  - 네 파일 모두 fetch/네트워크 호출 및 외부 라이브러리 import 0건.
- Covers: [AC-1.7, AC-7.8, AC-8.1(데이터 원본), CC-10]
- Files: `src/domain/tariff.ts`, `src/domain/appliances.ts`, `src/domain/tips.ts`, `src/data/region-average.json`
- Depends on: Task 1.1

---

## Epic 2. Domain Logic (순수 함수) (2 packets)

**Risk Assessment**
- Complexity: High
- Risk factors: 반올림 순서(floor1 → round VAT → floor10 fund → floor10 total)를 틀리면 AC-1.1/1.2 기대값(58,270 / 86,500)이 수 원 단위로 어긋나 전 화면 숫자가 실패. 시뮬레이션이 `calcBill`을 재사용하지 않고 자체 계산하면 누진 역행 값 불일치.
- Mitigation: 계산 엔진을 UI 이전 독립 패킷으로 분리하고 SPEC 기대값을 그대로 유닛 테스트로 고정. 시뮬레이션은 `calcBill` 재호출만 허용해 로직 중복 금지.

### Task 2.1 누진요금 계산 엔진 `calcBill` + 반올림 유틸
- Description: `floor1/floor10` 유틸과 `calcBill(input: BillInput): BillBreakdown` 구현. 연월의 월이 `summerMonths`에 포함되면 여름 구간표 사용 + `isSummerRelief=true`. 누적 상한 기준 3구간 배분, 최종 적용 구간의 `baseFee` 채택 및 그 구간 단가를 `marginalRate`로 반환. `energyFee=floor1(Σ tier fee)`, `climateFee=floor1(kWh×9.0)`, `fuelAdjFee=floor1(kWh×5.0)`, `subtotal=floor1(baseFee+energyFee+climateFee+fuelAdjFee)`, `vat=Math.round(subtotal×0.1)`, `fund=floor10(subtotal×0.037)`, `total=floor10(subtotal+vat+fund)`. `tiers`는 항상 길이 3.
- DoD:
  - `calcBill({kWh:300,yearMonth:'2026-05',contractType:'low'})` → `{baseFee:1600, energyFee:45460, climateFee:2700, fuelAdjFee:1500, subtotal:51260, vat:5126, fund:1890, total:58270, isSummerRelief:false, marginalRate:214.6}`, `tiers === [{tier:1,kWh:200,fee:24000},{tier:2,kWh:100,fee:21460},{tier:3,kWh:0,fee:0}]`.
  - `{kWh:450,'2026-08',low}` → `isSummerRelief===true`, `{baseFee:1600, energyFee:68190, subtotal:76090, vat:7609, fund:2810, total:86500}`; 동일 450kWh를 `'2026-05'`로 계산 시 `total===109010`, 차액 `22510`.
  - `{kWh:500,'2026-05',low}` → `tiers[2].kWh===100`, `marginalRate===307.3`, `baseFee===7300`.
  - `{kWh:300,'2026-05',high}` → `baseFee===1260`, `energyFee===38400`.
  - 모든 반환 숫자 필드에 `Number.isFinite`가 true이며 `NaN` 0건. `tariffVersion==='v2024.01'`.
- Covers: [AC-1.1, AC-1.2, AC-1.3, AC-1.4, AC-1.7]
- Files: `src/domain/calcBill.ts`, `src/domain/rounding.ts`, `src/domain/__tests__/calcBill.test.ts`
- Depends on: Task 1.2

### Task 2.2 입력 검증 + 비교/시뮬레이션 순수 함수
- Description: `validateUsageInput(raw)`, `validateYearMonth(ym, today)`, `findYoY(records, yearMonth)`, `diffPercent(prev, curr)`, `simulate(base: BillInput, cuts: ApplianceCut[], days=30)` 구현. `simulate`는 `savedKWh = Σ round(watt/1000 × cutHours × days)`, `afterKWh = Math.max(1, base.kWh - savedKWh)`(클램프 시 `clamped:true`), `afterBill = calcBill({...base, kWh: afterKWh})`, `savedWon = baseBill.total - afterBill.total` 반환.
- DoD:
  - `validateUsageInput('')`·`('0')` → `{ok:false, message:'사용량을 1kWh 이상 입력해주세요'}`; `('10001')` → `{ok:false, message:'10,000kWh 이하로 입력해주세요'}`; `('12.5')`·`('-5')` → `{ok:false, message:'숫자만 입력해주세요'}`; `('450')` → `{ok:true, kWh:450}`.
  - `validateYearMonth('2026-10', new Date('2026-09-02'))` → `{ok:false, message:'아직 오지 않은 달이에요'}`; `('2026-09', 동일)` → `{ok:true}`.
  - `diffPercent(68000, 86500) === 27`(정수); `diffPercent(0, 86500) === null`; 반환값에 `NaN`/`Infinity` 0건.
  - `findYoY(records,'2026-08')`는 `yearMonth==='2025-08'` 레코드 또는 `null` 반환.
  - `simulate(base{450,'2026-08',low}, [{aircon,2}])` → `savedKWh===108`, `afterBill.total===58440`, `savedWon===28060`.
  - `simulate(..., [{aircon,1},{dryer,0.5}])` → `savedKWh===78`, `afterKWh===372`.
  - `simulate(base{kWh:100}, 총 108kWh 감축)` → `afterKWh===1`, `clamped===true`.
- Covers: [AC-1.5, AC-1.6, AC-2.4, AC-5.2, AC-5.5, AC-6.1, AC-6.2, AC-6.3]
- Files: `src/domain/validate.ts`, `src/domain/compare.ts`, `src/domain/simulate.ts`, `src/domain/__tests__/validate.test.ts`, `src/domain/__tests__/simulate.test.ts`
- Depends on: Task 2.1

---

## Epic 3. Data Layer (localStorage) (4 packets)

**Risk Assessment**
- Complexity: Medium
- Risk factors: 손상 JSON(`'{{broken'`, `'null'`)이 파싱에서 throw되면 앱 전체 화이트스크린. `QuotaExceededError` 미포착 시 결과 화면 크래시(CC-12). 60건 프루닝 누락 시 무한 증가.
- Mitigation: `safeStorage`를 모든 스토어보다 먼저 만들고 스토어 3종이 예외 없이 경유하게 한다. quota Toast 훅(3.4)도 페이지 패킷 이전에 완성해, 페이지가 나중에 수정될 필요가 없게 만든다(파일 충돌 제거).

### Task 3.1 safeStorage 기반 계층
- Description: `safeParse<T>(key, guard, fallback)` — JSON 파싱 실패·guard 실패 시 fallback 반환 + 손상 키를 fallback으로 덮어쓰기. `safeWrite(key, value): { ok: boolean; quotaExceeded: boolean }` — try/catch로 `QuotaExceededError` 포착 후 throw 없이 결과 객체 반환. `isQuotaError(e)` 헬퍼.
- DoD:
  - `localStorage.setItem('es:settings:v1','{{broken')` 후 `safeParse` → fallback 반환, throw 없음, 해당 키가 fallback JSON으로 갱신됨.
  - `'null'` 및 `'{"a":1}'` 저장 후 배열 guard로 `safeParse` → `[]` 반환.
  - `setItem`이 `QuotaExceededError`를 던지도록 모킹 → `safeWrite`가 `{ok:false, quotaExceeded:true}` 반환, 예외 전파 0건.
  - 전체 함수 실행 중 `console.error` 호출 0건.
- Covers: [AC-2.6(기반), AC-4.5(기반), CC-12(기반)]
- Files: `src/lib/safeStorage.ts`, `src/lib/__tests__/safeStorage.test.ts`
- Depends on: Task 1.1

### Task 3.2 recordStore (list/upsert/remove/prune/latest)
- Description: `es:records:v1` CRUD. `list()`는 배열 guard + 항목 스키마 guard(`yearMonth`/`kWh`/`total` 필수)로 필터링 후 `yearMonth` 내림차순 반환. `upsert(record)`는 동일 `yearMonth` 존재 시 덮어쓰기(`updatedAt` 갱신, 길이 불변), 신규면 삽입 후 60건 초과 시 오래된 순 삭제. `remove(id)`, `latest()`.
- DoD:
  - `['2026-06','2026-08','2026-07']` 주입 → `list()` 순서 `['2026-08','2026-07','2026-06']`.
  - 동일 `yearMonth` upsert 2회 → `list().length` 불변, `total`만 갱신.
  - 60건(가장 오래된 `2021-01`) 상태에서 `2026-09` upsert → 길이 60 유지, `2021-01` 부재.
  - `'null'` / `'{"a":1}'` / `kWh` 누락 항목 포함 배열 주입 → `list()`가 유효 항목만 반환, `console.error` 0건.
  - `upsert`/`remove`는 quota 실패 시 `{ok:false, quotaExceeded:true}`를 반환하고 throw하지 않는다.
- Covers: [AC-3.4, AC-4.1, AC-4.3, AC-4.5]
- Files: `src/lib/recordStore.ts`, `src/lib/__tests__/recordStore.test.ts`
- Depends on: Task 3.1

### Task 3.3 settingsStore · simStore · unlockStore
- Description: `settingsStore.get()/patch()` — 기본값 `{contractType:'low', regionCode:'KR-11', householdSize:1, lastYearMonth:null}` 병합. `simStore.get(baseRecordId)/save(input)` — 저장된 `baseRecordId`가 인자와 다르면 폐기하고 빈 cuts 반환. `unlockStore.isUnlocked(recordId)/unlock(recordId)` — TTL 24h, 읽을 때 만료 키 삭제. 세 스토어의 쓰기는 전부 `safeWrite` 결과를 그대로 반환한다.
- DoD:
  - `es:settings:v1`이 `'{{broken'`일 때 `get()` → 기본값 반환 + 해당 키가 기본값 JSON으로 덮어써짐.
  - `patch({contractType:'high'})` 후 `get().regionCode === 'KR-11'`(미지정 필드 보존).
  - `simStore.get('rec_2026-07')`가 저장된 `baseRecordId='rec_2026-08'`와 불일치 → `cuts: []` 반환.
  - `unlock('rec_2026-08')` 후 1시간 경과 모킹 → `isUnlocked===true`; 25시간 경과 모킹 → `isUnlocked===false` 및 `es:report_unlock:v1`에서 키 삭제.
  - 세 스토어 모두 quota 실패 시 `{ok:false, quotaExceeded:true}` 반환, throw 0건.
- Covers: [AC-2.6, AC-6.6, AC-7.1(저장), AC-7.4, AC-8.2(저장)]
- Files: `src/lib/settingsStore.ts`, `src/lib/simStore.ts`, `src/lib/unlockStore.ts`, `src/lib/__tests__/stores.test.ts`
- Depends on: Task 3.1

### Task 3.4 useQuotaToast 훅 (CC-12 공통 처리)
- Description: 모든 쓰기 경로에서 재사용할 훅. `const showQuotaToast = useQuotaToast()`가 `(result: {ok:boolean; quotaExceeded:boolean}) => void`를 반환하고, `quotaExceeded === true`일 때만 TDS Toast "저장 공간이 부족해요. 오래된 기록을 삭제해주세요"를 1회 띄운다(동일 렌더 사이클 중복 호출 시 Toast 1개). 페이지 패킷보다 먼저 만들어 이후 페이지가 마운트 시점부터 이 훅을 사용하게 한다.
- DoD:
  - `showQuotaToast({ok:false, quotaExceeded:true})` 호출 → Toast 텍스트 "저장 공간이 부족해요. 오래된 기록을 삭제해주세요" 렌더.
  - `{ok:true, quotaExceeded:false}` 호출 → Toast 렌더 0개.
  - 동일 tick에 3회 연속 호출 → Toast 노드 1개.
  - 훅 실행 중 `console.error` 0건, throw 0건.
- Covers: [CC-12]
- Files: `src/lib/useQuotaToast.ts`, `src/lib/__tests__/useQuotaToast.test.tsx`
- Depends on: Task 3.1

---

## Epic 4. 프레젠테이션 컴포넌트 (페이지 조립 부품) (4 packets)

**Risk Assessment**
- Complexity: Medium
- Risk factors: HEX 하드코딩 시 CC-8 즉시 반려. TDS 컴포넌트 위 인라인 padding 덮어쓰기 검수 반려. 페이지 패킷이 10분을 초과할 위험.
- Mitigation: 페이지에서 무거운 부분(YoY 비교 카드, 8행 스텝퍼 카드, 리워드 광고 상태머신)을 미리 독립 컴포넌트로 떼어내 페이지 패킷을 "조립만" 하도록 축소하고, 동시에 페이지 파일이 단 한 패킷에서만 작성되도록 보장한다.

### Task 4.1 SummaryHero · MiniBar · Sparkline
- Description: TDS 미제공 3개 프레젠테이션 컴포넌트. `SummaryHero`(t2 이상 강조 타이포 + CountUp, `data-testid` prop), `MiniBar`(ratio 0~1 막대, 커스텀 CSS는 flex/width만), `Sparkline`(number[] → SVG polyline). 색상은 `var(--tds-color-*)`만.
- DoD:
  - 3개 파일 전체에서 `#RRGGBB`/`#RGB` 리터럴 0건, 인라인 `padding`/`margin` 0건.
  - `SummaryHero value={86500}` → 최종 텍스트 `"86,500원"`(`toLocaleString('ko-KR')`).
  - `MiniBar ratio={0.67}` → fill 요소 `style.width === '67%'`; `ratio={0}` → `'0%'`, 크래시 없음.
  - `Sparkline` values 길이 0 또는 1 → `null` 반환(DOM 미렌더).
- Covers: [AC-3.1(기반), AC-5.4(기반), AC-8.1(기반), CC-8]
- Files: `src/components/SummaryHero.tsx`, `src/components/MiniBar.tsx`, `src/components/Sparkline.tsx`
- Depends on: Task 1.1

### Task 4.2 YoYCard (전년 동월 비교 + 추이)
- Description: `props: { records: UsageRecord[]; current: { yearMonth: string; kWh: number; total: number; contractType: ContractType } }`를 받아 `data-testid="yoy-card"` Card를 렌더하는 독립 컴포넌트. 내부에서 `findYoY`/`diffPercent` 사용, 증감 색상은 TDS `color="red"|"blue"` 토큰만. 최근 12개월 `total` 배열로 `Sparkline(data-testid="trend-sparkline")` 렌더. **ResultPage는 이 컴포넌트를 import만 하므로 ResultPage 파일을 수정하지 않는다.**
- DoD:
  - `{yearMonth:'2025-08', kWh:380, total:68000}` 존재 + current 2026-08/450kWh/86,500원 → "작년 8월보다 70kWh 더 썼어요"와 "요금 +18,500원 (+27%)" 렌더, 증가값에 `color="red"` 계열 토큰(HEX 매칭 0건).
  - 전년 레코드 없음 → "작년 8월 기록이 없어요. 다음 해에 비교해드릴게요" 렌더, 증감 수치 요소 부재.
  - records 2건 이상 → `trend-sparkline` 렌더; 1건 이하 → `queryByTestId('trend-sparkline')===null` + "기록이 2개 이상 쌓이면 추이를 보여드려요" 렌더.
  - 전년 `total===0` → "비교할 수 없어요" 렌더, 화면 텍스트 내 `NaN`/`Infinity` 매칭 0건.
  - 전년 `contractType==='high'`, 현재 `'low'` → "계약 종별이 달라 참고용이에요" 캡션 렌더.
  - `records=[]`로 렌더해도 크래시 0건.
- Covers: [AC-5.1, AC-5.2, AC-5.3, AC-5.4, AC-5.5, AC-5.6]
- Files: `src/components/YoYCard.tsx`, `src/components/__tests__/YoYCard.test.tsx`
- Depends on: Task 2.2, Task 4.1

### Task 4.3 ApplianceStepperCard (8행 가전 스텝퍼)
- Description: `props: { cuts: ApplianceCut[]; onChange(applianceId, hours): void }`. `data-testid="appliance-card"` Card 안에 `APPLIANCES` 8종을 `data-testid="appliance-row-{id}"` ListRow로 렌더하고 각 행 우측에 0.5시간 단위 ＋/－ TDS Button 스텝퍼를 둔다. 프리셋 Chip("에어컨 1시간 줄이기")도 포함. 값 경계 처리는 이 컴포넌트가 전담한다. **SimulatePage는 import만 한다.**
- DoD:
  - 8개 `appliance-row-{id}` 렌더(`aircon`, `dryer`, `microwave`, `washer`, `heatmat`, `dehumid`, `tv`, `ricecooker`).
  - 값 `0`에서 "－" Button `disabled`이고 `onChange`에 음수 전달 0회; 값 `12`에서 "＋" Button `disabled`이고 12 초과 전달 0회.
  - "＋" 1회 탭 → `onChange(id, 0.5)` 정확히 1회 호출.
  - 각 스텝퍼 Button의 렌더 히트영역 ≥ 44×44px, ListRow에 인라인 padding 덮어쓰기 0건(간격은 TDS `Spacing`).
  - "일반적인 제품 기준 추정치" 캡션 렌더. 파일 내 HEX 리터럴 0건.
- Covers: [AC-6.4, AC-6.8(스텝퍼 부분)]
- Files: `src/components/ApplianceStepperCard.tsx`, `src/components/__tests__/ApplianceStepperCard.test.tsx`
- Depends on: Task 1.2, Task 4.1

### Task 4.4 ReportGate (리워드 광고 게이팅 상태머신)
- Description: `props: { recordId: string; children: ReactNode }`. `unlockStore.isUnlocked(recordId)`가 true면 `children`을 즉시 렌더. false면 잠금 Card("짧은 광고 보고 상세 리포트 열기" Button ≥52px + "예상 연간 절감액을 확인할 수 있어요")를 렌더하고 템플릿 `<TossRewardAd slotId={import.meta.env.VITE_TOSS_AD_SLOT_ID}>`로 `children`을 감싼다. 시청 완료 → `unlockStore.unlock(recordId)` 후 렌더. 로딩 중 CTA `disabled` + `data-testid="ad-loading"` Loader + 중복요청 방지 플래그. 실패 → Toast + "다시 시도" Button. 중도 이탈 → 잠금 유지. **광고 상태 처리가 전부 여기 있으므로 ReportPage는 단일 패킷으로 끝난다.**
- DoD:
  - 잠금 상태 → `children`이 DOM에 없고 잠금 Card CTA(렌더 높이 ≥ 52px) + 설명 텍스트 렌더.
  - 시청 완료 콜백 → `children` 렌더 + `es:report_unlock:v1[recordId]`가 number로 저장.
  - `unlock` 시각 -1시간 → 광고 없이 즉시 `children` 렌더; -25시간 → 잠금 복귀 + 해당 키 삭제.
  - 로드 실패 콜백 → Toast "지금은 광고를 불러올 수 없어요. 잠시 후 다시 시도해주세요" + 잠금 유지 + "다시 시도" Button(≥44px) 렌더 + `console.error` 호출 0건.
  - 중도 이탈(미완료 닫힘) 콜백 → `es:report_unlock:v1` 키 미생성, `children` 미렌더.
  - 로드 중 CTA `disabled` + `ad-loading` 렌더; CTA 연속 3회 탭 시 광고 요청 함수 호출 횟수 === 1.
- Covers: [AC-7.2, AC-7.5, AC-7.6, AC-7.7, AC-7.1(언락 저장)]
- Files: `src/components/ReportGate.tsx`, `src/components/__tests__/ReportGate.test.tsx`
- Depends on: Task 3.3, Task 3.4

---

## Epic 5. UI Pages (6 packets — 한 패킷 = 한 페이지 파일, 중복 소유 없음)

**Risk Assessment**
- Complexity: High
- Risk factors: `location.state` 직접 구조분해 시 새로고침/딥링크에서 즉시 크래시. 키보드가 SubmitFooter를 가려 제출 불가. AdSlot이 폼/CTA와 겹쳐 검수 반려.
- Mitigation: 모든 state 수신 페이지 DoD에 "null 가드 → 빈 상태/Navigate"를 필수 항목으로 박음. 도메인·스토어·컴포넌트가 모두 완성된 뒤 페이지는 조립만 담당하므로 각 패킷이 10분 내 완료되고, 페이지 파일당 소유 패킷이 정확히 1개다.

### Task 5.1 홈 화면 `/` (사용량 입력)
- Description: `ScreenScaffold` > `Top`("우리집 전기요금") > 입력 Card(TextField kWh, 연월 ListRow→BottomSheet, Tab 저압/고압) > `AdSlot(home-ad)` > `SubmitFooter(Button "요금 계산하기")`. 마운트 시 `settingsStore.get()` 복원, 제출 시 검증 → `settingsStore.patch({contractType,lastYearMonth})`(실패 시 `useQuotaToast`) → `navigate('/result', { state: { input } })`. 하단에 "한국전력 주택용 전력 기준 · v2024.01" 및 "기록은 이 기기에만 저장돼요" 캡션.
- DoD:
  - `450` + `2026-08` + 저압 제출 → `navigate('/result', {state:{input:{kWh:450,yearMonth:'2026-08',contractType:'low'}}})` 정확히 1회 호출, `es:settings:v1`의 `contractType`/`lastYearMonth` 갱신.
  - 사용량 TextField에 `inputMode="numeric"`, `type="text"`, `pattern="[0-9]*"` 속성 존재.
  - Enter keydown → 필드 blur + 제출 핸들러 정확히 1회 호출.
  - 빈 값 제출 → "사용량을 1kWh 이상 입력해주세요" 렌더 + `navigate` 0회; `2026-10` 제출(오늘 2026-09-02) → "아직 오지 않은 달이에요" 렌더 + `navigate` 0회.
  - 설정 로딩 중 `data-testid="home-skeleton"` 3개 + 제출 Button `disabled`; 로딩 후 저장값이 필드에 채워짐.
  - `es:settings:v1='{{broken'` 상태 진입 → 크래시 없이 기본값 렌더.
  - 최상위 `ScreenScaffold`, 제출 Button `display="block"` 및 렌더 높이 ≥ 52px, `data-testid="home-ad"`가 입력 Card와 SubmitFooter 사이 DOM 순서에 위치(폼 요소와 겹침 0).
  - SubmitFooter가 `visualViewport` resize 리스너를 등록해 키보드 위 위치를 계산(리스너 등록 검증).
- Covers: [AC-2.1, AC-2.2, AC-2.3, AC-2.4, AC-2.5, AC-2.6, AC-2.7, AC-1.7(캡션)]
- Files: `src/pages/HomePage.tsx`
- Depends on: Task 2.2, Task 3.3, Task 3.4

### Task 5.2 결과 화면 `/result`
- Description: `location.state`를 `(useLocation().state as RouteState['/result']) ?? null`로 받고 **null이면 계산 시도 없이 빈 상태 렌더**. state 있으면 `calcBill` 실행 → `SummaryHero(bill-hero)` > `tier-card`(구간 3행 + MiniBar) > `<YoYCard/>`(Task 4.2) > `detail-card`(6항목) > `AdSlot(result-ad)` > `SubmitFooter("절약 시뮬레이션 하기")`. 마운트 시 `recordStore.upsert` 후 결과를 `useQuotaToast`(Task 3.4)에 전달. 여름 배지, "할인 미반영" 및 요금표 버전 캡션 포함. **이 파일은 본 패킷에서만 작성/수정된다.**
- DoD:
  - `state={input:{kWh:450,yearMonth:'2026-08',contractType:'low'}}` → `bill-hero`에 "86,500원", `tier-card` 3행이 "1구간 300kWh · 36,000원", "2구간 150kWh · 32,190원", "3구간 0kWh · 0원", MiniBar 3개 ratio 0.67/0.33/0.
  - `detail-card`에 "기본요금 1,600원 / 전력량요금 68,190원 / 기후환경요금 4,050원 / 연료비조정액 2,250원 / 부가가치세 7,609원 / 전력기금 2,810원" 6 ListRow가 이 순서로 렌더.
  - `isSummerRelief===true` → Badge "여름철 완화 적용" + "완화 덕분에 22,510원 아꼈어요" 렌더; `2026-05` 입력 시 두 요소 모두 `queryBy...===null`.
  - 마운트 후 `es:records:v1`에 `{id:'rec_2026-08', yearMonth:'2026-08', kWh:450, total:86500}` 존재; 동일 yearMonth 재진입 시 배열 길이 불변.
  - **`location.state`가 null인 채 `/result` 직접 진입 → 크래시 없이 "계산할 사용량이 없어요" 빈 상태(ContentIcon + Paragraph.Text) + "사용량 입력하러 가기" Button, 탭 시 `navigate('/', {replace:true})`.**
  - `setItem`이 QuotaExceededError를 던지는 환경 → Toast "저장 공간이 부족해요. 오래된 기록을 삭제해주세요" 표시 + `bill-hero` 정상 렌더(크래시 0).
  - 첫 프레임 `data-testid="result-skeleton"` 렌더 후 200ms 이내 실제 값 교체.
  - 최상위 `ScreenScaffold`, Card 3개 구조(raw div 나열 0), 청구금액 t2 이상 타이포, `result-ad`가 `detail-card` 아래·CTA 위 DOM 순서이며 CTA와 겹침 0, 하단 `padding-bottom` ≥ SubmitFooter 높이.
  - `yoy-card`가 DOM에 1개 렌더된다(내용 검증은 Task 4.2 소관).
  - CTA 탭 → `navigate('/simulate', {state:{recordId:'rec_2026-08', input}})`.
- Covers: [AC-3.1, AC-3.2, AC-3.3, AC-3.4, AC-3.5, AC-3.6, AC-3.7, AC-3.8, AC-1.7, CC-12]
- Files: `src/pages/ResultPage.tsx`
- Depends on: Task 2.1, Task 3.2, Task 3.4, Task 4.1, Task 4.2

### Task 5.3 히스토리 화면 `/history`
- Description: `ScreenScaffold` > `Top` > `data-testid="history-list"`(ListRow: "2026년 8월 · 450kWh" + 우측 금액 + 삭제 아이콘) > `AdSlot(history-ad)`(목록 최하단). 삭제 시 `AlertDialog` 확인 → `recordStore.remove` → Toast, 실패 시 Toast "삭제하지 못했어요. 다시 시도해주세요". 행 탭 시 결과 재조회. 컨테이너에 FloatingTabBar 높이만큼 `padding-bottom` 확보. **이 파일은 본 패킷에서만 작성/수정된다.**
- DoD:
  - `['2026-06','2026-08','2026-07']` 주입 → ListRow 순서 `2026-08 → 2026-07 → 2026-06`, 각 행에 "2026년 8월 · 450kWh"와 우측 "86,500원" 렌더.
  - `2026-07` 삭제 아이콘(히트영역 ≥ 44×44px) 탭 → AlertDialog "이 기록을 삭제할까요?" 표시, "삭제" 탭 후 `es:records:v1` 길이 2 + Toast "기록을 삭제했어요"; 삭제 실패 모킹 시 Toast "삭제하지 못했어요. 다시 시도해주세요".
  - 빈 배열/키 없음 → `data-testid="history-empty"`에 `Asset.ContentIcon` + "아직 계산한 기록이 없어요" + "지금 계산하기" Button, ListRow 0개.
  - 손상 값(`'null'`) 주입 → 크래시 없이 빈 상태, `console.error` 0건.
  - 최초 읽기 중 `data-testid="history-skeleton"` 행 3개 렌더.
  - 목록 컨테이너 스타일에 `overflow-y: auto`, `-webkit-overflow-scrolling: touch`, `padding-bottom ≥ FloatingTabBar 높이` 적용(마지막 행 가림 0), 가상 스크롤 라이브러리 import 0건. ListRow 렌더 높이 ≥ 56px.
  - 행 탭 → `navigate('/result', {state:{input:{kWh,yearMonth,contractType}}})`.
- Covers: [AC-4.1, AC-4.2, AC-4.4, AC-4.5, AC-4.6, AC-4.7]
- Files: `src/pages/HistoryPage.tsx`
- Depends on: Task 3.2, Task 3.4

### Task 5.4 시뮬레이션 화면 `/simulate`
- Description: `location.state`를 `?? null` 가드 후 null이면 `recordStore.latest()` 폴백, 그것도 없으면 빈 상태. `ScreenScaffold` > `SummaryHero(saving-hero)` > `<ApplianceStepperCard/>`(Task 4.3) > `SubmitFooter("절약 팁 리포트 보기")`. 값 변경 시 `simulate()` 즉시 재계산 + `simStore.save({baseRecordId, cuts, days:30})`(디바운스, 실패 시 `useQuotaToast`). 마운트 시 `simStore.get(baseRecordId)`로 복원. AdSlot 미배치(조작 화면). **이 파일은 본 패킷에서만 작성/수정된다.**
- DoD:
  - 기준 450kWh/2026-08에서 `aircon`을 `2`로 → `saving-hero`가 "28,060원 절약" CountUp 렌더.
  - `aircon:1` + `dryer:0.5` → 화면에 시뮬레이션 후 사용량 "372kWh" 렌더.
  - 기준 100kWh에서 총 108kWh 감축 → 후 사용량 "1kWh" + "실제 사용량보다 많이 줄일 수는 없어요" 캡션 렌더.
  - 모든 cut이 0 → `saving-hero` "0원", CTA `disabled`, "줄일 가전을 하나 이상 선택해주세요" 캡션 렌더.
  - `aircon:2` 설정 → 언마운트 → 재마운트 시 `appliance-row-aircon` 스텝퍼 값 `2` 복원; 저장된 `baseRecordId`가 현재 레코드 id와 다르면 전 스텝퍼 값 `0`.
  - **`location.state===null`이고 `es:records:v1`도 빈 상태로 직접 진입 → 크래시 없이 "먼저 이번 달 사용량을 계산해주세요" + "계산하러 가기" Button 렌더, 스텝퍼 0개.**
  - 기준 레코드 조회 중 `data-testid="simulate-skeleton"` 1개 렌더.
  - quota 초과 환경에서 저장 시 크래시 없이 화면 유지 + Toast "저장 공간이 부족해요. 오래된 기록을 삭제해주세요".
  - 최상위 `ScreenScaffold`, CTA는 SubmitFooter 내 `display="block"`(≥52px), 하단 `padding-bottom` ≥ SubmitFooter 높이, `AdSlot` 렌더 0개.
  - CTA 탭 → `navigate('/report', {state:{recordId:'rec_2026-08', input, cuts:[{applianceId:'aircon',cutHoursPerDay:2}], savedWon:28060}})` 1회 호출.
- Covers: [AC-6.1, AC-6.2, AC-6.3, AC-6.5, AC-6.6, AC-6.7, AC-6.8, CC-12]
- Files: `src/pages/SimulatePage.tsx`
- Depends on: Task 2.2, Task 3.2, Task 3.3, Task 3.4, Task 4.1, Task 4.3

### Task 5.5 리포트 화면 `/report`
- Description: `location.state`를 `?? null` 가드. state 없거나 `cuts`가 전부 0이면 빈 상태. 그 외에는 `<ReportGate recordId={...}>`(Task 4.4)로 `data-testid="report-body"`를 감싼다. 본문 = 감축량 내림차순 상위 3개 가전 Card(각 `tips.ts` 정적 팁 2개) + `data-testid="annual-saving"`(t2 강조). 본문 최하단 `AdSlot(report-ad)`. **이 파일은 본 패킷에서만 작성/수정된다(광고 상태 처리는 ReportGate 소관).**
- DoD:
  - `cuts=[{aircon,2},{dryer,0.5}]`, `savedWon=28060`, 언락 상태 → 가전 Card 순서 `aircon` → `dryer`, 각 Card에 `tips.ts` 팁 문자열 2개 렌더, `annual-saving`에 "연간 336,720원".
  - 잠금 상태 → `queryByTestId('report-body')===null`(ReportGate 렌더 결과 확인).
  - **state 없이 `/report` 직접 진입 → 크래시 없이 "시뮬레이션 결과가 없어요" + "시뮬레이션 하러 가기" Button, 탭 시 `navigate('/simulate', {replace:true})`.** `cuts`가 전부 0인 state로 진입 시에도 동일 빈 상태.
  - 팁 문자열은 `src/domain/tips.ts`에서만 로드되며, 파일 내 `anthropic`/`openai`/`fetch(` 매칭 0건.
  - 최상위 `ScreenScaffold`, `report-ad`가 본문 최하단 DOM 순서, `Top` 뒤로가기 히트영역 ≥ 44×44px, HEX 리터럴 0건.
- Covers: [AC-7.1, AC-7.3, AC-7.4, AC-7.8, AC-7.2(본문 미노출 확인)]
- Files: `src/pages/ReportPage.tsx`
- Depends on: Task 1.2, Task 4.4, Task 5.4

### Task 5.6 우리 동네 비교 화면 `/compare`
- Description: `ScreenScaffold` > 지역 Chip 행(탭 시 BottomSheet 17개 시도) > `region-compare-card`(차이 kWh t2~t3 + 증감률 Badge + `bar-mine`/`bar-avg`) > `AdSlot(compare-ad)`. `region-average.json`은 dynamic import(로딩 중 Skeleton). 지역 선택 시 `settingsStore.patch({regionCode})`(실패 시 `useQuotaToast`). 최신 레코드는 `recordStore.latest()`. 하단 `padding-bottom` ≥ FloatingTabBar 높이. **이 파일은 본 패킷에서만 작성/수정된다.**
- DoD:
  - `regionCode='KR-11'`, 8월 평균 320, 최신 레코드 2026-08/450kWh → `region-compare-card`에 "서울 8월 평균보다 130kWh 많아요 (+41%)" 렌더, `bar-mine`/`bar-avg` width 비율 450:320.
  - BottomSheet에서 "부산" 선택 → `es:settings:v1.regionCode==='KR-26'` 저장 + 부산 8월 평균 기준으로 즉시 재렌더. BottomSheet 항목 렌더 높이 ≥ 48px, Chip ≥ 44px.
  - 진입~지역 변경 전 과정에서 `globalThis.fetch`/`XMLHttpRequest` 스파이 호출 0건, "내 사용량은 기기에만 저장되며 어디에도 전송되지 않아요" 캡션 렌더.
  - 레코드 없음 → `Asset.ContentIcon` + "비교하려면 먼저 사용량을 계산해주세요" + "계산하러 가기" Button, MiniBar 0개.
  - `regionCode='KR-99'` 또는 월 키 부재 → "이 지역의 평균 데이터가 아직 없어요" 렌더, 화면 텍스트 `NaN` 매칭 0건, 크래시 0.
  - 로딩 중 `data-testid="compare-skeleton"` 렌더 후 비교 카드로 교체.
  - 최상위 `ScreenScaffold`, 증감률은 TDS Badge, `compare-ad`가 비교 카드 아래이며 FloatingTabBar와 겹치지 않음(하단 패딩 확보), HEX 리터럴 0건.
- Covers: [AC-8.1, AC-8.2, AC-8.3, AC-8.4, AC-8.5, AC-8.6, AC-8.7, CC-3(화면 단위)]
- Files: `src/pages/ComparePage.tsx`
- Depends on: Task 1.2, Task 3.2, Task 3.3, Task 3.4, Task 4.1

---

## Epic 6. Integration + 컴플라이언스 (3 packets — 페이지 파일 미수정)

**Risk Assessment**
- Complexity: Medium
- Risk factors: 알 수 없는 경로에서 화이트스크린, `/result`·`/simulate`·`/report`에서 TabBar가 남아 CTA를 가림. 컴플라이언스 위반이 배포 직전 발견되면 광범위 수정 필요.
- Mitigation: 라우팅 셸(`App.tsx`/`routes.tsx`)만 이 Epic이 소유하고 페이지 파일은 절대 수정하지 않아 파일 충돌 0. 컴플라이언스 스캔은 마지막에 두되, HEX 금지·네트워크 금지·null 가드 조건을 앞선 모든 패킷 DoD에 이미 포함시켜 위반 시 수정 범위를 문자열/스타일 수준으로 국한.

### Task 6.1 라우팅 + FloatingTabBar 통합
- Description: `<BrowserRouter>` + `<Routes>`로 6개 라우트 연결, 미정의 경로는 `<Navigate to="/" replace />`. `FloatingTabBar` 3탭(계산 `/`, 기록 `/history`, 내 동네 `/compare`)을 `/result`·`/simulate`·`/report`에서 숨기고 `Top` 뒤로가기를 노출한다. 페이지 파일은 import만 하고 수정하지 않는다.
- DoD:
  - `/`, `/result`, `/simulate`, `/report`, `/history`, `/compare` 6개 경로가 각 페이지를 렌더하고 `/zzz` 진입 시 `/`로 replace 리다이렉트.
  - `/`, `/history`, `/compare`에서 FloatingTabBar 렌더 O; `/result`, `/simulate`, `/report`에서 `queryBy` 결과 null이며 `Top` 뒤로가기 Button(히트영역 ≥ 44×44px) 렌더 O.
  - **6개 경로 각각에 `location.state` 없이 직접 진입해도 크래시 0건**(state 필요 화면은 빈 상태 또는 폴백 렌더).
  - `npx tsc --noEmit` 및 `vite build` 성공.
  - 변경 파일이 `src/App.tsx`, `src/main.tsx`, `src/routes.tsx` 3개뿐이다(페이지 파일 diff 0줄).
- Covers: [AC-3.5, AC-6.7, AC-7.2(빈 상태 라우팅), CC-2]
- Files: `src/App.tsx`, `src/main.tsx`, `src/routes.tsx`
- Depends on: Task 5.1, 5.2, 5.3, 5.4, 5.5, 5.6

### Task 6.2 컴플라이언스 정적 스캔 + 호환성 설정
- Description: 소스 grep 기반 유닛 테스트와 빌드 타깃 설정. `vite.config.ts`에 `build.target:'es2020'`, `.browserslistrc`에 `iOS >= 16` / `Android >= 7`. 전 라우트 순회 스모크 테스트(`console.error`/`fetch` 스파이 포함).
- DoD:
  - 스캔 테스트 통과: `src/**`에서 `window.location.href = "http`·`window.open(` 0건(CC-1); "설치"/"다운로드"/"앱스토어"/"플레이스토어" 0건(CC-5); `<a href` 0건(CC-6); `google-analytics`/`amplitude` import 및 package.json 의존성 0건(CC-7); `#RRGGBB`·`#RGB` 리터럴 0건(`.css`/`.tsx` 포함, CC-8); `grantPromotionReward` 0건(CC-9); `anthropic`/`openai`/`/v1/chat` 0건(CC-10); `.at(`·`Object.groupBy`·`structuredClone` 0건(CC-4).
  - 전 라우트 순회 스모크에서 `console.error` 호출 0건(CC-2), `globalThis.fetch`/`XMLHttpRequest` 스파이 호출 0건(CC-3).
  - 인터랙티브 요소(Button/ListRow/Stepper/Chip/Tab)의 렌더 높이 또는 size prop이 44px 이상임을 검증하는 테스트 통과(CC-11).
  - `vite build` 성공 및 산출물 로드 시 에러 0건, `build.target === 'es2020'`, browserslist 설정 존재.
  - shadcn/MUI/Ant/Chakra 의존성 매칭 0건.
- Covers: [CC-1, CC-2, CC-3, CC-4, CC-5, CC-6, CC-7, CC-8, CC-9, CC-10, CC-11]
- Files: `src/__tests__/compliance.test.ts`, `src/__tests__/routes-smoke.test.tsx`, `vite.config.ts`, `.browserslistrc`
- Depends on: Task 6.1

### Task 6.3 최종 QA — quota/레이아웃/다크모드 통합 검증 (테스트 전용)
- Description: 앞선 패킷들이 이미 `useQuotaToast`(3.4)와 하단 패딩 규칙을 적용했음을 전 화면 순회 테스트로 검증한다. **소스 파일은 수정하지 않고 테스트 파일만 추가**하며, 실패 시 수정 대상은 해당 페이지의 소유 패킷으로 되돌려 보낸다.
- DoD:
  - `setItem`이 항상 `QuotaExceededError`를 던지는 환경에서 `/result`, `/simulate`, `/history`, `/compare` 4개 화면 순회 시 크래시 0건이며 각 화면에서 Toast "저장 공간이 부족해요. 오래된 기록을 삭제해주세요" 표시.
  - `/history`·`/compare` 스크롤 컨테이너의 `padding-bottom` ≥ FloatingTabBar 높이, `/result`·`/simulate`의 `padding-bottom` ≥ SubmitFooter 높이 검증 통과.
  - `prefers-color-scheme: dark` 매치미디어 모킹 상태에서 6개 화면 렌더 시 크래시 0건 및 인라인 HEX 색상 사용 0건.
  - 변경 파일이 `src/__tests__/` 하위 2개뿐이다(페이지/컴포넌트 diff 0줄).
  - `npx tsc --noEmit` 및 전체 테스트 스위트 통과.
- Covers: [CC-12, AC-3.6, AC-4.6, AC-8.7]
- Files: `src/__tests__/quota-integration.test.tsx`, `src/__tests__/layout-contract.test.tsx`
- Depends on: Task 6.1

---

## 패킷 인벤토리 (총 21 — 선언값과 실제 나열 일치 검증)

| Epic | 패킷 ID | 개수 |
|---|---|---|
| 1. Types & Static Data | 1.1, 1.2 | 2 |
| 2. Domain Logic | 2.1, 2.2 | 2 |
| 3. Data Layer | 3.1, 3.2, 3.3, 3.4 | 4 |
| 4. Presentation Components | 4.1, 4.2, 4.3, 4.4 | 4 |
| 5. UI Pages | 5.1, 5.2, 5.3, 5.4, 5.5, 5.6 | 6 |
| 6. Integration & Compliance | 6.1, 6.2, 6.3 | 3 |
| **합계** | | **21** |

**예상 소요**: 패킷당 ≤ 10분 기준 총 21 × 10분 ≈ 3.5시간(코딩 에이전트 실행 시간, 병렬화 미고려). Epic 4 내부(4.1→4.2/4.3 병렬)와 Epic 5 내부(5.1/5.3/5.6 병렬 가능)를 병렬 실행하면 임계 경로는 12 패킷(1.1 → 1.2 → 2.1 → 2.2 → 3.1 → 3.3 → 3.4 → 4.1 → 4.4 → 5.4 → 5.5 → 6.1 → 6.2/6.3) ≈ 2시간.

---

## 파일 소유권 표 (충돌 0 검증)

| 파일 | 소유 패킷 |
|---|---|
| `src/lib/types.ts` | 1.1 |
| `src/domain/tariff.ts`, `appliances.ts`, `tips.ts`, `src/data/region-average.json` | 1.2 |
| `src/domain/calcBill.ts`, `rounding.ts` | 2.1 |
| `src/domain/validate.ts`, `compare.ts`, `simulate.ts` | 2.2 |
| `src/lib/safeStorage.ts` | 3.1 |
| `src/lib/recordStore.ts` | 3.2 |
| `src/lib/settingsStore.ts`, `simStore.ts`, `unlockStore.ts` | 3.3 |
| `src/lib/useQuotaToast.ts` | 3.4 |
| `src/components/SummaryHero.tsx`, `MiniBar.tsx`, `Sparkline.tsx` | 4.1 |
| `src/components/YoYCard.tsx` | 4.2 |
| `src/components/ApplianceStepperCard.tsx` | 4.3 |
| `src/components/ReportGate.tsx` | 4.4 |
| `src/pages/HomePage.tsx` | 5.1 |
| `src/pages/ResultPage.tsx` | **5.2 단독** |
| `src/pages/HistoryPage.tsx` | **5.3 단독** |
| `src/pages/SimulatePage.tsx` | **5.4 단독** |
| `src/pages/ReportPage.tsx` | **5.5 단독** |
| `src/pages/ComparePage.tsx` | **5.6 단독** |
| `src/App.tsx`, `main.tsx`, `routes.tsx` | 6.1 |
| `vite.config.ts`, `.browserslistrc`, `src/__tests__/compliance*`, `routes-smoke*` | 6.2 |
| `src/__tests__/quota-integration*`, `layout-contract*` | 6.3 |

---

## AC Coverage

- **Total ACs in SPEC: 61** (기능 AC 49 + 공통 컴플라이언스 AC 12)
- **Covered by tasks: 61**

| Feature | AC | Task |
|---|---|---|
| F1 | AC-1.1, 1.2, 1.3, 1.4 | 2.1 |
| F1 | AC-1.5, 1.6 | 2.2 |
| F1 | AC-1.7 | 1.1, 1.2, 2.1, 5.1, 5.2 |
| F2 | AC-2.1, 2.2, 2.3, 2.5, 2.7 | 5.1 |
| F2 | AC-2.4 | 2.2, 5.1 |
| F2 | AC-2.6 | 3.1, 3.3, 5.1 |
| F3 | AC-3.1, 3.2, 3.3, 3.4, 3.7, 3.8 | 5.2 (MiniBar/Hero 기반 4.1) |
| F3 | AC-3.5 | 5.2, 6.1 |
| F3 | AC-3.6 | 3.4, 5.2, 6.3 |
| F4 | AC-4.1 | 3.2, 5.3 |
| F4 | AC-4.2, 4.4, 4.7 | 5.3 |
| F4 | AC-4.3 | 3.2 |
| F4 | AC-4.5 | 3.1, 3.2, 5.3 |
| F4 | AC-4.6 | 5.3, 6.3 |
| F5 | AC-5.1, 5.3, 5.4, 5.6 | 4.2 |
| F5 | AC-5.2, 5.5 | 2.2, 4.2 |
| F6 | AC-6.1, 6.2, 6.3 | 2.2, 5.4 |
| F6 | AC-6.4 | 4.3 |
| F6 | AC-6.5 | 5.4 |
| F6 | AC-6.6 | 3.3, 5.4 |
| F6 | AC-6.7 | 5.4, 6.1 |
| F6 | AC-6.8 | 4.3, 5.4 |
| F7 | AC-7.1 | 4.4, 5.5 |
| F7 | AC-7.2 | 4.4, 5.5, 6.1 |
| F7 | AC-7.3 | 5.5 |
| F7 | AC-7.4 | 3.3, 4.4, 5.5 |
| F7 | AC-7.5, 7.6, 7.7 | 4.4 |
| F7 | AC-7.8 | 1.2, 5.5 |
| F8 | AC-8.1 | 1.2, 4.1, 5.6 |
| F8 | AC-8.2 | 3.3, 5.6 |
| F8 | AC-8.3, 8.4, 8.5, 8.6 | 5.6 |
| F8 | AC-8.7 | 5.6, 6.3 |
| 공통 | CC-1 ~ CC-11 | 6.2 (CC-3는 5.6에서도 화면 단위 검증, CC-8은 1.1/4.1에서 선제 검증) |
| 공통 | CC-12 | 3.1, 3.4, 5.2, 5.3, 5.4, 5.6, 6.3 |

**Uncovered: 0**

---

## 변경 이력 (교차검증 반영)

| 항목 | 이전 | 수정 | 근거 |
|---|---|---|---|
| 문서 상단 패킷 수 선언 | "총 19 packets" | **"총 21 packets"** + Epic별 내역 | 실제 나열된 Task 21개와 불일치 (GAP 지적사항) |
| SPEC "13 packets" 추정과의 차이 | 설명 없음 | **산정 근거 표 추가** | 기능 단위 추정 → 실행 단위 분할 과정 명시 |
| 패킷 인벤토리 섹션 | 없음 | **신설**(Epic별 ID·합계·임계경로 소요) | 선언값-실제값 재발 방지, 리소스 계획 정확도 확보 |
| Epic 헤더 | 개수 미표기 | **각 헤더에 `(N packets)` 표기** | 집계 오류 즉시 발견 가능 |

기능·AC·파일 소유권·의존 순서는 검증에서 전부 일치 판정되었으므로 **내용 변경 없음**.