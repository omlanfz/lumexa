import { Module } from '@nestjs/common';
import { AdminAlertsService } from './admin-alerts.service';

@Module({
  providers: [AdminAlertsService],
})
export class AdminAlertsModule {}
