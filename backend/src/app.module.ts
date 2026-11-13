
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';

import { ConfigModule } from '@nestjs/config';

import {
  ThrottlerGuard,
  ThrottlerModule,
} from '@nestjs/throttler';

import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';

import { validateEnv } from './config/env.validation.js';

import { DatabaseModule } from './database/database.module.js';
import { AuthModule } from './auth/auth.module.js';
import { UsersModule } from './users/users.module.js';
import { VehiclesModule } from './vehicles/vehicles.module.js';
import { resolve } from 'node:path';
import { MediaAssetsModule } from './media-assets/media-assets.module.js';

@Module({
  imports: [
  ConfigModule.forRoot({
    isGlobal: true,
    envFilePath: [
      resolve(process.cwd(), '.env.local'),
      resolve(process.cwd(), '.env'),
    ],
    cache: true,
    expandVariables: true,
    validate: validateEnv,
  }),

    DatabaseModule,
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
    VehiclesModule,
    MediaAssetsModule,
  ],

  controllers: [
    AppController,
  ],

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
