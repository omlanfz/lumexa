import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma.module';
import { EngagementService } from './engagement.service';
import { StudentsModule } from '../students/students.module';

@Module({
  imports: [PrismaModule, StudentsModule],
  providers: [EngagementService],
})
export class EngagementModule {}
