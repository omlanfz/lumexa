// FILE PATH: server/src/alerts/alerts.module.ts
import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma.module';
import { AlertsService } from './alerts.service';
import { AlertsController } from './alerts.controller';

@Module({
  imports: [PrismaModule],
  controllers: [AlertsController],
  providers: [AlertsService],
  exports: [AlertsService],
})
export class AlertsModule {}
