# API 테스트 가이드

> **테스트 계정** (DB 시드 데이터 기준)
>
> | 유형 | ID | 비밀번호 |
> |---|---|---|
> | 의사 (DOCT) | `admin` | `admin001123!` |
> | 환자 (PATI) | `user_001` | `user_001123!` |

> **JWT 키 분리 정책**  
> AccessToken은 `JWT_SECRET`, RefreshToken은 `JWT_REFRESH_SECRET`으로 별도 서명됩니다.  
> AccessToken을 RefreshToken 자리에 넣으면 **401**이 반환됩니다.

---

## 1. Swagger UI

### 서버 기동 후 브라우저 접속

```
http://localhost:3000/api-docs
```

### 사용 순서

1. **POST /auth/login** 클릭 → `Try it out` → `Execute`
2. 응답 본문에서 `access_token` 값 복사
3. 우측 상단 **Authorize** 버튼 클릭 → 값 붙여넣기 → **Authorize** → Close
4. 이후 모든 API에 JWT가 자동 첨부됨

---

## 2. REST Client (VS Code)

### 설치

VS Code 확장 탭 → **REST Client** (Huachao Mao) 검색 후 설치

### 사용 순서

1. `test/api.http` 파일 열기
2. `### 1-1. 로그인` 블록 위 **Send Request** 클릭
3. 응답 패널에서 `access_token` / `refresh_token` 복사
4. 파일 상단 변수에 붙여넣기:
   ```
   @accessToken  = eyJhbGci...
   @refreshToken = eyJhbGci...
   ```
5. 이후 모든 블록 실행 가능

---

## 3. curl 명령

### 3-1. 로그인

**Windows — cmd**
```cmd
curl -s -X POST http://localhost:3000/auth/login ^
  -H "Content-Type: application/json" ^
  -d "{\"id\":\"user_001\",\"passwd\":\"user_001123!\"}"
```

**Windows — PowerShell**
```powershell
Invoke-RestMethod -Method POST -Uri http://localhost:3000/auth/login `
  -ContentType "application/json" `
  -Body '{"id":"user_001","passwd":"user_001123!"}'
```

**Mac / Linux**
```bash
curl -s -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"id":"user_001","passwd":"user_001123!"}' | jq .
```

---

### 3-2. AccessToken 재발급

> RefreshToken은 JWT_REFRESH_SECRET으로 서명됨 — AccessToken으로 대체 불가

**Windows — cmd**
```cmd
curl -s -X POST http://localhost:3000/auth/refresh ^
  -H "Content-Type: application/json" ^
  -d "{\"refresh_token\":\"YOUR_REFRESH_TOKEN\"}"
```

**Windows — PowerShell**
```powershell
Invoke-RestMethod -Method POST -Uri http://localhost:3000/auth/refresh `
  -ContentType "application/json" `
  -Body '{"refresh_token":"YOUR_REFRESH_TOKEN"}'
```

**Mac / Linux**
```bash
curl -s -X POST http://localhost:3000/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refresh_token":"YOUR_REFRESH_TOKEN"}' | jq .
```

---

### 3-3. 회원 목록 조회

**Windows — cmd**
```cmd
curl -s http://localhost:3000/members ^
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Windows — PowerShell**
```powershell
Invoke-RestMethod -Uri http://localhost:3000/members `
  -Headers @{Authorization="Bearer YOUR_ACCESS_TOKEN"}
```

**Mac / Linux**
```bash
curl -s http://localhost:3000/members \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" | jq .
```

---

### 3-4. 최근 건강 데이터 조회 (실시간 초기 로딩)

**Mac / Linux**
```bash
curl -s "http://localhost:3000/members/user_001/health/latest?limit=50" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" | jq .
```

**Windows — PowerShell**
```powershell
Invoke-RestMethod `
  -Uri "http://localhost:3000/members/user_001/health/latest?limit=50" `
  -Headers @{Authorization="Bearer YOUR_ACCESS_TOKEN"}
