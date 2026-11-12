import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma.module';
import { AlertsModule } from '../alerts/alerts.module';
import { SubmissionsModule } from '../submissions/submissions.module';
import { AssessmentsController } from './assessments.controller';
import { AssessmentsService } from './assessments.service';
import { ClassTestsService } from './class-tests.service';
import { TestReportsController } from './test-reports.controller';
import { TestReportsService } from './test-reports.service';
import { AssessmentFilesService } from './assessment-files.service';

// The coding project is marked by the teacher against a rubric, so the old
// in-process code runner and AI auto-grader were removed: nothing needs to
// execute student-submitted code inside the API process anymore.
//
// AssessmentFilesService keeps a practical project's files (Little Coders) in the private
// homework bucket — SubmissionsModule provides that storage — until the teacher finalises the
// review, then removes them.
@Module({
  imports: [PrismaModule, AlertsModule, SubmissionsModule],
  controllers: [AssessmentsController, TestReportsController],
  providers: [
    AssessmentsService,
    ClassTestsService,
    TestReportsService,
    AssessmentFilesService,
  ],
  exports: [
    AssessmentsService,
    ClassTestsService,
    TestReportsService,
    AssessmentFilesService,
  ],
})
export class AssessmentsModule {}
