/**
 * Data-driven hero/god special abilities (resolved from card text + optional overrides).
 * Executed by battleEngine `useAbility` — not cosmetic.
 */

export type AbilityTarget = "highest_hp" | "lowest_hp";

export type AbilityDebuff = { stat: "attack" | "defense"; value: number; duration: number };

/** Resolved effect for one ability use. */
export type AbilityEffect =
  | { kind: "generic_scaled" }
  | { kind: "sequence"; steps: AbilityEffect[] }
  | {
      kind: "damage_single";
      target: AbilityTarget;
      value: number;
      ignoreDefenseFrac?: number;
      stun?: boolean;
      debuff?: AbilityDebuff;
    }
  | { kind: "damage_aoe"; value: number; debuff?: AbilityDebuff }
  /** Volley / meteors: N separate hits */
  | { kind: "damage_multi"; hits: number; damageEach: number; randomTargets?: boolean }
  | { kind: "heal"; scope: "self" | "all_allies" | "lowest_ally"; value: number }
  | { kind: "buff_allies"; stat: "attack" | "defense"; value: number; duration: number }
  | { kind: "buff_self"; stat: "attack" | "defense"; value: number; duration: number }
  | { kind: "debuff_all_enemies"; stat: "attack" | "defense"; value: number; duration: number }
  | { kind: "debuff_one_enemy"; which: AbilityTarget; stat: "attack" | "defense"; value: number; duration: number }
  | { kind: "drain"; target: AbilityTarget; damage: number; healSelf: number }
  | { kind: "shield_side"; value: number }
  | { kind: "hurt_self"; value: number };