```

---

### 3-5. 건강 데이터 기간 조회

**Mac / Linux**
```bash
curl -s "http://localhost:3000/members/user_001/health?from=2026-07-12T00:00:00%2B09:00&to=2026-07-19T23:59:59%2B09:00" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" | jq .
```

**Windows — PowerShell**
```powershell
Invoke-RestMethod `
  -Uri "http://localhost:3000/members/user_001/health?from=2026-07-12T00:00:00+09:00&to=2026-07-19T23:59:59+09:00" `
  -Headers @{Authorization="Bearer YOUR_ACCESS_TOKEN"}
```

---

### 3-6. 채팅 (AI Agent 프록시)

**Mac / Linux**
```bash
curl -s -X POST http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{"message":"최근 혈당이 높은데 식이요법을 알려줘","member_id":"user_001"}' | jq .
```

**Windows — cmd**
```cmd
curl -s -X POST http://localhost:3000/chat ^
  -H "Content-Type: application/json" ^
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" ^
  -d "{\"message\":\"최근 혈당이 높은데\",\"member_id\":\"user_001\"}"
```

---

### 3-7. Slack 웹훅 수동 전송

**Mac / Linux**
```bash
curl -s -X POST http://localhost:3000/webhook/slack \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{"message":"[테스트] curl 수동 알림"}' | jq .
```

**Windows — cmd**
```cmd
curl -s -X POST http://localhost:3000/webhook/slack ^
  -H "Content-Type: application/json" ^
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" ^
  -d "{\"message\":\"[테스트] curl 수동 알림\"}"
```

---

## 4. Jest 단위 테스트

DB 연결 없이 AuthService 로직을 모킹(Mock)으로 검증합니다.

### 실행

```bash
# 전체 단위 테스트
npm test

# auth 단독 실행
npm test -- auth.service.spec

# 커버리지 포함
npm run test:cov
```

### 테스트 파일

```
src/auth/auth.service.spec.ts
```

### 테스트 케이스 (10개)

| # | 그룹 | 케이스 |
|---|---|---|
| 1 | login | 올바른 자격증명 → 토큰 2종 + member 반환 |
| 2 | login | 응답 member에 password 미포함 확인 |
| 3 | login | 없는 ID → 401 UnauthorizedException |
| 4 | login | 비밀번호 불일치 → 401 |
| 5 | login | sign 2회 호출 (access + refresh 분리 확인) |
| 6 | login | AccessToken은 JWT_SECRET, RefreshToken은 JWT_REFRESH_SECRET |
| 7 | login | JWT payload에 userid·name·api_key·member_type 포함 |
| 8 | refresh | 유효 RefreshToken → 새 AccessToken 반환 |
| 9 | refresh | verify는 JWT_REFRESH_SECRET, sign은 JWT_SECRET 사용 확인 |
| 10 | refresh | 만료/무효 토큰 → 401 |

---

## 5. E2E 테스트 (로그인)

실제 DB에 연결하여 HTTP 요청 → 응답 전체 흐름을 검증합니다.

### 사전 조건

- `.env`의 DB 접속 정보(DB_HOST, DB_PASSWORD 등)가 정확해야 합니다.
- DB에 `admin`, `user_001` 시드 계정이 존재해야 합니다.

### 실행

```bash
npm run test:e2e
```

### 테스트 파일

```
test/auth.e2e-spec.ts
```

### 테스트 케이스 (11개)

| # | 엔드포인트 | 케이스 | 예상 |
|---|---|---|---|
| 1 | POST /auth/login | 의사 계정 성공 | 200 + 토큰 2종 + member |
| 2 | POST /auth/login | 환자 계정 성공 | 200 + 토큰 2종 |
| 3 | POST /auth/login | access ≠ refresh (키 분리) | 두 값이 다름 |
| 4 | POST /auth/login | 잘못된 비밀번호 | 401 |
| 5 | POST /auth/login | 없는 ID | 401 |
| 6 | POST /auth/login | 바디 누락 | 401 |
| 7 | POST /auth/refresh | 유효 RefreshToken | 200 + access_token |
| 8 | POST /auth/refresh | 재발급 토큰 ≠ 최초 토큰 | 다른 값 |
| 9 | POST /auth/refresh | **AccessToken을 refresh 자리에** | **401** (키 분리 검증) |
| 10 | POST /auth/refresh | 무효 RefreshToken | 401 |
| 11 | POST /auth/refresh | 누락 | 401 |

---

## 6. 건강 데이터 개별 조회 API 테스트

### 6-1. REST Client

`test/health.http` 파일을 VS Code에서 열어 각 블록 **Send Request** 클릭.

**공통 파라미터**

| 파라미터 | 설명 | 예시 |
|---|---|---|
| `limit` | 최근 N건 (기본 100) | `?limit=20` |
| `from` + `to` | 기간 조회 (KST ISO 8601) | `?from=2026-07-19T00:00:00+09:00&to=2026-07-19T23:59:59+09:00` |

**API 엔드포인트**

| 엔드포인트 | 설명 |
|---|---|
| `GET /members/:id/health/heart-rates` | 심박수 |
| `GET /members/:id/health/blood-pressures` | 혈압 |
| `GET /members/:id/health/glucose` | 혈당 |
| `GET /members/:id/health/weights` | 체중 |
| `GET /members/:id/health/steps` | 걸음수 |

---

### 6-2. curl (심박수 예시)

**Mac / Linux**
```bash
curl -s "http://localhost:3000/members/user_001/health/heart-rates?limit=10" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" | jq .
```

**Windows — PowerShell**
```powershell
Invoke-RestMethod `
  -Uri "http://localhost:3000/members/user_001/health/heart-rates?limit=10" `
  -Headers @{Authorization="Bearer YOUR_ACCESS_TOKEN"}
