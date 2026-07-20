# 외부 건강정보 서버 API 명세 (WebSocket)

> **출처**: `Health_interface.pdf` — 외부 제공 인터페이스 명세서  
> 본 문서는 백엔드가 수신(consume)하는 외부 서버 스펙입니다. 우리 시스템이 제공하는 API가 아닙니다.

---

## 개요

| 항목 | 내용 |
|------|------|
| 프로토콜 | WebSocket (Socket.IO) |
| 서버 URL | `wss://healthsim.iranglab.com` |
| 네임스페이스 | `/simulator` |
| 시간 기준 | KST (UTC+9), ISO 8601 (`+09:00` 오프셋 포함) |
| 이벤트 수 | 9종 |

---

## 0. 공통 규칙

- 모든 이벤트 페이로드 구조:
  ```json
  { "event": "<이벤트명>", "data": { ... } }
  ```
- `timestamp`는 항상 KST 기준 ISO 8601 문자열
  - 예: `2026-07-03T22:07:15.541+09:00`
- 회원별 수면 시간대(`userId` 해시로 6.0~9.0시간 산출, KST 07시 기상 고정)가 심박수·걸음수·혈압·혈당 값 생성에 공통 반영됨

---

## 1. 접속 방법

### 1.1 엔드포인트 & 인증

- 연결(handshake) 시점의 **쿼리 파라미터**로 인증 (별도 이벤트 없음)

| 파라미터 | 설명 |
|----------|------|
| `userId` | 사용자 고유 ID |
| `apiKey` | 해당 사용자의 API Key |

**접속 URL 예시**
```
wss://healthsim.iranglab.com/simulator?userId=user_001&apiKey=key_001
```

### 1.2 Socket.IO 클라이언트 예시 (Node.js)

```js
const { io } = require('socket.io-client');

const socket = io('wss://healthsim.iranglab.com/simulator', {
  transports: ['websocket'], // polling 폴백 방지 — 명시 권장
  query: { userId: 'user_001', apiKey: 'key_001' },
  reconnectionAttempts: 5,
  timeout: 5000,
});

socket.on('connect', () => console.log('connected', socket.id));
socket.on('userProfile',    (msg) => console.log(msg));
socket.on('heartRate',      (msg) => console.log(msg));
socket.on('stepCount',      (msg) => console.log(msg));
socket.on('bloodPressure',  (msg) => console.log(msg));
socket.on('weight',         (msg) => console.log(msg));
socket.on('glucose',        (msg) => console.log(msg));
socket.on('sleep',          (msg) => console.log(msg));
socket.on('error',          (err) => console.error(err));
socket.on('disconnect',     (reason) => console.log('disconnected:', reason));
```

> `transports: ['websocket']` 미지정 시 HTTP 롱폴링으로 먼저 시도해 초기 이벤트 수신이 지연될 수 있음

### 1.3 연결 성공/실패 흐름

**인증 실패 시**
- `error` 이벤트 전송 후 서버가 즉시 소켓 연결 종료
- 같은 자격증명으로 재시도해도 계속 실패

**인증 성공 시** (이벤트 전송 순서)
1. `userProfile` — 1회
2. `weight` / `bloodPressure` / `glucose` / `sleep` — 각 즉시 1회
3. 이후 주기 전송 시작:

| 이벤트 | 주기 |
|--------|------|
| `heartRate` | 4초 |
| `stepCount` | 4.5초 |
| `bloodPressure` | 2시간 |
| `glucose` | 1시간 |
| `weight` | 매일 08 / 12 / 18시 (KST) |
| `sleep` | 매일 기상 시각 (KST 07:00) |

### 1.4 연결 해제 및 재접속

- 연결 해제 시 서버가 해당 세션의 모든 타이머 정리 (`destroySession`)
- **세션 상태는 저장되지 않음** — 재접속 시 완전히 새 세션으로 시작
  - `stepCount`는 0부터 재시작
  - `weight` / `sleep`의 "오늘 이미 보냈는지" 여부도 초기화
- 동일 `userId`로 다중 소켓 연결 시, 연결(`client.id`)마다 독립 세션 생성

### 1.5 연결 상태 확인 (ping/pong)

```js
socket.emit('ping', { ts: Date.now() });
socket.on('pong', (msg) => console.log('rtt check', msg));
```

클라이언트가 `ping`을 보내면 서버가 동일 데이터를 `pong`으로 echo 반환.

---

## 2. WebSocket 이벤트 상세

### 2.1 `userProfile`

- **발생 시점**: 인증 성공 직후 최초 1회
- **용도**: 해당 회원의 기본 프로필 및 질환 정보 수신

