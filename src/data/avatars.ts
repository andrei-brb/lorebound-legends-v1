// Avatar catalog. Avatars are emoji-based for now (zero-asset, instant theming).
// Each avatar has an unlock condition checked against PlayerState + AchievementState.

import type { PlayerState } from "@/lib/playerState";
import type { AchievementState } from "@/lib/achievementEngine";

export interface AvatarDefinition {
  id: string;
  name: string;
  emoji: string;
  description: string;
  unlock: (state: PlayerState, ach: AchievementState) => boolean;
  unlockHint: string;
}

export const AVATARS: AvatarDefinition[] = [
  { id: "default", name: "Wanderer", emoji: "🧙", description: "Every legend begins here.", unlock: () => true, unlockHint: "Default avatar" },
  { id: "flame", name: "Flame Acolyte", emoji: "🔥", description: "Forged in the volcanic peaks.", unlock: (s) => s.selectedPath === "fire", unlockHint: "Choose the Fire path" },
  { id: "leaf", name: "Verdant Sage", emoji: "🌿", description: "Whispered to by ancient groves.", unlock: (s) => s.selectedPath === "nature", unlockHint: "Choose the Nature path" },
  { id: "void", name: "Voidwalker", emoji: "🌑", description: "Bound to the silent dark.", unlock: (s) => s.selectedPath === "shadow", unlockHint: "Choose the Shadow path" },
  { id: "sword", name: "Champion", emoji: "⚔️", description: "Tempered in 10 victories.", unlock: (_s, a) => !!a.unlocked["wins_10"], unlockHint: "Win 10 battles" },
  { id: "trophy", name: "Conqueror", emoji: "🏆", description: "Master of 50 battlefields.", unlock: (_s, a) => !!a.unlocked["wins_50"], unlockHint: "Win 50 battles" },
  { id: "crown", name: "Sovereign", emoji: "👑", description: "Crowned by the legends themselves.", unlock: (s) => s.ownedCardIds.length >= 25, unlockHint: "Own 25 different cards" },
  { id: "dragon", name: "Dragonbound", emoji: "🐉", description: "Companion to ancient wyrms.", unlock: (s) => s.ownedCardIds.includes("fire-dragon"), unlockHint: "Own the Fire Dragon card" },
  { id: "moon", name: "Moonchild", emoji: "🌙", description: "Walks beneath silver light.", unlock: (s) => s.ownedCardIds.includes("moon-goddess"), unlockHint: "Own the Moon Goddess card" },
  { id: "gem", name: "Treasure Lord", emoji: "💎", description: "Wealth beyond measure.", unlock: (s) => s.gold >= 5000, unlockHint: "Hold 5,000 gold" },
  { id: "spark", name: "Stardust Mage", emoji: "✨", description: "Channels astral essence.", unlock: (s) => s.stardust >= 500, unlockHint: "Hold 500 stardust" },
  { id: "skull", name: "Reaper", emoji: "💀", description: "Death walks beside you.", unlock: (_s, a) => !!a.unlocked["streak_5"], unlockHint: "Win 5 battles in a row" },
];

export function getAvatar(id: string | undefined | null): AvatarDefinition {
  return AVATARS.find((a) => a.id === id) ?? AVATARS[0];
}
