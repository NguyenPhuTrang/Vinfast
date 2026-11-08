// Tự động chuyển đổi dữ liệu mà Controller trả về thành một cấu trúc JSON thống nhất trước khi gửi về Frontend.
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';

import type { Request, Response } from 'express';
import { map, Observable } from 'rxjs';

import type { ApiSuccessResponse } from '../interfaces/api-response.interface.js';

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, ApiSuccessResponse<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiSuccessResponse<T>> {
    const httpContext = context.switchToHttp();

    const request = httpContext.getRequest<Request>();
    const response = httpContext.getResponse<Response>();

    return next.handle().pipe(
      map((data: T): ApiSuccessResponse<T> => ({
        success: true,
        statusCode: response.statusCode,
        timestamp: new Date().toISOString(),
        path: request.originalUrl || request.url,
        data,
      })),
    );
  }
}