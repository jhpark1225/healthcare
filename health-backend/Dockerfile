# ── Stage 1: build ──────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ── Stage 2: production ─────────────────────────────────────────
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /app/dist ./dist

# 로그 디렉토리 생성 (볼륨 마운트 전 기본 경로 확보)
RUN mkdir -p /app/logs

EXPOSE 3000

CMD ["node", "dist/main.js"]
