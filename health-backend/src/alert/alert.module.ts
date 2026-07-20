import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { AlertService } from './alert.service';

@Module({
  imports: [HttpModule],
  providers: [AlertService],
  exports: [AlertService],
})
export class AlertModule {}
