import { describe, it, expect } from "vitest";
import { allGameCards } from "@/data/cardIndex";
import { resolveAbilityEffect } from "@/lib/abilityInference";

function cardById(id: string) {
  const c = allGameCards.find((x) => x.id === id);
  if (!c) throw new Error(`missing card ${id}`);
  return c;
}

describe("poison ability inference", () => {
  it("vitalis heals all allies and cures poison", () => {
    expect(resolveAbilityEffect(cardById("vitalis"))).toEqual({
      kind: "heal",
      scope: "all_allies",
      value: 5,
      curePoison: true,
    });
  });

  it("serpentia poisons one enemy", () => {
    expect(resolveAbilityEffect(cardById("serpentia"))).toEqual({
      kind: "poison_enemy",
      which: "highest_hp",
      damagePerTurn: 3,
      duration: 3,
    });
  });

  it("viper deals damage and poisons", () => {
    expect(resolveAbilityEffect(cardById("viper"))).toEqual({
      kind: "sequence",
      steps: [
        { kind: "damage_single", target: "highest_hp", value: 4 },
        { kind: "poison_enemy", which: "highest_hp", damagePerTurn: 2, duration: 2 },
      ],
    });
  });

  it("plague-doctor poisons all enemies", () => {
    expect(resolveAbilityEffect(cardById("plague-doctor"))).toEqual({
      kind: "poison_all_enemies",
      damagePerTurn: 3,
      duration: 2,
    });
  });

  it("myth-thalwen volleys arrows and applies poison", () => {
    expect(resolveAbilityEffect(cardById("myth-thalwen"))).toEqual({
      kind: "sequence",
      steps: [
        { kind: "damage_multi", hits: 3, damageEach: 6, randomTargets: false },
        { kind: "poison_enemy", which: "highest_hp", damagePerTurn: 4, duration: 3 },
      ],
    });
  });
});
