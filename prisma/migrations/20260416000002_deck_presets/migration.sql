-- Add per-player deck presets (user-defined templates)

ALTER TABLE "Player"
ADD COLUMN IF NOT EXISTS "deckPresets" JSONB;

