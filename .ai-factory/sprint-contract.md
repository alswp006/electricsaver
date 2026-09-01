# Sprint Contract: 라우팅 + FloatingTabBar 통합

## 목표
src/App.tsx에서 react-router-dom으로 6개 라우트(/, /result, /simulate, /report, /history, /compare)를 연결하고, 하단 탭 노출 라우트(/, /history, /compare)에서만 FloatingTabBar를 조건부 렌더.

## 구현 항목

| 항목 | 변경사항 | 타입 |
|------|---------|------|
| **src/App.tsx** | 6개 라우트 + FloatingTabBar 조건부 렌더 (location.pathname 기반) | `RouteState` (path 타입 정의용) |

## 사용 타입 (src/lib/types.ts에서 import)
- `RouteState` — 라우트 path와 state 타입 정의. path 매칭에 사용.

## 검증 기준
- ✅ `npx tsc --noEmit` — 타입 에러 0개
- ✅ `npx vitest run` — 테스트 통과 (App.tsx에 테스트 없으면 패스)
- ✅ `npm run test:visual` — 흰 화면/콘텐츠 잘림 없음. e2e/__shots__에서 6개 라우트 모두 가능.
- ✅ `/` `/history` `/compare`에서만 FloatingTabBar 렌더 확인. 다른 라우트에서는 없음.

## 절대 금지
- ❌ **main.tsx 수정** — @AI:ANCHOR. TDSMobileAITProvider/BrowserRouter는 이미 설정됨.
- ❌ App.tsx에서 Provider 추가 금지 — main.tsx에서 이미 배선됨.
- ❌ 개발용 __tds-gallery 라우트 제거 금지 — import.meta.env.DEV로 프로덕션 빌드 시 자동 tree-shake됨.

## 추가 참고
- FloatingTabBar는 `src/components/FloatingTabBar.tsx`에서 import. 현재 존재하지 않으면 별도 구현 필요 (이 패킷 범위 내).
- Routes/Route는 이미 있음 — 라우트 추가 아님. 기존 6개 라우트만 기존대로 유지.