| 필드 | 타입 | 설명 |
|------|------|------|
| `userId` | string | 사용자 ID |
| `name` | string | 이름 |
| `age` | number | 나이 |
| `gender` | `"M"` \| `"F"` | 성별 |
| `heightCm` | number | 키 (cm) |
| `weightKg` | number | 최신 체중 (없으면 0) |
| `bmi` | number | 최신 BMI (없으면 0) |
| `hypertension` | boolean | 고혈압(HYP) 보유 여부 |
| `diabetes` | boolean | 당뇨병(DIA) 보유 여부 |
| `heartDisease` | `"myocardial_infarction"` \| `"arrhythmia"` \| `null` | 심장질환 (MI > ARR 우선순위, 없으면 null) |
| `diseases` | `Array<{diseaseCode, name, nameKr}>` | 보유 질환 전체 목록 |
| `otherConditions` | `string[]` | HYP/DIA/MI/ARR/none 제외 질환 코드 목록 (예: AST, SLP, CHO, ATH, THY) |

**페이로드 예시**
```json
{
  "event": "userProfile",
  "data": {
    "userId": "user_003",
    "name": "박지훈",
    "age": 45,
    "gender": "M",
    "heightCm": 172,
    "weightKg": 88,
    "bmi": 29.8,
    "hypertension": true,
    "diabetes": true,
    "heartDisease": null,
    "diseases": [
      { "diseaseCode": "HYP", "name": "Hypertension", "nameKr": "고혈압" },
      { "diseaseCode": "DIA", "name": "Diabetes",     "nameKr": "당뇨병" }
    ],
    "otherConditions": []
  }
}
```

---

### 2.2 `heartRate`

- **발생 시점**: 4초 주기 (정상 시뮬레이션)  
  심장질환(MI) 또는 고혈압(HYP) 보유자는 **10분 주기로 이상 수치가 동일 이벤트명으로 추가 전송**됨

| 필드 | 타입 | 설명 |
|------|------|------|
| `timestamp` | string | KST ISO 8601 |
| `userId` | string | 사용자 ID |
| `heartRate` | number | 심박수 (bpm) |
| `source` | `"simulation"` \| `"abnormal_event"` | 일반 / 이상 이벤트 구분 |
| `note` | string? | `source`가 `abnormal_event`일 때만 존재. 고정값: `"Possible tachycardia detected."` |

**값 생성 규칙**
- 기준: `baselineHeartRate` (회원별 고유값)
- 변동폭: 평상시 ±5bpm, 수면 중 ±2.5bpm
- 부정맥(ARR) 보유 시 변동폭 추가 (평상시 ±4bpm, 수면 중 ±2bpm)
- 고혈압/당뇨 보유 시 +2bpm 가산
- 수면 중: 기준치의 약 82%로 낮춤, 하한 42bpm (평상시 하한 50bpm)
- **이상 이벤트** (10분 주기, MI/HYP 보유자만): 기준치 + 20bpm + (MI 보유 시 +10bpm) + 0~10 난수, 하한 100bpm

---

### 2.3 `stepCount`

- **발생 시점**: 4.5초 주기

| 필드 | 타입 | 설명 |
|------|------|------|
| `timestamp` | string | KST ISO 8601 |
| `userId` | string | 사용자 ID |
| `stepCount` | number | 해당 일자 누적 걸음 수 |
| `dailyReset` | boolean | 해당 틱에서 날짜가 바뀌어 0으로 초기화되었는지 여부 |

**값 생성 규칙**
- 평상시: `max(10, baselineStepRate × 20 + 0~20 난수)` 만큼 매 틱 누적
- 수면 중: 90% 확률로 증가 0, 10% 확률로 1~5보만 증가
- 날짜 변경: KST 자정(00:00) 기준, `dailyReset: true`가 해당 틱에 1회 표시

---

### 2.4 `bloodPressure`

- **발생 시점**: 접속 즉시 1회, 이후 2시간 주기

| 필드 | 타입 | 설명 |
|------|------|------|
| `timestamp` | string | KST ISO 8601 |
| `userId` | string | 사용자 ID |
| `systolic` | number | 수축기 혈압 (mmHg) |
| `diastolic` | number | 이완기 혈압 (mmHg) |
| `source` | string | 항상 `"simulation"` |

**값 생성 규칙**
- 기준: 고혈압(HYP) 보유 시 수축기 140 / 이완기 90, 미보유 시 120 / 80
- 수면 중: 야간 혈압 하강(nocturnal dipping) 반영 — 기준치 × 0.88, 변동폭 절반
- 변동폭: 평상시 수축기 ±6, 이완기 ±4 / 수면 중 수축기 ±3, 이완기 ±2
- 하한: 수축기 90, 이완기 55

---

### 2.5 `weight`

- **발생 시점**: 접속 즉시 1회, 이후 매일 08 / 12 / 18시 (KST) 각 1회

