import { Injectable, OnModuleInit, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { io, Socket } from 'socket.io-client';

import { Member } from '../members/entities/member.entity';
import { MemberHeartRate } from '../health/entities/member-heart-rate.entity';
import { MemberBloodPressure } from '../health/entities/member-blood-pressure.entity';
import { MemberWeight } from '../health/entities/member-weight.entity';
import { MemberGlucose } from '../health/entities/member-glucose.entity';
import { MemberStep } from '../health/entities/member-step.entity';
import { HealthGateway } from '../health/health.gateway';
import { AlertService } from '../alert/alert.service';

@Injectable()
export class SimulatorService implements OnModuleInit {
  private sockets: Map<string, Socket> = new Map();

  constructor(
    @InjectRepository(Member)
    private memberRepository: Repository<Member>,
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
    private healthGateway: HealthGateway,
    private alertService: AlertService,
    private configService: ConfigService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  async onModuleInit() {
    this.logger.info('SimulatorService initializing...', { context: 'SimulatorService' });

    // api_key가 있는 회원 전체 조회
    const members = await this.memberRepository
      .createQueryBuilder('m')
      .where('m.api_key IS NOT NULL')
      .getMany();

    this.logger.info(`Connecting to simulator for ${members.length} members`, {
      context: 'SimulatorService',
    });

    for (const member of members) {
      this.connectMember(member, 0);
    }
  }

  private connectMember(member: Member, retryCount: number) {
    const simUrl = this.configService.get<string>('SIMULATOR_URL');

    this.logger.info(`Connecting simulator for ${member.member_id} (retry: ${retryCount})`, {
      context: 'SimulatorService',
    });

    const socket = io(simUrl, {
      transports: ['websocket'],
      query: {
        userId: member.member_id,
        apiKey: member.api_key,
      },
      reconnection: false,
    });

    this.sockets.set(member.member_id, socket);

    socket.on('connect', () => {
      this.logger.info(`Simulator connected for ${member.member_id}`, {
        context: 'SimulatorService',
      });
    });

    socket.on('heartRate', async (data: any) => {
      this.logIfToday(member.member_id, 'heartRate', data);
      await this.handleHeartRate(member, data);
    });

    socket.on('bloodPressure', async (data: any) => {
      this.logIfToday(member.member_id, 'bloodPressure', data);
      await this.handleBloodPressure(member, data);
    });

    socket.on('weight', async (data: any) => {
      this.logIfToday(member.member_id, 'weight', data);
      await this.handleWeight(member, data);
    });

    socket.on('glucose', async (data: any) => {
      this.logIfToday(member.member_id, 'glucose', data);
      await this.handleGlucose(member, data);
    });

    socket.on('stepCount', async (data: any) => {
      this.logIfToday(member.member_id, 'stepCount', data);
      await this.handleStepCount(member, data);
    });

    socket.on('error', (data: any) => {
      this.logger.error(
        `Simulator error for ${member.member_id}: ${JSON.stringify(data)}`,
        { context: 'SimulatorService' },
      );
    });

    socket.on('disconnect', (reason: string) => {
      this.logger.warn(
        `Simulator disconnected for ${member.member_id}: ${reason} (retry: ${retryCount}/3)`,
        { context: 'SimulatorService' },
      );
      if (retryCount < 3) {
        setTimeout(() => this.connectMember(member, retryCount + 1), 5000);
      } else {
        this.logger.error(
          `Simulator permanently disconnected for ${member.member_id}: 재연결 3회 실패, 연결 중지`,
          { context: 'SimulatorService' },
        );
        this.sockets.delete(member.member_id);
      }
    });

    socket.on('connect_error', (err: Error) => {
      this.logger.error(
        `Simulator connect_error for ${member.member_id}: ${err.message} (retry: ${retryCount}/3)`,
        { context: 'SimulatorService' },
      );
      socket.disconnect();
      if (retryCount < 3) {
        setTimeout(() => this.connectMember(member, retryCount + 1), 5000);
      } else {
        this.logger.error(
          `Simulator permanently failed for ${member.member_id}: 재연결 3회 실패, 연결 중지`,
          { context: 'SimulatorService' },
        );
        this.sockets.delete(member.member_id);
      }
    });
  }

  private async handleHeartRate(member: Member, data: any) {
    try {
      const measuredAt = data.timestamp ? new Date(data.timestamp) : new Date();
      const heartRate = data.heartRate;
      const source = data.source;
      const note = data.note;

      // DB 저장
      const entity = this.heartRateRepository.create({
        member_id: member.member_id,
        heart_rate: heartRate,
        status: source,
        note: note || null,
        measured_at: measuredAt,
      });
      await this.heartRateRepository.save(entity);

      // WebSocket push
      this.healthGateway.pushToClients(member.member_id, 'heartRate', {
        memberId: member.member_id,
        heartRate,
        source,
        note,
        measuredAt: measuredAt.toISOString(),
      });

      // 이상 감지
      const isAbnormal = source === 'abnormal_event' || heartRate >= 100;
      if (isAbnormal) {
        const alertMsg = `[이상 감지] ${member.member_id} ${member.name}\n항목: 심박수 | 값: ${heartRate} bpm\n시각: ${measuredAt.toISOString()}`;
        await this.alertService.sendSlack(alertMsg);

        this.healthGateway.pushToClients(member.member_id, 'alert', {
          memberId: member.member_id,
          memberName: member.name,
          type: 'heartRate',
          value: { heartRate, source },
          measuredAt: measuredAt.toISOString(),
        });
      }
    } catch (err) {
      this.logger.error(`heartRate handler error: ${err.message}`, { context: 'SimulatorService' });
    }
  }

  private async handleBloodPressure(member: Member, data: any) {
    try {
      const measuredAt = data.timestamp ? new Date(data.timestamp) : new Date();
      const systolic = data.systolic;
      const diastolic = data.diastolic;
      const source = data.source;

      // DB 저장
      const entity = this.bloodPressureRepository.create({
        member_id: member.member_id,
        systolic,
        diastolic,
        status: source,
        note: undefined,
        measured_at: measuredAt,
      });
      await this.bloodPressureRepository.save(entity);

      // WebSocket push
      this.healthGateway.pushToClients(member.member_id, 'bloodPressure', {
        memberId: member.member_id,
        systolic,
        diastolic,
        measuredAt: measuredAt.toISOString(),
      });

      // 이상 감지
      const isAbnormal = systolic >= 140 || diastolic >= 90;
      if (isAbnormal) {
        const alertMsg = `[이상 감지] ${member.member_id} ${member.name}\n항목: 혈압 | 값: ${systolic}/${diastolic} mmHg\n시각: ${measuredAt.toISOString()}`;
        await this.alertService.sendSlack(alertMsg);

        this.healthGateway.pushToClients(member.member_id, 'alert', {
          memberId: member.member_id,
          memberName: member.name,
          type: 'bloodPressure',
          value: { systolic, diastolic },
          measuredAt: measuredAt.toISOString(),
        });
      }
    } catch (err) {
      this.logger.error(`bloodPressure handler error: ${err.message}`, {
        context: 'SimulatorService',
      });
    }
  }

  private async handleWeight(member: Member, data: any) {
    try {
      const measuredAt = data.timestamp ? new Date(data.timestamp) : new Date();
      const weightKg = data.weightKg;
      const bmi = data.bmi;
      const skeletalMuscleMassKg = data.skeletalMuscleMassKg;
      const bodyFatPercentage = data.bodyFatPercentage;

      // DB 저장
      const entity = this.weightRepository.create({
        member_id: member.member_id,
        weight_kg: weightKg,
        bmi,
        skeletal_muscle_mass: skeletalMuscleMassKg,
        body_fat_percentage: bodyFatPercentage,
        status: undefined,
        note: undefined,
        measured_at: measuredAt,
      });
      await this.weightRepository.save(entity);

      // WebSocket push
      this.healthGateway.pushToClients(member.member_id, 'weight', {
        memberId: member.member_id,
        weightKg,
        bmi,
        skeletalMuscleMassKg,
        bodyFatPercentage,
        measuredAt: measuredAt.toISOString(),
      });
    } catch (err) {
      this.logger.error(`weight handler error: ${err.message}`, { context: 'SimulatorService' });
    }
  }

  private async handleGlucose(member: Member, data: any) {
    try {
      const measuredAt = data.timestamp ? new Date(data.timestamp) : new Date();
      const glucoseValue = data.glucoseMgDl;
      const status = data.status;

      // DB 저장
      const entity = this.glucoseRepository.create({
        member_id: member.member_id,
        glucose_value: glucoseValue,
        status,
        note: undefined,
        measured_at: measuredAt,
      });
      await this.glucoseRepository.save(entity);

      // WebSocket push
      this.healthGateway.pushToClients(member.member_id, 'glucose', {
        memberId: member.member_id,
        glucoseValue,
        status,
        measuredAt: measuredAt.toISOString(),
      });

      // 이상 감지
      const isAbnormal = status === 'elevated' || status === 'high';
      if (isAbnormal) {
        const alertMsg = `[이상 감지] ${member.member_id} ${member.name}\n항목: 혈당 | 값: ${glucoseValue} mg/dL (${status})\n시각: ${measuredAt.toISOString()}`;
        await this.alertService.sendSlack(alertMsg);

        this.healthGateway.pushToClients(member.member_id, 'alert', {
          memberId: member.member_id,
          memberName: member.name,
          type: 'glucose',
          value: { glucoseValue, status },
          measuredAt: measuredAt.toISOString(),
        });
      }
    } catch (err) {
      this.logger.error(`glucose handler error: ${err.message}`, { context: 'SimulatorService' });
    }
  }

  private async handleStepCount(member: Member, data: any) {
    try {
      const measuredAt = data.timestamp ? new Date(data.timestamp) : new Date();
      const cumulativeSteps = data.stepCount;

      // DB 저장
      const entity = this.stepRepository.create({
        member_id: member.member_id,
        cumulative_steps: cumulativeSteps,
        measured_at: measuredAt,
      });
      await this.stepRepository.save(entity);

      // WebSocket push
      this.healthGateway.pushToClients(member.member_id, 'stepCount', {
        memberId: member.member_id,
        cumulativeSteps,
        measuredAt: measuredAt.toISOString(),
      });
    } catch (err) {
      this.logger.error(`stepCount handler error: ${err.message}`, { context: 'SimulatorService' });
    }
  }

  private isToday(date: Date): boolean {
    const now = new Date();
    return (
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth() &&
      date.getDate() === now.getDate()
    );
  }

  private logIfToday(memberId: string, type: string, data: any) {
    const measuredAt = data.timestamp ? new Date(data.timestamp) : new Date();
    if (this.isToday(measuredAt)) {
      this.logger.info(
        `[수신] ${memberId} | ${type} | ${JSON.stringify(data)}`,
        { context: 'SimulatorService' },
      );
    }
  }
}
