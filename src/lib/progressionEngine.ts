import type { CardProgress } from "./playerState";
import { xpForLevel } from "./playerState";

export interface LevelUpResult {
  cardId: string;
  oldLevel: number;
  newLevel: number;
  milestone: string | null;
}

export interface PassiveAbility {
  name: string;
  description: string;
  level: number;
  effect: "crit" | "lifesteal" | "thorns" | "damage_reduction" | "double_strike";
  value: number;
}

const PASSIVE_DEFINITIONS: { level: number; effect: PassiveAbility["effect"]; name: string; description: string; value: number }[] = [
  { level: 3, effect: "crit", name: "Critical Eye", description: "+10% critical hit chance", value: 0.10 },
  { level: 7, effect: "lifesteal", name: "Soul Siphon", description: "Heal 15% of damage dealt", value: 0.15 },
  { level: 12, effect: "damage_reduction", name: "Iron Skin", description: "Reduce incoming damage by 15%", value: 0.15 },
];

export function getPassiveAbilities(progress: CardProgress): PassiveAbility[] {
  return PASSIVE_DEFINITIONS.filter(p => progress.level >= p.level).map(p => ({
    name: p.name,
    description: p.description,
    level: p.level,
    effect: p.effect,
    value: p.value,
  }));
}

export function getStatBonuses(progress: CardProgress): { attack: number; defense: number } {
  const levelBonus = progress.level - 1;
  const prestigeBonus = progress.prestigeLevel * 2;
  return {
    attack: levelBonus + prestigeBonus,
    defense: levelBonus + prestigeBonus,
  };
}

export function getSynergyMultiplier(level: number): number {
  return 1 + (level - 1) * 0.1;
}

export function getAbilityMultiplier(level: number): number {
  if (level >= 15) return 1.75;
  if (level >= 10) return 1.5;
  if (level >= 5) return 1.25;
  return 1;
}

export function getAbilityEvolutionName(baseName: string, level: number): string {
  if (level >= 15) return `Awakened ${baseName}`;
  if (level >= 10) return `Enhanced ${baseName}`;
  return baseName;
}

export function getVisualTier(level: number): "base" | "shimmer" | "premium" | "awakened" {
  if (level >= 15) return "awakened";
  if (level >= 10) return "premium";
  if (level >= 5) return "shimmer";
  return "base";
}

export function awardXp(progress: CardProgress, xpAmount: number): { progress: CardProgress; levelUps: LevelUpResult[]; cardId?: string } {
  const newProgress = { ...progress };
  const levelUps: LevelUpResult[] = [];
  newProgress.xp += xpAmount;

  while (newProgress.level < 20) {
    const needed = xpForLevel(newProgress.level);
    if (newProgress.xp >= needed) {
      newProgress.xp -= needed;
      const oldLevel = newProgress.level;
      newProgress.level++;
      let milestone: string | null = null;
      if (newProgress.level === 5) milestone = "Ability boost +25%! Card shimmer unlocked!";
      else if (newProgress.level === 10) milestone = "Ability gains secondary effect! Premium frame unlocked!";
      else if (newProgress.level === 15) milestone = "Ability AWAKENED! Overlay effects unlocked!";
      else if (newProgress.level === 20) milestone = "MAX LEVEL! Prestige available!";
      else if (newProgress.level === 3) milestone = "Passive: Critical Eye unlocked!";
      else if (newProgress.level === 7) milestone = "Passive: Soul Siphon unlocked!";
      else if (newProgress.level === 12) milestone = "Passive: Iron Skin unlocked!";
      levelUps.push({ cardId: "", oldLevel, newLevel: newProgress.level, milestone });
    } else {
      break;
    }
  }

  return { progress: newProgress, levelUps };
}

export function canPrestige(progress: CardProgress): boolean {
  return progress.level >= 20 && progress.prestigeLevel < 3;
}

export function prestige(progress: CardProgress): CardProgress {
  if (!canPrestige(progress)) return progress;
  return {
    level: 1,
    xp: 0,
    prestigeLevel: progress.prestigeLevel + 1,
    starProgress: progress.starProgress,
  };
}
