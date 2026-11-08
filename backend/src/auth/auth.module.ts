import { Module } from '@nestjs/common';

import {
  ConfigModule,
  ConfigService,
} from '@nestjs/config';

import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { JwtStrategy } from './strategies/jwt.strategy.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';

import { RolesGuard } from '../common/guards/roles.guard.js';

@Module({
  imports: [
    ConfigModule,

    PassportModule.register({
      defaultStrategy: 'jwt',
      session: false,
    }),

    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],

      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>(
          'JWT_ACCESS_SECRET',
        ),
        signOptions: {
          expiresIn: Number(
            configService.get<string>(
              'JWT_ACCESS_EXPIRES_IN',
            ) ?? 900,
          ),
        },
      }),
    }),
  ],

  controllers: [AuthController],

  providers: [
    AuthService,
    JwtStrategy,
    JwtAuthGuard,
    RolesGuard,
  ],

  exports: [
    JwtModule,
    PassportModule,
    JwtAuthGuard,
    RolesGuard,
  ],
})
export class AuthModule {}