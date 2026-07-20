# 시스템 아키텍처

## 전체 구성 개요

```
[시뮬레이터 서버] ──WebSocket──▶ [4-1. NestJS 백엔드] ──HTTP──▶ [4-2. React+Vite 웹]
                                         │                               │
                                         │ HTTP                   Python API 호출
                                         ▼                               │
                                 [2. AI Agent API]  ◀─────────────────────
                                  (Python / RAG + LLM)
                                         │
                              ┌──────────┴──────────┐
                              ▼                     ▼
                         [Ollama LLM]           [Slack 웹훅]
                        (Gemma3 로컬)         (이상 증상 알림)

[7. React Native (Expo)] ──HTTP──▶ [4-1. NestJS 백엔드]
```

---

## 구성 요소별 상세

### 1. 시스템 설계 및 구축 준비 (사전작업)

| 단계 | 내용 | 산출물 |
|---|---|---|
| 요구사항 확인 | 서비스 기능 및 비기능 요구사항 정의 | REQUIREMENTS.md |
| 화면 설계 | 화면 구조 및 UI/UX 설계 | SCREEN_DESIGN.md |
| 데이터 모델링 | ERD 작성 후 테이블 설계 및 생성 | DATA_MODEL.md / table.sql |

---

### 2. AI Agent 백엔드 (Python)

로컬 LLM 기반 AI 추론 및 RAG 검색 서비스를 제공한다.

| 컴포넌트 | 역할 |
|---|---|
| **RAG** | 문서·데이터 검색 및 벡터 기반 조회 |
| **Ollama (Gemma3)** | 로컬 LLM 실행 — 외부 API 의존 없이 추론 |
| **AI Agent API** | RAG + LLM 연동, 프롬프트/컨텍스트 관리, HTTP API 제공 |

- NestJS 백엔드(API-1)와 React 웹 챗봇(CHAT) 양쪽에서 호출
- Slack 웹훅을 통해 이상 증상 분석 결과를 전송

---

### 3. 시뮬레이터 서버

외부 건강정보 서버(`healthsim.iranglab.com`)가 회원의 건강 데이터를 실시간으로 푸시한다.

- 프로토콜: WebSocket (Socket.IO)
- 인증: `userId` + `apiKey` (handshake 파라미터)
- 전송 데이터: 심박수, 혈압, 체중, 혈당, 걸음수 등
- 상세 스펙: [API_SPEC_EXTERNAL.md](../health-backend/docs/API_SPEC_EXTERNAL.md)

---

### 4-1. NestJS 백엔드

시스템의 중심 서버. DB 관리, 실시간 데이터 수신, 클라이언트 API 제공을 담당한다.

| 레이블 | 기능 |
|---|---|
| **DATA** | 시뮬레이터 서버로부터 건강 데이터 WebSocket 수신 → DB 저장 |
| **ALM** | 수신 데이터 이상 여부 판단 → 실시간 모니터링 알림 발송 |
| **API-1** | AI Agent API(Python) 호출 — 챗봇 응답, 이상 증상 분석 |
| **API-2** | 웹·앱 클라이언트에 건강 데이터 제공 REST API |

- 기술 스택: NestJS (Node.js)
- DB: PostgreSQL ([DATA_MODEL.md](./DATA_MODEL.md) 참고)

---

### 4-2. React + Vite 웹 서비스

의사(관리자)가 사용하는 웹 대시보드.

| 레이블 | 화면 | 설명 |
|---|---|---|
| **AUTH** | 로그인 | 의사 계정 인증 |
| **LIST** | 회원목록 | 등록된 환자 목록 조회 |
| **VIEW** | 회원상세 | 실시간 건강 모니터링 대시보드 |
| **CHAT** | 챗봇 | AI Agent API(Python) 직접 호출하여 LLM 응답 표시 |

---

### 5. Slack 웹훅

AI Agent가 이상 증상을 감지했을 때 Slack 채널로 분석 내용을 자동 전송한다.

- 트리거: 이상 건강 데이터 수신 시 AI Agent API에서 판단
- 전송 주체: AI Agent 백엔드 (Python)

---

### 6. 서버 배포 및 네트워크 인프라

클라우드 서버, 네트워크, 보안 등 인프라 구성. 배포는 **GitHub Actions**를 통해 자동화한다.

| 항목 | 내용 |
|---|---|
| CI/CD | GitHub Actions — main 브랜치 push 시 자동 빌드·배포 |
| 서버 | 클라우드 서버 (NestJS 백엔드, AI Agent API 배포) |
| 네트워크 | 도메인, 리버스 프록시, HTTPS 설정 |
| 보안 | 방화벽, 포트 관리, GitHub Secrets 기반 시크릿 관리 |

**GitHub Actions 배포 흐름**

```
git push (main)
    │
    ▼
GitHub Actions
    ├── 빌드 (NestJS / React+Vite / Python)
    ├── 테스트
    └── 클라우드 서버 배포 (SSH / Docker 등)
```

---

### 7. React Native (Expo) 모바일 앱

환자 본인이 사용하는 모바일 클라이언트.

| 화면 | 설명 |
|---|---|
| 로그인 | 환자 계정 인증 |
| 회원목록 | (의사 권한 시) 환자 목록 |
| 회원상세 | 본인 건강 데이터 실시간 모니터링 |
| 챗봇 | AI Agent API 연동 챗봇 |

- NestJS 백엔드(API-2)를 통해 데이터 수신
- 웹과 동일한 백엔드 API를 공유

---

## 데이터 흐름 요약

```
시뮬레이터 서버
    │  WebSocket (건강 데이터 push)
    ▼
NestJS 백엔드
    ├── PostgreSQL DB 저장
    ├── 이상 감지 → AI Agent API 호출 → Slack 알림
    └── REST API 제공
            │
    ┌───────┴───────┐
    ▼               ▼
React+Vite 웹   React Native 앱
 (의사 대시보드)   (환자 모바일)
    │
    └── 챗봇 → AI Agent API (Python) 직접 호출
```

---

## 기술 스택 요약

| 영역 | 기술 |
|---|---|
| 웹 프론트엔드 | React + Vite |
| 모바일 | React Native (Expo) |
| 백엔드 | NestJS (Node.js) |
| AI Agent | Python (RAG + Ollama Gemma3) |
| DB | PostgreSQL |
| 실시간 통신 | WebSocket / Socket.IO |
| 알림 | Slack 웹훅 |
| 인프라 | 클라우드 서버 |
