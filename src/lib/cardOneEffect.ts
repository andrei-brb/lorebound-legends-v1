import type { GameCard } from "@/data/cards";

export type OneEffectTiming = "on_summon" | "on_death" | "activate" | "react";

export type OneEffectKind =
  | "damage_enemy"
  | "stun_enemy"
  | "debuff_enemy_attack"
  | "debuff_enemy_defense"
  | "heal_hero"
  | "shield_hero"
  | "buff_ally_attack"
  | "buff_ally_defense"
  | "burn_enemy"
  | "poison_enemy"
  | "blind_enemy";

export type OneEffectDef = {
  timing: OneEffectTiming;
  kind: OneEffectKind;
  name: string;
  description: string;
  /** For activate effects: HP cost. */
  hpCost?: number;
  /** For buffs/debuffs/dots: turns. */
  duration?: number;
  /** For damage/shield/heal/buff magnitude. */
  value: number;
  /** If true, requires choosing an enemy unit target (vs auto-pick). */
  requiresTarget?: boolean;
};

function hashId(id: string): number {
  // FNV-1a 32-bit
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function choose<T>(arr: T[], seed: number): T {
  return arr[seed % arr.length]!;
}

function hasTag(card: GameCard, tag: string) {
  return (card.tags || []).includes(tag);
}

export function getOneEffectForCard(card: GameCard): OneEffectDef | null {
  if (card.type !== "hero" && card.type !== "god") return null;

  const seed = hashId(card.id);

  // Some cards have no extra effect (keeps game harder; identity comes from stats + passives).
  // Roughly: commons often none, rares sometimes none, legendaries usually have one.
  const noneRoll = seed % 10;
  if (card.rarity === "common" && noneRoll < 5) return null;
  if (card.rarity === "rare" && noneRoll < 2) return null;

  // Timing: react is rare and only for a small subset.
  const timingPool: OneEffectTiming[] =
    card.rarity === "legendary" || card.rarity === "mythic"
      ? ["on_summon", "on_death", "activate", "react"]
      : ["on_summon", "on_death", "activate"];
  const timing = choose(timingPool, seed);

  const base = card.rarity === "mythic" ? 5 : card.rarity === "legendary" ? 4 : card.rarity === "rare" ? 3 : 2;
  const dur = card.rarity === "mythic" ? 3 : card.rarity === "legendary" ? 2 : 1;

  // Choose a single effect kind based on tags (YGO-ish identity).
  const pool: OneEffectKind[] = [];
  if (hasTag(card, "fire")) pool.push("damage_enemy", "burn_enemy");
  if (hasTag(card, "storm") || hasTag(card, "wind")) pool.push("stun_enemy", "blind_enemy");
  if (hasTag(card, "shadow") || hasTag(card, "void")) pool.push("debuff_enemy_attack", "blind_enemy");
  if (hasTag(card, "water")) pool.push("heal_hero", "debuff_enemy_attack");
  if (hasTag(card, "nature") || hasTag(card, "earth") || hasTag(card, "stone")) pool.push("shield_hero", "buff_ally_defense", "poison_enemy");
  if (hasTag(card, "forge") || hasTag(card, "warrior")) pool.push("buff_ally_attack", "shield_hero");
  if (hasTag(card, "healer") || hasTag(card, "light") || hasTag(card, "lunar")) pool.push("heal_hero", "shield_hero", "buff_ally_defense");
  if (pool.length === 0) pool.push("damage_enemy");

  const kind = choose(pool, seed >>> 3);

  const hpCost = timing === "activate" || timing === "react" ? Math.max(4, Math.min(12, 4 + (seed % 9))) : undefined;
  const requiresTarget =
    kind === "damage_enemy" ||
    kind === "stun_enemy" ||
    kind === "debuff_enemy_attack" ||
    kind === "debuff_enemy_defense" ||
    kind === "burn_enemy" ||
    kind === "poison_enemy" ||
    kind === "blind_enemy";

  const value =
    kind === "damage_enemy" ? base + (seed % 2) :
    kind === "heal_hero" ? base + 1 :
    kind === "shield_hero" ? base + 2 :
    kind === "buff_ally_attack" ? base :
    kind === "buff_ally_defense" ? base :
    kind === "burn_enemy" ? 2 :
    kind === "poison_enemy" ? 2 :
    kind === "blind_enemy" ? 0 : // blind uses missChance via duration + fixed chance
    1;

  const name =
    kind === "damage_enemy" ? (hasTag(card, "fire") ? "Branding Strike" : "Judgment") :
    kind === "stun_enemy" ? "Stasis Sigil" :
    kind === "debuff_enemy_attack" ? "Withering Decree" :
    kind === "debuff_enemy_defense" ? "Sunder Oath" :
    kind === "heal_hero" ? "Sanctuary" :
    kind === "shield_hero" ? "Aegis Rite" :
    kind === "buff_ally_attack" ? "War Hymn" :
    kind === "buff_ally_defense" ? "Ward Chorus" :
    kind === "burn_enemy" ? "Cinder Mark" :
    kind === "poison_enemy" ? "Venom Script" :
    "Veil of Ash";

  const timingLabel =
    timing === "on_summon" ? "On Summon" :
    timing === "on_death" ? "On Death" :
    timing === "react" ? "Quick Response" :
    "Activate";
  const description =
    kind === "damage_enemy"
      ? `${timingLabel}: Deal ${value} + 30% ATK as damage to an enemy.`
      : kind === "stun_enemy"
        ? `${timingLabel}: Stun an enemy for ${dur} turn(s).`
        : kind === "debuff_enemy_attack"
          ? `${timingLabel}: -${value} ATK to an enemy for ${dur} turn(s).`
          : kind === "debuff_enemy_defense"
            ? `${timingLabel}: -${value} DEF to an enemy for ${dur} turn(s).`
            : kind === "heal_hero"
              ? `${timingLabel}: Heal your hero for ${value}.`
              : kind === "shield_hero"
                ? `${timingLabel}: Grant your hero ${value} shield.`
                : kind === "buff_ally_attack"
                  ? `${timingLabel}: +${value} ATK to an ally for ${dur} turn(s).`
                  : kind === "buff_ally_defense"
                    ? `${timingLabel}: +${value} DEF to an ally for ${dur} turn(s).`
                    : kind === "burn_enemy"
                      ? `${timingLabel}: Burn an enemy for ${value}/turn for ${dur} turn(s).`
                      : kind === "poison_enemy"
                        ? `${timingLabel}: Poison an enemy for ${value}/turn for ${dur} turn(s).`
                        : `${timingLabel}: Blind an enemy for ${dur} turn(s).`;

  return {
    timing,
    kind,
    name,
    description,
    hpCost,
    duration: kind.includes("buff") || kind.includes("debuff") || kind.includes("burn") || kind.includes("poison") || kind.includes("blind") || kind.includes("stun") ? dur : undefined,
    value,
    requiresTarget: timing === "activate" || timing === "react" ? requiresTarget : false,
  };
}

