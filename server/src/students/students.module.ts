import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { StudentsService } from './students.service';
import { StudentLedgerService } from './student-ledger.service';
import { StudentsController } from './students.controller';
import { PrismaModule } from '../prisma.module';

@Module({
  imports: [
    PrismaModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [StudentsController],
  providers: [StudentsService, StudentLedgerService],
  exports: [StudentsService, StudentLedgerService],
})
export class StudentsModule {}
