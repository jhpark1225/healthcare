# 백엔드 배포 가이드

NestJS 백엔드를 Docker 컨테이너로 빌드하고 GitHub Actions로 자동 배포하는 절차를 설명한다.

---

## 1. 네임스페이스 규칙

학생마다 할당된 `BACKEND_PORT`를 네임스페이스로 사용해 이름 충돌을 방지한다.

| 항목 | 규칙 | 예시 (BACKEND_PORT=3015) |
|---|---|---|
| Docker 이미지명 | `healthcare-backend-{BACKEND_PORT}` | `healthcare-backend-3015` |
| 컨테이너명 | `healthcare-backend-{BACKEND_PORT}` | `healthcare-backend-3015` |
| 배포 디렉토리 | `~/healthcare-{BACKEND_PORT}/backend` | `~/healthcare-3015/backend` |
| 로그 디렉토리 | `~/healthcare-{BACKEND_PORT}/logs` | `~/healthcare-3015/logs` |
| 호스트 포트 | `{BACKEND_PORT}:{BACKEND_PORT}` | `3015:3015` |

---

## 2. 생성 파일 목록

```
health-backend/
├── Dockerfile                        ← 멀티 스테이지 빌드
├── docker-compose.yml                ← 로컬 개발용
└── docs/
    └── DEPLOY.md                     ← 이 문서

.github/
└── workflows/
    └── deploy-backend.yml            ← CI/CD 자동 배포
```

---

## 3. GitHub Secrets / Variables 설정

GitHub 저장소 → **Settings → Secrets and variables → Actions** 에서 등록한다.

### Secrets (암호화 저장)

| 키 | 설명 |
|---|---|
| `SERVER_USER` | 배포 서버 SSH 사용자명 |
| `SSH_KEY` | 배포 서버 SSH 개인키 (`-----BEGIN OPENSSH PRIVATE KEY-----` 포함 전체) |
| `JWT_ACCESS_SECRET` | Access Token 서명 비밀키 |
| `JWT_REFRESH_SECRET` | Refresh Token 서명 비밀키 |
| `DB_USER` | PostgreSQL 사용자명 |
| `DB_PASSWORD` | PostgreSQL 비밀번호 |

> **주의**: Secret 값에 `$`, `\`, `` ` ``, `"` 같은 특수문자가 포함되면 배포 스크립트 변수 치환 시 오류가 발생할 수 있다.

### Variables (평문 저장)

| 키 | 설명 | 예시 |
|---|---|---|
| `SERVER_HOST` | 배포 서버 IP 또는 호스트명 | `211.253.10.22` |
| `SERVER_PORT` | SSH 포트 (보통 22) | `22` |
| `BACKEND_PORT` | **학생 고유 포트** | `3015` |
| `JWT_ACCESS_TTL_SEC` | Access Token 유효시간(초) | `86400` |
| `JWT_REFRESH_TTL_SEC` | Refresh Token 유효시간(초) | `604800` |
| `DB_HOST` | PostgreSQL 호스트 | `211.253.27.76` |
| `DB_PORT` | PostgreSQL 포트 | `5432` |
| `DB_NAME` | 데이터베이스명 | `db15` |
| `SIMULATOR_URL` | 시뮬레이터 WebSocket URL | `wss://healthsim.iranglab.com/simulator` |
| `SIMULATOR_RECONNECT_ATTEMPTS` | 시뮬레이터 재연결 시도 횟수 | `5` |
| `SIMULATOR_TIMEOUT_MS` | 시뮬레이터 연결 타임아웃(ms) | `10000` |
| `SLACK_WEBHOOK_URL` | Slack Incoming Webhook URL | `https://hooks.slack.com/...` |

### 고정값 (워크플로에 하드코딩)

GitHub에 등록하지 않고 `.env` 값을 그대로 사용하는 항목:

| 앱 환경변수 | 고정값 |
|---|---|
| `NODE_ENV` | `production` |
| `AI_API_URL` | `http://localhost:8000` |
| `AI_API_TIMEOUT_MS` | `30000` |
| `LOG_DIR` | `/app/logs` |
| `LOG_LEVEL` | `info` |
| `LOG_RETENTION_DAYS` | `7d` |
| `DATA_RETENTION_DAYS` | `7` |

