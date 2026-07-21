import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, Between } from 'typeorm';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';

import { Member } from './entities/member.entity';
import { MemberDisease } from './entities/member-disease.entity';
import { DiseaseCode } from './entities/disease-code.entity';
import { MemberHeartRate } from '../health/entities/member-heart-rate.entity';
import { MemberBloodPressure } from '../health/entities/member-blood-pressure.entity';
import { MemberWeight } from '../health/entities/member-weight.entity';
import { MemberGlucose } from '../health/entities/member-glucose.entity';
import { MemberStep } from '../health/entities/member-step.entity';

@Injectable()
export class MembersService {
  constructor(
    @InjectRepository(Member)
    private memberRepository: Repository<Member>,
    @InjectRepository(MemberDisease)
    private memberDiseaseRepository: Repository<MemberDisease>,
    @InjectRepository(DiseaseCode)
    private diseaseCodeRepository: Repository<DiseaseCode>,
    @InjectRepository(MemberHeartRate)
    private heartRateRepository: Repository<MemberHeartRate>,
    @InjectRepository(MemberBloodPressure)
    private bloodPressureRepository: Repository<MemberBloodPressure>,
    @InjectRepository(MemberWeight)
    private weightRepository: Repository<MemberWeight>,
    @InjectRepository(MemberGlucose)
    private glucoseRepository: Repository<MemberGlucose>,
    @InjectRepository(MemberStep)
    private stepRepository: Repository<MemberStep>,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  async findAll(user: any, query: { member_id?: string; member_type?: string; search?: string }) {
    if (user.member_type === 'PATI') {
      // 환자는 본인만
      const member = await this.memberRepository.findOne({
        where: { member_id: user.userid },
      });
      return member ? [member] : [];
    }

    // 의사(DOCT)는 전체 조회
    const where: any = {};
    if (query.member_id) {
      where.member_id = Like(`%${query.member_id}%`);
    }
    if (query.member_type) {
      where.member_type = query.member_type;
    }
    if (query.search) {
      // 이름 또는 ID 검색
      const members = await this.memberRepository
        .createQueryBuilder('m')
        .where('m.name LIKE :search OR m.member_id LIKE :search', {
          search: `%${query.search}%`,
        })
        .getMany();
      return members;
    }

    return this.memberRepository.find({ where });
  }

  async findOne(user: any, memberId: string) {
    if (user.member_type === 'PATI' && user.userid !== memberId) {
      throw new ForbiddenException('본인의 정보만 조회할 수 있습니다.');
    }

    const member = await this.memberRepository.findOne({
      where: { member_id: memberId },
    });

    if (!member) {
      throw new NotFoundException('회원을 찾을 수 없습니다.');
    }

    // 질병 목록 조인
    const memberDiseases = await this.memberDiseaseRepository
      .createQueryBuilder('md')
      .leftJoinAndSelect('md.diseaseCode', 'dc')
      .where('md.member_id = :memberId', { memberId })
      .getMany();

    const diseases = memberDiseases.map((md) => ({
      diagnosis_seq: md.diagnosis_seq,
      disease_id: md.disease_id,
      disease_name_kr: md.diseaseCode?.disease_name_kr,
      disease_name_en: md.diseaseCode?.disease_name_en,
      disease_category: md.diseaseCode?.disease_category,
      severity: md.diseaseCode?.severity,
      diagnosis_content: md.diagnosis_content,
      diagnosed_at: md.diagnosed_at,
    }));

    return {
      member_id: member.member_id,
      name: member.name,
      gender: member.gender,
      birth_date: member.birth_date,
      member_type: member.member_type,
      created_at: member.created_at,
      updated_at: member.updated_at,
      diseases,
    };
  }

  async findLatestHealth(user: any, memberId: string, limit: number = 100) {
    if (user.member_type === 'PATI' && user.userid !== memberId) {
      throw new ForbiddenException('본인의 정보만 조회할 수 있습니다.');
    }

    const member = await this.memberRepository.findOne({
      where: { member_id: memberId },
    });
    if (!member) {
      throw new NotFoundException('회원을 찾을 수 없습니다.');
    }

    const [heartRates, bloodPressures, weights, glucoses, steps] = await Promise.all([
      this.heartRateRepository.find({
        where: { member_id: memberId },
        order: { measured_at: 'DESC' },
        take: limit,
      }),
      this.bloodPressureRepository.find({
        where: { member_id: memberId },
        order: { measured_at: 'DESC' },
        take: limit,
      }),
      this.weightRepository.find({
        where: { member_id: memberId },
        order: { measured_at: 'DESC' },
        take: limit,
      }),
      this.glucoseRepository.find({
        where: { member_id: memberId },
        order: { measured_at: 'DESC' },
        take: limit,
      }),
      this.stepRepository.find({
        where: { member_id: memberId },
        order: { measured_at: 'DESC' },
        take: limit,
      }),
    ]);

    return {
      member_id: memberId,
      fetched_at: new Date(),
      heartRates,
      bloodPressures,
      weights,
      glucoses,
      steps,
    };
  }

  async getDashboard(user: any) {
    if (user.member_type !== 'DOCT') {
      throw new ForbiddenException('의사 권한이 필요합니다.');
    }

    const patients = await this.memberRepository.find({
      where: { member_type: 'PATI' },
    });

    const patientData = await Promise.all(
      patients.map(async (p) => {
        const [latestHr, latestBp, latestGlucose] = await Promise.all([
          this.heartRateRepository.findOne({
            where: { member_id: p.member_id },
            order: { measured_at: 'DESC' },
          }),
          this.bloodPressureRepository.findOne({
            where: { member_id: p.member_id },
            order: { measured_at: 'DESC' },
          }),
          this.glucoseRepository.findOne({
            where: { member_id: p.member_id },
            order: { measured_at: 'DESC' },
          }),
        ]);

        const hasAlert =
          (latestHr?.heart_rate ?? 0) >= 100 ||
          (latestBp?.systolic ?? 0) >= 140 ||
          latestGlucose?.status === 'elevated' ||
          latestGlucose?.status === 'high';

        return {
          member_id: p.member_id,
          name: p.name,
          latestHeartRate: latestHr ?? null,
          latestBP: latestBp ?? null,
          latestGlucose: latestGlucose ?? null,
          hasAlert,
        };
      }),
    );

    // Count today's records (KST: UTC+9)
    const nowUtc = new Date();
    const kstOffset = 9 * 60 * 60 * 1000;
    const kstNow = new Date(nowUtc.getTime() + kstOffset);
    const todayStartKst = new Date(
      Date.UTC(kstNow.getUTCFullYear(), kstNow.getUTCMonth(), kstNow.getUTCDate()),
    );
    const todayStart = new Date(todayStartKst.getTime() - kstOffset);
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000 - 1);

    const [hrCount, bpCount, gluCount, stepCount, weightCount] = await Promise.all([
      this.heartRateRepository.count({ where: { measured_at: Between(todayStart, todayEnd) } }),
      this.bloodPressureRepository.count({ where: { measured_at: Between(todayStart, todayEnd) } }),
      this.glucoseRepository.count({ where: { measured_at: Between(todayStart, todayEnd) } }),
      this.stepRepository.count({ where: { measured_at: Between(todayStart, todayEnd) } }),
      this.weightRepository.count({ where: { measured_at: Between(todayStart, todayEnd) } }),
    ]);

    return {
      total: patients.length,
      abnormal: patientData.filter((p) => p.hasAlert).length,
      todayCount: hrCount + bpCount + gluCount + stepCount + weightCount,
      patients: patientData,
    };
  }

