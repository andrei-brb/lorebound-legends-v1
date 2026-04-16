import type { AbilityEffect } from "./abilityEffectTypes";

/**
 * Per-card overrides when automatic inference does not match design intent.
 * Prefer fixing inference; use sparingly.
 */
export const ABILITY_OVERRIDES: Partial<Record<string, AbilityEffect>> = {
  // Examples (add as needed):
  // "temporal-rift": { kind: "heal", scope: "lowest_ally", value: 8 },
};
