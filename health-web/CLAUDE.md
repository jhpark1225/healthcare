# health-web — Claude 작업 규칙

React + Vite 기반 웹 프론트엔드 패키지. 이 파일의 규칙은 루트 `CLAUDE.md`에 추가로 적용된다.

---

## 문서 지도 — 작업 전 반드시 해당 문서를 먼저 읽는다

| 작업 | 읽어야 할 문서 |
|---|---|
| 기술 스택·폴더 구조·데이터 흐름 확인 | `health-web/docs/ARCHITECTURE.md` |
| 구현할 작업 목록 확인 | `health-web/docs/TASKS.md` |
| 화면 레이아웃·컴포넌트 명세 | `docs/SCREEN_DESIGN.md` (루트) |
| 색상·폰트·간격·컴포넌트 스타일 | `docs/DESIGN-apple.md` (루트) |
| REST API·WebSocket 명세 | `health-backend/docs/API_SPEC.md` |

---

## 기술 스택

- **프레임워크**: React 19 + Vite 8
- **언어**: TypeScript
- **패키지 매니저**: npm
- **라우팅**: react-router-dom v7
- **HTTP**: axios
- **실시간**: socket.io-client
- **인증**: JWT + 쿠키(js-cookie)

---

## 화면 작업 규칙

1. 컴포넌트 생성·수정 전 `docs/SCREEN_DESIGN.md` 확인
2. 색상·간격·폰트·버튼·카드·입력폼은 `docs/DESIGN-apple.md` 토큰 우선 적용
3. 스타일은 `src/styles/global.css`에 정의된 CSS 변수를 사용하고 값을 직접 하드코딩하지 않는다

---

## API 연동 규칙

- 모든 HTTP 요청은 `health-backend/docs/API_SPEC.md` 명세 기준으로 작성
- 실시간 데이터는 WebSocket(`/health-ws`) 사용, 초기 데이터는 REST `GET /members/:id/health/latest` 먼저 호출
- API base URL은 환경변수 `VITE_API_URL`로 관리하고 코드에 직접 하드코딩 금지

---

## 폴더 구조 규칙

- 신규 파일 생성 전 `health-web/docs/ARCHITECTURE.md` 의 폴더 구조 확인
- 컴포넌트는 기능 단위 폴더로 분리 (예: `src/features/dashboard/`)
- 공통 컴포넌트는 `src/components/`
- API 호출 함수는 `src/api/`

---

## 코드 규칙

- 공유 타입·인터페이스는 `shared/types.ts`(루트)에서 import — `@shared/types`로 단축
- 공유 유틸 함수는 `shared/utils.ts`(루트)에서 import — `@shared/utils`로 단축
- 컴포넌트 파일명은 PascalCase (예: `MemberCard.tsx`)
- 유틸 함수·훅 파일명은 camelCase (예: `useHealthData.ts`)
- 환경변수는 `VITE_` 접두사 필수 (Vite 클라이언트 번들 노출 규칙)
- 타입 전용 import는 `import type { ... }` 형식 사용 (`verbatimModuleSyntax`)

---

## 인증 규칙

- 로그인 후 access_token / refresh_token / member 정보를 **쿠키(js-cookie)** 에 저장
- `src/api/axiosInstance.ts`의 요청 인터셉터가 Authorization 헤더를 자동 첨부
- 401 응답 시 응답 인터셉터가 자동으로 토큰 재발급 후 원 요청 재시도
