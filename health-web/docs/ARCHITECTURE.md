# health-web 아키텍처

React + Vite 기반 의사(관리자) 전용 웹 대시보드의 기술 스택, 폴더 구조, 데이터 흐름을 정의한다.

---

## 1. 기술 스택

| 분류 | 라이브러리 / 도구 | 용도 |
|---|---|---|
| 프레임워크 | React 19 + TypeScript | UI 렌더링 |
| 빌드 | Vite | 번들링 및 개발 서버 |
| 라우팅 | react-router-dom v6 | 페이지 전환 |
| HTTP | axios | REST API 요청 |
| 실시간 | socket.io-client | WebSocket 구독 |
| 스타일 | CSS Modules | 컴포넌트 스코프 스타일 |
| 디자인 토큰 | `docs/DESIGN.md` → `docs/DESIGN-apple.md` | 색상·폰트·간격 |
| 공유 타입 | `shared/types.ts` | 인터페이스·DTO |
| 공유 유틸 | `shared/utils.ts` | 날짜 변환 등 순수 함수 |

> **스타일 규칙**: CSS Modules에서 임의의 값을 새로 정의하지 않는다.
> 색상·폰트·간격·반경·그림자는 반드시 `docs/DESIGN-apple.md` 토큰을 사용한다.

> **타입·유틸 규칙**: 인터페이스, DTO, 순수 로직을 `src/` 안에 재정의하지 않는다.
> `shared/types.ts` / `shared/utils.ts`를 import하고, 부족한 경우 해당 파일을 업데이트한다.

---

## 2. 폴더 구조

```
health-web/
├── public/
│   └── favicon.svg
│
├── src/
│   ├── api/                    # axios 요청 함수 (엔드포인트별 모듈)
│   │   ├── auth.ts             # 로그인 / 토큰 재발급
│   │   ├── members.ts          # 회원 목록 / 상세 / 건강 데이터
│   │   └── chat.ts             # 채팅 (AI Agent 프록시)
│   │
│   ├── components/             # 재사용 공통 컴포넌트
│   │   ├── Button/
│   │   ├── Card/
│   │   └── ...
│   │
│   ├── features/               # 화면 단위 기능 모듈
│   │   ├── auth/               # 로그인 화면
│   │   │   ├── LoginPage.tsx
│   │   │   └── LoginPage.module.css
│   │   ├── members/            # 회원 목록 화면
│   │   │   ├── MemberListPage.tsx
│   │   │   └── ...
│   │   ├── detail/             # 회원 상세 + 실시간 모니터링
│   │   │   ├── MemberDetailPage.tsx
│   │   │   └── ...
│   │   └── chat/               # 챗봇 화면
│   │       ├── ChatPage.tsx
│   │       └── ...
│   │
│   ├── hooks/                  # 커스텀 훅
│   │   ├── useAuth.ts          # JWT 인증 상태 관리
│   │   └── useHealthSocket.ts  # WebSocket 구독 훅 (§5.3)
│   │
│   ├── router/
│   │   └── index.tsx           # react-router-dom 라우트 정의
│   │
│   ├── services/
│   │   └── socket.ts           # socket.io-client 인스턴스 및 연결 관리
│   │
│   ├── styles/
│   │   └── global.css          # CSS 변수(디자인 토큰) + 리셋
│   │
│   ├── App.tsx
│   └── main.tsx
│
├── .env.development            # 개발 환경 변수
├── .env.production             # 운영 환경 변수
├── vite.config.ts
├── tsconfig.json
└── package.json
```

---

## 3. 환경 변수 (.env)

### 3.1 파일 분리 규칙

- `VITE_` 접두사 필수 (Vite 클라이언트 번들 노출 조건)
- 코드에 URL·포트를 직접 하드코딩하지 않는다
- `.env` 파일은 `.gitignore`에 포함되어 있으며 커밋하지 않는다

### 3.2 개발 환경 (`.env.development`)

```dotenv
# 웹 서버 포트
VITE_PORT=5173

# 백엔드 REST API
VITE_API_URL=http://127.0.0.1:3000

# 백엔드 WebSocket
VITE_WS_URL=ws://127.0.0.1:3000
```

### 3.3 운영 환경 (`.env.production`)

```dotenv
# 웹 서버 포트 (학생별 할당 포트로 업데이트 필요)
VITE_PORT=5173

# 백엔드 REST API (컨테이너 내부 통신)
VITE_API_URL=http://172.27.0.192:3000

# 백엔드 WebSocket
VITE_WS_URL=ws://172.27.0.192:3000
```

> 백엔드는 **같은 서버에 컨테이너로 배포**된다.
> 개발 환경은 `127.0.0.1`, 운영 환경은 `172.27.0.192`(컨테이너 내부 IP)를 사용한다.
> 포트는 `health-backend/.env`의 `PORT` 값과 일치시킨다.

---

## 4. CORS 허용 도메인

백엔드 NestJS의 CORS 설정에 아래 오리진이 등록되어 있어야 한다.
웹 배포 도메인이 변경되면 `health-backend/src/main.ts`의 `enableCors` 설정도 함께 업데이트한다.

