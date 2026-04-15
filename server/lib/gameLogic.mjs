import { allCardMeta } from "./cardMeta.mjs";

const PITY_THRESHOLD = 30;

const STARTER_CARD_IDS = [
  "warrior-king", "moon-goddess", "fire-dragon", "shadow-assassin", "forest-druid",
  "healer", "divine-shield", "terragon", "tempestia", "nekros",
];

export { STARTER_CARD_IDS };

export const FACTION_STARTER_CARDS = {
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

const PACK_DEFINITIONS = {
  bronze: { cost: 100, cardCount: 5, rates: { common: 80, rare: 18, legendary: 2 } },
  silver: { cost: 300, cardCount: 5, rates: { common: 55, rare: 38, legendary: 7 } },
  gold:   { cost: 800, cardCount: 5, rates: { common: 30, rare: 50, legendary: 20 } },
  free:   { cost: 0,   cardCount: 2, rates: { common: 80, rare: 18, legendary: 2 } },
};

export { PACK_DEFINITIONS };

const FREE_PACK_COOLDOWN_MS = 24 * 60 * 60 * 1000;

export function canClaimFreePack(lastFreePackTime) {
  if (!lastFreePackTime) return true;
  return Date.now() - new Date(lastFreePackTime).getTime() >= FREE_PACK_COOLDOWN_MS;
}

export function pullCards(packId, pityCounter) {
  const pack = PACK_DEFINITIONS[packId];
  if (!pack) throw new Error(`Unknown pack: ${packId}`);

  const cardIds = [];
  let pity = pityCounter;

  for (let i = 0; i < pack.cardCount; i++) {
    pity++;
    let rarity;

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

    const pool = allCardMeta.filter((c) => c.rarity === rarity);
    const card = pool[Math.floor(Math.random() * pool.length)];
    cardIds.push(card.id);
  }

  return { cardIds, newPityCounter: pity };
}

// Star system (mirrors src/lib/starSystem.ts)
const GOLD_STAR_DUPES = {
  common:    [5, 10, 15, 20, 25],
  rare:      [3,  6,  9, 12, 15],
  legendary: [2,  4,  6,  8, 10],
};

const RED_STAR_DUPES = {
  common:    [10, 20, 30, 40, 50],
  rare:      [ 6, 12, 18, 24, 30],
  legendary: [ 4,  8, 12, 16, 20],
};

const STARDUST_PER_DUPE = { common: 5, rare: 15, legendary: 50 };

export function calculateStars(dupeCount, rarity) {
  let goldStars = 0;
  const goldThresholds = GOLD_STAR_DUPES[rarity];
  let dupesUsed = 0;
  for (let i = 0; i < 5; i++) {
    if (dupeCount >= dupesUsed + goldThresholds[i]) {
      goldStars++;
      dupesUsed += goldThresholds[i];
    } else break;
  }
  let redStars = 0;
  if (goldStars === 5) {
    const redThresholds = RED_STAR_DUPES[rarity];
    for (let i = 0; i < 5; i++) {
      if (dupeCount >= dupesUsed + redThresholds[i]) {
        redStars++;
        dupesUsed += redThresholds[i];
      } else break;
    }
  }
  return { goldStars, redStars };
}

export function getCardRarity(cardId) {
  const meta = allCardMeta.find((c) => c.id === cardId);
  return meta?.rarity || "common";
}

export function processDuplicatePull(cardRow, cardId) {
  const rarity = getCardRarity(cardId);
  const oldStars = calculateStars(cardRow.dupeCount, rarity);
  const newDupeCount = cardRow.dupeCount + 1;
  const newStars = calculateStars(newDupeCount, rarity);
  const stardustEarned = STARDUST_PER_DUPE[rarity] || 5;

  return {
    dupeCount: newDupeCount,
    goldStars: newStars.goldStars,
    redStars: newStars.redStars,
    xpBonus: 50,
    stardustEarned,
    newGoldStar: newStars.goldStars > oldStars.goldStars,
    newRedStar: newStars.redStars > oldStars.redStars,
  };
}

export function getBattleGoldReward(won, turnCount) {
  if (!won) return 25;
  const base = 100;
  const speedBonus = Math.max(0, 100 - turnCount * 5);
  return base + speedBonus;
}

export function xpForLevel(level) {
  return 100 * level;
}

export function awardXp(cardRow, xpAmount) {
  let { level, xp } = cardRow;
  xp += xpAmount;
  const levelUps = [];

  while (level < 20) {
    const needed = xpForLevel(level);
    if (xp >= needed) {
      xp -= needed;
      const oldLevel = level;
      level++;
      levelUps.push({ oldLevel, newLevel: level });
    } else break;
  }

  return { level, xp, levelUps };
}
