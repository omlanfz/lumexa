import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma.module';
import { AssessmentsController } from './assessments.controller';
import { AssessmentsService } from './assessments.service';
import { AiGradingService } from './ai-grading.service';
import { CodeRunnerService } from './code-runner.service';

@Module({
  imports: [PrismaModule],
  controllers: [AssessmentsController],
  providers: [AssessmentsService, AiGradingService, CodeRunnerService],
  exports: [AssessmentsService],
})
export class AssessmentsModule {}
