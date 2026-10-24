import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma.module';
import { AlertsModule } from '../alerts/alerts.module';
import { CertificatesModule } from '../certificates/certificates.module';
import { AssessmentsController } from './assessments.controller';
import { AssessmentsService } from './assessments.service';
import { TestReportsController } from './test-reports.controller';
import { TestReportsService } from './test-reports.service';

// The coding project is marked by the teacher against a rubric, so the old
// in-process code runner and AI auto-grader were removed: nothing needs to
// execute student-submitted code inside the API process anymore.
@Module({
  imports: [PrismaModule, CertificatesModule, AlertsModule],
  controllers: [AssessmentsController, TestReportsController],
  providers: [AssessmentsService, TestReportsService],
  exports: [AssessmentsService, TestReportsService],
})
export class AssessmentsModule {}
