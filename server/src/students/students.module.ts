import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { StudentsService } from './students.service';
import { StudentLedgerService } from './student-ledger.service';
import { StudentProgressService } from './progress/student-progress.service';
import { StudentsController } from './students.controller';
import { PrismaModule } from '../prisma.module';
import { SchedulingModule } from '../scheduling/scheduling.module';

@Module({
  imports: [
    PrismaModule,
    SchedulingModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [StudentsController],
  providers: [StudentsService, StudentLedgerService, StudentProgressService],
  exports: [StudentsService, StudentLedgerService, StudentProgressService],
})
export class StudentsModule {}
