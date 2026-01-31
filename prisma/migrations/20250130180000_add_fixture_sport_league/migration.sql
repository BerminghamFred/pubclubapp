-- AlterTable
ALTER TABLE "upcoming_fixtures" ADD COLUMN IF NOT EXISTS "sport" TEXT;
ALTER TABLE "upcoming_fixtures" ADD COLUMN IF NOT EXISTS "league" TEXT;
