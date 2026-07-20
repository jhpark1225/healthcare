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
ARG VITE_API_URL
ARG VITE_WS_URL
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_WS_URL=$VITE_WS_URL

RUN cd health-web && npx vite build

# ─── Stage 2: 서빙 ───────────────────────────────────────────────
FROM nginx:1.27-alpine

# 빌드 결과물 복사
COPY --from=builder /app/health-web/dist /usr/share/nginx/html

# SPA 라우팅 설정
COPY health-web/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
