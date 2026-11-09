
import {
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';

import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';

import cookieParser from 'cookie-parser';
import helmet from 'helmet';

import { AppModule } from './app.module.js';

import { HttpExceptionFilter } from './common/filters/http-exception.filter.js';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor.js';
import { TransformInterceptor } from './common/interceptors/transform.interceptor.js';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  
  app.enableShutdownHooks();
  
  const configService = app.get(ConfigService);

  // Application Configuration
  const port = Number(configService.get<string>('PORT') ?? 4000);

  const apiPrefix = configService.get<string>('API_PREFIX') ?? 'api';

  const apiVersion = configService.get<string>('API_VERSION') ?? '1';

  // Validate Port
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('Invalid application port configuration');
  }

  // Global API Prefix
  app.setGlobalPrefix(apiPrefix);

  // API Versioning
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: apiVersion,
  });

  // Security
  app.use(helmet());
  app.use(cookieParser());

  // CORS Configuration
  const corsOrigins = (
    configService.get<string>('CORS_ORIGIN') ?? 'http://localhost:3000'
  )
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.enableCors({
    origin: corsOrigins,
    credentials: true,
  });

  // Global Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Global Exception Filter
  app.useGlobalFilters(new HttpExceptionFilter());

  // Global Interceptors
  app.useGlobalInterceptors(
    new LoggingInterceptor(),
    new TransformInterceptor(),
  );

  // Start Application
  await app.listen(port);
}

await bootstrap();
