# health-backend API 명세서

> health-backend(NestJS)가 **제공**하는 REST API 및 WebSocket Gateway 스펙과  
> **연동**하는 외부 시뮬레이터 WebSocket 스펙을 통합 정의한다.

---

## 목차

1. [전체 데이터 흐름](#1-전체-데이터-흐름)
2. [공통 규칙](#2-공통-규칙)
3. [REST API](#3-rest-api)
   - 3.1 로그인
   - 3.2 AccessToken 재발급
   - 3.3 회원 목록 조회
   - 3.4 회원 상세 조회
   - 3.5 회원 최근 건강 데이터 조회 ← 실시간 화면 초기 로딩용
   - 3.6 회원 건강 데이터 기간 조회
   - 3.7 채팅 (AI Agent 프록시)
   - 3.8 Slack 웹훅 메시지 전송
4. [WebSocket Gateway — 클라이언트 실시간 수신](#4-websocket-gateway--클라이언트-실시간-수신)
5. [시뮬레이터 WebSocket — 백엔드 수신 전용](#5-시뮬레이터-websocket--백엔드-수신-전용)

---

## 1. 전체 데이터 흐름

### 핵심 원칙

> **클라이언트(웹/앱)는 시뮬레이터 서버에 직접 접근하지 않는다.**  
> 모든 데이터는 반드시 백엔드를 경유한다.

```
┌─────────────────────────────────────────────────────────────┐
│                    외부 (클라이언트 접근 불가)                │
│                                                             │
│   [시뮬레이터 서버]                                          │
│   healthsim.iranglab.com                                    │
│         │  WebSocket (회원별 소켓)                           │
│         │  • heartRate  4초                                 │
│         │  • stepCount  4.5초                               │
│         │  • bloodPressure  2시간                           │
│         │  • glucose  1시간                                 │
│         ▼                                                   │
└─────────────────────────────────────────────────────────────┘
          │
          ▼
┌──────────────────────────────────────────────────────────────┐
│               [NestJS 백엔드]  ← 클라이언트의 유일한 창구       │
│                                                              │
│  SimulatorService                                            │
│    └─ 이벤트 수신                                            │
│         ├─① DB 저장 (PostgreSQL)                             │
│         ├─② 이상 감지 → Slack 알림                           │
│         └─③ HealthGateway → 구독 중인 클라이언트에 Push       │
│                                                              │
│  REST API          WebSocket Gateway (/health-ws)            │
│  ─────────         ──────────────────────────────           │
│  로그인/토큰        구독(subscribe) 이벤트 수신                │
│  회원 목록/상세     heartRate / bloodPressure / glucose push  │
│  건강 데이터 조회   stepCount / weight / alert push           │
│  채팅 프록시                                                  │
│  Slack 전송                                                  │
└──────────────────────────────────────────────────────────────┘
          │                          │
          │ REST (HTTP)              │ WebSocket (Socket.IO)
          ▼                          ▼
┌────────────────────────────────────────┐
│        [클라이언트 — 웹 / 모바일]       │
└────────────────────────────────────────┘
```

### 실시간 건강 모니터링 화면 진입 시퀀스

클라이언트가 회원 건강 모니터링 화면에 진입할 때 아래 순서를 따른다.

```
클라이언트                                  백엔드
   │                                          │
   │──① GET /members/:id/health/latest ──────▶│
   │                                          │  DB에서 각 지표별
   │                                          │  최근 N건 조회
   │◀─────────────── 초기 데이터 응답 ─────────│
   │  (심박/혈압/혈당/걸음수/체중 최근 이력)    │
   │                                          │
   │  차트에 초기 데이터 렌더링                │
   │                                          │
   │──② WS connect /health-ws ───────────────▶│
   │──③ emit subscribe { memberId } ─────────▶│
   │                                          │
   │◀──── emit heartRate (4초 주기) ───────────│  시뮬레이터에서
   │◀──── emit glucose (1시간 주기) ───────────│  수신한 데이터를
   │◀──── emit bloodPressure (2시간) ──────────│  실시간 Push
   │◀──── emit stepCount (4.5초) ─────────────│
   │◀──── emit alert (이상 감지 시) ───────────│
   │                                          │
   │  화면 이탈 시                             │
   │──④ emit unsubscribe { memberId } ────────▶│
   │──⑤ WS disconnect ────────────────────────▶│
```

---

## 2. 공통 규칙

### Base URL

```
http://<서버호스트>:<PORT>
```

> 포트는 환경변수 `PORT` (기본값 `3000`)

### 인증

JWT 인증이 필요한 API는 아래 헤더를 포함한다.

```
Authorization: Bearer <access_token>
```

### Content-Type

```
application/json
```

### 시간 형식

모든 일시 필드는 **KST 기준 ISO 8601** 문자열을 사용한다.

```
2026-07-16T14:32:00+09:00
```

### 공통 에러 응답

| HTTP 코드 | 사유 |
|-----------|------|
| 400 | 요청 파라미터 오류 |
| 401 | 토큰 없음 / 만료 / 인증 실패 |
| 403 | 권한 없음 |
| 404 | 리소스 없음 |
| 500 | 서버 내부 오류 |

```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

---

## 3. REST API

---

### 3.1 로그인

```
POST /auth/login
```

인증 없음 (Public)

#### Request Body

| 필드 | 타입 | 필수 | 설명 |
|------|------|:----:|------|
| `id` | string | Y | 회원 ID |
| `passwd` | string | Y | 비밀번호 |

```json
{
  "id": "user001",
  "passwd": "pass1234"
}
```

#### Response 200

| 필드 | 타입 | 설명 |
|------|------|------|
| `access_token` | string | JWT AccessToken (단기) |
| `refresh_token` | string | JWT RefreshToken (장기) |
| `member` | object | 회원 정보 전체 |

**JWT AccessToken Payload**

```json
{
  "userid": "user001",
  "name": "홍길동",
  "api_key": "key_xxxx"
}
```

**응답 예시**

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "member": {
    "member_id": "user001",
    "name": "홍길동",
    "gender": "M",
    "birth_date": "19800101",
    "member_type": "PATI",
    "api_key": "key_xxxx",
    "created_at": "2026-01-01T09:00:00+09:00",
    "updated_at": "2026-07-01T10:00:00+09:00"
  }
}
```

#### Response 401

```json
{
  "statusCode": 401,
  "message": "아이디 또는 비밀번호가 올바르지 않습니다."
}
```

---

### 3.2 AccessToken 재발급

```
POST /auth/refresh
```

인증 없음 (RefreshToken으로 인증)

#### Request Body

| 필드 | 타입 | 필수 | 설명 |
|------|------|:----:|------|
| `refresh_token` | string | Y | 로그인 시 발급된 RefreshToken |

```json
{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### Response 200

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### Response 401

```json
{
  "statusCode": 401,
  "message": "RefreshToken이 만료되었습니다. 다시 로그인해주세요."
}
```

---

### 3.3 회원 목록 조회

```
GET /members
Authorization: Bearer <access_token>
```

#### Query Parameters

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|:----:|------|
| `member_id` | string | N | 회원 ID 검색 (부분 일치) |
| `member_type` | string | N | `PATI`(환자) / `DOCT`(의사) 필터 |
| `search` | string | N | 이름 또는 ID 통합 검색 |

#### 권한별 응답

| 호출자 | 반환 데이터 |
|--------|------------|
| `DOCT` | 전체 회원 목록 |
| `PATI` | 자기 자신 데이터만 |

#### Response 200

```json
[
  {
    "member_id": "user001",
    "name": "홍길동",
    "gender": "M",
    "birth_date": "19800101",
    "member_type": "PATI",
    "created_at": "2026-01-01T09:00:00+09:00"
  }
]
```

---

### 3.4 회원 상세 조회

```
GET /members/:memberId
Authorization: Bearer <access_token>
```

#### Path Parameters

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| `memberId` | string | 조회할 회원 ID |

#### 권한

- `DOCT`: 모든 회원 조회 가능
- `PATI`: 본인만 조회 가능 (타인 조회 시 403)

#### Response 200

기본 회원 정보 및 보유 질병 목록을 반환한다.  
건강 데이터(그래프용)는 **3.5 최근 건강 데이터 조회** API를 별도 호출한다.

```json
{
  "member_id": "user001",
  "name": "홍길동",
  "gender": "M",
  "birth_date": "19800101",
  "member_type": "PATI",
  "created_at": "2026-01-01T09:00:00+09:00",
  "updated_at": "2026-07-01T10:00:00+09:00",
  "diseases": [
    {
      "diagnosis_seq": 1,
      "disease_id": "HYP",
      "disease_name_kr": "고혈압",
      "disease_name_en": "Hypertension",
      "disease_category": "심혈관",
      "severity": "중등도",
      "diagnosis_content": "약물 치료 중",
      "diagnosed_at": "2026-01-10T09:00:00+09:00"
    }
  ]
}
```

---

### 3.5 회원 최근 건강 데이터 조회

> **실시간 모니터링 화면 초기 로딩 전용**  
> 클라이언트는 이 API로 DB의 최근 이력을 가져온 뒤 즉시 WebSocket을 연결하여 실시간 수신으로 전환한다.

```
GET /members/:memberId/health/latest
Authorization: Bearer <access_token>
```

#### Path Parameters

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| `memberId` | string | 조회할 회원 ID |

#### Query Parameters

| 파라미터 | 타입 | 필수 | 기본값 | 설명 |
|----------|------|:----:|--------|------|
| `limit` | number | N | `100` | 각 지표별 최근 N건 |

#### 권한

- `DOCT`: 모든 회원 조회 가능
- `PATI`: 본인만 조회 가능

#### 응답 구조 설명

각 지표 배열은 `measured_at` 기준 **최신순** 정렬 후 `limit`건을 반환한다.  
클라이언트는 이 데이터로 차트 초기 상태를 구성하고, WebSocket 연결 이후 수신되는 신규 데이터를 배열 앞에 추가(unshift)하는 방식으로 그래프를 업데이트한다.

#### Response 200

```json
{
  "member_id": "user001",
  "fetched_at": "2026-07-16T15:00:00+09:00",
  "heartRates": [
    {
      "seq": 520,
      "heart_rate": 78,
      "status": null,
      "note": null,
      "measured_at": "2026-07-16T14:59:56+09:00",
      "created_at": "2026-07-16T14:59:56+09:00"
    },
    {
      "seq": 519,
      "heart_rate": 76,
      "status": null,
      "note": null,
      "measured_at": "2026-07-16T14:59:52+09:00",
      "created_at": "2026-07-16T14:59:52+09:00"
    }
  ],
  "bloodPressures": [
    {
      "seq": 12,
      "systolic": 138,
      "diastolic": 88,
      "status": null,
      "note": null,
      "measured_at": "2026-07-16T14:00:00+09:00",
      "created_at": "2026-07-16T14:00:01+09:00"
    }
  ],
  "weights": [
    {
      "seq": 8,
      "weight_kg": 72.5,
      "bmi": 23.1,
      "skeletal_muscle_mass": 30.2,
      "body_fat_percentage": 18.5,
      "status": null,
      "note": null,
      "measured_at": "2026-07-16T12:00:00+09:00",
      "created_at": "2026-07-16T12:00:01+09:00"
    }
  ],
  "glucoses": [
    {
      "seq": 30,
      "glucose_value": 98.0,
      "status": "normal",
      "note": null,
      "measured_at": "2026-07-16T14:00:00+09:00",
      "created_at": "2026-07-16T14:00:01+09:00"
    }
  ],
  "steps": [
    {
      "seq": 480,
      "cumulative_steps": 4200,
      "measured_at": "2026-07-16T14:59:58+09:00",
      "created_at": "2026-07-16T14:59:58+09:00"
    }
  ]
}
```

> `fetched_at`은 서버가 DB를 조회한 시각이다.  
> 클라이언트는 이 시각 이후 WebSocket으로 수신되는 데이터를 그래프에 이어 붙인다.

---

### 3.6 회원 건강 데이터 기간 조회

과거 데이터 열람 및 통계 화면용.

```
GET /members/:memberId/health
Authorization: Bearer <access_token>
```

#### Path Parameters

| 파라미터 | 타입 | 설명 |
|----------|------|------|
| `memberId` | string | 조회할 회원 ID |

#### Query Parameters

| 파라미터 | 타입 | 필수 | 설명 |
|----------|------|:----:|------|
| `from` | string | Y | 시작 일시 (KST ISO 8601) |
| `to` | string | Y | 종료 일시 (KST ISO 8601) |

**예시**

```
GET /members/user001/health?from=2026-07-10T00:00:00+09:00&to=2026-07-16T23:59:59+09:00
```

#### 권한

- `DOCT`: 모든 회원 조회 가능
- `PATI`: 본인만 조회 가능

#### Response 200

```json
{
  "member_id": "user001",
  "from": "2026-07-10T00:00:00+09:00",
  "to": "2026-07-16T23:59:59+09:00",
  "heartRates": [
    {
      "seq": 1,
      "heart_rate": 78,
      "status": null,
      "note": null,
      "measured_at": "2026-07-16T14:00:00+09:00",
      "created_at": "2026-07-16T14:00:01+09:00"
    }
  ],
  "bloodPressures": [
    {
      "seq": 1,
      "systolic": 138,
      "diastolic": 88,
      "status": null,
      "note": null,
      "measured_at": "2026-07-16T12:00:00+09:00",
      "created_at": "2026-07-16T12:00:01+09:00"
    }
  ],
  "weights": [
    {
      "seq": 1,
      "weight_kg": 72.5,
      "bmi": 23.1,
      "skeletal_muscle_mass": 30.2,
      "body_fat_percentage": 18.5,
      "status": null,
      "note": null,
      "measured_at": "2026-07-16T08:00:00+09:00",
      "created_at": "2026-07-16T08:00:01+09:00"
    }
  ],
  "glucoses": [
    {
      "seq": 1,
      "glucose_value": 98.0,
      "status": "normal",
      "note": null,
      "measured_at": "2026-07-16T13:00:00+09:00",
      "created_at": "2026-07-16T13:00:01+09:00"
    }
  ],
  "steps": [
    {
      "seq": 1,
      "cumulative_steps": 4200,
      "measured_at": "2026-07-16T14:00:00+09:00",
      "created_at": "2026-07-16T14:00:01+09:00"
    }
  ]
}
```

---

### 3.7 채팅 (AI Agent 프록시)

```
POST /chat
Authorization: Bearer <access_token>
```

#### Request Body

| 필드 | 타입 | 필수 | 설명 |
|------|------|:----:|------|
| `message` | string | Y | 사용자 질의 내용 |
| `member_id` | string | N | 맥락 제공용 회원 ID |

```json
{
  "message": "최근 혈당이 높은데 식이요법을 알려줘",
  "member_id": "user001"
}
```

#### Response 200

```json
{
  "reply": "혈당 관리를 위해 저탄수화물 식단을 권장합니다..."
}
```

> `AI_AGENT_URL` 환경변수에 설정된 AI Agent API를 호출하는 프록시 역할이다.

---

### 3.8 Slack 웹훅 메시지 전송

```
POST /webhook/slack
Authorization: Bearer <access_token>
```

> 이상 데이터 감지 시 백엔드 내부에서 자동 호출된다. 외부 직접 호출도 가능하다.

#### Request Body

| 필드 | 타입 | 필수 | 설명 |
|------|------|:----:|------|
| `message` | string | Y | 전송할 메시지 내용 |

```json
{
  "message": "[이상 감지] user001 홍길동 — 심박수 130bpm (2026-07-16T14:32:00+09:00)"
}
```

#### Response 200

| 필드 | 타입 | 설명 |
|------|------|------|
| `success` | boolean | 전송 완료 여부 |
| `sent_at` | string | 전송 시각 (KST ISO 8601) |

```json
{
  "success": true,
  "sent_at": "2026-07-16T14:32:01+09:00"
}
```

#### Response 500

```json
{
  "success": false,
  "statusCode": 500,
  "message": "Slack 메시지 전송 실패"
}
```

---

## 4. WebSocket Gateway — 클라이언트 실시간 수신

백엔드가 시뮬레이터로부터 수신한 건강 데이터를 구독 중인 클라이언트에 **즉시 Push**한다.

> 클라이언트는 시뮬레이터 서버에 직접 접근하지 않는다.  
> 이 Gateway가 클라이언트의 유일한 실시간 데이터 수신 창구이다.

### 연결 정보

| 항목 | 값 |
|------|-----|
| 엔드포인트 | `ws://<서버호스트>:<PORT>/health-ws` |
| 프로토콜 | Socket.IO |

### 연결 및 인증

```js
const socket = io('http://<host>/health-ws', {
  transports: ['websocket'],
  auth: { token: '<access_token>' },
});

socket.on('connect', () => {
  // ① REST로 초기 데이터 로드 완료 후
  // ② 구독 시작
  socket.emit('subscribe', { memberId: 'user001' });
});
```

### 클라이언트 → 서버 이벤트

#### `subscribe`

특정 회원 채널 구독을 시작한다.

| 필드 | 타입 | 설명 |
|------|------|------|
| `memberId` | string | 구독할 회원 ID |

```json
{ "memberId": "user001" }
```

> `PATI` 권한은 본인 `memberId`만 구독 가능. 타인 구독 요청은 무시된다.

#### `unsubscribe`

구독을 해제한다. 화면 이탈 시 반드시 호출한다.

```json
{ "memberId": "user001" }
```

---

### 서버 → 클라이언트 이벤트

시뮬레이터로부터 데이터 수신 즉시 해당 `memberId`를 구독 중인 클라이언트에 전송된다.

#### `heartRate` (4초 주기)

| 필드 | 타입 | 설명 |
|------|------|------|
| `memberId` | string | 회원 ID |
| `heartRate` | number | 심박수 (bpm) |
| `source` | `"simulation"` \| `"abnormal_event"` | 정상 / 이상 이벤트 구분 |
| `note` | string? | 이상 이벤트 시 메모 |
| `measuredAt` | string | 측정 일시 (KST ISO 8601) |

```json
{
  "memberId": "user001",
  "heartRate": 128,
  "source": "abnormal_event",
  "note": "Possible tachycardia detected.",
  "measuredAt": "2026-07-16T14:32:00+09:00"
}
```

#### `bloodPressure` (2시간 주기)

| 필드 | 타입 | 설명 |
|------|------|------|
| `memberId` | string | 회원 ID |
| `systolic` | number | 수축기 혈압 (mmHg) |
| `diastolic` | number | 이완기 혈압 (mmHg) |
| `measuredAt` | string | 측정 일시 |

#### `glucose` (1시간 주기)

| 필드 | 타입 | 설명 |
|------|------|------|
| `memberId` | string | 회원 ID |
| `glucoseValue` | number | 혈당 (mg/dL) |
| `status` | `"normal"` \| `"elevated"` \| `"high"` | 혈당 상태 |
| `measuredAt` | string | 측정 일시 |

#### `stepCount` (4.5초 주기)

| 필드 | 타입 | 설명 |
|------|------|------|
| `memberId` | string | 회원 ID |
| `cumulativeSteps` | number | 당일 누적 걸음수 |
| `measuredAt` | string | 측정 일시 |

#### `weight` (매일 08 / 12 / 18시)

| 필드 | 타입 | 설명 |
|------|------|------|
| `memberId` | string | 회원 ID |
| `weightKg` | number | 체중 (kg) |
| `bmi` | number | BMI |
| `skeletalMuscleMassKg` | number | 골격근량 (kg) |
| `bodyFatPercentage` | number | 체지방률 (%) |
| `measuredAt` | string | 측정 일시 |

#### `alert` (이상 감지 시 즉시)

이상 데이터 수신 시 구독 중인 클라이언트와 함께 Slack으로도 자동 전송된다.

| 필드 | 타입 | 설명 |
|------|------|------|
| `memberId` | string | 회원 ID |
| `memberName` | string | 회원 이름 |
| `type` | `"heartRate"` \| `"bloodPressure"` \| `"glucose"` | 이상 항목 |
| `value` | object | 이상 수치 (항목별 상이) |
| `measuredAt` | string | 측정 일시 |

```json
{
  "memberId": "user001",
  "memberName": "홍길동",
  "type": "heartRate",
  "value": { "heartRate": 128, "source": "abnormal_event" },
  "measuredAt": "2026-07-16T14:32:00+09:00"
}
```

---

## 5. 시뮬레이터 WebSocket — 백엔드 수신 전용

> **출처**: `docs/Health_interface.pdf`  
> 백엔드 내부에서만 사용하는 외부 시뮬레이터 연결 스펙이다.  
> **클라이언트는 이 인터페이스에 접근할 수 없으며 접근해서도 안 된다.**

### 연결 정보

| 항목 | 내용 |
|------|------|
| 서버 URL | `wss://healthsim.iranglab.com` |
| 네임스페이스 | `/simulator` |
| 프로토콜 | WebSocket (Socket.IO) |
| 시간 기준 | KST (UTC+9) |

### 인증 (Handshake 쿼리 파라미터)

| 파라미터 | 설명 |
|----------|------|
| `userId` | 회원 ID (`members.member_id`) |
| `apiKey` | 해당 회원의 API Key (`members.api_key`) |

```
wss://healthsim.iranglab.com/simulator?userId=user_001&apiKey=key_001
```

> 앱 부트 시 `members` 테이블 전체 회원을 조회하여 회원별로 각각 소켓을 연결한다.

### 수신 이벤트 처리 흐름

```
시뮬레이터 이벤트 수신
    │
    ├─① PostgreSQL DB 저장
    ├─② 이상 수치 판단
    │       ├─ 이상 → AlertService → Slack Webhook 전송
    │       └─ HealthGateway → alert 이벤트 클라이언트 Push
    └─③ HealthGateway → 해당 이벤트 클라이언트 Push
```

### 수신 이벤트 → DB 저장 매핑

| 이벤트 | 주기 | 저장 테이블 | 이상 감지 |
|--------|------|------------|:---------:|
| `heartRate` | 4초 | `member_heart_rates` | O |
| `stepCount` | 4.5초 | `member_steps` | - |
| `bloodPressure` | 2시간 | `member_blood_pressures` | O |
| `glucose` | 1시간 | `member_glucose` | O |
| `weight` | 하루 3회 | `member_weights` | - |
| `sleep` | 하루 1회 | 저장 없음 (로그만) | - |
| `userProfile` | 최초 1회 | 저장 없음 (로그만) | - |

### 이상 수치 판단 기준

| 항목 | 이상 조건 |
|------|-----------|
| 심박수 | `source === "abnormal_event"` 또는 `heartRate ≥ 100 bpm` |
| 혈당 | `status === "elevated"` (110~139 mg/dL) 또는 `status === "high"` (140↑) |
| 혈압 | `systolic ≥ 140 mmHg` 또는 `diastolic ≥ 90 mmHg` |

### 주요 이벤트 페이로드

#### `heartRate`

```json
{
  "event": "heartRate",
  "data": {
    "timestamp": "2026-07-16T14:32:00+09:00",
    "userId": "user_001",
    "heartRate": 128,
    "source": "abnormal_event",
    "note": "Possible tachycardia detected."
  }
}
```

#### `bloodPressure`

```json
{
  "event": "bloodPressure",
  "data": {
    "timestamp": "2026-07-16T12:00:00+09:00",
    "userId": "user_001",
    "systolic": 145,
    "diastolic": 92,
    "source": "simulation"
  }
}
```

#### `glucose`

```json
{
  "event": "glucose",
  "data": {
    "timestamp": "2026-07-16T13:00:00+09:00",
    "userId": "user_001",
    "glucoseMgDl": 145,
    "status": "high",
    "source": "simulation"
  }
}
```

#### `stepCount`

```json
{
  "event": "stepCount",
  "data": {
    "timestamp": "2026-07-16T14:00:00+09:00",
    "userId": "user_001",
    "stepCount": 4200,
    "dailyReset": false
  }
}
```

#### `weight`

```json
{
  "event": "weight",
  "data": {
    "timestamp": "2026-07-16T08:00:00+09:00",
    "userId": "user_001",
    "weightKg": 72.5,
    "bmi": 23.1,
    "skeletalMuscleMassKg": 30.2,
    "bodyFatPercentage": 18.5,
    "source": "simulation"
  }
}
```

#### `error` (인증 실패)

```json
{
  "event": "error",
  "data": {
    "code": "AUTH_FAILED",
    "message": "Invalid userId or apiKey."
  }
}
```

> 수신 즉시 서버가 소켓을 강제 종료한다. 재접속 시 지수 백오프 적용.

---

## 6. 참조 문서

| 문서 | 위치 |
|------|------|
| 백엔드 내부 아키텍처 | `health-backend/docs/ARCHITECTURE.md` |
| 시뮬레이터 전체 스펙 | `health-backend/docs/API_SPEC_EXTERNAL.md` |
| 데이터 모델 / ERD | `docs/DATA_MODEL.md` |
| 공유 타입 | `shared/types.ts` |
