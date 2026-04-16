-- Add battle pass + cosmetics persistence fields

ALTER TABLE "Player"
ADD COLUMN IF NOT EXISTS "battlePass" JSONB,
ADD COLUMN IF NOT EXISTS "cosmeticsOwned" JSONB,
ADD COLUMN IF NOT EXISTS "cosmeticsEquipped" JSONB,
ADD COLUMN IF NOT EXISTS "battlePassXpBoostExpiresAt" TIMESTAMP(3);

