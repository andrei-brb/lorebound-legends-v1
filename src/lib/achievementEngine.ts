import type { PlayerState } from "./playerState";
import { allCards } from "@/data/cards";

export interface AchievementDefinition {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: "collection" | "battle" | "progression" | "economy";
  check: (state: PlayerState, stats: AchievementStats) => boolean;
}

export interface AchievementStats {
  totalWins: number;
  totalBattles: number;
  winStreak: number;
  maxWinStreak: number;
  totalPulls: number;
  totalCrafts: number;
  totalSacrifices: number;
}

export interface AchievementState {
  unlocked: Record<string, number>; // id -> timestamp
  stats: AchievementStats;
}

const ACHIEVEMENT_KEY = "mythic-arcana-achievements";

export const ACHIEVEMENTS: AchievementDefinition[] = [
  // Collection
  { id: "first_card", title: "First Steps", description: "Own your first card", icon: "🃏", category: "collection",
    check: (state) => state.ownedCardIds.length >= 1 },
  { id: "collector_10", title: "Collector", description: "Own 10 different cards", icon: "📚", category: "collection",
    check: (state) => state.ownedCardIds.length >= 10 },
  { id: "collector_25", title: "Archivist", description: "Own 25 different cards", icon: "📖", category: "collection",
    check: (state) => state.ownedCardIds.length >= 25 },
  { id: "collector_50", title: "Curator", description: "Own 50 different cards", icon: "🏛️", category: "collection",
    check: (state) => state.ownedCardIds.length >= 50 },
  { id: "full_collection", title: "Mythic Completionist", description: "Collect every card in the game", icon: "👑", category: "collection",
    check: (state) => {
      const uniqueIds = new Set(allCards.map(c => c.id));
      return state.ownedCardIds.length >= uniqueIds.size;
    }},
  { id: "first_legendary", title: "Legendary Find", description: "Own your first Legendary card", icon: "⭐", category: "collection",
    check: (state) => state.ownedCardIds.some(id => allCards.find(c => c.id === id)?.rarity === "legendary") },
  { id: "legendary_5", title: "Legend Hoarder", description: "Own 5 Legendary cards", icon: "🌟", category: "collection",
    check: (state) => state.ownedCardIds.filter(id => allCards.find(c => c.id === id)?.rarity === "legendary").length >= 5 },

  // Battle
  { id: "first_win", title: "Victor", description: "Win your first battle", icon: "⚔️", category: "battle",
    check: (_, stats) => stats.totalWins >= 1 },
  { id: "wins_10", title: "Warrior", description: "Win 10 battles", icon: "🗡️", category: "battle",
    check: (_, stats) => stats.totalWins >= 10 },
  { id: "wins_50", title: "Champion", description: "Win 50 battles", icon: "🏆", category: "battle",
    check: (_, stats) => stats.totalWins >= 50 },
  { id: "streak_5", title: "Unstoppable", description: "Win 5 battles in a row", icon: "🔥", category: "battle",
    check: (_, stats) => stats.maxWinStreak >= 5 },
  { id: "streak_10", title: "Invincible", description: "Win 10 battles in a row", icon: "💎", category: "battle",
    check: (_, stats) => stats.maxWinStreak >= 10 },

  // Progression
  { id: "max_level", title: "Master", description: "Reach max level on a card", icon: "📈", category: "progression",
    check: (state) => Object.values(state.cardProgress).some(p => p.level >= 20) },
  { id: "prestige_1", title: "Transcendent", description: "Prestige a card for the first time", icon: "🔄", category: "progression",
    check: (state) => Object.values(state.cardProgress).some(p => p.prestigeLevel >= 1) },

  // Economy
  { id: "rich_1000", title: "Prospector", description: "Accumulate 1,000 gold", icon: "💰", category: "economy",
    check: (state) => state.gold >= 1000 },
  { id: "rich_5000", title: "Tycoon", description: "Accumulate 5,000 gold", icon: "💎", category: "economy",
    check: (state) => state.gold >= 5000 },
  { id: "crafter", title: "Artificer", description: "Craft your first card", icon: "🔨", category: "economy",
    check: (_, stats) => stats.totalCrafts >= 1 },
];

export function loadAchievementState(): AchievementState {
  try {
    const raw = localStorage.getItem(ACHIEVEMENT_KEY);
    if (raw) {
      const state = JSON.parse(raw) as AchievementState;
      if (!state.stats) state.stats = getDefaultStats();
      return state;
    }
  } catch { /* ignore */ }
  return { unlocked: {}, stats: getDefaultStats() };
}

export function saveAchievementState(state: AchievementState): void {
  localStorage.setItem(ACHIEVEMENT_KEY, JSON.stringify(state));
}

function getDefaultStats(): AchievementStats {
  return { totalWins: 0, totalBattles: 0, winStreak: 0, maxWinStreak: 0, totalPulls: 0, totalCrafts: 0, totalSacrifices: 0 };
}

export function updateAchievementStats(
  achieveState: AchievementState,
  update: Partial<AchievementStats> & { battleWon?: boolean }
): AchievementState {
  const newState = { ...achieveState, stats: { ...achieveState.stats } };

  if (update.totalWins !== undefined) newState.stats.totalWins = update.totalWins;
  if (update.totalBattles !== undefined) newState.stats.totalBattles = update.totalBattles;
  if (update.totalPulls !== undefined) newState.stats.totalPulls = update.totalPulls;
  if (update.totalCrafts !== undefined) newState.stats.totalCrafts = update.totalCrafts;
  if (update.totalSacrifices !== undefined) newState.stats.totalSacrifices = update.totalSacrifices;

  // Win streak logic
  if (update.battleWon === true) {
    newState.stats.winStreak += 1;
    newState.stats.maxWinStreak = Math.max(newState.stats.maxWinStreak, newState.stats.winStreak);
  } else if (update.battleWon === false) {
    newState.stats.winStreak = 0;
  }

  saveAchievementState(newState);
  return newState;
}

export function checkNewAchievements(
  achieveState: AchievementState,
  playerState: PlayerState
): { achieveState: AchievementState; newlyUnlocked: AchievementDefinition[] } {
  const newlyUnlocked: AchievementDefinition[] = [];
  const newState = { ...achieveState, unlocked: { ...achieveState.unlocked } };

  for (const ach of ACHIEVEMENTS) {
    if (newState.unlocked[ach.id]) continue;
    if (ach.check(playerState, newState.stats)) {
      newState.unlocked[ach.id] = Date.now();
      newlyUnlocked.push(ach);
    }
  }

  if (newlyUnlocked.length > 0) {
    saveAchievementState(newState);
  }

  return { achieveState: newState, newlyUnlocked };
}
