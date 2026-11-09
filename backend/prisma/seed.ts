
import 'dotenv/config';

import { PrismaPg } from '@prisma/adapter-pg';

import { PrismaClient } from '../src/generated/prisma/client.js';

import {
  Role,
  UserStatus,
} from '../src/generated/prisma/enums.js';

// ==========================================
// ENVIRONMENT CONFIGURATION
// ==========================================

// Database connection
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is required');
}

// Admin email
const rawAdminEmail = process.env.ADMIN_EMAIL;

if (
  typeof rawAdminEmail !== 'string' ||
  rawAdminEmail.trim().length === 0
) {
  throw new Error('ADMIN_EMAIL is required');
}

const adminEmail: string = rawAdminEmail
  .trim()
  .toLowerCase();

if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail)) {
  throw new Error('ADMIN_EMAIL must be a valid email');
}

// Admin full name
const adminFullName =
  process.env.ADMIN_FULL_NAME?.trim() ||
  'VinFast Administrator';

// ==========================================
// PRISMA CLIENT
// ==========================================

const adapter = new PrismaPg({
  connectionString: databaseUrl,
});

const prisma = new PrismaClient({
  adapter,
});

// ==========================================
// SEED INITIAL ADMIN ACCOUNT
// ==========================================

async function main(): Promise<void> {
  const admin = await prisma.user.upsert({
    where: {
      email: adminEmail,
    },

    create: {
      email: adminEmail,
      fullName: adminFullName,
      role: Role.ADMIN,
      status: UserStatus.ACTIVE,
    },

    update: {
      fullName: adminFullName,
      role: Role.ADMIN,
    },

    select: {
      id: true,
      email: true,
      fullName: true,
      googleId: true,
      role: true,
      status: true,
      createdAt: true,
    },
  });

  console.log('==========================================');
  console.log('Admin account initialized successfully.');
  console.log('==========================================');

  console.log({
    id: admin.id,
    email: admin.email,
    fullName: admin.fullName,
    googleId: admin.googleId,
    role: admin.role,
    status: admin.status,
  });
}

// ==========================================
// EXECUTION
// ==========================================

main()
  .catch((error: unknown) => {
    console.error('Admin seeding failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
