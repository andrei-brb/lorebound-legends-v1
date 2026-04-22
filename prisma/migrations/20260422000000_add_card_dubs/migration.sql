-- Add Player.cardDubs JSON storage for duplicate “dubs” (0–3 per card id).
ALTER TABLE "Player" ADD COLUMN "cardDubs" JSONB;