  async findHealthByRange(
    user: any,
    memberId: string,
    from: string,
    to: string,
  ) {
    if (user.member_type === 'PATI' && user.userid !== memberId) {
      throw new ForbiddenException('본인의 정보만 조회할 수 있습니다.');
    }

    const member = await this.memberRepository.findOne({
      where: { member_id: memberId },
    });
    if (!member) {
      throw new NotFoundException('회원을 찾을 수 없습니다.');
    }

    const fromDate = new Date(from);
    const toDate = new Date(to);

    const [heartRates, bloodPressures, weights, glucoses, steps] = await Promise.all([
      this.heartRateRepository
        .createQueryBuilder('hr')
        .where('hr.member_id = :memberId', { memberId })
        .andWhere('hr.measured_at BETWEEN :from AND :to', { from: fromDate, to: toDate })
        .orderBy('hr.measured_at', 'ASC')
        .getMany(),
      this.bloodPressureRepository
        .createQueryBuilder('bp')
        .where('bp.member_id = :memberId', { memberId })
        .andWhere('bp.measured_at BETWEEN :from AND :to', { from: fromDate, to: toDate })
        .orderBy('bp.measured_at', 'ASC')
        .getMany(),
      this.weightRepository
        .createQueryBuilder('w')
        .where('w.member_id = :memberId', { memberId })
        .andWhere('w.measured_at BETWEEN :from AND :to', { from: fromDate, to: toDate })
        .orderBy('w.measured_at', 'ASC')
        .getMany(),
      this.glucoseRepository
        .createQueryBuilder('g')
        .where('g.member_id = :memberId', { memberId })
        .andWhere('g.measured_at BETWEEN :from AND :to', { from: fromDate, to: toDate })
        .orderBy('g.measured_at', 'ASC')
        .getMany(),
      this.stepRepository
        .createQueryBuilder('s')
        .where('s.member_id = :memberId', { memberId })
        .andWhere('s.measured_at BETWEEN :from AND :to', { from: fromDate, to: toDate })
        .orderBy('s.measured_at', 'ASC')
        .getMany(),
    ]);

    return {
      member_id: memberId,
      from,
      to,
      heartRates,
      bloodPressures,
      weights,
      glucoses,
      steps,
    };
  }
}
