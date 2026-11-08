// Ghi nhận và theo dõi hoạt động của các API trong Backend NestJS (API Request Logging).

import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';

import type { Request, Response } from 'express';

import { Observable, tap } from 'rxjs';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> {
    const httpContext = context.switchToHttp();

    const request = httpContext.getRequest<Request>();
    const response = httpContext.getResponse<Response>();

    const { method, path } = request;
    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - startTime;

          this.logger.log(
            `${method} ${path} ${response.statusCode} - ${duration}ms`,
          );
        },
      }),
    );
  }
}
