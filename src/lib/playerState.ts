import { allCards } from "@/data/cards";
import { type StarProgress, getDefaultStarProgress, processDuplicate } from "./starSystem";

export interface CardProgress {
  level: number;
  xp: number;
  prestigeLevel: number; // 0-3
  starProgress: StarProgress;
}

export type FactionPath = "fire" | "nature" | "shadow";

export interface PlayerState {
  gold: number;
  stardust: number;
  ownedCardIds: string[];
  cardProgress: Record<string, CardProgress>;
  pityCounter: number; // pulls since last legendary
  lastFreePackTime: number | null;
  totalPulls: number;
  hasCompletedOnboarding: boolean;
  selectedPath: FactionPath | null;
  // Battle Pass + cosmetics (client + server)
  battlePass?: BattlePassState;
  cosmeticsOwned?: string[];
  cosmeticsEquipped?: CosmeticsEquipped;
  battlePassXpBoostExpiresAt?: number | null; // epoch ms; doubles BP XP while active
  deckPresets?: DeckPreset[];
}

export interface DeckPreset {
  id: string;
  name: string;
  cardIds: string[]; // up to 10
  updatedAt: number; // epoch ms
}

export type BattlePassSeasonId = "season-01" | "season-02" | "season-03";

export interface BattlePassSeasonProgress {
  seasonId: BattlePassSeasonId;
  xp: number;
  hasElite: boolean;
  claimedFreeLevels: number[];
  claimedEliteLevels: number[];
}

export interface BattlePassState {
  activeSeasonId: BattlePassSeasonId;
  seasons: Partial<Record<BattlePassSeasonId, BattlePassSeasonProgress>>;
  daily: { date: string; xpEarned: number }; // XP cap tracking
}

export interface CosmeticsEquipped {
  boardSkinId?: string | null;
  cardFrameId?: string | null;
  cardBackId?: string | null;
  borderId?: string | null;
  titleId?: string | null;
}

export const FACTION_STARTER_CARDS: Record<FactionPath, string[]> = {
  fire: [
    "pyrothos", "fire-dragon", "inferna", "ignis", "magmus",
    "draconus", "warrior-king", "ares", "ferros", "bellator",
  ],
  nature: [
    "gaiara", "forest-druid", "verdantia", "sylvana", "vitalis",
    "arachnia", "serpentia", "fenris", "healer", "aquaris",
  ],
  shadow: [
    "nyx", "shadow-assassin", "thanatos", "nekros", "umbra",
    "obscura", "corvus", "mortuus", "phantos", "somnia",
  ],
};

const STORAGE_KEY = "mythic-arcana-player";

const STARTER_CARD_IDS = [
  "warrior-king", "moon-goddess", "fire-dragon", "shadow-assassin", "forest-druid",
  "healer", "divine-shield", "terragon", "tempestia", "nekros",
];

function todayString(): string {
  return new Date().toISOString().slice(0, 10);
}

function getDefaultBattlePassState(): BattlePassState {
  return {
    activeSeasonId: "season-01",
    seasons: {},
    daily: { date: todayString(), xpEarned: 0 },
  };
}

function normalizeBattlePassState(bp: BattlePassState | undefined): BattlePassState {
  const base = bp ?? getDefaultBattlePassState();
  const date = base.daily?.date ?? todayString();
  const daily = date === todayString() ? base.daily : { date: todayString(), xpEarned: 0 };
  return {
    activeSeasonId: (base.activeSeasonId ?? "season-01") as BattlePassSeasonId,
    seasons: base.seasons ?? {},
    daily,
  };
}

function normalizeCosmeticsEquipped(eq: CosmeticsEquipped | undefined): CosmeticsEquipped {
  return {
    boardSkinId: eq?.boardSkinId ?? null,
    cardFrameId: eq?.cardFrameId ?? null,
    cardBackId: eq?.cardBackId ?? null,
    borderId: eq?.borderId ?? null,
    titleId: eq?.titleId ?? null,
  };
}

function createDefaultState(): PlayerState {
  return {
    gold: 500,
    stardust: 0,
    ownedCardIds: [],
    cardProgress: {},
    pityCounter: 0,
    lastFreePackTime: null,
    totalPulls: 0,
    hasCompletedOnboarding: false,
    selectedPath: null,
    battlePass: getDefaultBattlePassState(),
    cosmeticsOwned: [],
    cosmeticsEquipped: normalizeCosmeticsEquipped(undefined),
    battlePassXpBoostExpiresAt: null,
    deckPresets: [],
  };
}