```

**기간 조회 (Mac / Linux)**
```bash
curl -s "http://localhost:3000/members/user_001/health/blood-pressures?from=2026-07-19T00:00:00%2B09:00&to=2026-07-19T23:59:59%2B09:00" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" | jq .
```

---

### 6-3. Jest 단위 테스트

```bash
# health.service 단독 실행
npm test -- health.service.spec

# 전체
npm test
```

테스트 케이스 (14개):

| # | 대상 | 케이스 |
|---|---|---|
| 1~5 | 심박수 | 의사 허용 / 환자 본인 허용 / 환자 타인 403 / 기간조회 qb / limit 기본값 100 |
| 6~8 | 혈압 | 의사 허용 / 타인 403 / 기간조회 qb |
| 9~10 | 혈당 | 의사 허용 / 타인 403 |
| 11~12 | 체중 | 의사 허용 / 타인 403 |
| 13~14 | 걸음수 | 의사 허용 / 타인 403 / 기간조회 qb |

---

### 6-4. E2E 테스트

```bash
npm run test:e2e -- --testPathPattern=health
```

---

## 7. 파일 목록

```
test/
├── README.md              ← 이 파일
├── api.http               ← 인증 REST Client
├── health.http            ← 건강 데이터 개별 조회 REST Client
├── auth.e2e-spec.ts       ← E2E 테스트 (로그인)
└── health.e2e-spec.ts     ← E2E 테스트 (건강 데이터 개별 조회)

src/auth/
└── auth.service.spec.ts   ← Jest 단위 테스트 (인증)

src/health/
└── health.service.spec.ts ← Jest 단위 테스트 (건강 데이터)
```

---

## 8. WebSocket 실시간 테스트

```js
// Node.js 콘솔에서 실행 (서버 기동 후)
const { io } = require('socket.io-client');

const ACCESS_TOKEN = 'YOUR_ACCESS_TOKEN';

const socket = io('http://localhost:3000/health-ws', {
  transports: ['websocket'],
  auth: { token: ACCESS_TOKEN },
});

socket.on('connect', () => {
  console.log('[WS] connected:', socket.id);
  socket.emit('subscribe', { memberId: 'user_001' });
});

socket.on('heartRate',     (d) => console.log('💓', d));
socket.on('bloodPressure', (d) => console.log('🩸', d));
socket.on('glucose',       (d) => console.log('🍬', d));
socket.on('stepCount',     (d) => console.log('👟', d));
socket.on('weight',        (d) => console.log('⚖️ ', d));
socket.on('alert',         (d) => console.log('🚨 ALERT', d));
socket.on('disconnect',    (r) => console.log('[WS] disconnected:', r));
```
