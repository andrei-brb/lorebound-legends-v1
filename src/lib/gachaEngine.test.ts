import { describe, it, expect } from "vitest";
import { PACK_DEFINITIONS, canAffordPack } from "@/lib/gachaEngine";

describe("arcane pack", () => {
  const arcane = PACK_DEFINITIONS.find((p) => p.id === "arcane")!;

  it("costs stardust", () => {
    expect(arcane.currency).toBe("stardust");
    expect(arcane.cost).toBe(250);
  });

  it("checks stardust balance", () => {
    expect(canAffordPack({ gold: 9999, stardust: 249 }, arcane)).toBe(false);
    expect(canAffordPack({ gold: 0, stardust: 250 }, arcane)).toBe(true);
  });
});
