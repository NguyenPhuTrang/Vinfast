// chức năng xác thực JWT Access Token mà người dùng gửi đến Backend.
import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';

import { ExtractJwt, Strategy } from 'passport-jwt';

import { Role } from '../../common/enums/role.enum.js';

import type { AuthUser } from '../../common/interfaces/auth-user.interface.js';

interface JwtPayload {
  sub: string;
  email: string;
  role: Role;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>(
        'JWT_ACCESS_SECRET',
      ),
    });
  }

  validate(payload: JwtPayload): AuthUser {
    const validRoles = Object.values(Role);

    if (
      typeof payload.sub !== 'string' ||
      typeof payload.email !== 'string' ||
      !validRoles.includes(payload.role)
    ) {
      throw new UnauthorizedException('Invalid access token');
    }

    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
    };
  }
}