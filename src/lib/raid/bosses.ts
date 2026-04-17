import { createSeededRng, generateEnemyDeck } from "@/lib/battleEngine";

export interface RaidBossDefinition {
  id: string;
  name: string;
  description: string;
  /** Fixed boss deck; if omitted, generated from seed at battle start. */
  deckCardIds?: string[];
  enemyHp: number;
  enemyShield: number;
  /** Applied to base PvE gold reward on win. */
  goldRewardMultiplier: number;
}

export const RAID_BOSSES: RaidBossDefinition[] = [
  {
    id: "ember-tyrant",
    name: "Ember Tyrant",
    description: "A fire-aligned raid boss with a brutal opener.",
    deckCardIds: [
      "fire-dragon",
      "pyrothos",
      "warrior-king",
      "inferna",
      "magmus",
      "pyrra",
      "helios",
      "grim",
      "kael",
      "lyra",
    ],
    enemyHp: 55,
    enemyShield: 18,
    goldRewardMultiplier: 1.35,
  },
  {
    id: "shadow-court",
    name: "Shadow Court",
    description: "Dark heroes and assassins strike from the gloom.",
    deckCardIds: [
      "shadow-assassin",
      "nyx",
      "thanatos",
      "mara",
      "shade",
      "raven",
      "grim",
      "vex",
      "darin",
      "psion",
    ],
    enemyHp: 52,
    enemyShield: 20,
    goldRewardMultiplier: 1.3,
  },
];

export function getRaidBoss(id: string): RaidBossDefinition | undefined {
  return RAID_BOSSES.find((b) => b.id === id);
}

/** Resolve deck for a boss; uses curated list or deterministic generation from seed. */
export function resolveBossDeck(boss: RaidBossDefinition, deckSize: number, seed: number): string[] {
  if (boss.deckCardIds && boss.deckCardIds.length > 0) {
    const ids = boss.deckCardIds.filter(Boolean);
    if (ids.length >= deckSize) return ids.slice(0, deckSize);
    const rng = createSeededRng(seed);
    const pad = generateEnemyDeck(deckSize - ids.length, rng);
    return [...ids, ...pad].slice(0, deckSize);
  }
  return generateEnemyDeck(deckSize, createSeededRng(seed));
}
