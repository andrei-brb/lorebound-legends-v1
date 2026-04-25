import { allCards, type Rarity } from "@/data/cards";
import type { PlayerState, CardProgress } from "./playerState";
import { getDefaultStarProgress, processDuplicate } from "./starSystem";

export type CraftAction = "fuse" | "sacrifice";

export interface FusionRecipe {
  inputRarity: Rarity;
  inputCount: number;
  outputRarity: Rarity;
  goldCost: number;
}

export interface SacrificeResult {
  stardustGained: number;
}

export const FUSION_RECIPES: FusionRecipe[] = [
  { inputRarity: "common", inputCount: 3, outputRarity: "rare", goldCost: 150 },
  { inputRarity: "rare", inputCount: 3, outputRarity: "legendary", goldCost: 500 },
  // Legendary fusion is a special case: 3 legendary dubs -> 3% mythic, else legendary.
  { inputRarity: "legendary", inputCount: 3, outputRarity: "legendary", goldCost: 1200 },
];

/** Stardust granted per card when sacrificing (by rarity). */
export const SACRIFICE_STARDUST: Record<Rarity, number> = {
  common: 10,
  rare: 30,
  legendary: 100,
  mythic: 250,
};

export function getEligibleFusionCards(playerState: PlayerState, rarity: Rarity): string[] {
  const dubs = playerState.cardDubs || {};
  return Object.keys(dubs).filter((id) => {
    const n = Math.max(0, Math.floor(Number(dubs[id] || 0)));
    if (n <= 0) return false;
    const card = allCards.find((c) => c.id === id);
    return !!card && card.rarity === rarity;
  });
}

export function getDuplicateCards(playerState: PlayerState): string[] {
  const dubs = playerState.cardDubs || {};
  return Object.keys(dubs).filter((id) => Math.max(0, Math.floor(Number(dubs[id] || 0))) > 0);
}

export function canFuse(playerState: PlayerState, recipe: FusionRecipe, selectedCardIds: string[]): boolean {
  if (selectedCardIds.length !== recipe.inputCount) return false;
  if (playerState.gold < recipe.goldCost) return false;

  // All selected cards must have dubs available and match the input rarity.
  const dubs = playerState.cardDubs || {};
  const needed: Record<string, number> = {};
  for (const id of selectedCardIds) {
    const card = allCards.find((c) => c.id === id);
    if (!card || card.rarity !== recipe.inputRarity) return false;
    needed[id] = (needed[id] || 0) + 1;
  }
  for (const [id, n] of Object.entries(needed)) {
    const have = Math.max(0, Math.floor(Number(dubs[id] || 0)));
    if (have < n) return false;
  }

  return true;
}

export function performFusion(
  playerState: PlayerState,
  recipe: FusionRecipe,
  selectedCardIds: string[]
): { playerState: PlayerState; resultCardId: string } | null {
  if (!canFuse(playerState, recipe, selectedCardIds)) return null;

  // Determine output rarity (legendary fusion: 3% mythic).
  const outputRarity =
    recipe.inputRarity === "legendary"
      ? (Math.random() < 0.03 ? "mythic" : "legendary")
      : recipe.outputRarity;

  // Match server behavior: prefer unowned outputs, fallback to any of the rarity.
  const unownedPool = allCards.filter((c) => c.rarity === outputRarity && !playerState.ownedCardIds.includes(c.id));
  const fallbackPool = allCards.filter((c) => c.rarity === outputRarity);
  const finalPool = unownedPool.length > 0 ? unownedPool : fallbackPool;
  if (finalPool.length === 0) return null;
  const resultCard = finalPool[Math.floor(Math.random() * finalPool.length)];

  const newState: PlayerState = { ...playerState, cardProgress: { ...playerState.cardProgress }, cardDubs: { ...(playerState.cardDubs || {}) } };
  newState.gold -= recipe.goldCost;

  // Spend dubs
  const needed: Record<string, number> = {};
  for (const id of selectedCardIds) needed[id] = (needed[id] || 0) + 1;
  for (const [id, n] of Object.entries(needed)) {
    const have = Math.max(0, Math.floor(Number(newState.cardDubs?.[id] || 0)));
    const next = have - n;
    if (next <= 0) delete newState.cardDubs![id];
    else newState.cardDubs![id] = next;
  }

  // Add result card
  if (!newState.ownedCardIds.includes(resultCard.id)) {
    newState.ownedCardIds = [...newState.ownedCardIds, resultCard.id];
    newState.cardProgress[resultCard.id] = { level: 1, xp: 0, prestigeLevel: 0, starProgress: getDefaultStarProgress() };
  }

  return { playerState: newState, resultCardId: resultCard.id };
}

