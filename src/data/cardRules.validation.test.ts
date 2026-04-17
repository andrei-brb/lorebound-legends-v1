/**
 * Card data validation (Phase A). Run: npm run validate-cards
 */
import { describe, it, expect } from "vitest";
import { allGameCards } from "./cardIndex";
import { TOKEN_IDS } from "./tokenDefinitions";
import type { AbilityEffect } from "@/lib/abilityEffectTypes";
import { resolveAbilityEffect } from "@/lib/abilityInference";

const ABILITY_KINDS = new Set([
  "generic_scaled",
  "sequence",
  "damage_single",
  "damage_aoe",
  "damage_multi",
  "heal",
  "buff_allies",
  "buff_self",
  "debuff_all_enemies",
  "debuff_one_enemy",
  "drain",
  "shield_side",
  "hurt_self",
  "summon_tokens",
  "revive_from_graveyard",
  "taunt_self",
  "poison_enemy",
  "burn_enemy",
  "burn_all_enemies",
  "blind_enemy",
  "blind_all_enemies",
]);

const TOKEN_ID_SET = new Set<string>(TOKEN_IDS as unknown as string[]);

function flattenAbility(e: AbilityEffect): AbilityEffect[] {
  if (e.kind === "sequence") return e.steps.flatMap(flattenAbility);
  return [e];
}

describe("card rules validation", () => {
  it("every spell has spellEffect, every trap has trapEffect", () => {
    for (const card of allGameCards) {
      if (card.type === "spell") expect(card.spellEffect, card.id).toBeDefined();
      if (card.type === "trap") expect(card.trapEffect, card.id).toBeDefined();
    }
  });

  it("hero/god abilities resolve to known effect kinds and token IDs", () => {
    for (const card of allGameCards) {
      if (card.type !== "hero" && card.type !== "god") continue;
      const resolved = resolveAbilityEffect(card);
      for (const x of flattenAbility(resolved)) {
        expect(ABILITY_KINDS.has(x.kind), `${card.id}: unknown kind ${(x as { kind: string }).kind}`).toBe(true);
        if (x.kind === "summon_tokens") {
          expect(TOKEN_ID_SET.has(x.tokenId), `${card.id}: bad token ${x.tokenId}`).toBe(true);
        }
      }
    }
  });

  it("weapon onTurnStart uses known token IDs", () => {
    for (const card of allGameCards) {
      const w = card.weaponRules?.onTurnStart;
      if (!w || w.kind !== "summon_token") continue;
      expect(TOKEN_ID_SET.has(w.tokenId), `${card.id}: bad weapon token ${w.tokenId}`).toBe(true);
    }
  });

  it("legendary cards should not rely on generic_scaled when cardRules is added", () => {
    const bad: string[] = [];
    for (const card of allGameCards) {
      if (card.type !== "hero" && card.type !== "god") continue;
      if (card.rarity !== "legendary") continue;
      const resolved = resolveAbilityEffect(card);
      if (resolved.kind === "generic_scaled" && !card.cardRules?.abilityEffect) {
        bad.push(card.id);
      }
    }
    expect(bad, `Add cardRules.abilityEffect for: ${bad.join(", ")}`).toEqual([]);
  });
});
