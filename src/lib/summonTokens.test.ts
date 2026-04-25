import { describe, it, expect } from "vitest";
import { initBattle, playCard, activateAbility } from "./battleEngine";

describe("token summon (Phase B)", () => {
  it("Mortuus Grave Call places skeleton-warrior tokens", () => {
    let s = initBattle(["mortuus", "warrior-king", "storm-god", "healer", "moon-goddess", "kova"], ["kova"], {
      seed: 999_001,
    });
    const handIdx = s.player.hand.findIndex((c) => c.id === "mortuus");
    expect(handIdx).toBeGreaterThanOrEqual(0);
    s = playCard(s, handIdx);
    const fi = s.player.field.findIndex((f) => f !== null);
    expect(fi).toBeGreaterThanOrEqual(0);
    // Ability costs AP; ensure enough for the test.
    s.player.ap = 10;
    s = activateAbility(s, fi);
    expect(s.player.tokens.some((t) => t?.tokenId === "skeleton-warrior")).toBe(true);
  });

  it("Nekros Raise Dead revives from graveyard when field has room", () => {
    let s = initBattle(["nekros", "healer", "kova"], ["storm-god"], { seed: 999_002 });
    const nk = s.player.hand.findIndex((c) => c.id === "nekros");
    expect(nk).toBeGreaterThanOrEqual(0);
    s = playCard(s, nk);
    const healer = s.player.hand.find((c) => c.id === "healer");
    expect(healer).toBeDefined();
    s.player.graveyard.push(healer!);
    s.player.hand = s.player.hand.filter((c) => c.id !== "healer");
    // Ability costs AP; ensure enough for the test.
    s.player.ap = 10;
    const fi = s.player.field.findIndex((f) => f?.card.id === "nekros");
    expect(fi).toBeGreaterThanOrEqual(0);
    s = activateAbility(s, fi);
    expect(s.logs.some((l) => l.message.includes("raises"))).toBe(true);
  });
});
