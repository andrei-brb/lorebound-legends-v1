import type { Rarity } from "@/data/cards";

// Dupes needed for each gold star (cumulative thresholds per star)
const GOLD_STAR_DUPES: Record<Rarity, number[]> = {
  common:    [5, 10, 15, 20, 25],    // total 75
  rare:      [3,  6,  9, 12, 15],    // total 45
  legendary: [2,  4,  6,  8, 10],    // total 30
  mythic:    [2,  4,  6,  8, 10],    // total 30 (top tier; same dupe pace as legendary)
};

// Dupes needed for each red star (after all gold stars, cumulative)
const RED_STAR_DUPES: Record<Rarity, number[]> = {
  common:    [10, 20, 30, 40, 50],   // total 150
  rare:      [ 6, 12, 18, 24, 30],   // total 90
  legendary: [ 4,  8, 12, 16, 20],   // total 60
  mythic:    [ 4,  8, 12, 16, 20],   // total 60
};

// Stat bonuses per star
const GOLD_STAR_BONUS: Record<Rarity, { attack: number; defense: number; hp: number }> = {
  common:    { attack: 1, defense: 1, hp: 0 },
  rare:      { attack: 2, defense: 2, hp: 0 },
  legendary: { attack: 3, defense: 3, hp: 0 },
  mythic:    { attack: 4, defense: 4, hp: 0 },
};

const RED_STAR_BONUS: Record<Rarity, { attack: number; defense: number; hp: number }> = {
  common:    { attack: 2, defense: 2, hp: 3 },
  rare:      { attack: 3, defense: 3, hp: 5 },
  legendary: { attack: 5, defense: 5, hp: 8 },
  mythic:    { attack: 6, defense: 6, hp: 10 },
};

// Stardust per dupe
const STARDUST_PER_DUPE: Record<Rarity, number> = {
  common: 5,
  rare: 15,
  legendary: 50,
  mythic: 120,
};

export interface StarProgress {
  dupeCount: number;
  goldStars: number; // 0-5
  redStars: number;  // 0-5
}

export function getDefaultStarProgress(): StarProgress {
  return { dupeCount: 0, goldStars: 0, redStars: 0 };
}

export function getStardustForDupe(rarity: Rarity): number {
  return STARDUST_PER_DUPE[rarity];
}

/** Calculate how many gold and red stars based on total dupe count */
export function calculateStars(dupeCount: number, rarity: Rarity): { goldStars: number; redStars: number } {
  let goldStars = 0;
  const goldThresholds = GOLD_STAR_DUPES[rarity];
  let dupesUsed = 0;

  // Count gold stars
  for (let i = 0; i < 5; i++) {
    if (dupeCount >= dupesUsed + goldThresholds[i]) {
      goldStars++;
      dupesUsed += goldThresholds[i];
    } else {
      break;
    }
  }

  // Count red stars (only if all 5 gold achieved)
  let redStars = 0;
  if (goldStars === 5) {
    const redThresholds = RED_STAR_DUPES[rarity];
    for (let i = 0; i < 5; i++) {
      if (dupeCount >= dupesUsed + redThresholds[i]) {
        redStars++;
        dupesUsed += redThresholds[i];
      } else {
        break;
      }
    }
  }

  return { goldStars, redStars };
}

/** Get cumulative dupes needed for the next star */
export function getDupesForNextStar(dupeCount: number, rarity: Rarity): { needed: number; current: number; starType: "gold" | "red" | "max" } {
  const goldThresholds = GOLD_STAR_DUPES[rarity];
  const redThresholds = RED_STAR_DUPES[rarity];
  
  let cumulative = 0;
  
  // Check gold stars
  for (let i = 0; i < 5; i++) {
    cumulative += goldThresholds[i];
    if (dupeCount < cumulative) {
      const prevCumulative = cumulative - goldThresholds[i];
      return { needed: goldThresholds[i], current: dupeCount - prevCumulative, starType: "gold" };
    }
  }
  
  // Check red stars
  for (let i = 0; i < 5; i++) {
    cumulative += redThresholds[i];
    if (dupeCount < cumulative) {
      const prevCumulative = cumulative - redThresholds[i];
      return { needed: redThresholds[i], current: dupeCount - prevCumulative, starType: "red" };
    }
  }
  
  return { needed: 0, current: 0, starType: "max" };
}

/** Get total stat bonuses from stars */
export function getStarStatBonuses(rarity: Rarity, goldStars: number, redStars: number): { attack: number; defense: number; hp: number } {
  const goldBonus = GOLD_STAR_BONUS[rarity];
  const redBonus = RED_STAR_BONUS[rarity];
  return {
    attack: goldStars * goldBonus.attack + redStars * redBonus.attack,
    defense: goldStars * goldBonus.defense + redStars * redBonus.defense,
    hp: goldStars * goldBonus.hp + redStars * redBonus.hp,
  };
}

/** Process a duplicate pull — returns updated star progress and stardust earned */
export function processDuplicate(
  currentProgress: StarProgress,
  rarity: Rarity
): { progress: StarProgress; stardustEarned: number; newGoldStar: boolean; newRedStar: boolean } {
  const oldStars = calculateStars(currentProgress.dupeCount, rarity);
  const newDupeCount = currentProgress.dupeCount + 1;
  const newStars = calculateStars(newDupeCount, rarity);
  
  return {
    progress: {
      dupeCount: newDupeCount,
      goldStars: newStars.goldStars,
      redStars: newStars.redStars,
    },
    stardustEarned: getStardustForDupe(rarity),
    newGoldStar: newStars.goldStars > oldStars.goldStars,
    newRedStar: newStars.redStars > oldStars.redStars,
  };
}
