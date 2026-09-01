# Sprint Contract — App.tsx Routing + FloatingTabBar

## 만들 항목
- **src/App.tsx** — React Router로 7개 화면 라우트 연결, FloatingTabBar(홈/기록/시뮬레이션/설정 4탭) 배치, 부팅 시 migrateFlags() 1회 실행
- **src/components/FloatingTabBar.tsx** — 하단 4탭 네비 컴포넌트(활성탭=아이콘+라벨 컬러 틴트, 솔리드 알약 금지)
- **.ai-factory/shared-context.md** — 7개 라우트 경로 확인(읽기 전용)

## 공유 타입 (src/lib/types.ts에서 import)
- `AppFlags` — schemaVersion, disclaimerSeenAt 포함
- `BillBreakdown`, `StageBreakdown` — 빌 계산 데이터 모델

## 검증 방법
- `npx tsc --noEmit` — 타입 에러 0건
- `npx vitest run` — 테스트 통과(e2e/visual-smoke에 App 라우트 등록 확인)
- 각 라우트 navigate() 호출 시 대응 Route 존재 확인
- FloatingTabBar 4탭이 스크린샷에 보이고 활성탭이 컬러 틴트인지 확인(visual-review.md)

## 절대 금지
- main.tsx 수정 금지(@AI:ANCHOR 파일)
- .ai-factory/ 파일 수정 금지(spec.md, prd.md, shared-context.md 등)
- package.json의 플랫폼 필수 의존성(react, @toss/tds-mobile, @apps-in-toss/web-framework 등) 제거 금지
- 라우트 분기 시 RouteState 타입 검증 필수(types.ts의 RouteState와 일치)
