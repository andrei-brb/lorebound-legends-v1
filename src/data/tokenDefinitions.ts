/** Token stats only (no image imports) — safe for Node validation scripts. */
export type TokenStats = {
  id: string;
  name: string;
  attack: number;
  defense: number;
  hp: number;
  autoStrike: boolean;
};

export const TOKEN_IDS = [
  "skeleton-warrior",
  "wolf-companion",
  "dire-wolf",
  "forest-sprite",
  "raven-flock",
] as const;

export const TOKEN_STATS: Record<string, TokenStats> = {
  "skeleton-warrior": {
    id: "skeleton-warrior",
    name: "Skeletal Warrior",
    attack: 4,
    defense: 2,
    hp: 8,
    autoStrike: true,
  },
  "wolf-companion": {
    id: "wolf-companion",
    name: "Wolf Companion",
    attack: 3,
    defense: 1,
    hp: 6,
    autoStrike: true,
  },
  "dire-wolf": {
    id: "dire-wolf",
    name: "Dire Wolf",
    attack: 6,
    defense: 2,
    hp: 10,
    autoStrike: true,
  },
  "forest-sprite": {
    id: "forest-sprite",
    name: "Forest Sprite",
    attack: 2,
    defense: 2,
    hp: 6,
    autoStrike: true,
  },
  "raven-flock": {
    id: "raven-flock",
    name: "Raven Flock",
    attack: 2,
    defense: 0,
    hp: 4,
    autoStrike: false,
  },
};
