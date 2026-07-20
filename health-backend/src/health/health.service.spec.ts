import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { HealthService } from './health.service';
import { MemberHeartRate } from './entities/member-heart-rate.entity';
import { MemberBloodPressure } from './entities/member-blood-pressure.entity';
import { MemberWeight } from './entities/member-weight.entity';
import { MemberGlucose } from './entities/member-glucose.entity';
import { MemberStep } from './entities/member-step.entity';

const mockRepo = () => ({
  find: jest.fn(),
  delete: jest.fn(),
  createQueryBuilder: jest.fn().mockReturnValue({
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([]),
  }),
});

const mockConfigService = { get: jest.fn().mockReturnValue(7) };
const mockLogger = { info: jest.fn(), error: jest.fn(), warn: jest.fn() };

const doctUser = { userid: 'admin', member_type: 'DOCT' };
const patiUser = { userid: 'user_001', member_type: 'PATI' };

describe('HealthService', () => {
  let service: HealthService;
  let hrRepo: ReturnType<typeof mockRepo>;
  let bpRepo: ReturnType<typeof mockRepo>;
  let glucoseRepo: ReturnType<typeof mockRepo>;
  let weightRepo: ReturnType<typeof mockRepo>;
  let stepRepo: ReturnType<typeof mockRepo>;

  beforeEach(async () => {
    hrRepo = mockRepo();
    bpRepo = mockRepo();
    glucoseRepo = mockRepo();
    weightRepo = mockRepo();
    stepRepo = mockRepo();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HealthService,
        { provide: getRepositoryToken(MemberHeartRate), useValue: hrRepo },
        { provide: getRepositoryToken(MemberBloodPressure), useValue: bpRepo },
        { provide: getRepositoryToken(MemberWeight), useValue: weightRepo },
        { provide: getRepositoryToken(MemberGlucose), useValue: glucoseRepo },
        { provide: getRepositoryToken(MemberStep), useValue: stepRepo },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: WINSTON_MODULE_PROVIDER, useValue: mockLogger },
      ],
    }).compile();

    service = module.get<HealthService>(HealthService);
  });

  // ────────── 심박수 ──────────

  describe('findHeartRates', () => {
    it('의사 → 타인 심박수 조회 허용', async () => {
      hrRepo.find.mockResolvedValue([{ seq: 1, heart_rate: 72 }]);
      const result = await service.findHeartRates(doctUser, 'user_001', { limit: 10 });
      expect(hrRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ take: 10 }),
      );
      expect(result).toHaveLength(1);
    });

    it('환자 → 본인 심박수 조회 허용', async () => {
      hrRepo.find.mockResolvedValue([]);
      await expect(
        service.findHeartRates(patiUser, 'user_001', {}),
      ).resolves.not.toThrow();
    });

    it('환자 → 타인 심박수 조회 → 403', async () => {
      await expect(
        service.findHeartRates(patiUser, 'user_002', {}),
      ).rejects.toThrow(ForbiddenException);
    });

    it('from/to 제공 시 createQueryBuilder 사용', async () => {
      await service.findHeartRates(doctUser, 'user_001', {
        from: '2026-07-19T00:00:00+09:00',
        to: '2026-07-19T23:59:59+09:00',
      });
      expect(hrRepo.createQueryBuilder).toHaveBeenCalled();
    });

    it('limit 미지정 시 기본값 100 사용', async () => {
      hrRepo.find.mockResolvedValue([]);
      await service.findHeartRates(doctUser, 'user_001', {});
      expect(hrRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ take: 100 }),
      );
    });
  });

  // ────────── 혈압 ──────────

  describe('findBloodPressures', () => {
    it('의사 → 혈압 조회 허용', async () => {
      bpRepo.find.mockResolvedValue([{ seq: 1, systolic: 120, diastolic: 80 }]);
      const result = await service.findBloodPressures(doctUser, 'user_001', { limit: 5 });
      expect(bpRepo.find).toHaveBeenCalledWith(expect.objectContaining({ take: 5 }));
      expect(result).toHaveLength(1);
    });

    it('환자 → 타인 혈압 조회 → 403', async () => {
      await expect(
        service.findBloodPressures(patiUser, 'user_002', {}),
      ).rejects.toThrow(ForbiddenException);
    });

    it('기간 조회 시 createQueryBuilder 사용', async () => {
      await service.findBloodPressures(doctUser, 'user_001', {
        from: '2026-07-19T00:00:00+09:00',
        to: '2026-07-19T23:59:59+09:00',
      });
      expect(bpRepo.createQueryBuilder).toHaveBeenCalled();
    });
  });

  // ────────── 혈당 ──────────

  describe('findGlucose', () => {
    it('의사 → 혈당 조회 허용', async () => {
      glucoseRepo.find.mockResolvedValue([{ seq: 1, glucose_value: 95 }]);
      const result = await service.findGlucose(doctUser, 'user_001', { limit: 20 });
      expect(glucoseRepo.find).toHaveBeenCalledWith(expect.objectContaining({ take: 20 }));
      expect(result).toHaveLength(1);
    });

    it('환자 → 타인 혈당 조회 → 403', async () => {
      await expect(
        service.findGlucose(patiUser, 'user_002', {}),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ────────── 체중 ──────────

  describe('findWeights', () => {
    it('의사 → 체중 조회 허용', async () => {
      weightRepo.find.mockResolvedValue([{ seq: 1, weight_kg: 70 }]);
      const result = await service.findWeights(doctUser, 'user_001', { limit: 50 });
      expect(weightRepo.find).toHaveBeenCalledWith(expect.objectContaining({ take: 50 }));
      expect(result).toHaveLength(1);
    });

    it('환자 → 타인 체중 조회 → 403', async () => {
      await expect(
        service.findWeights(patiUser, 'user_002', {}),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ────────── 걸음수 ──────────

  describe('findSteps', () => {
    it('의사 → 걸음수 조회 허용', async () => {
      stepRepo.find.mockResolvedValue([{ seq: 1, cumulative_steps: 5000 }]);
      const result = await service.findSteps(doctUser, 'user_001', { limit: 10 });
      expect(stepRepo.find).toHaveBeenCalledWith(expect.objectContaining({ take: 10 }));
      expect(result).toHaveLength(1);
    });

    it('환자 → 타인 걸음수 조회 → 403', async () => {
      await expect(
        service.findSteps(patiUser, 'user_002', {}),
      ).rejects.toThrow(ForbiddenException);
    });

    it('기간 조회 시 createQueryBuilder 사용', async () => {
      await service.findSteps(doctUser, 'user_001', {
        from: '2026-07-19T00:00:00+09:00',
        to: '2026-07-19T23:59:59+09:00',
      });
      expect(stepRepo.createQueryBuilder).toHaveBeenCalled();
    });
  });
});
