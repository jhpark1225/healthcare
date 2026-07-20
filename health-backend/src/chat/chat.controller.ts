import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiBody,
  ApiResponse,
} from '@nestjs/swagger';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('채팅')
@ApiBearerAuth('access-token')
@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  @ApiOperation({
    summary: 'AI Agent 채팅 (프록시)',
    description: 'AI Agent API로 질의를 전달하고 응답을 반환합니다.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['message'],
      properties: {
        message: { type: 'string', example: '최근 혈당이 높은데 식이요법을 알려줘' },
        member_id: { type: 'string', example: 'user_001' },
      },
    },
  })
  @ApiResponse({ status: 200, schema: { example: { reply: 'AI 답변 내용...' } } })
  send(@Body() body: { message: string; member_id?: string }) {
    return this.chatService.send(body.message, body.member_id);
  }
}
