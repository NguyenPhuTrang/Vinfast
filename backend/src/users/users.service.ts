
import { Injectable } from '@nestjs/common';

import { PrismaService } from '../database/prisma.service.js';

import type { Role } from '../generated/prisma/enums.js';

// Google account information returned by verified Google authentication
export interface GoogleProfileInput {
  googleId: string;
  email: string;
  fullName: string;
  avatarUrl?: string | null;
  role: Role;
}

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  // Select only the user information needed by the application
  private readonly userSelect = {
    id: true,
    googleId: true,
    email: true,
    fullName: true,
    avatarUrl: true,
    role: true,
    status: true,
    lastLoginAt: true,
    createdAt: true,
    updatedAt: true,
  } as const;

  // Find a user by Google ID
  async findByGoogleId(googleId: string) {
    return this.prisma.user.findUnique({
      where: { googleId },
      select: this.userSelect,
    });
  }

  // Find a user by email
  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
      select: this.userSelect,
    });
  }

  // Find a user by database ID
  async findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: this.userSelect,
    });
  }

  // Create a user from a verified Google profile
  async createFromGoogle(input: GoogleProfileInput) {
    return this.prisma.user.create({
      data: {
        googleId: input.googleId,
        email: input.email,
        fullName: input.fullName,
        avatarUrl: input.avatarUrl ?? null,
        role: input.role,
      },
      select: this.userSelect,
    });
  }

  // Synchronize Google profile information
  async updateGoogleProfile(
    id: string,
    input: Omit<GoogleProfileInput, 'googleId' | 'role'>,
  ) {
    return this.prisma.user.update({
      where: { id },
      data: {
        email: input.email,
        fullName: input.fullName,
        avatarUrl: input.avatarUrl ?? null,
        lastLoginAt: new Date(),
      },
      select: this.userSelect,
    });
  }

  // Update the last successful login timestamp
  async updateLastLogin(id: string) {
    return this.prisma.user.update({
      where: { id },
      data: {
        lastLoginAt: new Date(),
      },
      select: this.userSelect,
    });
  }
}
