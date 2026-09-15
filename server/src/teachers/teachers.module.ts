import { Module } from '@nestjs/common';
import { TeachersService } from './teachers.service';
import { TeachersController } from './teachers.controller';
import { PrismaModule } from '../prisma.module';
import { PayoutsModule } from '../payouts/payouts.module';

@Module({
  imports: [PrismaModule, PayoutsModule],
  controllers: [TeachersController],
  providers: [TeachersService],
  exports: [TeachersService], // Export in case other modules need it later
})
export class TeachersModule {}
