# 데이터 모델

이 문서는 ERD를 기준으로 한 물리 스키마만을 정의한다.  
외부 건강정보 서버(`healthsim.iranglab.com`) 연동 스펙은 [API_SPEC_EXTERNAL.md](../health-backend/docs/API_SPEC_EXTERNAL.md)를 참고한다.

`api_key`는 `members` 테이블에 저장하며, 외부 API 요청 시 `member_id`로 조회해 사용한다.

---

## 1. ERD 개요

```
members ──< member_diseases >── disease_codes

members ──< member_heart_rates
members ──< member_blood_pressures
members ──< member_weights
members ──< member_glucose
members ──< member_steps
```

| 테이블명 | 한글명 |
|---|---|
| `members` | 회원관리 |
| `disease_codes` | 질병코드 |
| `member_diseases` | 회원-질병관리 |
| `member_heart_rates` | 회원-심박정보 |
| `member_blood_pressures` | 회원-혈압정보 |
| `member_weights` | 회원-체중관리 |
| `member_glucose` | 회원-혈당정보 |
| `member_steps` | 회원-걸음수정보 |

---

## 2. 물리 스키마

### 2.1 `members` (회원관리)

> `api_key`는 외부 건강정보 서버 요청 시 `member_id`로 조회해 사용한다.

| 컬럼명 (한글) | 컬럼명 (영문) | 타입 | 제약 | 설명 |
|---|---|---|---|---|
| 회원ID | `member_id` | VARCHAR(20) | PK | 회원 고유 식별자 |
| 암호 | `password` | VARCHAR(200) | NOT NULL | 로그인 비밀번호 (해시 저장) |
| API키 | `api_key` | VARCHAR(200) | | 외부 건강정보 서버 접속용 API Key |
| 회원명 | `name` | VARCHAR(50) | NOT NULL | 이름 |
| 성별 | `gender` | VARCHAR(1) | | `M` / `F` |
| 생년월일 | `birth_date` | VARCHAR(8) | | `YYYYMMDD` 형식 |
| 회원유형 | `member_type` | VARCHAR(4) | | `PATI`(환자) / `DOCT`(의사) 등 |
| 등록일 | `created_at` | DATETIME | NOT NULL | 계정 생성 일시 |
| 수정일 | `updated_at` | DATETIME | | 최근 정보 수정 일시 |

> 테이블 및 초기 데이터는 제공됨

---

### 2.2 `disease_codes` (질병코드)

| 컬럼명 (한글) | 컬럼명 (영문) | 타입 | 제약 | 설명 |
|---|---|---|---|---|
| 질병ID | `disease_id` | VARCHAR(20) | PK | 질병 고유 코드 |
| 질병명(영어) | `disease_name_en` | VARCHAR(100) | NOT NULL | 영문 질병명 |
| 질병명(한글) | `disease_name_kr` | VARCHAR(100) | NOT NULL | 한글 질병명 |
| 질병카테고리 | `disease_category` | VARCHAR(50) | | 분류 |
| 중증도 | `severity` | VARCHAR(20) | | `경증` / `중등도` / `중증` |
| 질병설명 | `description` | VARCHAR(512) | | 상세 설명 |
| 등록일 | `created_at` | DATETIME | NOT NULL | |
| 수정일 | `updated_at` | DATETIME | | |

**초기 데이터**

| disease_id | disease_name_en | disease_name_kr | disease_category |
|---|---|---|---|
| `HYP` | Hypertension | 고혈압 | 심혈관 |
| `DIA` | Diabetes | 당뇨병 | 대사 |
| `MI` | Myocardial Infarction | 심근경색 | 심혈관 |
| `ARR` | Arrhythmia | 부정맥 | 심혈관 |
| `AST` | Asthma | 천식 | 호흡기 |
| `SLP` | Sleep Apnea | 수면무호흡 | 호흡기 |
| `CHO` | High Cholesterol | 고지혈증 | 대사 |
| `ATH` | Atherosclerosis | 동맥경화 | 심혈관 |
| `THY` | Thyroid Disorder | 갑상선 질환 | 내분비 |

> 테이블 및 초기 데이터는 제공됨

---

### 2.3 `member_diseases` (회원-질병관리)

| 컬럼명 (한글) | 컬럼명 (영문) | 타입 | 제약 | 설명 |
|---|---|---|---|---|
| 진단시퀀스번호 | `diagnosis_seq` | INT | PK, AUTO_INCREMENT | 진단 고유 번호 |
| 회원ID | `member_id` | VARCHAR(20) | FK → `members.member_id` | |
| 질병ID | `disease_id` | VARCHAR(20) | FK → `disease_codes.disease_id` | |
| 진단내용 | `diagnosis_content` | VARCHAR(512) | | 의사 진단 메모 |
| 진단일 | `diagnosed_at` | DATETIME | NOT NULL | 진단 일시 |
| 수정일 | `updated_at` | DATETIME | | 최근 수정 일시 |

---

### 2.4 `member_heart_rates` (회원-심박정보)

