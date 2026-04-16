import type { AbilityEffect } from "@/lib/abilityEffectTypes";

/** Machine-readable combat rules (Phase A). Prefer this over inference when set. */
export type CardGameRules = {
  abilityEffect?: AbilityEffect;
};

export type WeaponTurnStartRule = { kind: "summon_token"; tokenId: string; count: number };

/** Passive weapon hooks (Phase B/C). */
export type WeaponGameRules = {
  onTurnStart?: WeaponTurnStartRule;
};
