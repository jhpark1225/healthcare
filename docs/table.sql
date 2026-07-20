-- ============================================================
-- Healthcare DB Schema
-- Database: PostgreSQL
-- ============================================================

-- 2.1 회원관리
CREATE TABLE members (
    member_id   VARCHAR(20)  PRIMARY KEY,
    password    VARCHAR(200) NOT NULL,
    api_key     VARCHAR(200),
    name        VARCHAR(50)  NOT NULL,
    gender      VARCHAR(1),
    birth_date  VARCHAR(8),
    member_type VARCHAR(4),
    created_at  TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP
);

-- 2.2 질병코드
CREATE TABLE disease_codes (
    disease_id       VARCHAR(20)  PRIMARY KEY,
    disease_name_en  VARCHAR(100) NOT NULL,
    disease_name_kr  VARCHAR(100) NOT NULL,
    disease_category VARCHAR(50),
    severity         VARCHAR(20),
    description      VARCHAR(512),
    created_at       TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMP
);

-- 2.3 회원-질병관리
CREATE TABLE member_diseases (
    diagnosis_seq     SERIAL      PRIMARY KEY,
    member_id         VARCHAR(20) NOT NULL REFERENCES members(member_id),
    disease_id        VARCHAR(20) NOT NULL REFERENCES disease_codes(disease_id),
    diagnosis_content VARCHAR(512),
    diagnosed_at      TIMESTAMP   NOT NULL,
    updated_at        TIMESTAMP
);

-- 2.4 회원-심박정보
CREATE TABLE member_heart_rates (
    seq         SERIAL      PRIMARY KEY,
    member_id   VARCHAR(20) NOT NULL REFERENCES members(member_id),
    heart_rate  INTEGER     NOT NULL,
    status      VARCHAR(200),
    note        VARCHAR(200),
    measured_at TIMESTAMP   NOT NULL,
    created_at  TIMESTAMP   NOT NULL DEFAULT NOW()
);

-- 2.5 회원-혈압정보
CREATE TABLE member_blood_pressures (
    seq         SERIAL      PRIMARY KEY,
    member_id   VARCHAR(20) NOT NULL REFERENCES members(member_id),
    systolic    INTEGER     NOT NULL,
    diastolic   INTEGER     NOT NULL,
    status      VARCHAR(200),
    note        VARCHAR(200),
    measured_at TIMESTAMP   NOT NULL,
    created_at  TIMESTAMP   NOT NULL DEFAULT NOW()
);

-- 2.6 회원-체중관리
CREATE TABLE member_weights (
    seq                  SERIAL      PRIMARY KEY,
    member_id            VARCHAR(20) NOT NULL REFERENCES members(member_id),
    weight_kg            NUMERIC     NOT NULL,
    bmi                  NUMERIC     NOT NULL,
    skeletal_muscle_mass NUMERIC,
    body_fat_percentage  NUMERIC,
    status               VARCHAR(100),
    note                 VARCHAR(200),
    measured_at          TIMESTAMP   NOT NULL,
    created_at           TIMESTAMP   NOT NULL DEFAULT NOW()
);

-- 2.7 회원-혈당정보
CREATE TABLE member_glucose (
    seq           SERIAL      PRIMARY KEY,
    member_id     VARCHAR(20) NOT NULL REFERENCES members(member_id),
    glucose_value NUMERIC     NOT NULL,
    status        VARCHAR(100),
    note          VARCHAR(200),
    measured_at   TIMESTAMP   NOT NULL,
    created_at    TIMESTAMP   NOT NULL DEFAULT NOW()
);

-- 2.8 회원-걸음수정보
CREATE TABLE member_steps (
    seq              SERIAL      PRIMARY KEY,
    member_id        VARCHAR(20) NOT NULL REFERENCES members(member_id),
    cumulative_steps INTEGER     NOT NULL,
    measured_at      TIMESTAMP   NOT NULL,
    created_at       TIMESTAMP   NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Indexes
-- ============================================================

CREATE INDEX idx_member_diseases_member_id   ON member_diseases(member_id);
CREATE INDEX idx_member_diseases_disease_id  ON member_diseases(disease_id);

CREATE INDEX idx_heart_rates_member_id       ON member_heart_rates(member_id);
CREATE INDEX idx_heart_rates_measured_at     ON member_heart_rates(measured_at);

CREATE INDEX idx_blood_pressures_member_id   ON member_blood_pressures(member_id);
CREATE INDEX idx_blood_pressures_measured_at ON member_blood_pressures(measured_at);

CREATE INDEX idx_weights_member_id           ON member_weights(member_id);
CREATE INDEX idx_weights_measured_at         ON member_weights(measured_at);

CREATE INDEX idx_glucose_member_id           ON member_glucose(member_id);
CREATE INDEX idx_glucose_measured_at         ON member_glucose(measured_at);

CREATE INDEX idx_steps_member_id             ON member_steps(member_id);
CREATE INDEX idx_steps_measured_at           ON member_steps(measured_at);
