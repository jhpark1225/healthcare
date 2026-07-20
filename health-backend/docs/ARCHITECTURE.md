# health-backend 아키텍처

NestJS 기반 헬스케어 백엔드 서버의 내부 구조, 모듈 구성, 데이터 흐름을 정의한다.

---

## 1. 기술 스택

| 항목 | 기술 |
|---|---|
| 런타임 | Node.js |
| 프레임워크 | NestJS |
| DB | PostgreSQL |
| ORM | TypeORM |
| 인증 | JWT (jsonwebtoken / @nestjs/jwt) |
| 실시간 통신 (수신) | Socket.IO-client (시뮬레이터 서버 연결) |
| 실시간 통신 (제공) | Socket.IO Gateway (@nestjs/websockets) |
| 로깅 | Winston + nest-winston |
| 알림 | Slack Incoming Webhook |
| 설정 관리 | @nestjs/config (.env) |

---

## 2. 환경변수 (.env)

```dotenv
# 서버
PORT=3000

# DB
DB_HOST=211.253.27.76
DB_PORT=5432
DB_NAME=db15
DB_USER=user15
DB_PASS=user1599!

# JWT
JWT_SECRET=healthcare_jwt_secret_key
JWT_EXPIRES_IN=1d

# 시뮬레이터 서버
SIM_URL=wss://healthsim.iranglab.com/simulator

# AI Agent API
AI_AGENT_URL=http://localhost:8000

# Slack
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/xxx/yyy/zzz
```

---

## 3. 모듈 구성

```
src/
├── main.ts                        # 앱 진입점 (Winston 로거 등록)
├── app.module.ts                  # 루트 모듈
│
├── auth/                          # 인증 모듈
│   ├── auth.module.ts
│   ├── auth.controller.ts         # POST /auth/login
│   ├── auth.service.ts            # 로그인, JWT 발급
│   ├── jwt.strategy.ts            # Passport JWT 전략
│   └── jwt-auth.guard.ts          # JwtAuthGuard
│
├── members/                       # 회원 모듈
│   ├── members.module.ts
│   ├── members.controller.ts      # GET /members, GET /members/:id
│   ├── members.service.ts
│   └── entities/
│       ├── member.entity.ts
│       ├── disease-code.entity.ts
│       └── member-disease.entity.ts
│
├── health/                        # 건강데이터 모듈
│   ├── health.module.ts
│   ├── health.gateway.ts          # WebSocket Gateway — 프론트에 실시간 push
│   ├── entities/
│   │   ├── member-heart-rate.entity.ts
│   │   ├── member-blood-pressure.entity.ts
│   │   ├── member-weight.entity.ts
│   │   ├── member-glucose.entity.ts
│   │   └── member-step.entity.ts
│   └── health.service.ts          # 최근 데이터 조회, 오래된 데이터 삭제
│
├── simulator/                     # 시뮬레이터 연동 모듈
│   ├── simulator.module.ts
│   ├── simulator.service.ts       # Socket.IO-client — 시뮬레이터 WebSocket 연결/수신
│   └── simulator-event.handler.ts # 이벤트별 파싱 → DB 저장 → 이상 감지 → push
│
├── chat/                          # AI Agent 프록시 모듈
│   ├── chat.module.ts
│   ├── chat.controller.ts         # POST /chat
│   └── chat.service.ts            # AI Agent API HTTP 호출
│
├── alert/                         # Slack 알림 모듈
│   ├── alert.module.ts
│   └── alert.service.ts           # Slack Incoming Webhook 전송
│
└── common/                        # 공통
    ├── logger/
    │   └── logger.module.ts       # Winston 설정 (날짜별 파일, 7일 자동 삭제)
    ├── guards/
    │   └── roles.guard.ts         # 권한 검사 (PATI / DOCT)
    └── decorators/
        └── roles.decorator.ts
```

> 인터페이스·타입·공통 유틸은 상위 `shared/` 폴더에 정의하고 import해서 사용한다.

---

## 4. 로깅 (Winston)

```
logs/
├── 2026-07-16.log    ← 오늘
├── 2026-07-15.log
└── ...               ← 7일 경과 파일은 자동 삭제
```

| 설정 항목 | 값 |
|---|---|
| 로그 경로 | `./logs` |
| 파일 패턴 | `YYYY-MM-DD.log` |
| 보존 기간 | 7일 (maxDays: 7) |
| 라이브러리 | `winston-daily-rotate-file` |
| 레벨 | production: `warn` / 그 외: `debug` |

---

## 5. 인증 — Auth 모듈

### 5.1 로그인 API

```
POST /auth/login
Content-Type: application/json

{ "member_id": "user001", "password": "pass" }
```

- `members` 테이블에서 `member_id` 조회 후 bcrypt 비교
- 성공 시 JWT 발급

**JWT Payload**

```json
{
  "userid": "user001",
  "name": "홍길동",
  "api_key": "key_xxxx"
}
```

**응답**

```json
{
  "access_token": "<JWT>",
  "member_type": "DOCT"
}
```

---

## 6. 회원 — Members 모듈

### 6.1 회원 목록 조회

```
GET /members
Authorization: Bearer <JWT>
```

- `DOCT`: 전체 환자 목록 반환
- `PATI`: 자신의 정보만 반환

### 6.2 회원 상세 조회

