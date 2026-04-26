import type { GameCard } from "@/data/cards";
import type { BattleState, FieldCard, PlayerSide } from "@/lib/battleEngine";

export type OneEffectTiming = "on_summon" | "on_death" | "activate";

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
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
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
  const rarity = card.rarity;
  const isLegend = rarity === "legendary";
  const isRare = rarity === "rare";

  const timing: OneEffectTiming = isLegend ? "activate" : isRare ? choose(["activate", "on_summon"], seed) : choose(["on_summon", "on_death"], seed);

  const base = isLegend ? 4 : isRare ? 3 : 2;
  const dur = isLegend ? 2 : 1;

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

  const kind = choose(pool, seed);

  const hpCost = timing === "activate" ? Math.max(4, Math.min(10, 4 + (seed % 7))) : undefined;
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

  return {
    timing,
    kind,
    hpCost,
    duration: kind.includes("buff") || kind.includes("debuff") || kind.includes("burn") || kind.includes("poison") || kind.includes("blind") || kind.includes("stun") ? dur : undefined,
    value,
    requiresTarget: timing === "activate" ? requiresTarget : false,
  };
}

export function canActivateOneEffect(state: BattleState, side: PlayerSide, fc: FieldCard): { ok: boolean; reason?: string; hpCost?: number; def?: OneEffectDef } {
  const def = getOneEffectForCard(fc.card);
  if (!def || def.timing !== "activate") return { ok: false, reason: "No activate effect" };
  const hpCost = def.hpCost ?? 6;
  if (side.hp <= hpCost) return { ok: false, reason: `Need >${hpCost} HP`, hpCost, def };
  if (fc.abilityUsed) return { ok: false, reason: "Already used", hpCost, def };
  if (fc.stunned) return { ok: false, reason: "Stunned", hpCost, def };
  return { ok: true, hpCost, def };
}