### GitHub 변수 → 컨테이너 환경변수 변환

| GitHub 변수 | 컨테이너 env | 변환 규칙 |
|---|---|---|
| `BACKEND_PORT` | `PORT` | 동일 값 |
| `JWT_ACCESS_SECRET` | `JWT_SECRET` | 이름 변경 |
| `JWT_ACCESS_TTL_SEC` | `JWT_EXPIRES_IN` | 숫자에 `s` 접미사 추가 (`86400` → `86400s`) |
| `JWT_REFRESH_TTL_SEC` | `JWT_REFRESH_EXPIRES_IN` | 동일 방식 (`604800` → `604800s`) |

---

## 4. SSH 키 설정

배포 서버에 GitHub Actions용 공개키를 등록한다.

```bash
# 1. 배포 서버에서 키 생성
ssh-keygen -t ed25519 -f ~/.ssh/github_deploy -N ""

# 2. 공개키를 authorized_keys에 등록
cat ~/.ssh/github_deploy.pub >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys

# 3. 개인키 확인 → GitHub Secrets SSH_KEY에 전체 내용 붙여넣기
cat ~/.ssh/github_deploy
```

---

## 5. Dockerfile 설명

`health-backend/Dockerfile` — 멀티 스테이지 빌드:

- **Stage 1 (builder)**: `npm ci` + `npm run build` → `dist/` 생성
- **Stage 2 (runner)**: 프로덕션 의존성만 설치 + `dist/` 복사 → 최소 이미지

빌드 시 `.env` 파일 불필요. 모든 환경변수는 `docker run -e` 파라미터로 주입한다.

---

## 6. docker-compose.yml 설명

`health-backend/docker-compose.yml` — **로컬 개발 전용**

`.env` 파일에서 환경변수를 읽어 컨테이너를 실행한다.

```bash
cd health-backend
docker compose up --build -d   # 빌드 + 백그라운드 실행
docker compose logs -f          # 로그 스트리밍
docker compose down             # 중지
```

---

## 7. deploy-backend.yml 배포 흐름

```
push → main (health-backend/** 변경 시 트리거)
  │
  ├─ [Runner] Checkout
  ├─ [Runner] webfactory/ssh-agent 로 SSH 키 로드
  ├─ [Runner] known_hosts 등록 (ssh-keyscan)
  ├─ [Runner] docker build → healthcare-backend-{PORT}
  ├─ [Runner] docker save | gzip → backend.tar.gz
  ├─ [Runner → Server] SCP: backend.tar.gz 전송
  ├─ [Runner] 배포 스크립트 생성 (env 값 직접 치환)
  ├─ [Runner → Server] SCP: 스크립트 전송
  └─ [Server] 스크립트 실행
       ├─ docker load
       ├─ docker stop / rm (기존 컨테이너)
       ├─ docker run -d (모든 env를 -e 파라미터로 전달)
       └─ docker image prune
```

---

## 8. 트러블슈팅

| 증상 | 원인 | 해결 |
|---|---|---|
| `Permission denied (publickey)` | SSH_KEY 불일치 | 개인키 전체(헤더 포함)를 정확히 복사했는지 확인 |
| `Port already in use` | 포트 충돌 | `BACKEND_PORT`가 다른 학생과 겹치지 않는지 확인 |
| 컨테이너 즉시 종료 | 환경변수 누락 또는 DB 접속 실패 | `docker logs healthcare-backend-{PORT}` |
| JWT 파싱 오류 | TTL 형식 오류 | `JWT_ACCESS_TTL_SEC`에 순수 숫자만 입력 |

---

## 9. 운영 명령

```bash
# 컨테이너 상태
docker ps --filter "name=healthcare-backend-{PORT}"

# 실시간 로그
docker logs -f healthcare-backend-{PORT}

# 컨테이너 재시작
docker restart healthcare-backend-{PORT}

# 로그 파일 확인
ls -la ~/healthcare-{PORT}/logs/
```
