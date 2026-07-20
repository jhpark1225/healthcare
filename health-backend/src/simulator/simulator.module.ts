import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { SimulatorService } from './simulator.service';
import { Member } from '../members/entities/member.entity';
import { MemberHeartRate } from '../health/entities/member-heart-rate.entity';
import { MemberBloodPressure } from '../health/entities/member-blood-pressure.entity';
import { MemberWeight } from '../health/entities/member-weight.entity';
import { MemberGlucose } from '../health/entities/member-glucose.entity';
import { MemberStep } from '../health/entities/member-step.entity';
import { HealthModule } from '../health/health.module';
import { AlertModule } from '../alert/alert.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Member,
      MemberHeartRate,
      MemberBloodPressure,
      MemberWeight,
      MemberGlucose,
      MemberStep,
    ]),
    HealthModule,
    AlertModule,
  ],
  providers: [SimulatorService],
  exports: [SimulatorService],
})
export class SimulatorModule {}
