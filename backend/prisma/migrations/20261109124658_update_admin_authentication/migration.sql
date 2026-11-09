/*
  Warnings:

  - The values [EDITOR] on the enum `user_role` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "user_role_new" AS ENUM ('ADMIN');
ALTER TABLE "public"."users" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "users" ALTER COLUMN "role" TYPE "user_role_new" USING ("role"::text::"user_role_new");
ALTER TYPE "user_role" RENAME TO "user_role_old";
ALTER TYPE "user_role_new" RENAME TO "user_role";
DROP TYPE "public"."user_role_old";
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'ADMIN';
COMMIT;

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "google_id" DROP NOT NULL,
ALTER COLUMN "role" SET DEFAULT 'ADMIN';
