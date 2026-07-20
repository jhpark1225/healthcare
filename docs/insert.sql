-- ============================================================
-- Healthcare DB Seed Data
-- Database: PostgreSQL
-- Source: users_seed.csv / disease_code_seed.csv / user_disease_seed.csv
-- ============================================================

-- pgcrypto 확장 활성화 (bcrypt 해싱에 필요)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- members (회원관리)
-- user_type: D → DOCT, P → PATI
-- birth_date: YYYY-MM-DD → YYYYMMDD
-- password: crypt(passwd, gen_salt('bf')) — bcrypt 해싱
-- ============================================================

INSERT INTO members (member_id, api_key, password, member_type, name, birth_date, gender, created_at)
VALUES
    ('admin',    'admin',    crypt('admin001123!',  gen_salt('bf')), 'DOCT', '김닥터', '19680311', 'M', NOW()),
    ('user_001', 'key_001',  crypt('user_001123!',  gen_salt('bf')), 'PATI', '김민준', '19980722', 'M', NOW()),
    ('user_002', 'key_002',  crypt('user_002123!',  gen_salt('bf')), 'PATI', '이서연', '19921105', 'F', NOW()),
    ('user_003', 'key_003',  crypt('user_003123!',  gen_salt('bf')), 'PATI', '박지훈', '19810217', 'M', NOW()),
    ('user_004', 'key_004',  crypt('user_004123!',  gen_salt('bf')), 'PATI', '최수빈', '19740930', 'F', NOW()),
    ('user_005', 'key_005',  crypt('user_005123!',  gen_salt('bf')), 'PATI', '정하늘', '20070508', 'M', NOW()),
    ('user_006', 'key_006',  crypt('user_006123!',  gen_salt('bf')), 'PATI', '한지민', '19591224', 'F', NOW()),
    ('user_007', 'key_007',  crypt('user_007123!',  gen_salt('bf')), 'PATI', '김도윤', '19950413', 'M', NOW()),
    ('user_008', 'key_008',  crypt('user_008123!',  gen_salt('bf')), 'PATI', '이민지', '20020819', 'F', NOW()),
    ('user_009', 'key_009',  crypt('user_009123!',  gen_salt('bf')), 'PATI', '오성민', '19680602', 'M', NOW()),
    ('user_010', 'key_010',  crypt('user_010123!',  gen_salt('bf')), 'PATI', '서예진', '19871027', 'F', NOW());

-- ============================================================
-- disease_codes (질병코드)
-- ============================================================

INSERT INTO disease_codes (disease_id, disease_name_en, disease_name_kr, disease_category, severity, description, created_at)
VALUES
    ('HYP',  'Hypertension',          '고혈압',      'cardiovascular',  'moderate', 'High blood pressure leading to increased cardiovascular risk.',              NOW()),
    ('DIA',  'Diabetes',              '당뇨병',      'metabolic',       'moderate', 'Type 2 diabetes with glucose regulation issues.',                           NOW()),
    ('MI',   'Myocardial Infarction', '심근경색',    'cardiovascular',  'high',     'History of heart attack requiring careful heart rate monitoring.',           NOW()),
    ('ARR',  'Arrhythmia',            '부정맥',      'cardiovascular',  'moderate', 'Irregular heart rhythm that may cause variability in heart rate.',           NOW()),
    ('AST',  'Asthma',                '천식',        'respiratory',     'low',      'Mild airway constriction affecting exercise tolerance.',                     NOW()),
    ('SLP',  'Sleep Apnea',           '수면무호흡',  'respiratory',     'moderate', 'Sleep-disordered breathing that can worsen cardiovascular stress.',          NOW()),
    ('CHO',  'High Cholesterol',      '고지혈증',    'metabolic',       'low',      'Elevated cholesterol levels contributing to cardiovascular risk.',           NOW()),
    ('ATH',  'Arthritis',             '관절염',      'musculoskeletal', 'low',      'Joint discomfort reducing walking comfort and activity.',                   NOW()),
    ('THY',  'Thyroid Issue',         '갑상선 문제', 'endocrine',       'low',      'Thyroid condition affecting metabolism and energy levels.',                  NOW()),
    ('none', 'None',                  '없음',        'general',         'none',     'No diagnosed medical conditions.',                                          NOW());

-- ============================================================
-- member_diseases (회원-질병관리)
-- 'none' 질병 레코드는 diagnosed_at 이 없으므로 NULL 처리
-- (table.sql 의 diagnosed_at 컬럼에서 NOT NULL 제약 제거 필요)
-- ============================================================

INSERT INTO member_diseases (member_id, disease_id, diagnosis_content, diagnosed_at)
VALUES
    ('user_003', 'HYP',  '고혈압과 당뇨가 동시에 있음',              '2018-03-20 00:00:00'),
    ('user_003', 'DIA',  '인슐린 저항성 관찰',                        '2019-06-10 00:00:00'),
    ('user_002', 'HYP',  '체중 증가와 함께 혈압 조절 필요',           '2021-08-15 00:00:00'),
    ('user_002', 'HYP',  '체중 증가와 함께 혈압 조절 필요',           '2025-08-15 00:00:00'),
    ('user_004', 'HYP',  '혈압·혈당 관리 중',                         '2016-11-02 00:00:00'),
    ('user_004', 'DIA',  '체중 감량 필요',                            '2017-04-12 00:00:00'),
    ('user_004', 'ARR',  '불규칙 심박 증가 관찰',                     '2020-01-25 00:00:00'),
    ('user_006', 'HYP',  '고령으로 인한 혈압 관리 중요',              '2014-09-30 00:00:00'),
    ('user_006', 'MI',   '심근경색 이력 있음',                        '2022-02-18 00:00:00'),
    ('user_006', 'ATH',  '관절염으로 보행량 감소',                    '2020-12-05 00:00:00'),
    ('user_007', 'AST',  '운동 시 호흡 조절 필요',                    '2017-07-21 00:00:00'),
    ('user_009', 'HYP',  '만성 고혈압',                               '2012-05-08 00:00:00'),
    ('user_009', 'DIA',  '당뇨 관리 중',                              '2015-10-04 00:00:00'),
    ('user_009', 'MI',   '심근경색 이력으로 심박 패턴 주의',          '2023-03-14 00:00:00'),
    ('user_009', 'SLP',  '수면무호흡 동반',                           '2020-08-19 00:00:00'),
    ('user_010', 'DIA',  '갑상선 관련 대사 변화 관찰',                '2021-01-30 00:00:00');
