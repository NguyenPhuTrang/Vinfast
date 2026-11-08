// có chức năng bắt và xử lý lỗi tập trung (Global Exception Handling) trong Backend NestJS.
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';

import type { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();

    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const statusCode =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse =
      exception instanceof HttpException
        ? exception.getResponse()
        : null;

    let message: string | string[] = 'Internal server error';
    let error: string | undefined;

    if (typeof exceptionResponse === 'string') {
      message = exceptionResponse;
    } else if (
      typeof exceptionResponse === 'object' &&
      exceptionResponse !== null
    ) {
      const body = exceptionResponse as {
        message?: string | string[];
        error?: string;
      };

      message = body.message ?? message;
      error = body.error;
    }

    // Log unexpected server errors
    if (statusCode >= 500) {
      this.logger.error(
        `${request.method} ${request.url} - ${statusCode}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    } else {
      this.logger.warn(
        `${request.method} ${request.url} - ${statusCode}`,
      );
    }

    // Standard error response
    response.status(statusCode).json({
      success: false,
      statusCode,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message,
      ...(error ? { error } : {}),
    });
  }
}