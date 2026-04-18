-- PvE battle sessions (server-issued matchId for /api/battle/result)
CREATE TABLE IF NOT EXISTS "PveBattleSession" (
    "id" TEXT NOT NULL,
    "playerId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "PveBattleSession_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "PveBattleSession_playerId_createdAt_idx" ON "PveBattleSession"("playerId", "createdAt");

DO $$ BEGIN
  ALTER TABLE "PveBattleSession" ADD CONSTRAINT "PveBattleSession_playerId_fkey"
    FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "Player" ADD COLUMN IF NOT EXISTS "shareCollectionWithFriends" BOOLEAN NOT NULL DEFAULT false;
