# Changelog

## [0.1.0] - 2026-09-01

19/20 packets completed.

### Added
- feat: 도메인 타입 + RouteState 계약 정의 (packet 0001)
- feat: 정적 데이터 상수 (요금표·가전·팁·지역평균) (packet 0002)
- feat: 누진요금 계산 엔진 calcBill + 반올림 유틸 (packet 0003)
- feat: 입력 검증 + 비교/시뮬레이션 순수 함수 (packet 0004)
- feat: safeStorage 기반 계층 (CC-12 대응) (packet 0005)
- feat: recordStore (list/upsert/remove/prune/latest) (packet 0006)
- feat: settingsStore · simStore · unlockStore (packet 0007)
- feat: useQuotaToast 훅 (저장 실패 공통 처리) (packet 0008)
- feat: SummaryHero · Amount · MiniBar · Sparkline 컴포넌트 (packet 0009)
- feat: YoYCard (전년 동월 비교 카드) (packet 0010)
- feat: ApplianceStepperCard (가전 8행 스텝퍼) (packet 0011)
- feat: ReportGate (리워드 광고 게이팅 상태머신) (packet 0012)
- feat: 홈 화면 `/` (사용량 입력) (packet 0013)
- feat: 결과 화면 `/result` (packet 0014)
- feat: 히스토리 화면 `/history` (packet 0015)
- feat: 시뮬레이션 화면 `/simulate` (packet 0016)
- feat: 리포트 화면 `/report` (packet 0017)
- feat: 우리 동네 비교 화면 `/compare` (packet 0018)
- feat: 라우팅 + FloatingTabBar 통합 (App.tsx 단독 소유) (packet 0019)

### Known Issues
- 컴플라이언스 정적 스캔 + 호환성 설정 + 최종 QA (packet 0020) — failed
