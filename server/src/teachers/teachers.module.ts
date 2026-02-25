import { Module } from '@nestjs/common';
import { TeachersService } from './teachers.service';
import { TeachersController } from './teachers.controller';

// PrismaService is provided globally via PrismaModule (registered in AppModule).
// StripeService and NotificationsService are @Global() — available app-wide.
// No additional imports needed here.

@Module({
  controllers: [TeachersController],
  providers: [TeachersService],
  exports: [TeachersService], // Export in case other modules need it later
})
export class TeachersModule {}
