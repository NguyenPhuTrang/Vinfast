import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';

import {
  ThrottlerGuard,
  ThrottlerModule,
} from '@nestjs/throttler';

import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AuthModule } from './auth/auth.module.js';
import { UsersModule } from './users/users.module.js';
import { validateEnv } from './config/env.validation.js';

@Module({
  imports: [
    // Environment Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
      cache: true,
      expandVariables: true,
      validate: validateEnv,
    }),

    // Rate Limiting
    ThrottlerModule.forRoot({
      throttlers: [
        {
          ttl: 60_000,
          limit: 120,
        },
      ],
    }),

    AuthModule,

    UsersModule,
  ],

  controllers: [AppController],

  providers: [
    AppService,

    // Global Rate Limiting Guard
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}