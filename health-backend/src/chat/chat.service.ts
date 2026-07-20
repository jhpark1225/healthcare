import { Injectable, Inject } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class ChatService {
  constructor(
    private httpService: HttpService,
    private configService: ConfigService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  async send(message: string, member_id?: string): Promise<{ reply: string }> {
    const aiApiUrl = this.configService.get<string>('AI_API_URL');
    const timeoutMs = this.configService.get<number>('AI_API_TIMEOUT_MS') || 30000;

    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${aiApiUrl}/chat`,
          { message, member_id },
          { timeout: timeoutMs },
        ),
      );

      return { reply: response.data.reply || response.data };
    } catch (err) {
      this.logger.error(`AI Agent request failed: ${err.message}`, { context: 'ChatService' });
      throw err;
    }
  }
}
