import { Injectable, Inject } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class AlertService {
  constructor(
    private httpService: HttpService,
    private configService: ConfigService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {}

  async sendSlack(message: string): Promise<{ success: boolean; sent_at: string }> {
    const webhookUrl = this.configService.get<string>('SLACK_WEBHOOK_URL') as string;
    const sent_at = new Date().toISOString();

    try {
      await firstValueFrom(
        this.httpService.post(webhookUrl, { text: message }),
      );

      this.logger.info(`Slack message sent: ${message}`, { context: 'AlertService' });
      return { success: true, sent_at };
    } catch (err) {
      this.logger.error(`Slack send failed: ${err.message}`, { context: 'AlertService' });
      return { success: false, sent_at };
    }
  }
}
