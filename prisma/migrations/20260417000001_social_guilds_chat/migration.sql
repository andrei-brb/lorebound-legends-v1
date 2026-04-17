-- Social: guilds, guild membership, chat, presence
-- Idempotent migration

-- Add presence + guild link to Player
ALTER TABLE "Player" ADD COLUMN IF NOT EXISTS "lastSeenAt" TIMESTAMP(3);
ALTER TABLE "Player" ADD COLUMN IF NOT EXISTS "guildId" INTEGER;

CREATE TABLE IF NOT EXISTS "Guild" (
  "id" SERIAL PRIMARY KEY,
  "name" TEXT NOT NULL UNIQUE,
  "tag" TEXT NOT NULL UNIQUE,
  "description" TEXT,
  "ownerPlayerId" INTEGER NOT NULL,
  "memberCount" INTEGER NOT NULL DEFAULT 1,
  "weeklyGoalKey" TEXT NOT NULL DEFAULT 'wins',
  "weeklyGoalTarget" INTEGER NOT NULL DEFAULT 50,
  "weeklyGoalProgress" INTEGER NOT NULL DEFAULT 0,
  "weeklyResetAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Guild_owner_fkey" FOREIGN KEY ("ownerPlayerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "Guild_ownerPlayerId_idx" ON "Guild"("ownerPlayerId");
CREATE INDEX IF NOT EXISTS "Guild_createdAt_idx" ON "Guild"("createdAt");

-- Make Player.guildId a real FK now that Guild exists
DO $$ BEGIN
  ALTER TABLE "Player" ADD CONSTRAINT "Player_guildId_fkey"
    FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE INDEX IF NOT EXISTS "Player_guildId_idx" ON "Player"("guildId");
CREATE INDEX IF NOT EXISTS "Player_lastSeenAt_idx" ON "Player"("lastSeenAt");

-- Chat messages (channel = 'global' or 'guild:<id>')
CREATE TABLE IF NOT EXISTS "ChatMessage" (
  "id" SERIAL PRIMARY KEY,
  "channel" TEXT NOT NULL,
  "playerId" INTEGER NOT NULL,
  "username" TEXT NOT NULL,
  "avatar" TEXT,
  "body" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ChatMessage_player_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "ChatMessage_channel_createdAt_idx" ON "ChatMessage"("channel", "createdAt");
CREATE INDEX IF NOT EXISTS "ChatMessage_playerId_idx" ON "ChatMessage"("playerId");
