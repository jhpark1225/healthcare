import {
  Injectable,
  Inject,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, Between, FindManyOptions } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';

import { MemberHeartRate } from './entities/member-heart-rate.entity';
import { MemberBloodPressure } from './entities/member-blood-pressure.entity';
import { MemberWeight } from './entities/member-weight.entity';
import { MemberGlucose } from './entities/member-glucose.entity';
import { MemberStep } from './entities/member-step.entity';

export interface HealthQueryParams {
  from?: string;
  to?: string;
  limit?: number;
}

@Injectable()
export class HealthService {
  constructor(
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
    private configService: ConfigService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  @Cron('0 0 * * *')
  async deleteOldHealthData() {
    const retentionDays = this.configService.get<number>('DATA_RETENTION_DAYS') || 7;
    const threshold = new Date();
    threshold.setDate(threshold.getDate() - retentionDays);

    this.logger.info(
      `Deleting health data older than ${retentionDays}d (${threshold.toISOString()})`,
      { context: 'HealthService' },
    );

    const [hr, bp, w, g, s] = await Promise.all([
      this.heartRateRepository.delete({ measured_at: LessThan(threshold) }),
      this.bloodPressureRepository.delete({ measured_at: LessThan(threshold) }),
      this.weightRepository.delete({ measured_at: LessThan(threshold) }),
      this.glucoseRepository.delete({ measured_at: LessThan(threshold) }),
      this.stepRepository.delete({ measured_at: LessThan(threshold) }),
    ]);

    this.logger.info(
      `Deleted: heartRates=${hr.affected}, bp=${bp.affected}, weights=${w.affected}, glucoses=${g.affected}, steps=${s.affected}`,
      { context: 'HealthService' },
    );
  }

  // ────────────────── 통합 최신 조회 ──────────────────

  async findLatest(user: any, memberId: string, limit = 20) {
    this.checkAuth(user, memberId);
    const [heartRates, bloodPressures, glucoses, steps, weights] = await Promise.all([
      this.queryRepo(this.heartRateRepository, 'hr', memberId, { limit }),
      this.queryRepo(this.bloodPressureRepository, 'bp', memberId, { limit }),
      this.queryRepo(this.glucoseRepository, 'g', memberId, { limit }),
      this.queryRepo(this.stepRepository, 's', memberId, { limit }),
      this.queryRepo(this.weightRepository, 'w', memberId, { limit }),
    ]);
    return {
      member_id: memberId,
      fetched_at: new Date().toISOString(),
      heartRates,
      bloodPressures,
      glucoses,
      steps,
      weights,
    };
  }

  // ────────────────── 개별 건강 데이터 조회 ──────────────────

  async findHeartRates(user: any, memberId: string, params: HealthQueryParams) {
    this.checkAuth(user, memberId);
    return this.queryRepo(this.heartRateRepository, 'hr', memberId, params);
  }

  async findBloodPressures(user: any, memberId: string, params: HealthQueryParams) {
    this.checkAuth(user, memberId);
    return this.queryRepo(this.bloodPressureRepository, 'bp', memberId, params);
  }

  async findGlucose(user: any, memberId: string, params: HealthQueryParams) {
    this.checkAuth(user, memberId);
    return this.queryRepo(this.glucoseRepository, 'g', memberId, params);
  }

  async findWeights(user: any, memberId: string, params: HealthQueryParams) {
    this.checkAuth(user, memberId);
    return this.queryRepo(this.weightRepository, 'w', memberId, params);
  }

  async findSteps(user: any, memberId: string, params: HealthQueryParams) {
    this.checkAuth(user, memberId);
    return this.queryRepo(this.stepRepository, 's', memberId, params);
  }

  // ────────────────── 내부 유틸 ──────────────────

  private checkAuth(user: any, memberId: string) {
    if (user.member_type === 'PATI' && user.userid !== memberId) {
      throw new ForbiddenException('본인의 정보만 조회할 수 있습니다.');
    }
  }

  private async queryRepo<T extends object>(
    repo: Repository<T>,
    alias: string,
    memberId: string,
    params: HealthQueryParams,
  ): Promise<T[]> {
    const limit = params.limit || 100;

    if (params.from && params.to) {
      return repo
        .createQueryBuilder(alias)
        .where(`${alias}.member_id = :memberId`, { memberId })
        .andWhere(`${alias}.measured_at BETWEEN :from AND :to`, {
          from: new Date(params.from),
          to: new Date(params.to),
        })
        .orderBy(`${alias}.measured_at`, 'ASC')
        .getMany();
    }

    const options: FindManyOptions<T> = {
      where: { member_id: memberId } as any,
      order: { measured_at: 'DESC' } as any,
      take: limit,
    };
    return repo.find(options);
  }
}
