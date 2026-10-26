import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | object = 'An unexpected error occurred.';
    // Structured data a screen needs beyond the sentence (for example the
    // list of things an admin must decide before a batch placement goes
    // ahead). Only present when the exception carried it.
    let details: unknown;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      // If it's a validation error, surface the messages array
      if (
        typeof exceptionResponse === 'object' &&
        exceptionResponse !== null &&
        'message' in exceptionResponse
      ) {
        message = (exceptionResponse as any).message;
        if ('details' in exceptionResponse) {
          details = (exceptionResponse as any).details;
        }
      } else if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      }
    } else if (exception instanceof Error) {
      // Log the real error internally but don't expose it
      this.logger.error(
        `Unhandled exception on ${request.method} ${request.url}`,
        exception.stack,
      );
    }

    // Log all errors in production for observability
    if (status >= 500) {
      this.logger.error(
        `[${status}] ${request.method} ${request.url} — ${JSON.stringify(message)}`,
      );
    }

    response.status(status).json({
      statusCode: status,
      message,
      ...(details !== undefined ? { details } : {}),
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}