| 환경 | 오리진 |
|---|---|
| 개발 | `http://localhost:5173` |
| 운영 | `https://fe015.ys.iranglab.com` |

---

## 5. 데이터 흐름

### 5.1 인증 흐름 (JWT + Cookies)

```
[LoginPage]
    │
    ├── POST /auth/login  →  { access_token, refresh_token, member }
    │
    ├── access_token  →  메모리(React 상태 또는 Context) 저장
    │                    Authorization: Bearer 헤더로 매 요청에 첨부
    │
    └── refresh_token →  HttpOnly Cookie 저장
                         (보안: JS에서 직접 접근 불가)

[axios 인터셉터]
    요청: Authorization 헤더 자동 첨부
    응답 401: POST /auth/refresh (refresh_token → Cookie 자동 첨부)
            → 새 access_token 발급 → 원 요청 재시도
            → refresh 실패 시 로그인 화면으로 리다이렉트
```

### 5.2 REST API 통신 (axios)

- `src/api/` 모듈은 axios 인스턴스를 공유하고 엔드포인트별로 함수를 export한다
- Base URL은 `import.meta.env.VITE_API_URL`에서 읽는다
- 인증 헤더 첨부 및 토큰 갱신은 axios 인터셉터에서 처리한다

```ts
// src/api/axiosInstance.ts (예시)
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,   // Cookie(refresh_token) 자동 첨부
});
```

### 5.3 실시간 건강 데이터 — REST 최초 로드 → WebSocket 구독 전환

> **이 패턴은 강제 적용된다. polling, setInterval 등 다른 방식을 사용하지 않는다.**

회원 상세(모니터링) 화면 진입 시 아래 2단계 순서를 반드시 준수한다.

```
┌─ STEP 1: REST 초기 로드 ─────────────────────────────────────┐
│                                                               │
│  GET /members/:memberId/health/latest?limit=100               │
│      └─ 심박수·혈압·혈당·걸음수·체중 최근 이력 수신           │
│      └─ 차트 초기 상태 렌더링                                 │
│                                                               │
└───────────────────────────────────────────────────────────────┘
                    │  완료 후 즉시
                    ▼
┌─ STEP 2: WebSocket 구독 전환 ────────────────────────────────┐
│                                                               │
│  io(VITE_WS_URL + '/health-ws', { auth: { token } })         │
│      └─ on connect: emit 'subscribe' { memberId }            │
│                                                               │
│  수신 이벤트 → 차트에 신규 데이터 prepend (unshift)           │
│    heartRate    (4초)                                         │
│    bloodPressure (2시간)                                      │
│    glucose      (1시간)                                       │
│    stepCount    (4.5초)                                       │
│    weight       (하루 3회)                                    │
│    alert        (이상 감지 시 즉시)                            │
│                                                               │
│  화면 이탈(cleanup):                                          │
│    emit 'unsubscribe' { memberId }                            │
│    socket.disconnect()                                        │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

**구현 위치**: `src/hooks/useHealthSocket.ts`

```ts
// useHealthSocket.ts 뼈대 (구현 시 참고)
export function useHealthSocket(memberId: string) {
  // 1. REST 최초 로드
  useEffect(() => {
    api.get(`/members/${memberId}/health/latest`).then(setInitialData);
  }, [memberId]);

  // 2. WebSocket 구독
  useEffect(() => {
    const socket = io(import.meta.env.VITE_WS_URL + '/health-ws', {
      auth: { token: accessToken },
    });
    socket.on('connect', () => socket.emit('subscribe', { memberId }));
    socket.on('heartRate',     (d) => prependData('heartRates', d));
    socket.on('bloodPressure', (d) => prependData('bloodPressures', d));
    socket.on('glucose',       (d) => prependData('glucoses', d));
    socket.on('stepCount',     (d) => prependData('steps', d));
    socket.on('weight',        (d) => prependData('weights', d));
    socket.on('alert',         (d) => showAlert(d));
    return () => {
      socket.emit('unsubscribe', { memberId });
      socket.disconnect();
    };
  }, [memberId]);
}
```

---

## 6. 라우트 구조

```
/                   → 로그인 화면 (미인증 시 리다이렉트)
/members            → 회원 목록
/members/:memberId  → 회원 상세 + 실시간 모니터링
/chat               → AI 챗봇
```

---

## 7. 참조 문서

| 문서 | 경로 |
|---|---|
| 화면 레이아웃·컴포넌트 명세 | `docs/SCREEN_DESIGN.md` |
| 디자인 토큰 (색상·폰트·간격) | `docs/DESIGN-apple.md` |
| 전체 시스템 아키텍처 | `docs/ARCHITECTURE.md` |
| REST API·WebSocket 명세 | `health-backend/docs/API_SPEC.md` |
| 공유 타입·인터페이스 | `shared/types.ts` |
| 공유 유틸 함수 | `shared/utils.ts` |
| 작업 목록 | `health-web/docs/TASKS.md` |
