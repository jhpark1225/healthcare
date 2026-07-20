import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WinstonModule } from 'nest-winston';
import { ScheduleModule } from '@nestjs/schedule';
import * as winston from 'winston';
import 'winston-daily-rotate-file';

import { AuthModule } from './auth/auth.module';
import { MembersModule } from './members/members.module';
import { HealthModule } from './health/health.module';
import { SimulatorModule } from './simulator/simulator.module';
import { AlertModule } from './alert/alert.module';
import { ChatModule } from './chat/chat.module';
import { WebhookModule } from './webhook/webhook.module';
import { DatabaseSeederService } from './database/database-seeder.service';
import { Member } from './members/entities/member.entity';
import { DiseaseCode } from './members/entities/disease-code.entity';
import { MemberDisease } from './members/entities/member-disease.entity';

@Module({
  imports: [
    // 환경변수 전역 로드 (.env)
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // PostgreSQL (TypeORM)
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (cs: ConfigService) => ({
        type: 'postgres',
        host: cs.get<string>('DB_HOST'),
        port: cs.get<number>('DB_PORT'),
        database: cs.get<string>('DB_NAME'),
        username: cs.get<string>('DB_USER'),
        password: cs.get<string>('DB_PASSWORD'),
        synchronize: false,
        autoLoadEntities: true,
        logging: cs.get<string>('NODE_ENV') === 'development',
        retryAttempts: 3,
        retryDelay: 2000,
      }),
      inject: [ConfigService],
    }),

    // Winston 로거 (process.env 직접 참조 — ConfigModule이 .env 로드 후 process.env에 반영)
    WinstonModule.forRoot({
      level: process.env.LOG_LEVEL || 'debug',
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
            winston.format.colorize(),
            winston.format.printf(({ timestamp, level, message, context }) =>
              `[${timestamp}] [${level}]${context ? ` [${context}]` : ''} ${message}`,
            ),
          ),
        }),
        new (winston.transports as any).DailyRotateFile({
          dirname: process.env.LOG_DIR || './logs',
          filename: '%DATE%.log',
          datePattern: 'YYYY-MM-DD',
          maxFiles: process.env.LOG_RETENTION_DAYS || '7d',
          format: winston.format.combine(
            winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
            winston.format.json(),
          ),
        }),
      ],
    }),

    ScheduleModule.forRoot(),

    TypeOrmModule.forFeature([Member, DiseaseCode, MemberDisease]),

    AuthModule,
    MembersModule,
    HealthModule,
    SimulatorModule,
    AlertModule,
    ChatModule,
    WebhookModule,
  ],
  providers: [DatabaseSeederService],
})
export class AppModule {}
