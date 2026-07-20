import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { MembersController } from './members.controller';
import { MembersService } from './members.service';
import { Member } from './entities/member.entity';
import { DiseaseCode } from './entities/disease-code.entity';
import { MemberDisease } from './entities/member-disease.entity';
import { MemberHeartRate } from '../health/entities/member-heart-rate.entity';
import { MemberBloodPressure } from '../health/entities/member-blood-pressure.entity';
import { MemberWeight } from '../health/entities/member-weight.entity';
import { MemberGlucose } from '../health/entities/member-glucose.entity';
import { MemberStep } from '../health/entities/member-step.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Member,
      DiseaseCode,
      MemberDisease,
      MemberHeartRate,
      MemberBloodPressure,
      MemberWeight,
      MemberGlucose,
      MemberStep,
    ]),
  ],
  controllers: [MembersController],
  providers: [MembersService],
  exports: [MembersService, TypeOrmModule],
})
export class MembersModule {}
