# health-web 배포 가이드

React + Vite 프론트엔드를 Docker 컨테이너로 빌드·배포하는 전체 절차를 설명한다.
학생마다 **`FRONTEND_PORT`** 를 네임스페이스로 사용해 이미지 이름·컨테이너 이름·배포 경로가 겹치지 않는다.

---

## 목차

1. [네임스페이스 규칙](#1-네임스페이스-규칙)
2. [GitHub Variables / Secrets 설정](#2-github-variables--secrets-설정)
3. [Dockerfile](#3-dockerfile)
4. [nginx.conf (SPA 라우팅)](#4-nginxconf-spa-라우팅)
5. [docker-compose.yml (로컬 테스트용)](#5-docker-composeyml-로컬-테스트용)
6. [GitHub Actions 워크플로](#6-github-actions-워크플로)
7. [첫 배포 체크리스트](#7-첫-배포-체크리스트)

---

## 1. 네임스페이스 규칙

| 항목 | 패턴 | 예시 (FRONTEND_PORT=22015) |
|---|---|---|
| Docker 이미지 이름 | `healthcare-web-{FRONTEND_PORT}` | `healthcare-web-22015` |
| Docker 컨테이너 이름 | `healthcare-web-{FRONTEND_PORT}` | `healthcare-web-22015` |
| 서버 배포 디렉토리 | `~/healthcare-{FRONTEND_PORT}/web` | `~/healthcare-22015/web` |
| 호스트 노출 포트 | `{FRONTEND_PORT}:80` | `22015:80` |

> `FRONTEND_PORT` 하나만 바꾸면 모든 리소스가 충돌 없이 분리된다.

---

## 2. GitHub Variables / Secrets 설정

저장소 → **Settings → Secrets and variables → Actions** 에서 등록한다.

### Variables (평문, 공개 가능한 값)

| 키 | 예시 값 | 설명 |
|---|---|---|
| `FRONTEND_PORT` | `22015` | 학생별 고유 포트 (네임스페이스) |
| `VITE_API_BASE_URL` | `https://be015.ys.iranglab.com` | 백엔드 API 주소 (빌드 시점에 번들에 삽입) |
| `SERVER_HOST` | `deploy.example.com` | 배포 서버 호스트명 또는 IP |
| `SERVER_PORT` | `22` | SSH 포트 |
| `SERVER_USER` | `ubuntu` | SSH 접속 계정 |

### Secrets (암호화, 민감한 값)

| 키 | 설명 |
|---|---|
| `SSH_KEY` | 배포 서버 접속용 SSH 개인키 (PEM 전체 내용) |

> `VITE_API_BASE_URL` 은 Vite가 **빌드 시점**에 번들에 직접 삽입하기 때문에  
> 런타임 환경변수로 주입할 수 없다. GitHub Variable 로 등록하고 `--build-arg` 로 전달한다.

---

## 3. Dockerfile

파일 위치: `health-web/Dockerfile`

```dockerfile
# ─── Stage 1: 빌드 ───────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# shared 타입 복사 (모노레포: @shared 별칭이 ../shared를 가리킴)
COPY shared/ ./shared/

# 의존성만 먼저 복사해 레이어 캐시 활용
COPY health-web/package*.json ./health-web/
RUN cd health-web && npm ci

# 소스 전체 복사 후 빌드
COPY health-web/ ./health-web/

# Vite 빌드 시점 환경변수 — ARG → ENV 순서 필수
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

RUN cd health-web && npm run build

# ─── Stage 2: 서빙 ───────────────────────────────────────────────
FROM nginx:1.27-alpine

# 빌드 결과물 복사
COPY --from=builder /app/health-web/dist /usr/share/nginx/html

# SPA 라우팅 설정 (4번 참고)
COPY health-web/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

> **빌드 컨텍스트는 리포지토리 루트**여야 한다.  
> `shared/` 디렉토리를 함께 복사해야 `@shared` 별칭이 정상 동작한다.  
> 워크플로에서 `docker build -f health-web/Dockerfile .` 형태로 호출한다.

---

## 4. nginx.conf (SPA 라우팅)

파일 위치: `health-web/nginx.conf`

```nginx
server {
    listen 80;
    server_name _;

    root /usr/share/nginx/html;
    index index.html;

    # SPA 라우팅: 정적 파일이 없으면 index.html로 폴백
    location / {
        try_files $uri $uri/ /index.html;
    }

    # 정적 자산 장기 캐시
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff2?)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # 헬스체크 엔드포인트
    location /healthz {
        return 200 "ok";
        add_header Content-Type text/plain;
    }
}
```

---

## 5. docker-compose.yml (로컬 테스트용)

파일 위치: `health-web/docker-compose.yml`

로컬에서 Docker 이미지를 직접 빌드하고 테스트할 때 사용한다.  
`.env` 파일이 없어도 되도록 `--build-arg` 를 `args:` 블록에 명시한다.

```yaml
services:
  web:
    image: healthcare-web-${FRONTEND_PORT:-5173}
    container_name: healthcare-web-${FRONTEND_PORT:-5173}
    build:
      context: ..                     # 리포 루트 (shared/ 포함)
      dockerfile: health-web/Dockerfile
      args:
        VITE_API_BASE_URL: ${VITE_API_BASE_URL:-http://localhost:3000}
    ports:
      - "${FRONTEND_PORT:-5173}:80"
    restart: unless-stopped
```

### 로컬 실행 방법

```bash
# 리포 루트에서 실행
FRONTEND_PORT=22015 VITE_API_BASE_URL=https://be015.ys.iranglab.com \
  docker compose -f health-web/docker-compose.yml up --build -d

# 또는 셸에 미리 export 후
export FRONTEND_PORT=22015
export VITE_API_BASE_URL=https://be015.ys.iranglab.com
docker compose -f health-web/docker-compose.yml up --build -d

# 브라우저에서 확인
open http://localhost:22015
```

---

## 6. GitHub Actions 워크플로

파일 위치: `.github/workflows/deploy-web.yml`

```yaml
name: Deploy Web

on:
  push:
    branches: [main]
    paths:
      - 'health-web/**'
      - 'shared/**'
      - '.github/workflows/deploy-web.yml'

jobs:
  deploy:
    runs-on: ubuntu-latest

    env:
      IMAGE_NAME:     healthcare-web-${{ vars.FRONTEND_PORT }}
      CONTAINER_NAME: healthcare-web-${{ vars.FRONTEND_PORT }}
      SSH_TARGET:     ${{ vars.SERVER_USER }}@${{ vars.SERVER_HOST }}

    steps:
      # 1. 소스 체크아웃 (shared/ 포함)
      - name: Checkout
        uses: actions/checkout@v4.2.2

      # 2. SSH 에이전트 설정
      - name: SSH 에이전트 설정
        uses: webfactory/ssh-agent@v0.9.0
        with:
          ssh-private-key: ${{ secrets.SSH_KEY }}

      # 3. known_hosts 등록 (호스트키 검증 우회)
      - name: SSH 설정
        run: |
          ssh-keyscan -p ${{ vars.SERVER_PORT }} ${{ vars.SERVER_HOST }} \
            >> ~/.ssh/known_hosts 2>/dev/null || true
          cat >> ~/.ssh/config << 'EOF'
          Host *
            StrictHostKeyChecking no
            UserKnownHostsFile /dev/null
          EOF

      # 4. Docker 이미지 빌드
      #    - 빌드 컨텍스트: 리포 루트 (shared/ 포함)
      #    - VITE_API_BASE_URL: 빌드 시점에 번들에 삽입 (런타임 주입 불가)
      - name: Docker 이미지 빌드
        env:
          VITE_API_BASE_URL: ${{ vars.VITE_API_BASE_URL }}
        run: |
          docker build \
            -f health-web/Dockerfile \
            --build-arg VITE_API_BASE_URL=$VITE_API_BASE_URL \
            -t "$IMAGE_NAME" \
            .

      # 5. 이미지 압축
      - name: 이미지 압축
        run: docker save "$IMAGE_NAME" | gzip > web.tar.gz

      # 6. 배포 디렉토리 생성
      - name: 배포 디렉토리 생성
        run: |
          ssh -p ${{ vars.SERVER_PORT }} $SSH_TARGET \
            "mkdir -p ~/healthcare-${{ vars.FRONTEND_PORT }}/web"

      # 7. 이미지 전송
      - name: 이미지 전송
        run: |
          scp -P ${{ vars.SERVER_PORT }} web.tar.gz \
            $SSH_TARGET:~/healthcare-${{ vars.FRONTEND_PORT }}/web/web.tar.gz

      # 8. 배포 스크립트 생성 → 전송 → 실행
      - name: 배포 스크립트 생성 및 실행
        env:
          APP_PORT: ${{ vars.FRONTEND_PORT }}
        run: |
          cat > /tmp/deploy_web_${APP_PORT}.sh << SCRIPT
          #!/bin/bash
          set -e

          echo '>>> [1/4] Docker 이미지 로드'
          docker load < \$HOME/healthcare-${APP_PORT}/web/web.tar.gz

          echo '>>> [2/4] 기존 컨테이너 중지 및 제거'
          docker stop ${CONTAINER_NAME} 2>/dev/null || true
          docker rm   ${CONTAINER_NAME} 2>/dev/null || true

          echo '>>> [3/4] 컨테이너 기동'
          docker run -d \
            --name ${CONTAINER_NAME} \
            --restart unless-stopped \
            -p ${APP_PORT}:80 \
            ${IMAGE_NAME}

          echo '>>> [4/4] 오래된 이미지 정리'
          docker image prune -f

          echo '=== 컨테이너 상태 확인 ==='
          sleep 5
          docker ps --filter "name=${CONTAINER_NAME}" \
            --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

          echo '=== 헬스체크 ==='
          curl -s -o /dev/null -w "HTTP status: %{http_code}\n" \
            http://localhost:${APP_PORT}/healthz 2>&1 || echo '[curl 실패]'
          SCRIPT

          chmod +x /tmp/deploy_web_${APP_PORT}.sh

          scp -P ${{ vars.SERVER_PORT }} /tmp/deploy_web_${APP_PORT}.sh \
            $SSH_TARGET:/tmp/deploy_web_${APP_PORT}.sh

          ssh -p ${{ vars.SERVER_PORT }} $SSH_TARGET \
            "chmod +x /tmp/deploy_web_${APP_PORT}.sh \
             && /tmp/deploy_web_${APP_PORT}.sh \
             && rm -f /tmp/deploy_web_${APP_PORT}.sh"
```

---

## 7. 첫 배포 체크리스트

```
[ ] GitHub Variables 등록
    [ ] FRONTEND_PORT
    [ ] VITE_API_BASE_URL
    [ ] SERVER_HOST
    [ ] SERVER_PORT
    [ ] SERVER_USER

[ ] GitHub Secrets 등록
    [ ] SSH_KEY  (cat ~/.ssh/id_rsa 내용 전체)

[ ] 파일 생성 및 커밋
    [ ] health-web/Dockerfile
    [ ] health-web/nginx.conf
    [ ] health-web/docker-compose.yml  (선택 — 로컬 테스트 시)
    [ ] .github/workflows/deploy-web.yml  (기존 파일 교체)

[ ] main 브랜치에 push → Actions 탭에서 워크플로 실행 확인

[ ] 브라우저에서 http://{SERVER_HOST}:{FRONTEND_PORT} 접속 확인
```

### 자주 발생하는 오류

| 증상 | 원인 | 해결 |
|---|---|---|
| API 호출 실패 (CORS) | `VITE_API_BASE_URL` 잘못 등록 | Variable 값 확인 후 재배포 |
| 페이지 새로고침 시 404 | `nginx.conf` 없음 또는 미적용 | `health-web/nginx.conf` 파일 추가 여부 확인 |
| 이미지 빌드 실패 (shared 못 찾음) | 빌드 컨텍스트가 `health-web/`으로 잘못 설정됨 | `-f health-web/Dockerfile .` (루트 기준) 확인 |
| 포트 충돌 | 다른 학생과 `FRONTEND_PORT` 동일 | 담당 교수에게 포트 번호 확인 |
