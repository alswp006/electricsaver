import { lazy, Suspense, useEffect, useRef, type ReactNode } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Home from './pages/Home';
import Result from './pages/Result';
import History from './pages/History';
import Simulate from './pages/Simulate';
import Report from './pages/Report';
import Region from './pages/Region';
import Settings from './pages/Settings';
import { FloatingTabBar, type TabItem } from './components/FloatingTabBar';
import { migrateFlags, readJSON } from './lib/storage';
import type { MeterRecord } from './types/domain';
import type { SimulateRouteState } from './types/navigation';

// Dev-only TDS Gallery route — `import.meta.env.DEV` is statically replaced
// (true in dev, false in prod) so the entire import + Route is tree-shaken
// from production builds. Verify with: `grep -r "TdsGallery" dist/` → empty.
const DevTdsGallery = import.meta.env.DEV
  ? lazy(() => import('./pages/__TdsGallery'))
  : null;

/**
 * 탭바를 띄우는 경로 — 메인 네비게이션의 루트 화면들.
 * /result·/simulate·/report는 하단 고정 CTA(FixedBottomCTA)를 쓰는 상세 화면이라
 * 탭바를 함께 띄우면 두 고정 요소가 겹친다 → 상세 화면에서는 탭바를 숨긴다.
 * /region은 고정 CTA가 없고 자체 뒤로가기 경로도 없어, 탭바가 유일한 탈출 경로다.
 */
const TABBAR_PATHS = new Set(['/', '/history', '/region', '/settings']);

/** 탭바 높이(6 + 최소 44 + 6 ≈ 56) + 여유. 마지막 콘텐츠가 탭바에 가리지 않도록. */
const TABBAR_SPACER = 'calc(64px + env(safe-area-inset-bottom))';

function TabIcon({ d }: { d: string }) {
  return (
    <svg
      width={22}
      height={22}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d={d} />
    </svg>
  );
}

const ICON_HOME = 'M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z';
const ICON_HISTORY = 'M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01';
const ICON_SIMULATE = 'M13 3 5 14h6l-1 7 8-11h-6z';
const ICON_SETTINGS =
  'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2v.2a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-3-1.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0-1.2-2.9h-.2a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.3-3l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 2.9-1.2V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 3 1.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0 1.2 2.9h.2a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.6 1z';

/**
 * 계산 입력(location.state)이 있어야 열리는 상세 화면 가드.
 * 주소 직접 진입·새로고침·뒤로가기로 state가 없으면 홈으로 replace — 화면을 그리기 전에
 * 라우트 단계에서 걸러 흰 화면/빈 결과를 원천 차단한다(각 화면의 useEffect 가드보다 먼저).
 */
function RequireRouteState({ field, children }: { field: string; children: ReactNode }) {
  const location = useLocation();
  const state = location.state as Record<string, unknown> | null;
  const value = state && typeof state === 'object' ? state[field] : undefined;
  if (value == null) return <Navigate to="/" replace />;
  return <>{children}</>;
}

/**
 * 시뮬레이션 탭은 계산 입력(location.state)이 있어야 열린다.
 * 마지막으로 저장된 검침 기록을 state로 실어 보내면, 탭을 눌렀을 때 홈으로 튕기지 않는다.
 * 기록이 하나도 없으면 undefined → Simulate가 홈으로 replace(입력부터 하라는 뜻).
 */
function latestRecordState(): SimulateRouteState | undefined {
  const { value } = readJSON<MeterRecord[]>('es:records', []);
  const records = Array.isArray(value) ? value : [];
  if (records.length === 0) return undefined;

  const latest = records.reduce((a, b) => (b.createdAt >= a.createdAt ? b : a));
  const month = Number(latest.yearMonth?.split('-')[1]);
  return {
    input: {
      yearMonth: latest.yearMonth,
      kWh: latest.kWh,
      month: Number.isFinite(month) && month >= 1 && month <= 12 ? month : 1,
    },
  };
}

export default function App() {
  const location = useLocation();
  const migratedRef = useRef(false);

  // 부팅 1회 — es:flags 스키마 정규화. ref 가드로 StrictMode 이중 마운트에서도 1회.
  useEffect(() => {
    if (migratedRef.current) return;
    migratedRef.current = true;
    try {
      migrateFlags();
    } catch {
      /* 저장소가 막힌 환경(프라이빗 모드 등)에서도 앱은 떠야 한다 */
    }
  }, []);

  const showTabBar = TABBAR_PATHS.has(location.pathname);

  const tabs: TabItem[] = [
    { label: '홈', path: '/', icon: <TabIcon d={ICON_HOME} /> },
    { label: '기록', path: '/history', icon: <TabIcon d={ICON_HISTORY} /> },
    {
      label: '시뮬레이션',
      path: '/simulate',
      icon: <TabIcon d={ICON_SIMULATE} />,
      state: latestRecordState(),
    },
    { label: '설정', path: '/settings', icon: <TabIcon d={ICON_SETTINGS} /> },
  ];

  return (
    <>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route
          path="/result"
          element={
            <RequireRouteState field="input">
              <Result />
            </RequireRouteState>
          }
        />
        <Route path="/history" element={<History />} />
        <Route
          path="/simulate"
          element={
            <RequireRouteState field="input">
              <Simulate />
            </RequireRouteState>
          }
        />
        <Route
          path="/report"
          element={
            <RequireRouteState field="summary">
              <Report />
            </RequireRouteState>
          }
        />
        <Route path="/region" element={<Region />} />
        <Route path="/settings" element={<Settings />} />
        {DevTdsGallery && (
          <Route
            path="/__tds-gallery"
            element={
              <Suspense fallback={null}>
                <DevTdsGallery />
              </Suspense>
            }
          />
        )}
        {/* 알 수 없는 경로로 들어와도 흰 화면 대신 홈으로 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      {showTabBar && (
        <>
          <div data-testid="tabbar-spacer" style={{ paddingBottom: TABBAR_SPACER }} />
          <FloatingTabBar items={tabs} />
        </>
      )}
    </>
  );
}
