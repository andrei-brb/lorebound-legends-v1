import { allCards, type Rarity } from "@/data/cards";
import type { PlayerState, CardProgress } from "./playerState";
import { getDefaultStarProgress } from "./starSystem";

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
];

/** Stardust granted per card when sacrificing (by rarity). */
export const SACRIFICE_STARDUST: Record<Rarity, number> = {
  common: 10,
  rare: 30,
  legendary: 100,
  mythic: 250,
};

export function getEligibleFusionCards(playerState: PlayerState, rarity: Rarity): string[] {
  // Cards of the given rarity that the player owns
  return playerState.ownedCardIds.filter(id => {
    const card = allCards.find(c => c.id === id);
    return card && card.rarity === rarity;
  });
}

export function getDuplicateCards(playerState: PlayerState): string[] {
  // Cards where the player has dupes (dupeCount > 0 in star progress)
  return playerState.ownedCardIds.filter(id => {
    const progress = playerState.cardProgress[id];
    return progress && progress.starProgress && progress.starProgress.dupeCount > 0;
  });
}

export function canFuse(playerState: PlayerState, recipe: FusionRecipe, selectedCardIds: string[]): boolean {
  if (selectedCardIds.length !== recipe.inputCount) return false;
  if (playerState.gold < recipe.goldCost) return false;

  // All selected cards must be owned and match the input rarity
  for (const id of selectedCardIds) {
    if (!playerState.ownedCardIds.includes(id)) return false;
    const card = allCards.find(c => c.id === id);
    if (!card || card.rarity !== recipe.inputRarity) return false;
  }

  return true;
}

export function performFusion(
  playerState: PlayerState,
  recipe: FusionRecipe,
  selectedCardIds: string[]
): { playerState: PlayerState; resultCardId: string } | null {
  if (!canFuse(playerState, recipe, selectedCardIds)) return null;

  // Pick random card of output rarity
  const outputPool = allCards.filter(c => c.rarity === recipe.outputRarity && (c.type === "hero" || c.type === "god"));
  if (outputPool.length === 0) return null;
  const resultCard = outputPool[Math.floor(Math.random() * outputPool.length)];

  const newState = { ...playerState };
  newState.gold -= recipe.goldCost;

  // Remove sacrificed cards from collection
  const idsToRemove = new Set(selectedCardIds);
  newState.ownedCardIds = newState.ownedCardIds.filter(id => {
    if (idsToRemove.has(id)) {
      idsToRemove.delete(id); // Remove only one instance per selected ID
      return false;
    }
    return true;
  });

  // Clean up card progress for removed cards
  newState.cardProgress = { ...newState.cardProgress };
  for (const id of selectedCardIds) {
    if (!newState.ownedCardIds.includes(id)) {
      delete newState.cardProgress[id];
    }
  }

  // Add result card
  if (!newState.ownedCardIds.includes(resultCard.id)) {
    newState.ownedCardIds = [...newState.ownedCardIds, resultCard.id];
    newState.cardProgress[resultCard.id] = { level: 1, xp: 0, prestigeLevel: 0, starProgress: getDefaultStarProgress() };
  }

  return { playerState: newState, resultCardId: resultCard.id };
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
    }
  }

  newState.stardust = (newState.stardust || 0) + totalStardust;

  return { playerState: newState, totalStardust };
}
