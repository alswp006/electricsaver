import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { Calculator, History as HistoryIcon, MapPin } from 'lucide-react';
import Home from './pages/Home';
import Result from './pages/Result';
import History from './pages/History';
import Simulate from './pages/Simulate';
import Report from './pages/Report';
import Compare from './pages/Compare';
import { FloatingTabBar, type TabItem } from './components/FloatingTabBar';

// Dev-only TDS Gallery route — `import.meta.env.DEV` is statically replaced
// (true in dev, false in prod) so the entire import + Route is tree-shaken
// from production builds. Verify with: `grep -r "TdsGallery" dist/` → empty.
const DevTdsGallery = import.meta.env.DEV
  ? lazy(() => import('./pages/__TdsGallery'))
  : null;

// @AI:NOTE 하단 탭은 App이 단독으로 소유한다. 페이지가 각자 FloatingTabBar를 렌더하면
// 같은 경로에 탭바가 2개 겹치므로(패킷 0019), 페이지 안에서는 렌더하지 않는다.
const TAB_ITEMS: TabItem[] = [
  { label: '계산', icon: <Calculator size={22} aria-hidden />, path: '/' },
  { label: '기록', icon: <HistoryIcon size={22} aria-hidden />, path: '/history' },
  { label: '내 동네', icon: <MapPin size={22} aria-hidden />, path: '/compare' },
];

/** 결과·시뮬레이션·리포트는 흐름 화면이라 탭바를 숨긴다(뒤로가기로 복귀). */
const TAB_ROUTES: readonly string[] = TAB_ITEMS.map((item) => item.path);

function normalizePath(pathname: string): string {
  return pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
}

export default function App() {
  const { pathname } = useLocation();
  const showTabBar = TAB_ROUTES.includes(normalizePath(pathname));

  return (
    <>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/result" element={<Result />} />
        <Route path="/history" element={<History />} />
        <Route path="/simulate" element={<Simulate />} />
        <Route path="/report" element={<Report />} />
        <Route path="/compare" element={<Compare />} />
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
        {/* 오타·만료 딥링크로 들어와도 막다른 화면 대신 홈으로. replace라 뒤로가기가 되돌지 않는다. */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {showTabBar && <FloatingTabBar items={TAB_ITEMS} />}
    </>
  );
}
