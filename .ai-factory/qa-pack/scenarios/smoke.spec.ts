import { test, expect } from '@playwright/test';

// nightcrew Sentinel smoke 팩 — Factory 산출(§7.1)
// 핵심 막: 월 사용량(kWh) 입력시 누진구간별 요금 자동 계산, 전년 동월 대비 요금 비교, 가전제품별 예상 절약액 시뮬레이션, 여름철 한시 완화 요금표 자동 반영, 가전별 상세 절약 팁 리포트(리워드 광고 시청 후 열람)
// 토스 브릿지 의존 구간(로그인·결제)은 외부 재현 불가 — 화면 도달 확인까지만.
const ROUTES = ["/","/History","/Home","/Region","/Report"];
// WebView 밖 실행에서만 나는 콘솔 에러는 무시(앱인토스 관례 — toss visual-smoke 템플릿 계승)
const IGNORED_CONSOLE = [/SafeAreaInsets/i, /granite/i, /apps-in-toss/i];

for (const route of ROUTES) {
  test(`smoke: ${route} 렌더링과 콘솔 에러 없음`, async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error' && !IGNORED_CONSOLE.some((re) => re.test(msg.text()))) errors.push(msg.text());
    });
    page.on('pageerror', (err) => errors.push(String(err)));
    await page.goto(route);
    await expect(page.locator('body')).toBeVisible();
    expect(errors).toEqual([]);
  });
}
