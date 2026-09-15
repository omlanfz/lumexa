// FILE PATH: server/src/payouts/payouts.controller.ts
//
// Teacher-facing earnings ledger endpoints. Read-only — teachers can view
// their own ledger and download their own monthly report, but every write
// path lives behind admin-only routes (see admin.controller.ts) or the
// system triggers in PayoutsService. There is no POST here for teachers.

import {
  Controller,
  Get,
  Query,
  Request,
  Response,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Response as ExpressResponse } from 'express';
import { PayoutsService } from './payouts.service';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';

@Controller('payouts')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(Role.TEACHER)
export class PayoutsController {
  constructor(private readonly payoutsService: PayoutsService) {}

  /** GET /payouts/me?page=1&limit=30 — chronological ledger transactions */
  @Get('me')
  listMine(
    @Request() req: any,
    @Query('page') page = '1',
    @Query('limit') limit = '30',
  ) {
    return this.payoutsService.listEntriesForUser(
      req.user.userId,
      +page,
      +limit,
    );
  }

  /** GET /payouts/me/summary — current month total, breakdown, all-time total */
  @Get('me/summary')
  getSummary(@Request() req: any) {
    return this.payoutsService.getSummaryForUser(req.user.userId);
  }

  /** GET /payouts/me/monthly — last 6 months, for the earnings chart */
  @Get('me/monthly')
  getMonthly(@Request() req: any) {
    return this.payoutsService.getMonthlySeriesForUser(req.user.userId);
  }

  /** GET /payouts/me/report.xlsx?month=&year= — downloadable payout statement */
  @Get('me/report')
  async downloadReport(
    @Request() req: any,
    @Query('month') month: string | undefined,
    @Query('year') year: string | undefined,
    @Response() res: ExpressResponse,
  ) {
    const now = new Date();
    const m = month ? +month : now.getMonth() + 1;
    const y = year ? +year : now.getFullYear();

    const { buffer, teacherName } =
      await this.payoutsService.generateReportForUser(req.user.userId, m, y);

    const filename = `${teacherName.replace(/\s+/g, '_')}_payout_${y}-${String(m).padStart(2, '0')}.xlsx`;
    res.set({
      'Content-Type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
    });
    res.send(buffer);
  }
}
