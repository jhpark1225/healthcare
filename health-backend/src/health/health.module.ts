import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { HealthGateway } from './health.gateway';
import { HealthService } from './health.service';
import { HealthController } from './health.controller';
import { MemberHeartRate } from './entities/member-heart-rate.entity';
import { MemberBloodPressure } from './entities/member-blood-pressure.entity';
import { MemberWeight } from './entities/member-weight.entity';
import { MemberGlucose } from './entities/member-glucose.entity';
import { MemberStep } from './entities/member-step.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      MemberHeartRate,
      MemberBloodPressure,
      MemberWeight,
      MemberGlucose,
      MemberStep,
    ]),
    // WebSocket Gateway JWT 검증용 (AccessToken 키)
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (cs: ConfigService) => ({
        secret: cs.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: (cs.get<string>('JWT_EXPIRES_IN') || '1d') as any },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [HealthController],
  providers: [HealthGateway, HealthService],
  exports: [HealthGateway, HealthService, TypeOrmModule],
})
export class HealthModule {}
