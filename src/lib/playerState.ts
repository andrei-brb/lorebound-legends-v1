import { allCards } from "@/data/cards";

export interface CardProgress {
  level: number;
  xp: number;
  prestigeLevel: number; // 0-3
}

export interface PlayerState {
  gold: number;
  ownedCardIds: string[];
  cardProgress: Record<string, CardProgress>;
  pityCounter: number; // pulls since last legendary
  lastFreePackTime: number | null;
  totalPulls: number;
}

const STORAGE_KEY = "mythic-arcana-player";

const STARTER_CARD_IDS = [
  "warrior-king", "moon-goddess", "fire-dragon", "shadow-assassin", "forest-druid",
  "healer", "divine-shield", "terragon", "tempestia", "nekros",
];

function createDefaultState(): PlayerState {
  const cardProgress: Record<string, CardProgress> = {};
  for (const id of STARTER_CARD_IDS) {
    cardProgress[id] = { level: 1, xp: 0, prestigeLevel: 0 };
  }
  return {
    gold: 500,
    ownedCardIds: [...STARTER_CARD_IDS],
    cardProgress,
    pityCounter: 0,
    lastFreePackTime: null,
    totalPulls: 0,
  };
}

export function loadPlayerState(): PlayerState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return createDefaultState();
}

export function savePlayerState(state: PlayerState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function getCardProgress(state: PlayerState, cardId: string): CardProgress {
  return state.cardProgress[cardId] || { level: 1, xp: 0, prestigeLevel: 0 };
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

export function addCardToCollection(state: PlayerState, cardId: string): { state: PlayerState; isDuplicate: boolean } {
  const newState = { ...state, cardProgress: { ...state.cardProgress } };
  if (newState.ownedCardIds.includes(cardId)) {
    // Duplicate: give bonus XP
    const progress = { ...(newState.cardProgress[cardId] || { level: 1, xp: 0, prestigeLevel: 0 }) };
    progress.xp += 50;
    newState.cardProgress[cardId] = progress;
    return { state: newState, isDuplicate: true };
  }
  newState.ownedCardIds = [...newState.ownedCardIds, cardId];
  newState.cardProgress[cardId] = { level: 1, xp: 0, prestigeLevel: 0 };
  return { state: newState, isDuplicate: false };
}
