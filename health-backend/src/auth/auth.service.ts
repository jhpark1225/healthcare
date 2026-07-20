import {
  Injectable,
  UnauthorizedException,
  Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';

import { Member } from '../members/entities/member.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Member)
    private memberRepository: Repository<Member>,
    private jwtService: JwtService,
    private configService: ConfigService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  async login(id: string, passwd: string) {
    const member = await this.memberRepository.findOne({
      where: { member_id: id },
    });

    if (!member) {
      throw new UnauthorizedException('아이디 또는 비밀번호가 올바르지 않습니다.');
    }

    // bcrypt 비교 시도, 실패 시 평문 비교 (교육용)
    let isValid = false;
    try {
      isValid = await bcrypt.compare(passwd, member.password);
    } catch {
      isValid = false;
    }
    if (!isValid) {
      isValid = passwd === member.password;
    }

    if (!isValid) {
      throw new UnauthorizedException('아이디 또는 비밀번호가 올바르지 않습니다.');
    }

    const payload = {
      userid: member.member_id,
      name: member.name,
      api_key: member.api_key,
      member_type: member.member_type,
    };

    // AccessToken — JWT_SECRET
    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_SECRET'),
      expiresIn: (this.configService.get<string>('JWT_EXPIRES_IN') || '1d') as any,
    });

    // RefreshToken — JWT_REFRESH_SECRET (별도 키)
    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: (this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') || '7d') as any,
    });

    this.logger.info(`Login success: ${member.member_id}`, { context: 'AuthService' });

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      member: {
        member_id: member.member_id,
        name: member.name,
        gender: member.gender,
        birth_date: member.birth_date,
        member_type: member.member_type,
        api_key: member.api_key,
        created_at: member.created_at,
        updated_at: member.updated_at,
      },
    };
  }

  async refresh(refreshToken: string) {
    try {
      // RefreshToken 전용 키로 검증
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });

      const newPayload = {
        userid: payload.userid,
        name: payload.name,
        api_key: payload.api_key,
        member_type: payload.member_type,
      };

      const newAccessToken = this.jwtService.sign(newPayload, {
        secret: this.configService.get<string>('JWT_SECRET'),
        expiresIn: (this.configService.get<string>('JWT_EXPIRES_IN') || '1d') as any,
      });

      return { access_token: newAccessToken };
    } catch {
      throw new UnauthorizedException('RefreshToken이 만료되었습니다. 다시 로그인해주세요.');
    }
  }
}
