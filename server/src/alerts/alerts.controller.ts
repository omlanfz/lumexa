// FILE PATH: server/src/alerts/alerts.controller.ts

import {
  Controller,
  Get,
  Param,
  Patch,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AlertsService } from './alerts.service';

@Controller('alerts')
@UseGuards(AuthGuard('jwt'))
export class AlertsController {
  constructor(private readonly alerts: AlertsService) {}

  @Get('me')
  listMine(@Request() req: any, @Query('limit') limit?: string) {
    return this.alerts.listForUser(req.user.userId, limit ? +limit : 20);
  }

  @Get('me/unread-count')
  unreadCount(@Request() req: any) {
    return this.alerts.unreadCountForUser(req.user.userId);
  }

  @Patch(':id/read')
  markRead(@Request() req: any, @Param('id') id: string) {
    return this.alerts.markRead(req.user.userId, id);
  }

  @Patch('read-all')
  markAllRead(@Request() req: any) {
    return this.alerts.markAllRead(req.user.userId);
  }
}
