import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

/**
 * 건강 데이터 개별 조회 E2E 테스트
 * - 실제 DB 연결 필요 (.env DB 접속 정보)
 * - 시드 계정: admin (DOCT), user_001 (PATI)
 */
describe('Health Individual API (E2E)', () => {
  let app: INestApplication;
  let doctToken: string;
  let patiToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // 의사 토큰 발급
    const doctRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ id: 'admin', passwd: 'admin001123!' });
    doctToken = doctRes.body.access_token;

    // 환자 토큰 발급
    const patiRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ id: 'user_001', passwd: 'user_001123!' });
    patiToken = patiRes.body.access_token;
  });

  afterAll(async () => {
    await app.close();
  });

  // ────────── 심박수 ──────────

  describe('GET /members/:id/health/heart-rates', () => {
    it('의사 → 200 + 배열 반환', async () => {
      const res = await request(app.getHttpServer())
        .get('/members/user_001/health/heart-rates?limit=5')
        .set('Authorization', `Bearer ${doctToken}`)
        .expect(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('환자 → 본인 데이터 200', async () => {
      await request(app.getHttpServer())
        .get('/members/user_001/health/heart-rates?limit=5')
        .set('Authorization', `Bearer ${patiToken}`)
        .expect(200);
    });

    it('환자 → 타인 데이터 → 403', async () => {
      await request(app.getHttpServer())
        .get('/members/user_002/health/heart-rates')
        .set('Authorization', `Bearer ${patiToken}`)
        .expect(403);
    });

    it('토큰 없음 → 401', async () => {
      await request(app.getHttpServer())
        .get('/members/user_001/health/heart-rates')
        .expect(401);
    });

    it('기간 조회 파라미터 → 200 + 배열', async () => {
      const res = await request(app.getHttpServer())
        .get(
          '/members/user_001/health/heart-rates' +
            '?from=2026-07-01T00:00:00%2B09:00&to=2026-07-19T23:59:59%2B09:00',
        )
        .set('Authorization', `Bearer ${doctToken}`)
        .expect(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  // ────────── 혈압 ──────────

  describe('GET /members/:id/health/blood-pressures', () => {
    it('의사 → 200 + 배열', async () => {
      const res = await request(app.getHttpServer())
        .get('/members/user_001/health/blood-pressures?limit=5')
        .set('Authorization', `Bearer ${doctToken}`)
        .expect(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('환자 → 타인 혈압 → 403', async () => {
      await request(app.getHttpServer())
        .get('/members/user_002/health/blood-pressures')
        .set('Authorization', `Bearer ${patiToken}`)
        .expect(403);
    });
  });

  // ────────── 혈당 ──────────

  describe('GET /members/:id/health/glucose', () => {
    it('의사 → 200 + 배열', async () => {
      const res = await request(app.getHttpServer())
        .get('/members/user_001/health/glucose?limit=5')
        .set('Authorization', `Bearer ${doctToken}`)
        .expect(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('환자 → 타인 혈당 → 403', async () => {
      await request(app.getHttpServer())
        .get('/members/user_002/health/glucose')
        .set('Authorization', `Bearer ${patiToken}`)
        .expect(403);
    });
  });

  // ────────── 체중 ──────────

  describe('GET /members/:id/health/weights', () => {
    it('의사 → 200 + 배열', async () => {
      const res = await request(app.getHttpServer())
        .get('/members/user_001/health/weights?limit=5')
        .set('Authorization', `Bearer ${doctToken}`)
        .expect(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('환자 → 타인 체중 → 403', async () => {
      await request(app.getHttpServer())
        .get('/members/user_002/health/weights')
        .set('Authorization', `Bearer ${patiToken}`)
        .expect(403);
    });
  });

  // ────────── 걸음수 ──────────

  describe('GET /members/:id/health/steps', () => {
    it('의사 → 200 + 배열', async () => {
      const res = await request(app.getHttpServer())
        .get('/members/user_001/health/steps?limit=5')
        .set('Authorization', `Bearer ${doctToken}`)
        .expect(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('환자 → 타인 걸음수 → 403', async () => {
      await request(app.getHttpServer())
        .get('/members/user_002/health/steps')
        .set('Authorization', `Bearer ${patiToken}`)
        .expect(403);
    });
  });
});