| 필드 | 타입 | 설명 |
|------|------|------|
| `timestamp` | string | KST ISO 8601 |
| `userId` | string | 사용자 ID |
| `weightKg` | number | 체중 (kg) — 세션 중 고정값 |
| `bmi` | number | BMI — 세션 중 고정값 |
| `skeletalMuscleMassKg` | number | 골격근량 (kg), 매 전송 시 재계산 |
| `bodyFatPercentage` | number | 체지방률 (%), 매 전송 시 재계산 |
| `source` | string | 항상 `"simulation"` |

**값 생성 규칙**
- 체지방률 (Deurenberg 공식): `1.2×BMI + 0.23×나이 − 10.8×성별계수(남 1/여 0) − 5.4 ± 1%p`, 범위 5~50% clamp
- 골격근량: `체중 × (1 − 체지방률/100)`으로 구한 제지방량의 42~46%

---

### 2.6 `glucose`

- **발생 시점**: 접속 즉시 1회, 이후 1시간 주기

| 필드 | 타입 | 설명 |
|------|------|------|
| `timestamp` | string | KST ISO 8601 |
| `userId` | string | 사용자 ID |
| `glucoseMgDl` | number | 혈당 (mg/dL) |
| `status` | `"normal"` \| `"elevated"` \| `"high"` | 140 이상: high / 110~139: elevated / 미만: normal |
| `source` | string | 항상 `"simulation"` |

**값 생성 규칙**
- 공복 기준치: 당뇨(DIA) 보유 시 130, 미보유 시 95
- 변동폭: 평상시 당뇨 ±10 / 비당뇨 ±5, 수면 중 각각 ±5 / ±3으로 축소
- 식후 스파이크 (수면 중 아니고 KST 08/12/18시 이후 2시간 이내): 비당뇨 +15~30, 당뇨 +40~70
- 새벽 현상(dawn phenomenon): 수면 중, 당뇨 보유, 기상 1.5시간 이내 → +10~25 추가 상승
- 하한: 70

---

### 2.7 `sleep`

- **발생 시점**: 접속 즉시 1회(직전 수면 기록), 이후 매일 기상 시각(KST 07:00)에 1회

| 필드 | 타입 | 설명 |
|------|------|------|
| `timestamp` | string | KST ISO 8601 |
| `userId` | string | 사용자 ID |
| `sleepHours` | number | 수면 시간 (시간 단위, 소수 첫째 자리) |
| `quality` | `"good"` \| `"fair"` \| `"poor"` | 수면 품질 |
| `bedTime` | string | 취침 시각 (KST) |
| `wakeTime` | string | 기상 시각 (KST), 매일 07:00 고정 |
| `source` | string | 항상 `"simulation"` |

**값 생성 규칙**
- 기준 수면시간: `userId` MD5 해시로 6.0~9.0시간 고정 부여 (회원마다 다름)
- 나이 보정: 40세 이상 −0.3시간, 60세 이상 −0.6시간
- 매 전송 시 기준치에 ±0.6시간 무작위 변동
- 수면무호흡(SLP) 보유 시 0.8~1.8시간 추가 차감, 60% 확률로 품질 강제 `poor`
- 품질 분류 (수면무호흡 강제 케이스 제외): 7.5시간↑ → good / 6~7.5시간 → fair / 6시간↓ → poor
- `bedTime` = `wakeTime`(07:00) − `sleepHours`

---

### 2.8 `error`

- **발생 시점**: 연결 시 `userId` / `apiKey` 인증 실패

| 필드 | 타입 | 설명 |
|------|------|------|
| `code` | string | 고정값 `"AUTH_FAILED"` |
| `message` | string | 고정 문구 `"Invalid userId or apiKey."` |

```json
{ "event": "error", "data": { "code": "AUTH_FAILED", "message": "Invalid userId or apiKey." } }
```

> 이벤트 전송 직후 서버가 소켓 연결을 강제 종료합니다.

---

### 2.9 `pong`

- **발생 시점**: 클라이언트가 `ping` 이벤트를 보낼 때 echo 반환
- **페이로드**: 클라이언트가 보낸 `data`를 그대로 반환

```js
// 클라이언트 → 서버
socket.emit('ping', { ts: Date.now() });

// 서버 → 클라이언트
// { event: 'pong', data: { ts: ... } }
```

---

## 3. 이상 수치 판단 기준 (알림 구현 참고)

| 항목 | 이상 조건 |
|------|-----------|
| 심박수 | `source === "abnormal_event"` 또는 100bpm 이상 |
| 혈당 | `status === "elevated"` (110~139) 또는 `status === "high"` (140↑) |
| 혈압 | 수축기 140 이상 또는 이완기 90 이상 |
