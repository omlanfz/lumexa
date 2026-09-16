import { Module } from '@nestjs/common';
import { TeachersService } from './teachers.service';
import { TeachersController } from './teachers.controller';
import { PrismaModule } from '../prisma.module';
import { PayoutsModule } from '../payouts/payouts.module';
import { SchedulingModule } from '../scheduling/scheduling.module';

@Module({
  imports: [PrismaModule, PayoutsModule, SchedulingModule],
  controllers: [TeachersController],
  providers: [TeachersService],
  exports: [TeachersService], // Export in case other modules need it later
})
export class TeachersModule {}
