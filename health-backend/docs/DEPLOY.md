# Backend 배포 가이드

NestJS 백엔드를 Docker 컨테이너로 빌드하고 GitHub Actions CI/CD로 배포하는 가이드.

---

## 1. 네임스페이스 규칙 (`BACKEND_PORT`)

학생마다 할당된 `BACKEND_PORT`를 기준으로 모든 이름이 고유하게 생성됩니다.

| 항목 | 형식 | 예시 (`BACKEND_PORT=3015`) |
|---|---|---|
| Docker 이미지명 | `healthcare-backend-{PORT}` | `healthcare-backend-3015` |
| 컨테이너명 | `healthcare-backend-{PORT}` | `healthcare-backend-3015` |
| 배포 디렉토리 | `/app/healthcare-{PORT}/backend` | `/app/healthcare-3015/backend` |
| 로그 볼륨 경로 | `/app/healthcare-{PORT}/logs` | `/app/healthcare-3015/logs` |
| 호스트 포트 | `{PORT}:{PORT}` | `3015:3015` |

---

## 2. 생성 파일 목록

```
health-backend/
├── Dockerfile              ← 멀티 스테이지 빌드 (builder + runner)
├── .dockerignore           ← 빌드 컨텍스트에서 제외할 파일
├── docker-compose.yml      ← 로컬 개발용 (env 파일로 실행)
└── docs/
    └── DEPLOY.md           ← 이 문서

.github/
└── workflows/
    └── deploy-backend.yml  ← CI/CD 워크플로
```

---

## 3. GitHub Secrets / Variables 설정

GitHub 저장소 → **Settings → Secrets and variables → Actions** 에서 등록.

### Secrets (암호화 저장)

| 키 | 설명 |
|---|---|
| `SERVER_USER` | 배포 서버 SSH 사용자명 |
| `SSH_KEY` | 배포 서버 SSH 비공개 키 (RSA PEM 전체) |
| `JWT_ACCESS_SECRET` | AccessToken 서명 비밀키 |
| `JWT_REFRESH_SECRET` | RefreshToken 서명 비밀키 |
| `DB_USER` | PostgreSQL 사용자명 |
| `DB_PASSWORD` | PostgreSQL 비밀번호 |

> **주의**: `DB_PASSWORD`, `JWT_*SECRET` 값에 `$`, `\`, `` ` ``, `"` 같은 쉘 특수문자가 포함되면 스크립트 치환 오류가 발생합니다. 영문 + 숫자 + `!@#%^&*` 조합을 권장합니다.

### Variables (평문 저장)

| 키 | 설명 | 예시 |
|---|---|---|
| `SERVER_HOST` | 배포 서버 IP | `211.253.10.22` |
| `SERVER_PORT` | SSH 포트 | `22` |
| `BACKEND_PORT` | **학생 고유 포트** (네임스페이스) | `3015` |
| `JWT_ACCESS_TTL_SEC` | AccessToken 유효시간 (초) | `86400` |
| `JWT_REFRESH_TTL_SEC` | RefreshToken 유효시간 (초) | `604800` |
| `DB_HOST` | PostgreSQL 호스트 | `211.253.27.76` |
| `DB_PORT` | PostgreSQL 포트 | `5432` |
| `DB_NAME` | 데이터베이스명 | `db15` |
| `SIMULATOR_URL` | 시뮬레이터 WebSocket URL | `wss://healthsim.iranglab.com/simulator` |
| `SIMULATOR_RECONNECT_ATTEMPTS` | 재연결 시도 횟수 | `3` |
| `SIMULATOR_TIMEOUT_MS` | 연결 타임아웃(ms) | `10000` |
| `SLACK_WEBHOOK_URL` | Slack Incoming Webhook URL | `https://hooks.slack.com/...` |

---

## 4. env 변수 매핑 (GitHub Variable → 앱 내부 변수)

워크플로에서 자동으로 이름을 변환해서 컨테이너에 주입합니다.

