# 내부 API 명세 (NestJS 백엔드 제공)

> 본 문서는 health-backend가 웹·모바일 클라이언트에 **제공**하는 REST API 및 WebSocket Gateway 스펙입니다.

---

## 공통 규칙

- Base URL: `http://<서버호스트>:<PORT>` (환경변수 `PORT`, 기본 3000)
- 모든 요청/응답 Content-Type: `application/json`
- 인증이 필요한 API는 HTTP 헤더에 JWT 토큰을 포함한다:
  ```
  Authorization: Bearer <access_token>
  ```
- 시간 필드는 KST 기준 ISO 8601 문자열로 반환한다.

---

## 공통 에러 응답

| HTTP 코드 | 사유 |
|-----------|------|
| 400 | 요청 파라미터 오류 |
| 401 | 인증 실패 / 토큰 없음 또는 만료 |
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

## 1. 인증 API

### 1.1 로그인

```
POST /auth/login
```

**Request Body**

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `member_id` | string | Y | 회원 ID |
| `password` | string | Y | 비밀번호 |

```json
{
  "member_id": "user001",
  "password": "pass1234"
}
```

**Response 200**

| 필드 | 타입 | 설명 |
|------|------|------|
| `access_token` | string | JWT 토큰 |
| `member_type` | string | `PATI`(환자) / `DOCT`(의사) |

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "member_type": "DOCT"
}
```

**JWT Payload**

```json
{
  "userid": "user001",
  "name": "홍길동",
  "api_key": "key_xxxx"
}
```

**Response 401** — 아이디 또는 비밀번호 불일치

---

## 2. 회원 API

> 모든 회원 API는 `Authorization` 헤더 필수.

### 2.1 회원 목록 조회

```
GET /members
```

| 쿼리 파라미터 | 타입 | 필수 | 설명 |
|---|---|---|---|
| `search` | string | N | 이름 또는 회원ID 검색 |

**권한**
- `DOCT`: 전체 환자(`PATI`) 목록 반환
- `PATI`: 자신의 정보만 반환

**Response 200**

```json
[
  {
    "member_id": "user001",
    "name": "홍길동",
    "gender": "M",
    "birth_date": "19800101",
    "member_type": "PATI"
  }
]
```

---

### 2.2 회원 상세 조회

```
GET /members/:memberId
```

**권한**
- `DOCT`: 모든 회원 조회 가능
- `PATI`: 본인만 조회 가능 (타인 조회 시 403)

**Response 200**

```json
{
  "member_id": "user001",
  "name": "홍길동",
  "gender": "M",
  "birth_date": "19800101",
  "member_type": "PATI",
  "diseases": [
    {
      "diagnosis_seq": 1,
      "disease_id": "HYP",
      "disease_name_kr": "고혈압",
      "disease_name_en": "Hypertension",
      "diagnosed_at": "2026-01-10T09:00:00+09:00"
    }
  ],
  "recentHealth": {
    "heartRates": [
      { "seq": 1, "heart_rate": 78, "status": null, "measured_at": "2026-07-16T14:00:00+09:00" }
    ],
    "bloodPressures": [
      { "seq": 1, "systolic": 130, "diastolic": 85, "status": null, "measured_at": "2026-07-16T12:00:00+09:00" }
    ],
    "weights": [
      { "seq": 1, "weight_kg": 72.5, "bmi": 23.1, "measured_at": "2026-07-16T08:00:00+09:00" }
    ],
    "glucoses": [
      { "seq": 1, "glucose_value": 98.0, "status": "normal", "measured_at": "2026-07-16T13:00:00+09:00" }
    ],
    "steps": [
      { "seq": 1, "cumulative_steps": 4200, "measured_at": "2026-07-16T14:00:00+09:00" }
    ]
  }
}
```

> `recentHealth`는 DB에서 항목별 최근 50건을 초기 응답에 포함한다.  
> 이후 실시간 데이터는 WebSocket Gateway를 통해 수신한다.

---

## 3. 채팅 API (AI Agent 프록시)

```
POST /chat
```

**Request Body**

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| `message` | string | Y | 사용자 질문 |
| `member_id` | string | N | 맥락 제공용 회원 ID |

```json
{
  "message": "최근 혈당이 높은데 식이요법을 알려줘",
  "member_id": "user001"
}
```

**Response 200**

```json
{
  "reply": "혈당 관리를 위해 저탄수화물 식단을 권장합니다..."
}
```

> 내부적으로 AI Agent API(`AI_AGENT_URL`)로 HTTP 요청을 전달하는 프록시 역할이다.

---

## 4. WebSocket Gateway (실시간 건강 데이터)

### 연결

| 항목 | 값 |
|---|---|
| 엔드포인트 | `ws://<서버호스트>:<PORT>/health-ws` |
| 프로토콜 | Socket.IO |

**연결 시 인증**

```js
const socket = io('http://<host>/health-ws', {
  transports: ['websocket'],
  auth: { token: '<access_token>' },
});
```

### 클라이언트 → 서버 이벤트

| 이벤트 | 페이로드 | 설명 |
|--------|----------|------|
| `subscribe` | `{ memberId: string }` | 특정 회원 채널 구독 시작 |
| `unsubscribe` | `{ memberId: string }` | 구독 해제 |

> `PATI`는 본인 `memberId`만 구독 가능. 타인 구독 시 무시.

### 서버 → 클라이언트 이벤트

| 이벤트 | 페이로드 | 설명 |
|--------|----------|------|
| `heartRate` | `{ memberId, heartRate, source, measuredAt }` | 심박수 실시간 |
| `bloodPressure` | `{ memberId, systolic, diastolic, measuredAt }` | 혈압 실시간 |
| `weight` | `{ memberId, weightKg, bmi, measuredAt }` | 체중 실시간 |
| `glucose` | `{ memberId, glucoseValue, status, measuredAt }` | 혈당 실시간 |
| `stepCount` | `{ memberId, cumulativeSteps, measuredAt }` | 걸음수 실시간 |
| `alert` | `{ memberId, type, value, measuredAt }` | 이상 데이터 감지 알림 |

**페이로드 예시 — heartRate**

```json
{
  "memberId": "user001",
  "heartRate": 128,
  "source": "abnormal_event",
  "measuredAt": "2026-07-16T14:32:00+09:00"
}
```

---

## 5. 참조 문서

| 문서 | 위치 |
|------|------|
| 외부 시뮬레이터 WebSocket 스펙 | `health-backend/docs/API_SPEC_EXTERNAL.md` |
| 백엔드 내부 아키텍처 | `health-backend/docs/ARCHITECTURE.md` |
| 데이터 모델 / ERD | `docs/DATA_MODEL.md` |
