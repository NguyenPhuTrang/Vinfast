
import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';

import { Throttle } from '@nestjs/throttler';

import type {
  Request,
  Response,
} from 'express';

import { AuthService } from './auth.service.js';

import { GoogleLoginDto } from './dto/google-login.dto.js';

import { JwtAuthGuard } from './guards/jwt-auth.guard.js';

import type { AuthUser } from '../common/interfaces/auth-user.interface.js';


interface AuthenticatedRequest extends Request {
  user: AuthUser;
}


const REFRESH_TOKEN_COOKIE = 'vinfast_refresh_token';

const REFRESH_TOKEN_MAX_AGE =
  30 * 24 * 60 * 60 * 1000;

const refreshCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/api/v1/auth',
  maxAge: REFRESH_TOKEN_MAX_AGE,
};

const clearRefreshCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/api/v1/auth',
};


@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
  ) {}


  @Post('google')
  @Throttle({
    default: {
      limit: 5,
      ttl: 60_000,
    },
  })
  @HttpCode(HttpStatus.OK)
  async googleLogin(
    @Body() dto: GoogleLoginDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.loginWithGoogle(
      dto.idToken,
      {
        ipAddress: request.ip,
        userAgent: request.get('user-agent'),
      },
    );

    // Store Refresh Token in HttpOnly Cookie
    response.cookie(
      REFRESH_TOKEN_COOKIE,
      result.refreshToken,
      refreshCookieOptions,
    );

    // Never expose Refresh Token in JSON
    return {
      accessToken: result.accessToken,
      tokenType: result.tokenType,
      expiresIn: result.expiresIn,
      user: result.user,
    };
  }


  @Post('refresh')
  @Throttle({
    default: {
      limit: 10,
      ttl: 60_000,
    },
  })
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const refreshToken =
      request.cookies?.[REFRESH_TOKEN_COOKIE];

    if (
      typeof refreshToken !== 'string' ||
      !refreshToken
    ) {
      throw new UnauthorizedException(
        'Refresh token is required',
      );
    }

    const result = await this.authService.refreshSession(
      refreshToken,
      {
        ipAddress: request.ip,
        userAgent: request.get('user-agent'),
      },
    );

    // Replace old Refresh Token with the new one
    response.cookie(
      REFRESH_TOKEN_COOKIE,
      result.refreshToken,
      refreshCookieOptions,
    );

    // Return Access Token only
    return {
      accessToken: result.accessToken,
      tokenType: result.tokenType,
      expiresIn: result.expiresIn,
      user: result.user,
    };
  }


  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const refreshToken =
      request.cookies?.[REFRESH_TOKEN_COOKIE];

    if (
      typeof refreshToken === 'string' &&
      refreshToken
    ) {
      await this.authService.logout(refreshToken);
    }

    // Remove Refresh Token Cookie
    response.clearCookie(
      REFRESH_TOKEN_COOKIE,
      clearRefreshCookieOptions,
    );

    return {
      message: 'Logged out successfully',
    };
  }


  @Post('logout-all')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logoutAll(
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.logoutAll(
      request.user.id,
    );

    // Remove current Refresh Token Cookie
    response.clearCookie(
      REFRESH_TOKEN_COOKIE,
      clearRefreshCookieOptions,
    );

    return {
      message: 'All sessions logged out successfully',
      revokedCount: result.revokedCount,
    };
  }


  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMe(
    @Req() request: AuthenticatedRequest,
  ) {
    return this.authService.getCurrentAdmin(
      request.user.id,
    );
  }
}
