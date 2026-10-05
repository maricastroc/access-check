-- DropForeignKey
ALTER TABLE "accounts" DROP CONSTRAINT "accounts_userId_fkey";

-- DropForeignKey
ALTER TABLE "sessions" DROP CONSTRAINT "sessions_userId_fkey";

-- DropForeignKey
ALTER TABLE "scans" DROP CONSTRAINT "scans_userId_fkey";

-- DropForeignKey
ALTER TABLE "screenshots" DROP CONSTRAINT "screenshots_scanId_fkey";

-- DropForeignKey
ALTER TABLE "site_scans" DROP CONSTRAINT "site_scans_userId_fkey";

-- DropIndex
DROP INDEX "site_scans_userId_createdAt_idx";

-- AlterTable
ALTER TABLE "site_scans" DROP COLUMN "userId";

-- DropTable
DROP TABLE "users";

-- DropTable
DROP TABLE "accounts";

-- DropTable
DROP TABLE "sessions";

-- DropTable
DROP TABLE "verification_tokens";

-- DropTable
DROP TABLE "scans";

-- DropTable
DROP TABLE "screenshots";
