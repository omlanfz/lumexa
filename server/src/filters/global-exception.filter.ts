import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import * as crypto from 'crypto';
import { NotificationsService } from '../notifications/notifications.service';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  constructor(private readonly notifications: NotificationsService) {}

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Internal server error';

    this.logger.error(
      `${request.method} ${request.url} → ${status}`,
      exception instanceof Error ? exception.stack : String(exception),
    );

    // Critical-failure alert — only unhandled 5xx (never a validation/auth
    // 4xx, which is routine and would spam admins). Bucketed by hour + a
    // short hash of the path/message so the SAME recurring error alerts at
    // most once an hour rather than once per request (see
    // NotificationsService.sendAdminSystemError's dedupeKey).
    if (status >= 500) {
      const errorText =
        exception instanceof Error ? exception.message : String(exception);
      const hourBucket = new Date().toISOString().slice(0, 13);
      const signature = crypto
        .createHash('sha256')
        .update(`${request.method} ${request.url} ${errorText}`)
        .digest('hex')
        .slice(0, 12);
      this.notifications
        .sendAdminSystemError({
          status,
          message: errorText,
          path: `${request.method} ${request.url}`,
          bucketKey: `${hourBucket}:${signature}`,
        })
        .catch(() => {});
    }

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message:
        typeof message === 'object' && message !== null
          ? ((message as any).message ?? message)
          : message,
    });
  }
}
