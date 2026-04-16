-- Ensure the opt-in sharing column exists with the correct (quoted) name.
-- This is safe to run even if the column was added manually.
ALTER TABLE "Player"
ADD COLUMN IF NOT EXISTS "shareCollectionWithFriends" BOOLEAN NOT NULL DEFAULT false;

