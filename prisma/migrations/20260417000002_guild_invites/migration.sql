-- Add guild invite support (request/join via accept/decline).

CREATE TYPE "GuildInviteStatus" AS ENUM ('pending', 'accepted', 'declined', 'cancelled');

CREATE TABLE "GuildInvite" (
  "id" SERIAL NOT NULL,
  "guildId" INTEGER NOT NULL,
  "fromPlayerId" INTEGER NOT NULL,
  "toPlayerId" INTEGER NOT NULL,
  "status" "GuildInviteStatus" NOT NULL DEFAULT 'pending',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "respondedAt" TIMESTAMP(3),

  CONSTRAINT "GuildInvite_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "GuildInvite_guildId_idx" ON "GuildInvite"("guildId");
CREATE INDEX "GuildInvite_toPlayerId_idx" ON "GuildInvite"("toPlayerId");
CREATE INDEX "GuildInvite_status_idx" ON "GuildInvite"("status");
CREATE INDEX "GuildInvite_createdAt_idx" ON "GuildInvite"("createdAt");

CREATE UNIQUE INDEX "GuildInvite_guildId_toPlayerId_status_key" ON "GuildInvite"("guildId", "toPlayerId", "status");

ALTER TABLE "GuildInvite" ADD CONSTRAINT "GuildInvite_guildId_fkey"
  FOREIGN KEY ("guildId") REFERENCES "Guild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "GuildInvite" ADD CONSTRAINT "GuildInvite_fromPlayerId_fkey"
  FOREIGN KEY ("fromPlayerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "GuildInvite" ADD CONSTRAINT "GuildInvite_toPlayerId_fkey"
  FOREIGN KEY ("toPlayerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

