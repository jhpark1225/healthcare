import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiBody,
  ApiResponse,
} from '@nestjs/swagger';
import { AlertService } from '../alert/alert.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('알림')
@ApiBearerAuth('access-token')
@Controller('webhook')
@UseGuards(JwtAuthGuard)
export class WebhookController {
  constructor(private readonly alertService: AlertService) {}

  @Post('slack')
  @ApiOperation({
    summary: 'Slack 메시지 전송',
    description: 'Slack Incoming Webhook으로 메시지를 전송합니다.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['message'],
      properties: {
        message: { type: 'string', example: '[테스트] 수동 알림 메시지' },
      },
    },
  })
  @ApiResponse({
    status: 200,
    schema: { example: { success: true, sent_at: '2026-07-16T14:32:01+09:00' } },
  })
  async sendSlack(@Body() body: { message: string }) {
    return this.alertService.sendSlack(body.message);
  }
}
