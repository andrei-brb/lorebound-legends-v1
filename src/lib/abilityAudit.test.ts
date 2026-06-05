/**
 * Diagnostic audit: how well specialAbility text maps to resolved effects.
 * Run: npx vitest run src/lib/abilityAudit.test.ts
 */
import { describe, it, expect } from "vitest";
import { allGameCards } from "@/data/cardIndex";
import { resolveAbilityEffect } from "@/lib/abilityInference";
import type { AbilityEffect } from "@/lib/abilityEffectTypes";

function flatten(e: AbilityEffect): AbilityEffect[] {
  if (e.kind === "sequence") return e.steps.flatMap(flatten);
  return [e];
}

describe("ability activation audit (diagnostic)", () => {
  it("reports hero/god ability resolution coverage", () => {
    const units = allGameCards.filter((c) => c.type === "hero" || c.type === "god");
    const byKind: Record<string, number> = {};
    const genericScaled: string[] = [];
    const poisonTextNoPoison: string[] = [];
    const explicitRules: string[] = [];
    for (const card of units) {
      const resolved = resolveAbilityEffect(card);
      byKind[resolved.kind] = (byKind[resolved.kind] ?? 0) + 1;
      if (resolved.kind === "generic_scaled") genericScaled.push(card.id);

      const desc = card.specialAbility.description.toLowerCase();
      const flat = flatten(resolved);
      const satisfiesPoisonText =
        /cures?\s+poison/i.test(desc)
          ? flat.some((x) => x.kind === "heal" && "curePoison" in x && x.curePoison)
          : flat.some((x) => x.kind === "poison_enemy" || x.kind === "poison_all_enemies");
      if (/poison/i.test(desc) && !satisfiesPoisonText) poisonTextNoPoison.push(card.id);

      if (card.cardRules?.abilityEffect) explicitRules.push(card.id);
    }

    // Log for manual review (shown when test runs with --reporter=verbose)
    console.log("\n--- Ability audit ---");
    console.log(`Hero/God units: ${units.length}`);
    console.log(`Explicit cardRules: ${explicitRules.length} (${explicitRules.join(", ")})`);
    console.log(`Resolved kinds:`, byKind);
    console.log(`generic_scaled fallback: ${genericScaled.length}`, genericScaled.slice(0, 20));
    console.log(`Poison in text but not resolved: ${poisonTextNoPoison.length}`, poisonTextNoPoison);

    expect(units.length).toBeGreaterThan(0);
    // Legendaries must not use generic_scaled (enforced in cardRules.validation.test.ts)
    const legendaryGeneric = units.filter(
      (c) => c.rarity === "legendary" && resolveAbilityEffect(c).kind === "generic_scaled" && !c.cardRules?.abilityEffect,
    );
    expect(legendaryGeneric.map((c) => c.id)).toEqual([]);
    expect(poisonTextNoPoison).toEqual([]);
  });
});
