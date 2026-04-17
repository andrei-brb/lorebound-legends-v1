import type { PlayerState } from "@/lib/playerState";
import type { AchievementState } from "@/lib/achievementEngine";

export interface TitleDefinition {
  id: string;
  label: string;
  color: string;
  unlock: (state: PlayerState, ach: AchievementState) => boolean;
  unlockHint: string;
}

export const TITLES: TitleDefinition[] = [
  { id: "novice", label: "Novice", color: "text-muted-foreground", unlock: () => true, unlockHint: "Default title" },
  { id: "first-steps", label: "First Steps", color: "text-foreground", unlock: (_s, a) => !!a.unlocked["first_card"], unlockHint: "Own your first card" },
  { id: "collector", label: "the Collector", color: "text-blue-400", unlock: (_s, a) => !!a.unlocked["collector_10"], unlockHint: "Own 10 different cards" },
  { id: "archivist", label: "the Archivist", color: "text-cyan-400", unlock: (_s, a) => !!a.unlocked["collector_25"], unlockHint: "Own 25 different cards" },
  { id: "curator", label: "the Curator", color: "text-violet-400", unlock: (_s, a) => !!a.unlocked["collector_50"], unlockHint: "Own 50 different cards" },
  { id: "completionist", label: "Mythic Completionist", color: "text-[hsl(var(--legendary))]", unlock: (_s, a) => !!a.unlocked["full_collection"], unlockHint: "Collect every card" },
  { id: "legend-find", label: "Legendary Finder", color: "text-yellow-400", unlock: (_s, a) => !!a.unlocked["first_legendary"], unlockHint: "Own a Legendary card" },
  { id: "legend-hoard", label: "Legend Hoarder", color: "text-amber-400", unlock: (_s, a) => !!a.unlocked["legendary_5"], unlockHint: "Own 5 Legendary cards" },
  { id: "victor", label: "the Victor", color: "text-green-400", unlock: (_s, a) => !!a.unlocked["first_win"], unlockHint: "Win your first battle" },
  { id: "warrior", label: "the Warrior", color: "text-red-400", unlock: (_s, a) => !!a.unlocked["wins_10"], unlockHint: "Win 10 battles" },
  { id: "champion", label: "the Champion", color: "text-orange-400", unlock: (_s, a) => !!a.unlocked["wins_50"], unlockHint: "Win 50 battles" },
  { id: "unstoppable", label: "the Unstoppable", color: "text-pink-400", unlock: (_s, a) => !!a.unlocked["streak_5"], unlockHint: "Win 5 in a row" },
  { id: "invincible", label: "the Invincible", color: "text-fuchsia-400", unlock: (_s, a) => !!a.unlocked["streak_10"], unlockHint: "Win 10 in a row" },
  { id: "master", label: "the Master", color: "text-emerald-400", unlock: (_s, a) => !!a.unlocked["max_level"], unlockHint: "Max-level a card" },
  { id: "transcendent", label: "the Transcendent", color: "text-purple-400", unlock: (_s, a) => !!a.unlocked["prestige_1"], unlockHint: "Prestige a card" },
  { id: "tycoon", label: "the Tycoon", color: "text-[hsl(var(--legendary))]", unlock: (_s, a) => !!a.unlocked["rich_5000"], unlockHint: "Hold 5,000 gold" },
];

export function getTitle(id: string | null | undefined): TitleDefinition | null {
  if (!id) return null;
  return TITLES.find((t) => t.id === id) ?? null;
}
