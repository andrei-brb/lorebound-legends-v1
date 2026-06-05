import type { AbilityEffect } from "./abilityEffectTypes";

/**
 * Per-card overrides when automatic inference does not match design intent.
 * Prefer cardRules.abilityEffect on the card; use here for unique semantics.
 */
export const ABILITY_OVERRIDES: Partial<Record<string, AbilityEffect>> = {
  // Rewind has no effect kind — heal lowest ally as pragmatic proxy
  chronos: { kind: "heal", scope: "lowest_ally", value: 20 },
  // Buff text missed by inference ("gain +N attack" without "all allies" phrasing)
  "warrior-king": { kind: "buff_allies", stat: "attack", value: 2, duration: 3 },
  // Execute threshold not modeled — heavy drain on weakest as proxy
  thanatos: { kind: "drain", target: "lowest_hp", damage: 50, healSelf: 50 },
};
