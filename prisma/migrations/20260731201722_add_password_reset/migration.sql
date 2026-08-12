/*
  Warnings:

  - You are about to drop the column `emailVerificationExpiresAt` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `emailVerificationTokenHash` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `emailVerified` on the `users` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "users" DROP COLUMN "emailVerificationExpiresAt",
DROP COLUMN "emailVerificationTokenHash",
DROP COLUMN "emailVerified",
ADD COLUMN     "passwordResetTokenExpiresAt" TIMESTAMP(3),
ADD COLUMN     "passwordResetTokenHash" TEXT;
