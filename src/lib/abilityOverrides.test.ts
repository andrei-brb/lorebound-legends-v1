import { describe, it, expect } from "vitest";
import { allGameCards } from "@/data/cardIndex";
import { resolveAbilityEffect } from "@/lib/abilityInference";

function cardById(id: string) {
  const c = allGameCards.find((x) => x.id === id);
  if (!c) throw new Error(`missing card ${id}`);
  return c;
}

describe("ability overrides and legendary cardRules", () => {
  it("chronos heals lowest ally (rewind proxy)", () => {
    expect(resolveAbilityEffect(cardById("chronos"))).toEqual({
      kind: "heal",
      scope: "lowest_ally",
      value: 20,
    });
  });

  it("warrior-king buffs all allies attack", () => {
    expect(resolveAbilityEffect(cardById("warrior-king"))).toEqual({
      kind: "buff_allies",
      stat: "attack",
      value: 2,
      duration: 3,
    });
  });

  it("thanatos drains weakest enemy", () => {
    expect(resolveAbilityEffect(cardById("thanatos"))).toEqual({
      kind: "drain",
      target: "lowest_hp",
      damage: 50,
      healSelf: 50,
    });
  });

  it("fire-dragon uses explicit AoE + burn sequence", () => {
    expect(resolveAbilityEffect(cardById("fire-dragon"))).toEqual({
      kind: "sequence",
      steps: [
        { kind: "damage_aoe", value: 8 },
        { kind: "burn_all_enemies", damagePerTurn: 3, duration: 2 },
      ],
    });
  });

  it("myth-noxareth uses explicit AoE drain sequence", () => {
    expect(resolveAbilityEffect(cardById("myth-noxareth"))).toEqual({
      kind: "sequence",
      steps: [
        { kind: "damage_aoe", value: 7 },
        { kind: "heal", scope: "self", value: 21 },
      ],
    });
  });
});
