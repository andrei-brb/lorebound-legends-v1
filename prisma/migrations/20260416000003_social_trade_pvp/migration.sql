-- Friends + Trading + Marketplace + PvP

-- Enums
DO $$ BEGIN
  CREATE TYPE "FriendshipStatus" AS ENUM ('pending', 'accepted', 'blocked');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "TradeStatus" AS ENUM ('open', 'cancelled', 'accepted', 'expired');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "TradeSide" AS ENUM ('from', 'to');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "ListingStatus" AS ENUM ('open', 'cancelled', 'fulfilled', 'expired');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "PvPMatchType" AS ENUM ('async', 'live');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "PvPMatchStatus" AS ENUM ('pending', 'active', 'completed', 'cancelled', 'expired');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Friendship
CREATE TABLE IF NOT EXISTS "Friendship" (
  "id" SERIAL PRIMARY KEY,
  "playerId" INTEGER NOT NULL,
  "friendPlayerId" INTEGER NOT NULL,
  "status" "FriendshipStatus" NOT NULL DEFAULT 'pending',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Friendship_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Friendship_friendPlayerId_fkey" FOREIGN KEY ("friendPlayerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "Friendship_playerId_friendPlayerId_key" ON "Friendship"("playerId","friendPlayerId");
CREATE INDEX IF NOT EXISTS "Friendship_playerId_idx" ON "Friendship"("playerId");
CREATE INDEX IF NOT EXISTS "Friendship_friendPlayerId_idx" ON "Friendship"("friendPlayerId");
CREATE INDEX IF NOT EXISTS "Friendship_status_idx" ON "Friendship"("status");

-- Trades
CREATE TABLE IF NOT EXISTS "Trade" (
  "id" SERIAL PRIMARY KEY,
  "status" "TradeStatus" NOT NULL DEFAULT 'open',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "fromPlayerId" INTEGER NOT NULL,
  "toPlayerId" INTEGER NOT NULL,
  "taxGold" INTEGER NOT NULL DEFAULT 0,
  "taxStardust" INTEGER NOT NULL DEFAULT 0,
  "message" TEXT,
  CONSTRAINT "Trade_fromPlayerId_fkey" FOREIGN KEY ("fromPlayerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Trade_toPlayerId_fkey" FOREIGN KEY ("toPlayerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "Trade_fromPlayerId_idx" ON "Trade"("fromPlayerId");
CREATE INDEX IF NOT EXISTS "Trade_toPlayerId_idx" ON "Trade"("toPlayerId");
CREATE INDEX IF NOT EXISTS "Trade_status_idx" ON "Trade"("status");
CREATE INDEX IF NOT EXISTS "Trade_createdAt_idx" ON "Trade"("createdAt");

CREATE TABLE IF NOT EXISTS "TradeItem" (
  "id" SERIAL PRIMARY KEY,
  "tradeId" INTEGER NOT NULL,
  "side" "TradeSide" NOT NULL,
  "cardId" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  CONSTRAINT "TradeItem_tradeId_fkey" FOREIGN KEY ("tradeId") REFERENCES "Trade"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "TradeItem_tradeId_idx" ON "TradeItem"("tradeId");
CREATE INDEX IF NOT EXISTS "TradeItem_cardId_idx" ON "TradeItem"("cardId");
CREATE INDEX IF NOT EXISTS "TradeItem_side_idx" ON "TradeItem"("side");

-- Marketplace
CREATE TABLE IF NOT EXISTS "MarketplaceListing" (
  "id" SERIAL PRIMARY KEY,
  "status" "ListingStatus" NOT NULL DEFAULT 'open',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "sellerPlayerId" INTEGER NOT NULL,
  "taxGold" INTEGER NOT NULL DEFAULT 0,
  "taxStardust" INTEGER NOT NULL DEFAULT 0,
  "note" TEXT,
  CONSTRAINT "MarketplaceListing_sellerPlayerId_fkey" FOREIGN KEY ("sellerPlayerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "MarketplaceListing_sellerPlayerId_idx" ON "MarketplaceListing"("sellerPlayerId");
CREATE INDEX IF NOT EXISTS "MarketplaceListing_status_idx" ON "MarketplaceListing"("status");
CREATE INDEX IF NOT EXISTS "MarketplaceListing_createdAt_idx" ON "MarketplaceListing"("createdAt");

CREATE TABLE IF NOT EXISTS "MarketplaceItem" (
  "id" SERIAL PRIMARY KEY,
  "listingId" INTEGER NOT NULL,
  "side" "TradeSide" NOT NULL,
  "cardId" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL DEFAULT 1,
  CONSTRAINT "MarketplaceItem_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "MarketplaceListing"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "MarketplaceItem_listingId_idx" ON "MarketplaceItem"("listingId");
CREATE INDEX IF NOT EXISTS "MarketplaceItem_cardId_idx" ON "MarketplaceItem"("cardId");
CREATE INDEX IF NOT EXISTS "MarketplaceItem_side_idx" ON "MarketplaceItem"("side");

-- PvP
CREATE TABLE IF NOT EXISTS "PvPDeckSnapshot" (
  "id" SERIAL PRIMARY KEY,
  "playerId" INTEGER NOT NULL,
  "seasonId" TEXT NOT NULL,
  "deckCardIds" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PvPDeckSnapshot_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "PvPDeckSnapshot_playerId_seasonId_key" ON "PvPDeckSnapshot"("playerId","seasonId");
CREATE INDEX IF NOT EXISTS "PvPDeckSnapshot_seasonId_idx" ON "PvPDeckSnapshot"("seasonId");

CREATE TABLE IF NOT EXISTS "PvPRating" (
  "id" SERIAL PRIMARY KEY,
  "playerId" INTEGER NOT NULL,
  "seasonId" TEXT NOT NULL,
  "mmr" INTEGER NOT NULL DEFAULT 1000,
  "rankTier" TEXT NOT NULL DEFAULT 'Bronze',
  "gamesPlayed" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PvPRating_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "PvPRating_playerId_seasonId_key" ON "PvPRating"("playerId","seasonId");
CREATE INDEX IF NOT EXISTS "PvPRating_seasonId_idx" ON "PvPRating"("seasonId");
CREATE INDEX IF NOT EXISTS "PvPRating_mmr_idx" ON "PvPRating"("mmr");

CREATE TABLE IF NOT EXISTS "PvPMatch" (
  "id" SERIAL PRIMARY KEY,
  "type" "PvPMatchType" NOT NULL,
  "status" "PvPMatchStatus" NOT NULL DEFAULT 'pending',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "playerAId" INTEGER NOT NULL,
  "playerBId" INTEGER NOT NULL,
  "seasonId" TEXT,
  "seed" INTEGER,
  "result" JSONB,
  "state" JSONB,
  "actionLog" JSONB,
  "turnPlayerId" INTEGER,
  "lastActionAt" TIMESTAMP(3),
  CONSTRAINT "PvPMatch_playerAId_fkey" FOREIGN KEY ("playerAId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "PvPMatch_playerBId_fkey" FOREIGN KEY ("playerBId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "PvPMatch_type_idx" ON "PvPMatch"("type");
CREATE INDEX IF NOT EXISTS "PvPMatch_status_idx" ON "PvPMatch"("status");
CREATE INDEX IF NOT EXISTS "PvPMatch_seasonId_idx" ON "PvPMatch"("seasonId");
CREATE INDEX IF NOT EXISTS "PvPMatch_playerAId_idx" ON "PvPMatch"("playerAId");
CREATE INDEX IF NOT EXISTS "PvPMatch_playerBId_idx" ON "PvPMatch"("playerBId");
CREATE INDEX IF NOT EXISTS "PvPMatch_createdAt_idx" ON "PvPMatch"("createdAt");