export function canApplyDub(playerState: PlayerState, cardId: string): boolean {
  if (!playerState.ownedCardIds.includes(cardId)) return false;
  const have = Math.max(0, Math.floor(Number(playerState.cardDubs?.[cardId] || 0)));
  return have > 0;
}

export function applyDubUpgrade(
  playerState: PlayerState,
  cardId: string
): { playerState: PlayerState; stardustEarned: number; newGoldStar: boolean; newRedStar: boolean } | null {
  if (!canApplyDub(playerState, cardId)) return null;
  const card = allCards.find((c) => c.id === cardId);
  if (!card) return null;

  const newState: PlayerState = { ...playerState, cardProgress: { ...playerState.cardProgress }, cardDubs: { ...(playerState.cardDubs || {}) } };
  const have = Math.max(0, Math.floor(Number(newState.cardDubs?.[cardId] || 0)));
  const next = have - 1;
  if (next <= 0) delete newState.cardDubs![cardId];
  else newState.cardDubs![cardId] = next;

  const rarity = card.rarity;
  const currentProgress: CardProgress = { ...(newState.cardProgress[cardId] || { level: 1, xp: 0, prestigeLevel: 0, starProgress: getDefaultStarProgress() }) };
  const starResult = processDuplicate(currentProgress.starProgress || getDefaultStarProgress(), rarity);
  currentProgress.starProgress = starResult.progress;
  currentProgress.xp += 50;
  newState.cardProgress[cardId] = currentProgress;
  newState.stardust = (newState.stardust || 0) + starResult.stardustEarned;

  return {
    playerState: newState,
    stardustEarned: starResult.stardustEarned,
    newGoldStar: starResult.newGoldStar,
    newRedStar: starResult.newRedStar,
  };
}

export function canSacrifice(playerState: PlayerState, cardId: string): boolean {
  return playerState.ownedCardIds.includes(cardId);
}

export function performSacrifice(
  playerState: PlayerState,
  cardIds: string[]
): { playerState: PlayerState; totalStardust: number } | null {
  let totalStardust = 0;
  const newState = { ...playerState };
  newState.cardProgress = { ...newState.cardProgress };
  newState.cardDubs = { ...(newState.cardDubs || {}) };
  const idsToRemove = [...cardIds];

  for (const cardId of cardIds) {
    if (!newState.ownedCardIds.includes(cardId)) return null;
    const card = allCards.find(c => c.id === cardId);
    if (!card) return null;
    totalStardust += SACRIFICE_STARDUST[card.rarity];
  }

  newState.ownedCardIds = newState.ownedCardIds.filter(id => {
    const idx = idsToRemove.indexOf(id);
    if (idx !== -1) {
      idsToRemove.splice(idx, 1);
      return false;
    }
    return true;
  });

  for (const id of cardIds) {
    if (!newState.ownedCardIds.includes(id)) {
      delete newState.cardProgress[id];
      // Prevent dangling dup state for cards that no longer exist in the collection.
      if (newState.cardDubs) delete newState.cardDubs[id];
    }
  }

  newState.stardust = (newState.stardust || 0) + totalStardust;

  return { playerState: newState, totalStardust };
}
