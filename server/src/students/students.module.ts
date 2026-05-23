import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { StudentsService } from './students.service';
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
  providers: [StudentsService],
  exports: [StudentsService],
})
export class StudentsModule {}
