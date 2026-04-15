-- AlterTable
ALTER TABLE "Player" ADD COLUMN     "hasCompletedOnboarding" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "Player" ADD COLUMN     "selectedPath" TEXT;

