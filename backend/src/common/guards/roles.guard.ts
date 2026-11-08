import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import { Reflector } from '@nestjs/core';

import type { Request } from 'express';

import { ROLES_KEY } from '../decorators/roles.decorator.js';
import type { Role } from '../enums/role.enum.js';
import type { AuthUser } from '../interfaces/auth-user.interface.js';

interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    const user = request.user;

    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }

    if (!requiredRoles.includes(user.role)) {
      throw new ForbiddenException('You do not have permission');
    }

    return true;
  }
}