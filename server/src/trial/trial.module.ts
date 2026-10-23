import { Module } from '@nestjs/common';
import { TrialController } from './trial.controller';
import { TrialAdminController } from './trial-admin.controller';
import { TrialService } from './trial.service';
import { TrialBookingService } from './trial-booking.service';
import { TrialAvailabilityService } from './trial-availability.service';
import { TrialAdminService } from './trial-admin.service';
import { TrialNotificationsService } from './trial-notifications.service';
import { TrialWhatsAppService } from './trial-whatsapp.service';
import { PrismaModule } from '../prisma.module';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';

// EmailModule, NotificationsModule and AuditModule are @Global.
@Module({
  imports: [PrismaModule, WhatsAppModule],
  controllers: [TrialController, TrialAdminController],
  providers: [
    TrialService,
    TrialBookingService,
    TrialAvailabilityService,
    TrialAdminService,
    TrialNotificationsService,
    TrialWhatsAppService,
  ],
})
export class TrialModule {}
