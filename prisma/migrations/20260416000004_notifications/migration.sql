-- Notifications (inbox/mail)

DO $$ BEGIN
  CREATE TYPE "NotificationType" AS ENUM (
    'friend_request',
    'friend_accepted',
    'trade_received',
    'trade_accepted',
    'trade_cancelled',
    'market_listing_sold',
    'pvp_match_ready',
    'pvp_live_invite',
    'pvp_live_result'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "Notification" (
  "id" SERIAL PRIMARY KEY,
  "playerId" INTEGER NOT NULL,
  "type" "NotificationType" NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT,
  "data" JSONB,
  "readAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Notification_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "Notification_playerId_idx" ON "Notification"("playerId");
CREATE INDEX IF NOT EXISTS "Notification_type_idx" ON "Notification"("type");
CREATE INDEX IF NOT EXISTS "Notification_createdAt_idx" ON "Notification"("createdAt");
CREATE INDEX IF NOT EXISTS "Notification_readAt_idx" ON "Notification"("readAt");

