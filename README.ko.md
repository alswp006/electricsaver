🇰🇷 [English](./README.md)

# ElectricSaver

앱인토스 (Vite + React + TDS) 우리집 전기 사용량을 입력하면 누진세 구간과 예상 요금을 계산하고 절약 시뮬레이션으로 다음 달 요금을 낮추는 법을 알려주는 생활 계산기. 한전 누진세 구조가 복잡해 실제 얼마나 아낄 수 있는지 체감하기 어렵고 폭염철 전기요금 폭탄에 대한 불안이 큼.

## 기술 스택

- React 18.0.0
- TypeScript
- Vitest

## 라우트

| 경로 | 설명 |
|------|------|
| `/History` | 기록 |
| `/Home` | 홈 |
| `/Region` | 지역 |
| `/Report` | 보고 |
| `/Result` | 결과 |
| `/Settings` | 설정 |
| `/Simulate` | 시뮬레이션 |

## 시작하기

```bash
pnpm install
pnpm dev
```

## 개발

```bash
pnpm typecheck    # 타입 체크
pnpm test         # 테스트 실행
pnpm build        # 프로덕션 빌드
```

## 설계 문서

전체 설계 문서는 `.ai-factory/` 디렉토리에서 확인하세요:
- `prd.md` — 제품 요구사항 문서
- `spec.md` — 기술 사양
- `task.md` — 에픽/작업 분류

---
[AI Factory](https://github.com/alswp006/ai-factory)로 만들어졌습니다 · 마지막 동기화: 2026-09-01
