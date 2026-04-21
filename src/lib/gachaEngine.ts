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
    rates: { common: 60, rare: 30, legendary: 9.9, mythic: 0.1 },
    description: "A basic pack with mostly common cards.",
    color: "from-amber-700 to-amber-900",
  },
  {
    id: "silver",
    name: "Silver Pack",
    cost: 300,
    cardCount: 5,
    rates: { common: 40, rare: 40, legendary: 19.7, mythic: 0.3 },
    description: "Better odds for rare cards.",
    color: "from-slate-300 to-slate-500",
  },
  {
    id: "gold",
    name: "Gold Pack",
    cost: 800,
    cardCount: 5,
    rates: { common: 20, rare: 40, legendary: 39.0, mythic: 1.0 },
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
      // Pity guarantees at least legendary (mythic remains its own ultra-rare roll).
      rarity = "legendary";
      pity = 0;
    } else {
      const roll = Math.random() * 100;
      if (roll < (pack.rates.mythic || 0)) {
        rarity = "mythic";
        pity = 0;
      } else if (roll < (pack.rates.mythic || 0) + pack.rates.legendary) {
        rarity = "legendary";
        pity = 0;
      } else if (roll < (pack.rates.mythic || 0) + pack.rates.legendary + pack.rates.rare) {
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
