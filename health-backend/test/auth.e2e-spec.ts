import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

/**
 * 로그인 E2E 테스트
 *
 * - 실제 PostgreSQL DB(211.253.27.76)에 연결하여 수행합니다.
 * - 서버를 별도 실행하지 않아도 됩니다 (NestJS가 앱을 내부 부트합니다).
 * - .env의 DB_HOST, DB_PASSWORD 등이 올바르게 설정돼 있어야 합니다.
 * - DB 시드 계정이 존재해야 합니다:
 *     의사: admin  / admin001123!
 *     환자: user_001 / user_001123!
 */
describe('Auth E2E — POST /auth/login  &  POST /auth/refresh', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  }, 30000);

  afterAll(async () => {
    await app.close();
  });

  // ──────────────────────────────
  // POST /auth/login
  // ──────────────────────────────
  describe('POST /auth/login', () => {
    it('의사 계정 로그인 성공 → 200, access_token + refresh_token + member', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ id: 'admin', passwd: 'admin001123!' })
        .expect(200);

      expect(res.body).toHaveProperty('access_token');
      expect(res.body).toHaveProperty('refresh_token');
      expect(res.body.member).toMatchObject({ member_id: 'admin' });
      expect(res.body.member).not.toHaveProperty('password');
    });

    it('환자 계정 로그인 성공 → 200, 토큰 2종 포함', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ id: 'user_001', passwd: 'user_001123!' })
        .expect(200);

      expect(res.body).toHaveProperty('access_token');
      expect(res.body).toHaveProperty('refresh_token');
      expect(res.body.member.member_id).toBe('user_001');
    });

    it('access_token과 refresh_token은 서로 다른 값이다 (별도 키 서명 확인)', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ id: 'user_001', passwd: 'user_001123!' })
        .expect(200);

      expect(res.body.access_token).not.toBe(res.body.refresh_token);
    });

    it('잘못된 비밀번호 → 401', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ id: 'user_001', passwd: 'wrongpassword' })
        .expect(401);

      expect(res.body.statusCode).toBe(401);
    });

    it('존재하지 않는 ID → 401', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ id: 'no_such_user', passwd: 'anypass' })
        .expect(401);
    });

    it('바디 없이 요청 → 401', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({})
        .expect(401);
    });
  });

  // ──────────────────────────────
  // POST /auth/refresh
  // ──────────────────────────────
  describe('POST /auth/refresh', () => {
    let refreshToken: string;
    let firstAccessToken: string;

    beforeAll(async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ id: 'user_001', passwd: 'user_001123!' });
      refreshToken    = res.body.refresh_token;
      firstAccessToken = res.body.access_token;
    });

    it('유효한 RefreshToken → 200 + 새 access_token', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refresh_token: refreshToken })
        .expect(200);

      expect(res.body).toHaveProperty('access_token');
      // JWT 3-part 구조 검증
      expect(res.body.access_token.split('.')).toHaveLength(3);
    });

    it('재발급된 access_token은 최초 로그인 토큰과 다르다', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refresh_token: refreshToken })
        .expect(200);

      // iat(발행시각)이 다르므로 값도 달라진다
      expect(res.body.access_token).not.toBe(firstAccessToken);
    });

    it('AccessToken을 RefreshToken 자리에 넣으면 → 401 (키 분리 확인)', async () => {
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refresh_token: firstAccessToken })
        .expect(401);
    });

    it('무효 RefreshToken → 401', async () => {
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refresh_token: 'invalid.token.here' })
        .expect(401);
    });

    it('RefreshToken 누락 → 401', async () => {
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({})
        .expect(401);
    });
  });
});
