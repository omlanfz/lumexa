import { Module } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { BookingsController } from './bookings.controller';

// StripeService and NotificationsService are @Global() so they don't need
// to be imported here explicitly — they're available app-wide via PaymentsModule
// and NotificationsModule registered in AppModule.

@Module({
  controllers: [BookingsController],
  providers: [BookingsService],
})
export class BookingsModule {}
