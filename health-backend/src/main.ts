import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));

  app.enableCors({
    origin: ['http://localhost:5173', 'https://fe015.ys.iranglab.com'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  // Swagger 설정
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Healthcare API')
    .setDescription(
      '헬스케어 백엔드 REST API 문서\n\n' +
      '**테스트 계정**\n' +
      '- 의사(DOCT): `admin` / `admin001123!`\n' +
      '- 환자(PATI): `user_001` / `user_001123!`\n\n' +
      '로그인 후 발급된 `access_token`을 우측 상단 **Authorize** 버튼에 입력하세요.',
    )
    .setVersion('1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'access-token',
    )
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api-docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  const port = process.env.PORT || 3000;
  await app.listen(port, '0.0.0.0');
  const logger = app.get(WINSTON_MODULE_NEST_PROVIDER);
  logger.log(`Application  : http://localhost:${port}`, 'Bootstrap');
  logger.log(`Swagger Docs : http://localhost:${port}/api-docs`, 'Bootstrap');
}

bootstrap();
