# Sprint Contract — App 루트 부팅 배선 최소화

## 만들 항목
- **src/App.tsx** — Provider 순서 고정(Router > 전역 > Suspense > Routes), lazy 페이지 Suspense 감싸기, catch-all Route('*' → '/'), useNavigate 컴포넌트는 Router 하위만
- **src/components/ErrorBoundary.tsx** — 클래스형 ErrorBoundary, throw 시 에러 뷰 페인트(스모크 timeout 방지)
- **src/components/FloatingTabBar/index.tsx** — useNavigate/useLocation은 Router 하위에서만(조건 검토)
- Router 중복 제거: main.tsx의 BrowserRouter/MemoryRouter와 App.tsx 중 하나만 남김

## 공유 타입 (src/lib/types.ts에서 import)
- `AppFlags` — schemaVersion, disclaimerSeenAt
- `BillBreakdown`, `StageBreakdown` — 계산 데이터 모델

## 검증 방법
- `npx tsc --noEmit` 타입 에러 0건
- `npm run test:visual` 통과, 스크린샷에 빈 화면/에러 뷰 없음
- 각 navigate() 호출에 대응 Route 있고, Router 단 1개 확인

## 절대 금지
- main.tsx 수정 금지(@AI:ANCHOR)
- 새 화면/기능 추가 금지, 배선만 수정
- package.json 플랫폼 의존성(react, @toss/tds-mobile, @apps-in-toss/web-framework) 제거 금지
