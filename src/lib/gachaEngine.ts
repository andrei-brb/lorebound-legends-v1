import { allCards, type Rarity } from "@/data/cards";
import type { PlayerState } from "./playerState";

export interface PackDefinition {
  id: string;
  name: string;
  cost: number;
  cardCount: number;
  rates: Record<Rarity, number>; // percentages
  description: string;
  color: string;
}

export const FREE_PACK_CARD_COUNT = 2;

export const PACK_DEFINITIONS: PackDefinition[] = [
  {
    id: "bronze",
    name: "Bronze Pack",
    cost: 100,
    cardCount: 5,
    rates: { common: 80, rare: 18, legendary: 2 },
    description: "A basic pack with mostly common cards.",
    color: "from-amber-700 to-amber-900",
  },
  {
    id: "silver",
    name: "Silver Pack",
    cost: 300,
    cardCount: 5,
    rates: { common: 55, rare: 38, legendary: 7 },
    description: "Better odds for rare cards.",
    color: "from-slate-300 to-slate-500",
  },
  {
    id: "gold",
    name: "Gold Pack",
    cost: 800,
    cardCount: 5,
    rates: { common: 30, rare: 50, legendary: 20 },
    description: "The best odds for legendary cards!",
    color: "from-yellow-400 to-amber-600",
  },
];

const PITY_THRESHOLD = 30;

export function pullCards(pack: PackDefinition, playerState: PlayerState): { cardIds: string[]; newPityCounter: number } {
  const cardIds: string[] = [];
  let pity = playerState.pityCounter;

  for (let i = 0; i < pack.cardCount; i++) {
    pity++;
    let rarity: Rarity;

    if (pity >= PITY_THRESHOLD) {
      rarity = "legendary";
      pity = 0;
    } else {
      const roll = Math.random() * 100;
      if (roll < pack.rates.legendary) {
        rarity = "legendary";
        pity = 0;
      } else if (roll < pack.rates.legendary + pack.rates.rare) {
        rarity = "rare";
      } else {
        rarity = "common";
      }
    }

    const pool = allCards.filter(c => c.rarity === rarity);
    const card = pool[Math.floor(Math.random() * pool.length)];
    cardIds.push(card.id);
  }

  return { cardIds, newPityCounter: pity };
}

export function canAffordPack(gold: number, pack: PackDefinition): boolean {
  return gold >= pack.cost;
}

export function getBattleGoldReward(won: boolean, turnCount: number): number {
  if (!won) return 25;
  const base = 100;
  const speedBonus = Math.max(0, 100 - turnCount * 5);
  return base + speedBonus;
}

/** Solo / co-op raid: multiply base PvE reward (e.g. 1.35 for elite bosses). */
export function getRaidGoldReward(won: boolean, turnCount: number, multiplier: number): number {
  const base = getBattleGoldReward(won, turnCount);
  if (!won) return base;
  return Math.round(base * multiplier);
}
