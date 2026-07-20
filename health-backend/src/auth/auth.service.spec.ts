import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Member } from '../members/entities/member.entity';

// ────────────────────────────────────────────────
// 목(Mock) 데이터
// ────────────────────────────────────────────────
const mockMember: Partial<Member> = {
  member_id: 'user_001',
  password: 'user_001123!',   // 평문 (교육용 DB 기준)
  name: '김민준',
  gender: 'M',
  birth_date: '19980722',
  member_type: 'PATI',
  api_key: 'key_001',
  created_at: new Date('2026-01-01'),
  updated_at: new Date('2026-01-01'),
};

const mockMemberRepository = { findOne: jest.fn() };

const mockJwtService = {
  sign: jest.fn().mockReturnValue('mocked.jwt.token'),
  verify: jest.fn(),
};

// JWT_SECRET / JWT_REFRESH_SECRET 을 key별로 반환
const mockConfigService = {
  get: jest.fn((key: string) => {
    const cfg: Record<string, string> = {
      JWT_SECRET: 'test-access-secret',
      JWT_REFRESH_SECRET: 'test-refresh-secret',
      JWT_EXPIRES_IN: '1d',
      JWT_REFRESH_EXPIRES_IN: '7d',
    };
    return cfg[key];
  }),
};

const mockLogger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() };

// ────────────────────────────────────────────────
// 테스트 스위트
// ────────────────────────────────────────────────
describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(Member), useValue: mockMemberRepository },
        { provide: JwtService,                useValue: mockJwtService },
        { provide: ConfigService,             useValue: mockConfigService },
        { provide: WINSTON_MODULE_PROVIDER,   useValue: mockLogger },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jest.clearAllMocks();
  });

  // ─────────────────────────────
  // login()
  // ─────────────────────────────
  describe('login()', () => {
    it('올바른 자격증명 → access_token + refresh_token + member 반환', async () => {
      mockMemberRepository.findOne.mockResolvedValue(mockMember);
      mockJwtService.sign
        .mockReturnValueOnce('access.token')
        .mockReturnValueOnce('refresh.token');

      const result = await service.login('user_001', 'user_001123!');

      expect(result.access_token).toBe('access.token');
      expect(result.refresh_token).toBe('refresh.token');
      expect(result.member.member_id).toBe('user_001');
    });

    it('응답 member 객체에 password 필드가 없어야 한다', async () => {
      mockMemberRepository.findOne.mockResolvedValue(mockMember);
      mockJwtService.sign.mockReturnValue('token');

      const result = await service.login('user_001', 'user_001123!');

      expect(result.member).not.toHaveProperty('password');
    });

    it('존재하지 않는 ID → UnauthorizedException', async () => {
      mockMemberRepository.findOne.mockResolvedValue(null);

      await expect(service.login('nobody', 'pass')).rejects.toThrow(UnauthorizedException);
    });

    it('비밀번호 불일치 → UnauthorizedException', async () => {
      mockMemberRepository.findOne.mockResolvedValue(mockMember);

      await expect(service.login('user_001', 'wrongpass')).rejects.toThrow(UnauthorizedException);
    });

    it('JWT sign이 2회 호출된다 (access + refresh 각각)', async () => {
      mockMemberRepository.findOne.mockResolvedValue(mockMember);
      mockJwtService.sign.mockReturnValue('token');

      await service.login('user_001', 'user_001123!');

      expect(mockJwtService.sign).toHaveBeenCalledTimes(2);
    });

    it('AccessToken은 JWT_SECRET, RefreshToken은 JWT_REFRESH_SECRET으로 서명된다', async () => {
      mockMemberRepository.findOne.mockResolvedValue(mockMember);
      mockJwtService.sign.mockReturnValue('token');

      await service.login('user_001', 'user_001123!');

      const accessOpts  = mockJwtService.sign.mock.calls[0][1];
      const refreshOpts = mockJwtService.sign.mock.calls[1][1];

      expect(accessOpts.secret).toBe('test-access-secret');
      expect(refreshOpts.secret).toBe('test-refresh-secret');
    });

    it('JWT payload에 userid, name, api_key, member_type이 포함된다', async () => {
      mockMemberRepository.findOne.mockResolvedValue(mockMember);
      mockJwtService.sign.mockReturnValue('token');

      await service.login('user_001', 'user_001123!');

      const payload = mockJwtService.sign.mock.calls[0][0];
      expect(payload).toMatchObject({
        userid: 'user_001',
        name: '김민준',
        api_key: 'key_001',
        member_type: 'PATI',
      });
    });
  });

  // ─────────────────────────────
  // refresh()
  // ─────────────────────────────
  describe('refresh()', () => {
    it('유효한 RefreshToken → 새 AccessToken 반환', async () => {
      mockJwtService.verify.mockReturnValue({
        userid: 'user_001',
        name: '김민준',
        api_key: 'key_001',
        member_type: 'PATI',
      });
      mockJwtService.sign.mockReturnValue('new.access.token');

      const result = await service.refresh('valid.refresh.token');

      expect(result).toHaveProperty('access_token', 'new.access.token');
    });

    it('refresh() verify는 JWT_REFRESH_SECRET을 사용한다', async () => {
      mockJwtService.verify.mockReturnValue({
        userid: 'user_001', name: 'x', api_key: 'k', member_type: 'PATI',
      });
      mockJwtService.sign.mockReturnValue('token');

      await service.refresh('some.token');

      const verifyOpts = mockJwtService.verify.mock.calls[0][1];
      expect(verifyOpts.secret).toBe('test-refresh-secret');
    });

    it('재발급 sign은 JWT_SECRET을 사용한다', async () => {
      mockJwtService.verify.mockReturnValue({
        userid: 'user_001', name: 'x', api_key: 'k', member_type: 'PATI',
      });
      mockJwtService.sign.mockReturnValue('token');

      await service.refresh('some.token');

      const signOpts = mockJwtService.sign.mock.calls[0][1];
      expect(signOpts.secret).toBe('test-access-secret');
    });

    it('만료/무효 RefreshToken → UnauthorizedException', async () => {
      mockJwtService.verify.mockImplementation(() => { throw new Error('jwt expired'); });

      await expect(service.refresh('expired.token')).rejects.toThrow(UnauthorizedException);
    });
  });
});
