import { Module } from '@nestjs/common';
import { ClassroomService } from './classroom.service';
import { ClassroomController } from './classroom.controller';

// StripeService is @Global() — available automatically from PaymentsModule

@Module({
  controllers: [ClassroomController],
  providers: [ClassroomService],
})
export class ClassroomModule {}
