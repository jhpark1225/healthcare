import { Injectable, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';

import { Member } from '../members/entities/member.entity';
import { DiseaseCode } from '../members/entities/disease-code.entity';
import { MemberDisease } from '../members/entities/member-disease.entity';

const MEMBERS = [
  { member_id: 'admin',    password: 'admin001123!', api_key: 'admin',    member_type: 'DOCT', name: '김닥터', birth_date: '19680311', gender: 'M' },
  { member_id: 'user_001', password: 'user_001123!', api_key: 'key_001',  member_type: 'PATI', name: '김민준', birth_date: '19980722', gender: 'M' },
  { member_id: 'user_002', password: 'user_002123!', api_key: 'key_002',  member_type: 'PATI', name: '이서연', birth_date: '19921105', gender: 'F' },
  { member_id: 'user_003', password: 'user_003123!', api_key: 'key_003',  member_type: 'PATI', name: '박지훈', birth_date: '19810217', gender: 'M' },
  { member_id: 'user_004', password: 'user_004123!', api_key: 'key_004',  member_type: 'PATI', name: '최수빈', birth_date: '19740930', gender: 'F' },
  { member_id: 'user_005', password: 'user_005123!', api_key: 'key_005',  member_type: 'PATI', name: '정하늘', birth_date: '20070508', gender: 'M' },
  { member_id: 'user_006', password: 'user_006123!', api_key: 'key_006',  member_type: 'PATI', name: '한지민', birth_date: '19591224', gender: 'F' },
  { member_id: 'user_007', password: 'user_007123!', api_key: 'key_007',  member_type: 'PATI', name: '김도윤', birth_date: '19950413', gender: 'M' },
  { member_id: 'user_008', password: 'user_008123!', api_key: 'key_008',  member_type: 'PATI', name: '이민지', birth_date: '20020819', gender: 'F' },
  { member_id: 'user_009', password: 'user_009123!', api_key: 'key_009',  member_type: 'PATI', name: '오성민', birth_date: '19680602', gender: 'M' },
  { member_id: 'user_010', password: 'user_010123!', api_key: 'key_010',  member_type: 'PATI', name: '서예진', birth_date: '19871027', gender: 'F' },
];

const DISEASE_CODES = [
  { disease_id: 'HYP',  disease_name_en: 'Hypertension',          disease_name_kr: '고혈압',      disease_category: 'cardiovascular',  severity: 'moderate', description: 'High blood pressure leading to increased cardiovascular risk.' },
  { disease_id: 'DIA',  disease_name_en: 'Diabetes',              disease_name_kr: '당뇨병',      disease_category: 'metabolic',       severity: 'moderate', description: 'Type 2 diabetes with glucose regulation issues.' },
  { disease_id: 'MI',   disease_name_en: 'Myocardial Infarction', disease_name_kr: '심근경색',    disease_category: 'cardiovascular',  severity: 'high',     description: 'History of heart attack requiring careful heart rate monitoring.' },
  { disease_id: 'ARR',  disease_name_en: 'Arrhythmia',            disease_name_kr: '부정맥',      disease_category: 'cardiovascular',  severity: 'moderate', description: 'Irregular heart rhythm that may cause variability in heart rate.' },
  { disease_id: 'AST',  disease_name_en: 'Asthma',                disease_name_kr: '천식',        disease_category: 'respiratory',     severity: 'low',      description: 'Mild airway constriction affecting exercise tolerance.' },
  { disease_id: 'SLP',  disease_name_en: 'Sleep Apnea',           disease_name_kr: '수면무호흡',  disease_category: 'respiratory',     severity: 'moderate', description: 'Sleep-disordered breathing that can worsen cardiovascular stress.' },
  { disease_id: 'CHO',  disease_name_en: 'High Cholesterol',      disease_name_kr: '고지혈증',    disease_category: 'metabolic',       severity: 'low',      description: 'Elevated cholesterol levels contributing to cardiovascular risk.' },
  { disease_id: 'ATH',  disease_name_en: 'Arthritis',             disease_name_kr: '관절염',      disease_category: 'musculoskeletal', severity: 'low',      description: 'Joint discomfort reducing walking comfort and activity.' },
  { disease_id: 'THY',  disease_name_en: 'Thyroid Issue',         disease_name_kr: '갑상선 문제', disease_category: 'endocrine',       severity: 'low',      description: 'Thyroid condition affecting metabolism and energy levels.' },
  { disease_id: 'none', disease_name_en: 'None',                  disease_name_kr: '없음',        disease_category: 'general',         severity: 'none',     description: 'No diagnosed medical conditions.' },
];

const MEMBER_DISEASES = [
  { member_id: 'user_003', disease_id: 'HYP', diagnosis_content: '고혈압과 당뇨가 동시에 있음',         diagnosed_at: new Date('2018-03-20') },
  { member_id: 'user_003', disease_id: 'DIA', diagnosis_content: '인슐린 저항성 관찰',                   diagnosed_at: new Date('2019-06-10') },
  { member_id: 'user_002', disease_id: 'HYP', diagnosis_content: '체중 증가와 함께 혈압 조절 필요',      diagnosed_at: new Date('2021-08-15') },
  { member_id: 'user_004', disease_id: 'HYP', diagnosis_content: '혈압·혈당 관리 중',                    diagnosed_at: new Date('2016-11-02') },
  { member_id: 'user_004', disease_id: 'DIA', diagnosis_content: '체중 감량 필요',                       diagnosed_at: new Date('2017-04-12') },
  { member_id: 'user_004', disease_id: 'ARR', diagnosis_content: '불규칙 심박 증가 관찰',                diagnosed_at: new Date('2020-01-25') },
  { member_id: 'user_006', disease_id: 'HYP', diagnosis_content: '고령으로 인한 혈압 관리 중요',         diagnosed_at: new Date('2014-09-30') },
  { member_id: 'user_006', disease_id: 'MI',  diagnosis_content: '심근경색 이력 있음',                   diagnosed_at: new Date('2022-02-18') },
  { member_id: 'user_006', disease_id: 'ATH', diagnosis_content: '관절염으로 보행량 감소',               diagnosed_at: new Date('2020-12-05') },
  { member_id: 'user_007', disease_id: 'AST', diagnosis_content: '운동 시 호흡 조절 필요',               diagnosed_at: new Date('2017-07-21') },
  { member_id: 'user_009', disease_id: 'HYP', diagnosis_content: '만성 고혈압',                          diagnosed_at: new Date('2012-05-08') },
  { member_id: 'user_009', disease_id: 'DIA', diagnosis_content: '당뇨 관리 중',                         diagnosed_at: new Date('2015-10-04') },
  { member_id: 'user_009', disease_id: 'MI',  diagnosis_content: '심근경색 이력으로 심박 패턴 주의',     diagnosed_at: new Date('2023-03-14') },
  { member_id: 'user_009', disease_id: 'SLP', diagnosis_content: '수면무호흡 동반',                      diagnosed_at: new Date('2020-08-19') },
  { member_id: 'user_010', disease_id: 'DIA', diagnosis_content: '갑상선 관련 대사 변화 관찰',           diagnosed_at: new Date('2021-01-30') },
];

@Injectable()
export class DatabaseSeederService implements OnApplicationBootstrap {
  private readonly logger = new Logger(DatabaseSeederService.name);

  constructor(
    @InjectRepository(Member)
    private memberRepo: Repository<Member>,
    @InjectRepository(DiseaseCode)
    private diseaseCodeRepo: Repository<DiseaseCode>,
    @InjectRepository(MemberDisease)
    private memberDiseaseRepo: Repository<MemberDisease>,
  ) {}

  async onApplicationBootstrap() {
    try {
      await this.seedMembers();
      await this.seedDiseaseCodes();
      await this.seedMemberDiseases();
    } catch (err) {
      this.logger.error(`시드 실패: ${(err as Error).message}`);
    }
  }

  private async seedMembers() {
    this.logger.log('[Seed] members 시드 시작...');
    for (const u of MEMBERS) {
      try {
        const hashed = await bcrypt.hash(u.password, 6);
        const exists = await this.memberRepo.findOne({ where: { member_id: u.member_id } });
        if (exists) {
          await this.memberRepo.update({ member_id: u.member_id }, { password: hashed, api_key: u.api_key, name: u.name, gender: u.gender, birth_date: u.birth_date, member_type: u.member_type });
          this.logger.log(`[Seed] ${u.member_id} 업데이트 완료`);
        } else {
          await this.memberRepo.save({ ...u, password: hashed });
          this.logger.log(`[Seed] ${u.member_id} 신규 삽입 완료`);
        }
      } catch (err) {
        this.logger.error(`[Seed] ${u.member_id} 실패: ${(err as Error).message}`);
      }
    }
    this.logger.log(`[Seed] members ${MEMBERS.length}명 처리 완료`);
  }

  private async seedDiseaseCodes() {
    const count = await this.diseaseCodeRepo.count();
    if (count > 0) {
      this.logger.log(`[Seed] disease_codes 이미 있음 (${count}개) — 스킵`);
      return;
    }
    this.logger.log('[Seed] disease_codes 시드 시작...');
    await this.diseaseCodeRepo.save(DISEASE_CODES);
    this.logger.log(`[Seed] disease_codes ${DISEASE_CODES.length}개 완료`);
  }

  private async seedMemberDiseases() {
    const count = await this.memberDiseaseRepo.count();
    if (count > 0) {
      this.logger.log(`[Seed] member_diseases 이미 있음 (${count}개) — 스킵`);
      return;
    }
    this.logger.log('[Seed] member_diseases 시드 시작...');
    await this.memberDiseaseRepo.save(MEMBER_DISEASES);
    this.logger.log(`[Seed] member_diseases ${MEMBER_DISEASES.length}개 완료`);
  }
}
