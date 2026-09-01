🇺🇸 [한국어](./README.ko.md)

# ElectricSaver

앱인토스 (Vite + React + TDS) 우리집 전기 사용량을 입력하면 누진세 구간과 예상 요금을 계산하고 절약 시뮬레이션으로 다음 달 요금을 낮추는 법을 알려주는 생활 계산기 한전 누진세 구조가 복잡해 실제 얼마나 아낄 수 있는지 체감하기 어렵고 폭염철 전기요금 폭탄에 대한 불안이 큼

## Tech Stack

- React 18.0.0
- TypeScript
- Vitest

## Routes

| Path | Description |
|------|-------------|
| `/History` | History |
| `/Home` | Home |
| `/HomeData` | HomeData |
| `/HomeInput` | HomeInput |
| `/Region` | Region |
| `/Report` | Report |
| `/Result` | Result |
| `/Settings` | Settings |
| `/Simulate` | Simulate |

## Getting Started

```bash
pnpm install
pnpm dev
```

## Development

```bash
pnpm typecheck    # Type checking
pnpm test         # Run tests
pnpm build        # Production build
```

## Design Documents

See `.ai-factory/` directory for full design artifacts:
- `prd.md` — Product Requirements Document
- `spec.md` — Technical Specification
- `task.md` — Epic/Task Breakdown

---
Built with [AI Factory](https://github.com/alswp006/ai-factory) · Last synced: 2026-09-01
