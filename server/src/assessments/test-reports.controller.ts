// FILE PATH: server/src/assessments/test-reports.controller.ts
//
// The teacher dashboard's "Test Evaluations" API. Access to each report is
// decided by TestReportsService (the class's teacher, the student's assigned
// teacher, or an admin) — the role guard here only keeps students/parents out.

import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Throttle } from '@nestjs/throttler';
import { Role } from '@prisma/client';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { TestReportsService } from './test-reports.service';
import {
  ListTestReportsQueryDto,
  UpdateTestReportDto,
} from './dto/test-report.dto';

@Controller('test-reports')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(Role.TEACHER, Role.ADMIN)
export class TestReportsController {
  constructor(private readonly reports: TestReportsService) {}

  /** GET /test-reports?status=PENDING|…&type=…&studentUserId=… */
  @Get()
  list(@Req() req: any, @Query() query: ListTestReportsQueryDto) {
    return this.reports.list(req.user, query);
  }

  /** GET /test-reports/summary — counts for the dashboard card and nav badge. */
  @Get('summary')
  @Throttle({ default: { limit: 120, ttl: 60_000 } })
  summary(@Req() req: any) {
    return this.reports.summary(req.user);
  }

  @Get(':id')
  get(@Param('id') id: string, @Req() req: any) {
    return this.reports.get(id, req.user);
  }

  /** PATCH /test-reports/:id — question overrides, coding rubric marks,
   *  feedback. Totals and status are recomputed server-side. */
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateTestReportDto,
    @Req() req: any,
  ) {
    return this.reports.update(id, dto, req.user);
  }

  @Post(':id/approve')
  approve(@Param('id') id: string, @Req() req: any) {
    return this.reports.approve(id, req.user);
  }

  @Post(':id/reopen')
  reopen(@Param('id') id: string, @Req() req: any) {
    return this.reports.reopen(id, req.user);
  }

  /** POST /test-reports/:id/share — emails the parent/guardian. Fails with
   *  the real reason (and leaves the report READY_TO_SHARE) if the email was
   *  not delivered. */
  @Post(':id/share')
  share(@Param('id') id: string, @Req() req: any) {
    return this.reports.share(id, req.user);
  }
}
