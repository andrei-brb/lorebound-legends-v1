-- PvE verified battle: store seed, decks, progress snapshot; optional skip for raid co-op.
ALTER TABLE "PveBattleSession" ADD COLUMN IF NOT EXISTS "skipReplayVerification" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "PveBattleSession" ADD COLUMN IF NOT EXISTS "seed" INTEGER;
ALTER TABLE "PveBattleSession" ADD COLUMN IF NOT EXISTS "playerDeckIds" JSONB;
ALTER TABLE "PveBattleSession" ADD COLUMN IF NOT EXISTS "enemyDeckIds" JSONB;
ALTER TABLE "PveBattleSession" ADD COLUMN IF NOT EXISTS "enemyHero" JSONB;
ALTER TABLE "PveBattleSession" ADD COLUMN IF NOT EXISTS "playerProgressSnapshot" JSONB;
ALTER TABLE "PveBattleSession" ADD COLUMN IF NOT EXISTS "raidBossId" TEXT;