| 컬럼명 (한글) | 컬럼명 (영문) | 타입 | 제약 | 설명 |
|---|---|---|---|---|
| 시퀀스번호 | `seq` | INT | PK, AUTO_INCREMENT | |
| 회원ID | `member_id` | VARCHAR(20) | FK → `members.member_id` | |
| 심박수 | `heart_rate` | INT | NOT NULL | 심박수 (bpm) |
| 상태 | `status` | VARCHAR(200) | | 상태 메시지 |
| 비고 | `note` | VARCHAR(200) | | 비고 |
| 측정일시 | `measured_at` | DATETIME | NOT NULL | 측정 시각 (KST) |
| 생성일시 | `created_at` | DATETIME | NOT NULL | DB 저장 시각 |

---

### 2.5 `member_blood_pressures` (회원-혈압정보)

| 컬럼명 (한글) | 컬럼명 (영문) | 타입 | 제약 | 설명 |
|---|---|---|---|---|
| 시퀀스번호 | `seq` | INT | PK, AUTO_INCREMENT | |
| 회원ID | `member_id` | VARCHAR(20) | FK → `members.member_id` | |
| 수축기 | `systolic` | INT | NOT NULL | 수축기 혈압 (mmHg) |
| 이완기 | `diastolic` | INT | NOT NULL | 이완기 혈압 (mmHg) |
| 상태 | `status` | VARCHAR(200) | | 상태 메시지 |
| 비고 | `note` | VARCHAR(200) | | 비고 |
| 측정일시 | `measured_at` | DATETIME | NOT NULL | 측정 시각 (KST) |
| 생성일시 | `created_at` | DATETIME | NOT NULL | DB 저장 시각 |

---

### 2.6 `member_weights` (회원-체중관리)

| 컬럼명 (한글) | 컬럼명 (영문) | 타입 | 제약 | 설명 |
|---|---|---|---|---|
| 시퀀스번호 | `seq` | INT | PK, AUTO_INCREMENT | |
| 회원ID | `member_id` | VARCHAR(20) | FK → `members.member_id` | |
| 체중(kg) | `weight_kg` | DECIMAL | NOT NULL | 체중 (kg) |
| BMI | `bmi` | DECIMAL | NOT NULL | BMI 수치 |
| 골격근량 | `skeletal_muscle_mass` | DECIMAL | | 골격근량 (kg) |
| 체지방률 | `body_fat_percentage` | DECIMAL | | 체지방률 (%) |
| 상태 | `status` | VARCHAR(100) | | 상태 메시지 |
| 비고 | `note` | VARCHAR(200) | | 비고 |
| 측정일시 | `measured_at` | DATETIME | NOT NULL | 측정 시각 (KST) |
| 생성일시 | `created_at` | DATETIME | NOT NULL | DB 저장 시각 |

---

### 2.7 `member_glucose` (회원-혈당정보)

| 컬럼명 (한글) | 컬럼명 (영문) | 타입 | 제약 | 설명 |
|---|---|---|---|---|
| 시퀀스번호 | `seq` | INT | PK, AUTO_INCREMENT | |
| 회원ID | `member_id` | VARCHAR(20) | FK → `members.member_id` | |
| 혈당값 | `glucose_value` | DECIMAL | NOT NULL | 혈당 (mg/dL) |
| 상태 | `status` | VARCHAR(100) | | 상태 메시지 |
| 비고 | `note` | VARCHAR(200) | | 비고 |
| 측정일시 | `measured_at` | DATETIME | NOT NULL | 측정 시각 (KST) |
| 생성일시 | `created_at` | DATETIME | NOT NULL | DB 저장 시각 |

---

### 2.8 `member_steps` (회원-걸음수정보)

| 컬럼명 (한글) | 컬럼명 (영문) | 타입 | 제약 | 설명 |
|---|---|---|---|---|
| 시퀀스번호 | `seq` | INT | PK, AUTO_INCREMENT | |
| 회원ID | `member_id` | VARCHAR(20) | FK → `members.member_id` | |
| 누적걸음수 | `cumulative_steps` | INT | NOT NULL | 당일 누적 걸음 수 (KST 자정 기준 초기화) |
| 측정일시 | `measured_at` | DATETIME | NOT NULL | 측정 시각 (KST) |
| 생성일시 | `created_at` | DATETIME | NOT NULL | DB 저장 시각 |

---

## 테이블 관계 요약

| 관계 | 부모 테이블 | 자식 테이블 | 카디널리티 |
|---|---|---|---|
| 회원 ↔ 질병 | `members` + `disease_codes` | `member_diseases` | M:N |
| 회원 → 심박 | `members` | `member_heart_rates` | 1:N |
| 회원 → 혈압 | `members` | `member_blood_pressures` | 1:N |
| 회원 → 체중 | `members` | `member_weights` | 1:N |
| 회원 → 혈당 | `members` | `member_glucose` | 1:N |
| 회원 → 걸음수 | `members` | `member_steps` | 1:N |