| GitHub | 앱 env 변수 | 비고 |
|---|---|---|
| `BACKEND_PORT` | `PORT` | |
| `JWT_ACCESS_SECRET` (Secret) | `JWT_SECRET` | |
| `JWT_REFRESH_SECRET` (Secret) | `JWT_REFRESH_SECRET` | |
| `JWT_ACCESS_TTL_SEC` | `JWT_EXPIRES_IN` | 숫자+'s' 접미사 추가 (`86400` → `86400s`) |
| `JWT_REFRESH_TTL_SEC` | `JWT_REFRESH_EXPIRES_IN` | 동일 (`604800` → `604800s`) |

### 고정값 (GitHub에 등록하지 않고 워크플로에서 직접 지정)

| 앱 env 변수 | 고정값 |
|---|---|
| `NODE_ENV` | `production` |
| `AI_API_URL` | `http://localhost:8000` |
| `AI_API_TIMEOUT_MS` | `30000` |
| `LOG_DIR` | `/app/logs` |
| `LOG_LEVEL` | `info` |
| `LOG_RETENTION_DAYS` | `7d` |
| `DATA_RETENTION_DAYS` | `7` |

---

## 5. 로컬 Docker 테스트

`.env` 파일이 있는 상태에서 docker-compose로 로컬 검증합니다.

```bash
cd health-backend

# 빌드 + 기동
docker compose up --build -d

# 로그 확인
docker compose logs -f

# 중지
docker compose down
```

접속 확인:
- API: `http://localhost:{BACKEND_PORT}`
- Swagger: `http://localhost:{BACKEND_PORT}/api-docs`

---

## 6. 배포 흐름

```
push to main (health-backend/** 변경)
  │
  ├─ [Runner] Docker 이미지 빌드
  │    └─ health-backend/Dockerfile (멀티 스테이지)
  │
  ├─ [Runner] 이미지 → backend.tar.gz 압축
  │
  ├─ [Runner → Server] SCP 전송
  │    └─ /app/healthcare-{PORT}/backend/backend.tar.gz
  │
  ├─ [Runner] 배포 스크립트 생성 (변수 값 직접 치환)
  │    └─ /tmp/deploy_{PORT}.sh
  │
  ├─ [Runner → Server] 스크립트 SCP 전송
  │
  └─ [Server] 스크립트 실행
       ├─ docker load (이미지 로드)
       ├─ docker stop / rm (기존 컨테이너 제거)
       ├─ docker run -d (신규 컨테이너 기동, 모든 env 파라미터 전달)
       └─ docker image prune (오래된 이미지 정리)
```

---

## 7. SSH 키 설정 방법

```bash
# 배포 서버에서 키 쌍 생성
ssh-keygen -t rsa -b 4096 -f ~/.ssh/healthcare_deploy -N ""

# 공개키를 authorized_keys에 등록
cat ~/.ssh/healthcare_deploy.pub >> ~/.ssh/authorized_keys

# 비공개키 내용을 복사 → GitHub Secret SSH_KEY에 붙여넣기
cat ~/.ssh/healthcare_deploy
```

---

## 8. 트러블슈팅

| 증상 | 원인 | 해결 |
|---|---|---|
| `Permission denied (publickey)` | SSH_KEY 값 오류 | PEM 헤더(`-----BEGIN...`) 포함해서 등록했는지 확인 |
| `Port already in use` | 다른 프로세스가 포트 점유 | `lsof -i :{PORT}` 또는 다른 학생 컨테이너와 포트 충돌 확인 |
| JWT 만료 오류 | `86400` → `86400s` 변환 후 앱이 파싱 불가 | `JWT_ACCESS_TTL_SEC`에 순수 숫자만 입력했는지 확인 |
| `null value` DB 에러 | 시뮬레이터가 빈 값 전송 | SimulatorService handler에서 null 체크 추가 |
| 컨테이너가 즉시 종료 | 환경변수 누락 또는 DB 접속 실패 | `docker logs {CONTAINER_NAME}` 로 원인 확인 |

---

## 9. 유용한 운영 명령

```bash
# 컨테이너 상태 확인
docker ps --filter "name=healthcare-backend-{PORT}"

# 실시간 로그
docker logs -f healthcare-backend-{PORT}

# 컨테이너 내부 접속
docker exec -it healthcare-backend-{PORT} sh

# 컨테이너 재시작
docker restart healthcare-backend-{PORT}

# 볼륨(로그) 확인
ls -la /app/healthcare-{PORT}/logs/
```
