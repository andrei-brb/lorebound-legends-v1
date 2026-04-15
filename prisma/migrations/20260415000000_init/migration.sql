-- CreateTable
CREATE TABLE "Player" (
    "id" SERIAL NOT NULL,
    "discordId" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "avatar" TEXT,
    "gold" INTEGER NOT NULL DEFAULT 500,
    "stardust" INTEGER NOT NULL DEFAULT 0,
    "pityCounter" INTEGER NOT NULL DEFAULT 0,
    "totalPulls" INTEGER NOT NULL DEFAULT 0,
    "lastFreePackTime" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Player_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CardProgress" (
    "id" SERIAL NOT NULL,
    "playerId" INTEGER NOT NULL,
    "cardId" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,
    "xp" INTEGER NOT NULL DEFAULT 0,
    "prestigeLevel" INTEGER NOT NULL DEFAULT 0,
    "dupeCount" INTEGER NOT NULL DEFAULT 0,
    "goldStars" INTEGER NOT NULL DEFAULT 0,
    "redStars" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "CardProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Deck" (
    "id" SERIAL NOT NULL,
    "playerId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "cardIds" JSONB NOT NULL,

    CONSTRAINT "Deck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BattleStat" (
    "id" SERIAL NOT NULL,
    "playerId" INTEGER NOT NULL,
    "wins" INTEGER NOT NULL DEFAULT 0,
    "losses" INTEGER NOT NULL DEFAULT 0,
    "draws" INTEGER NOT NULL DEFAULT 0,
    "goldEarned" INTEGER NOT NULL DEFAULT 0,
    "lastBattleAt" TIMESTAMP(3),

    CONSTRAINT "BattleStat_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Player_discordId_key" ON "Player"("discordId");

-- CreateIndex
CREATE INDEX "CardProgress_playerId_idx" ON "CardProgress"("playerId");

-- CreateIndex
CREATE UNIQUE INDEX "CardProgress_playerId_cardId_key" ON "CardProgress"("playerId", "cardId");

-- CreateIndex
CREATE INDEX "Deck_playerId_idx" ON "Deck"("playerId");

-- CreateIndex
CREATE UNIQUE INDEX "BattleStat_playerId_key" ON "BattleStat"("playerId");

-- AddForeignKey
ALTER TABLE "CardProgress" ADD CONSTRAINT "CardProgress_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deck" ADD CONSTRAINT "Deck_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BattleStat" ADD CONSTRAINT "BattleStat_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE CASCADE ON UPDATE CASCADE;