export function initializeStarterDeck(state: PlayerState, path: FactionPath): PlayerState {
  const starterIds = FACTION_STARTER_CARDS[path];
  const cardProgress: Record<string, CardProgress> = {};
  for (const id of starterIds) {
    cardProgress[id] = { level: 1, xp: 0, prestigeLevel: 0, starProgress: getDefaultStarProgress() };
  }
  return {
    ...state,
    ownedCardIds: [...starterIds],
    cardProgress,
    hasCompletedOnboarding: true,
    selectedPath: path,
  };
}

export function loadPlayerState(): PlayerState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const state = JSON.parse(raw) as PlayerState;
      // Migration: add stardust if missing
      if (state.stardust === undefined) state.stardust = 0;
      // Migration: add onboarding fields
      if (state.hasCompletedOnboarding === undefined) state.hasCompletedOnboarding = true; // existing players already onboarded
      if (state.selectedPath === undefined) state.selectedPath = null;
      // Migration: add battle pass + cosmetics
      state.battlePass = normalizeBattlePassState(state.battlePass);
      if (!Array.isArray(state.cosmeticsOwned)) state.cosmeticsOwned = [];
      state.cosmeticsEquipped = normalizeCosmeticsEquipped(state.cosmeticsEquipped);
      if (state.battlePassXpBoostExpiresAt === undefined) state.battlePassXpBoostExpiresAt = null;
      if (!Array.isArray(state.deckPresets)) state.deckPresets = [];
      // Migration: add starProgress to existing cards
      for (const id of Object.keys(state.cardProgress)) {
        if (!state.cardProgress[id].starProgress) {
          state.cardProgress[id].starProgress = getDefaultStarProgress();
        }
      }
      return state;
    }
  } catch { /* ignore */ }
  return createDefaultState();
}

export function savePlayerState(state: PlayerState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function getCardProgress(state: PlayerState, cardId: string): CardProgress {
  return state.cardProgress[cardId] || { level: 1, xp: 0, prestigeLevel: 0, starProgress: getDefaultStarProgress() };
}

export function xpForLevel(level: number): number {
  return 100 * level;
}

export function canClaimFreePack(state: PlayerState): boolean {
  if (!state.lastFreePackTime) return true;
  return Date.now() - state.lastFreePackTime >= 24 * 60 * 60 * 1000;
}

export function freePackTimeRemaining(state: PlayerState): number {
  if (!state.lastFreePackTime) return 0;
  const elapsed = Date.now() - state.lastFreePackTime;
  const remaining = 24 * 60 * 60 * 1000 - elapsed;
  return Math.max(0, remaining);
}

export function addCardToCollection(state: PlayerState, cardId: string): { state: PlayerState; isDuplicate: boolean; stardustEarned: number; newGoldStar: boolean; newRedStar: boolean } {
  const newState = { ...state, cardProgress: { ...state.cardProgress } };
  
  if (newState.ownedCardIds.includes(cardId)) {
    // Duplicate: process star system
    const card = allCards.find(c => c.id === cardId);
    const rarity = card?.rarity || "common";
    const currentProgress = { ...(newState.cardProgress[cardId] || { level: 1, xp: 0, prestigeLevel: 0, starProgress: getDefaultStarProgress() }) };
    const starResult = processDuplicate(currentProgress.starProgress || getDefaultStarProgress(), rarity);
    
    currentProgress.starProgress = starResult.progress;
    currentProgress.xp += 50; // Keep XP bonus too
    newState.cardProgress[cardId] = currentProgress;
    newState.stardust = (newState.stardust || 0) + starResult.stardustEarned;
    
    return { 
      state: newState, 
      isDuplicate: true, 
      stardustEarned: starResult.stardustEarned,
      newGoldStar: starResult.newGoldStar,
      newRedStar: starResult.newRedStar,
    };
  }
  
  newState.ownedCardIds = [...newState.ownedCardIds, cardId];
  newState.cardProgress[cardId] = { level: 1, xp: 0, prestigeLevel: 0, starProgress: getDefaultStarProgress() };
  return { state: newState, isDuplicate: false, stardustEarned: 0, newGoldStar: false, newRedStar: false };
}
