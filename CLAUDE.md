# Healthcare Project — Claude Instructions

실시간 건강정보를 시뮬레이터에서 받아 저장하고, 웹·모바일에서 모니터링하며 AI로 분석하는 교육용 모노레포.

## 공통 규칙

다음 규칙을 항상 따른다:
https://raw.githubusercontent.com/forrestchang/andrej-karpathy-skills/main/CLAUDE.md

## 문서 지도 — 작업 전 반드시 해당 문서를 먼저 읽는다

| 작업 | 읽어야 할 문서 |
|---|---|
| 요구사항 확인 | `docs/REQUIREMENTS.md` |
| 데이터 모델·타입 | `docs/DATA_MODEL.md` |
| 화면 설계·레이아웃 | `docs/SCREEN_DESIGN.md` |
| UI 스타일 (색상·폰트·컴포넌트) | `docs/DESIGN.md` → `docs/DESIGN-apple.md` 우선 적용 |
| 전체 시스템 흐름 | `docs/ARCHITECTURE.md` |
| 일정·마일스톤 | `docs/ROADMAP.md` |

## 패키지별 추가 규칙

각 패키지에 진입할 때 해당 `CLAUDE.md`를 추가로 읽는다.

| 패키지 | 역할 | 추가 문서 |
|---|---|---|
| `health-backend/` | NestJS 백엔드 | `health-backend/CLAUDE.md`, `health-backend/docs/` |
| `health-web/` | React + Vite 웹 | `health-web/CLAUDE.md`, `health-web/docs/` |
| `health-mobile/` | React Native (Expo) | `health-mobile/CLAUDE.md`, `health-mobile/docs/` |
| `health-ai/` | Python AI Agent (FastAPI) | `health-ai/CLAUDE.md`, `health-ai/docs/` |
| `shared/` | TS 공유 타입 | `shared/types.ts` |

## shared/ 사용 규칙

`health-backend`, `health-web`, `health-mobile`은 모두 Node.js 기반이므로 아래 규칙을 따른다.

- 인터페이스·타입·DTO는 `shared/types.ts`에 정의하고 각 패키지에서 import한다.
- 공통 유틸 함수(날짜 변환, 유효성 검사 등)는 `shared/` 아래에 생성한다.
- `health-ai`(Python)는 `shared/`를 참조하지 않는다.
- 새 공유 코드를 추가하기 전에 `shared/`에 이미 같은 역할의 코드가 있는지 확인한다.

## 화면 작업 규칙

모든 화면 생성·수정 시:
1. `docs/SCREEN_DESIGN.md` 먼저 확인
2. 색상·간격·폰트·버튼·카드·입력폼은 `docs/DESIGN-apple.md` 정의를 우선 적용