```
GET /members/:memberId
Authorization: Bearer <JWT>
```

- 기본 정보 + 질병 목록 반환
- 건강 데이터(심박/혈압/체중/혈당/걸음수) **최근 N건**을 DB에서 읽어 초기 응답에 포함
- 이후 실시간 데이터는 **WebSocket Gateway**(`health.gateway.ts`)를 통해 프론트로 push

---

## 7. 건강데이터 — Simulator 모듈

### 7.1 시뮬레이터 연결 방식

```
시뮬레이터 서버 (healthsim.iranglab.com)
    │  WebSocket / Socket.IO
    ▼
SimulatorService (Socket.IO-client)
    │  이벤트 수신
    ▼
SimulatorEventHandler
    ├── DB 저장 (TypeORM)
    ├── 이상 감지 → AlertService → Slack
    └── HealthGateway → 프론트 WebSocket push
```

- `members` 테이블의 전체 회원(`member_id`, `api_key`)을 조회해 회원별로 소켓 연결
- 앱 부트 시(`OnModuleInit`) 자동 연결 시작
- 연결 실패/`error` 이벤트 수신 시 재연결 로직(지수 백오프) 적용

### 7.2 수신 이벤트 → DB 매핑

| Socket.IO 이벤트 | 저장 테이블 |
|---|---|
| `heartRate` | `member_heart_rates` |
| `bloodPressure` | `member_blood_pressures` |
| `weight` | `member_weights` |
| `glucose` | `member_glucose` |
| `stepCount` | `member_steps` |
| `sleep` | (저장 없음 — 현재 요구사항 외) |
| `userProfile` | (참조용 로그만) |

### 7.3 오래된 데이터 자동 삭제

- `@Cron` (NestJS Schedule) 매일 00:00 KST 실행
- 건강 데이터 5개 테이블에서 `measured_at < NOW() - INTERVAL '7 days'` 행 삭제

---

## 8. 이상 감지 및 Slack 알림 — Alert 모듈

이벤트 수신 시 아래 기준으로 이상 여부를 판단한다.

| 항목 | 이상 조건 |
|---|---|
| 심박수 | `source === "abnormal_event"` 또는 `heartRate ≥ 100 bpm` |
| 혈당 | `status === "elevated"` (110~139) 또는 `status === "high"` (140↑) |
| 혈압 | `systolic ≥ 140` 또는 `diastolic ≥ 90` |

이상 감지 시 `AlertService.sendSlack()`으로 Slack Incoming Webhook에 메시지 전송.

**Slack 메시지 예시**

```
[이상 감지] user_003 박지훈
항목: 심박수 | 값: 130 bpm
시각: 2026-07-16T14:32:00+09:00
```

---

## 9. 채팅 프록시 — Chat 모듈

```
POST /chat
Authorization: Bearer <JWT>
{ "message": "최근 혈당이 높은데 조언해줘" }
```

- `ChatService`가 AI Agent API(`AI_AGENT_URL`)로 HTTP 요청을 전달(프록시)
- AI Agent 응답을 그대로 클라이언트에 반환
- 스트리밍 응답이 필요한 경우 `res.pipe()`로 패스스루 처리

---

## 10. WebSocket Gateway — 프론트 실시간 push

`HealthGateway`는 프론트(웹/앱)와의 WebSocket 연결을 담당한다.

```
프론트 클라이언트
    │  WS 연결: /health-ws
    ▼
HealthGateway (NestJS @WebSocketGateway)
    ←── SimulatorEventHandler에서 emit 호출
```

- 클라이언트가 특정 `memberId`를 구독하면 해당 회원 데이터만 수신
- 이벤트명: `heartRate` / `bloodPressure` / `weight` / `glucose` / `stepCount`

---

## 11. 데이터 흐름 요약

```
[시뮬레이터 서버]
    │ WebSocket (회원별 소켓)
    ▼
[SimulatorService]
    │ 이벤트 파싱
    ▼
[SimulatorEventHandler]
    ├─► [TypeORM] → PostgreSQL 저장
    ├─► [AlertService] → Slack 알림 (이상 감지 시)
    └─► [HealthGateway] → 프론트 WebSocket push

[REST API]
    POST /auth/login          → JWT 발급
    GET  /members             → 회원 목록
    GET  /members/:id         → 회원 상세 + 최근 건강 데이터 (DB)
    POST /chat                → AI Agent API 프록시
```

---

## 12. 권한 매트릭스

| 엔드포인트 | PATI | DOCT |
|---|---|---|
| POST /auth/login | O | O |
| GET /members | 본인만 | 전체 |
| GET /members/:id | 본인만 | 전체 |
| POST /chat | O | O |
| WS /health-ws | 본인 채널만 | 전체 채널 |

---

## 13. 참조 문서

| 문서 | 위치 |
|---|---|
| 전체 시스템 아키텍처 | `docs/ARCHITECTURE.md` |
| 데이터 모델 / ERD | `docs/DATA_MODEL.md` |
| 시뮬레이터 WebSocket 스펙 (외부) | `health-backend/docs/API_SPEC_EXTERNAL.md` |
| 백엔드 제공 REST/WS 스펙 (내부) | `health-backend/docs/API_SPEC_INTERNAL.md` |
| 공유 타입 | `shared/types.ts` |
