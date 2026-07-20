import { Controller, Post, Body } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBody,
  ApiResponse,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';

@ApiTags('인증')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @ApiOperation({
    summary: '로그인',
    description:
      '회원 ID/Password 인증 후 AccessToken과 RefreshToken을 발급합니다.\n\n' +
      '**테스트 계정**\n' +
      '- 의사: `admin` / `admin001123!`\n' +
      '- 환자: `user_001` / `user_001123!`',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['member_id', 'password'],
      properties: {
        member_id: { type: 'string', example: 'user_001' },
        password: { type: 'string', example: 'user_001123!' },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: '로그인 성공 — access_token, refresh_token, 회원정보 반환',
    schema: {
      example: {
        access_token: 'eyJhbGci...',
        refresh_token: 'eyJhbGci...',
        member: {
          member_id: 'user_001',
          name: '김민준',
          gender: 'M',
          birth_date: '19980722',
          member_type: 'PATI',
          api_key: 'key_001',
        },
      },
    },
  })
  @ApiResponse({ status: 401, description: '아이디 또는 비밀번호 불일치' })
  async login(@Body() body: { member_id: string; password: string }) {
    return this.authService.login(body.member_id, body.password);
  }

  @Post('refresh')
  @ApiOperation({
    summary: 'AccessToken 재발급',
    description: '만료된 AccessToken을 RefreshToken으로 재발급합니다.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['refresh_token'],
      properties: {
        refresh_token: { type: 'string', example: 'eyJhbGci...' },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: '새 AccessToken 발급',
    schema: { example: { access_token: 'eyJhbGci...' } },
  })
  @ApiResponse({ status: 401, description: 'RefreshToken 만료 또는 무효' })
  async refresh(@Body() body: { refresh_token: string }) {
    return this.authService.refresh(body.refresh_token);
  }
}
