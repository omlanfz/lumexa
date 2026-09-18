import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PayoutsModule } from '../payouts/payouts.module';
import { RescheduleModule } from '../reschedule/reschedule.module';
import { StudentsModule } from '../students/students.module';
import { SchedulingModule } from '../scheduling/scheduling.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [
    PayoutsModule,
    RescheduleModule,
    StudentsModule,
    SchedulingModule,
    // Same signing config as AuthModule — needed so AdminService can issue
    // ordinary login JWTs for the "view dashboard as" impersonation flow.
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
