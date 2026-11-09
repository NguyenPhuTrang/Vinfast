
import {
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

import { OAuth2Client } from 'google-auth-library';

import {
  createHash,
  randomBytes,
  randomUUID,
} from 'node:crypto';

import { PrismaService } from '../database/prisma.service.js';

import {
  AuditAction,
  Role,
  UserStatus,
} from '../generated/prisma/enums.js';

// ==========================================
// TYPES
// ==========================================

interface LoginMetadata {
  ipAddress?: string | null;
  userAgent?: string | null;
}

interface AdminTokenPayload {
  id: string;
  email: string;
  role: Role;
}

// ==========================================
// AUTH SERVICE
// ==========================================

@Injectable()
export class AuthService {
  private readonly googleClient: OAuth2Client;
  private readonly googleClientId: string;

  // Refresh Token lifetime: 30 days
  private readonly refreshTokenTtlMs =
    30 * 24 * 60 * 60 * 1000;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    this.googleClientId =
      this.configService.getOrThrow<string>(
        'GOOGLE_CLIENT_ID',
      );

    this.googleClient = new OAuth2Client(
      this.googleClientId,
    );
  }

  // ==========================================
  // PRIVATE HELPERS
  // ==========================================

  // Hash Refresh Token using SHA-256
  private hashRefreshToken(token: string): string {
    return createHash('sha256')
      .update(token)
      .digest('hex');
  }

  // Generate a cryptographically secure Refresh Token
  private generateRefreshToken(): string {
    return randomBytes(64).toString('base64url');
  }

  // Get Access Token expiration from environment
  private getAccessTokenExpiresIn(): number {
    const expiresIn = Number(
      this.configService.get<string>(
        'JWT_ACCESS_EXPIRES_IN',
      ) ?? 900,
    );

    if (
      !Number.isInteger(expiresIn) ||
      expiresIn < 1 ||
      expiresIn > 3600
    ) {
      throw new Error(
        'Invalid JWT_ACCESS_EXPIRES_IN configuration',
      );
    }

    return expiresIn;
  }

  // Generate VinFast Access Token
  private async generateAccessToken(
    admin: AdminTokenPayload,
  ): Promise<string> {
    return this.jwtService.signAsync({
      sub: admin.id,
      email: admin.email,
      role: admin.role,
    });
  }

  // Revoke all active Refresh Tokens belonging to a session family
  private async revokeRefreshTokenFamily(
    familyId: string,
  ): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: {
        familyId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });
  }

  // Check Prisma unique constraint errors
  private isUniqueConstraintError(
    error: unknown,
  ): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'P2002'
    );
  }

  // Record a security-related audit event
  private async createAuditLog(
    actorId: string,
    action: AuditAction,
    description: string,
    metadata: LoginMetadata = {},
  ): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        actorId,
        action,
        entityType: 'User',
        entityId: actorId,
        description,
        ipAddress: metadata.ipAddress ?? null,
        userAgent: metadata.userAgent ?? null,
      },
    });
  }

  // ==========================================
  // 1. GOOGLE LOGIN
  // ==========================================

  async loginWithGoogle(
    idToken: string,
    metadata: LoginMetadata = {},
  ) {
    if (!idToken || !idToken.trim()) {
      throw new UnauthorizedException(
        'Google ID token is required',
      );
    }

    // Step 1: Verify Google ID Token
    let payload;

    try {
      const ticket =
        await this.googleClient.verifyIdToken({
          idToken,
          audience: this.googleClientId,
        });

      payload = ticket.getPayload();
    } catch {
      throw new UnauthorizedException(
        'Invalid Google ID token',
      );
    }

    // Step 2: Validate Google identity
    if (
      !payload?.sub ||
      !payload.email ||
      payload.email_verified !== true
    ) {
      throw new UnauthorizedException(
        'Google account information is invalid',
      );
    }

    const googleId = payload.sub;
    const email = payload.email.trim().toLowerCase();

    // Step 3: Find pre-authorized Admin account
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedException(
        'This Google account is not authorized',
      );
    }

    // Step 4: Check account status
    if (user.status !== UserStatus.ACTIVE) {
      throw new ForbiddenException(
        'Your account is inactive',
      );
    }

    // Step 5: Check Admin role
    if (user.role !== Role.ADMIN) {
      throw new ForbiddenException(
        'Admin access is required',
      );
    }

    // Step 6: Prevent linking another Google account
    if (
      user.googleId &&
      user.googleId !== googleId
    ) {
      throw new ForbiddenException(
        'This account is linked to another Google account',
      );
    }

    // Step 7: Ensure Google ID is not linked elsewhere
    const existingGoogleUser =
      await this.prisma.user.findUnique({
        where: { googleId },
        select: { id: true },
      });

    if (
      existingGoogleUser &&
      existingGoogleUser.id !== user.id
    ) {
      throw new ConflictException(
        'Google account is already linked to another user',
      );
    }

    // Step 8: Prepare tokens
    const expiresIn = this.getAccessTokenExpiresIn();

    const accessToken = await this.generateAccessToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    const refreshToken = this.generateRefreshToken();

    const tokenHash =
      this.hashRefreshToken(refreshToken);

    const familyId = randomUUID();

    const expiresAt = new Date(
      Date.now() + this.refreshTokenTtlMs,
    );

    // Step 9: Update User, create Refresh Token and Audit Log
    // All database operations are performed atomically.
    let admin;

    try {
      admin = await this.prisma.$transaction(
        async (tx) => {
          const updatedAdmin = await tx.user.update({
            where: { id: user.id },
            data: {
              googleId,
              fullName: payload.name ?? user.fullName,
              avatarUrl:
                payload.picture ?? user.avatarUrl,
              lastLoginAt: new Date(),
            },
            select: {
              id: true,
              email: true,
              fullName: true,
              avatarUrl: true,
              role: true,
              status: true,
            },
          });

          await tx.refreshToken.create({
            data: {
              userId: updatedAdmin.id,
              tokenHash,
              familyId,
              expiresAt,
              ipAddress: metadata.ipAddress ?? null,
              userAgent: metadata.userAgent ?? null,
            },
          });

          await tx.auditLog.create({
            data: {
              actorId: updatedAdmin.id,
              action: AuditAction.LOGIN,
              entityType: 'User',
              entityId: updatedAdmin.id,
              description:
                'Admin logged in with Google',
              ipAddress: metadata.ipAddress ?? null,
              userAgent: metadata.userAgent ?? null,
            },
          });

          return updatedAdmin;
        },
      );
    } catch (error: unknown) {
      if (this.isUniqueConstraintError(error)) {
        throw new ConflictException(
          'Google account is already linked or email already exists',
        );
      }

      throw error;
    }

    // Step 10: Return authentication result
    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn,
      user: admin,
    };
  }

  // ==========================================
  // 2. REFRESH TOKEN ROTATION
  // ==========================================

  async refreshSession(
    rawRefreshToken: string,
    metadata: LoginMetadata = {},
  ) {
    if (
      typeof rawRefreshToken !== 'string' ||
      !rawRefreshToken
    ) {
      throw new UnauthorizedException(
        'Refresh token is required',
      );
    }

    // Step 1: Hash received Refresh Token
    const tokenHash =
      this.hashRefreshToken(rawRefreshToken);

    // Step 2: Find token and its owner
    const currentToken =
      await this.prisma.refreshToken.findUnique({
        where: { tokenHash },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              fullName: true,
              avatarUrl: true,
              role: true,
              status: true,
            },
          },
        },
      });

    if (!currentToken) {
      throw new UnauthorizedException(
        'Invalid refresh token',
      );
    }

    const now = new Date();

    // Step 3: Detect reuse of a revoked Refresh Token
    if (currentToken.revokedAt) {
      await this.prisma.$transaction(async (tx) => {
        await tx.refreshToken.updateMany({
          where: {
            familyId: currentToken.familyId,
            revokedAt: null,
          },
          data: {
            revokedAt: now,
          },
        });

        await tx.auditLog.create({
          data: {
            actorId: currentToken.userId,
            action: AuditAction.TOKEN_REFRESH,
            entityType: 'User',
            entityId: currentToken.userId,
            description:
              'Refresh token reuse detected; active session family revoked',
            ipAddress: metadata.ipAddress ?? null,
            userAgent: metadata.userAgent ?? null,
          },
        });
      });

      throw new UnauthorizedException(
        'Refresh token reuse detected. Please login again.',
      );
    }

    // Step 4: Check Refresh Token expiration
    if (currentToken.expiresAt <= now) {
      await this.prisma.refreshToken.updateMany({
        where: {
          id: currentToken.id,
          revokedAt: null,
        },
        data: {
          revokedAt: now,
        },
      });

      throw new UnauthorizedException(
        'Refresh token has expired',
      );
    }

    // Step 5: Recheck Admin permissions
    if (
      currentToken.user.status !== UserStatus.ACTIVE ||
      currentToken.user.role !== Role.ADMIN
    ) {
      await this.revokeRefreshTokenFamily(
        currentToken.familyId,
      );

      throw new ForbiddenException(
        'Admin account is not authorized',
      );
    }

    // Step 6: Generate new tokens
    const newRefreshToken =
      this.generateRefreshToken();

    const newTokenHash =
      this.hashRefreshToken(newRefreshToken);

    const newExpiresAt = new Date(
      now.getTime() + this.refreshTokenTtlMs,
    );

    const accessToken = await this.generateAccessToken({
      id: currentToken.user.id,
      email: currentToken.user.email,
      role: currentToken.user.role,
    });

    const expiresIn = this.getAccessTokenExpiresIn();

    // Step 7: Revoke old token and create new token atomically
    const rotated = await this.prisma.$transaction(
      async (tx) => {
        const updated =
          await tx.refreshToken.updateMany({
            where: {
              id: currentToken.id,
              tokenHash,
              revokedAt: null,
              expiresAt: { gt: now },
            },
            data: {
              revokedAt: now,
            },
          });

        if (updated.count !== 1) {
          return false;
        }

        await tx.refreshToken.create({
          data: {
            userId: currentToken.userId,
            tokenHash: newTokenHash,
            familyId: currentToken.familyId,
            expiresAt: newExpiresAt,
            ipAddress: metadata.ipAddress ?? null,
            userAgent: metadata.userAgent ?? null,
          },
        });

        await tx.auditLog.create({
          data: {
            actorId: currentToken.userId,
            action: AuditAction.TOKEN_REFRESH,
            entityType: 'User',
            entityId: currentToken.userId,
            description:
              'Admin refreshed authentication session',
            ipAddress: metadata.ipAddress ?? null,
            userAgent: metadata.userAgent ?? null,
          },
        });

        return true;
      },
    );

    // Step 8: Handle reuse or concurrent refresh attempts
    if (!rotated) {
      await this.revokeRefreshTokenFamily(
        currentToken.familyId,
      );

      throw new UnauthorizedException(
        'Refresh token is no longer valid. Please login again.',
      );
    }

    // Step 9: Return rotated tokens
    return {
      accessToken,
      refreshToken: newRefreshToken,
      tokenType: 'Bearer',
      expiresIn,

      user: currentToken.user,
    };
  }

  // ==========================================
  // 3. LOGOUT CURRENT SESSION
  // ==========================================

  async logout(
    rawRefreshToken: string,
  ): Promise<void> {
    if (
      typeof rawRefreshToken !== 'string' ||
      !rawRefreshToken
    ) {
      return;
    }

    const tokenHash =
      this.hashRefreshToken(rawRefreshToken);

    const token =
      await this.prisma.refreshToken.findUnique({
        where: { tokenHash },
        select: {
          userId: true,
          revokedAt: true,
        },
      });

    // Logout is idempotent
    if (!token || token.revokedAt) {
      return;
    }

    const now = new Date();

    await this.prisma.$transaction(async (tx) => {
      const revoked =
        await tx.refreshToken.updateMany({
          where: {
            tokenHash,
            revokedAt: null,
          },
          data: {
            revokedAt: now,
          },
        });

      if (revoked.count !== 1) {
        return;
      }

      await tx.auditLog.create({
        data: {
          actorId: token.userId,
          action: AuditAction.LOGOUT,
          entityType: 'User',
          entityId: token.userId,
          description: 'Admin logged out',
        },
      });
    });
  }

  // ==========================================
  // 4. LOGOUT ALL SESSIONS
  // ==========================================

  async logoutAll(
    userId: string,
  ): Promise<{ revokedCount: number }> {
    const now = new Date();

    return this.prisma.$transaction(async (tx) => {
      const result =
        await tx.refreshToken.updateMany({
          where: {
            userId,
            revokedAt: null,
          },
          data: {
            revokedAt: now,
          },
        });

      if (result.count > 0) {
        await tx.auditLog.create({
          data: {
            actorId: userId,
            action: AuditAction.LOGOUT,
            entityType: 'User',
            entityId: userId,
            description:
              'All Admin sessions were revoked',
          },
        });
      }

      return {
        revokedCount: result.count,
      };
    });
  }

  // ==========================================
  // 5. GET CURRENT ADMIN
  // ==========================================

  async getCurrentAdmin(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        avatarUrl: true,
        role: true,
        status: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException(
        'Admin account not found',
      );
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new ForbiddenException(
        'Admin account is inactive',
      );
    }

    if (user.role !== Role.ADMIN) {
      throw new ForbiddenException(
        'Admin access is not allowed',
      );
    }

    return user;
  }
}
