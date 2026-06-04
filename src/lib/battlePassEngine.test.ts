import { describe, it, expect } from "vitest";
import { loadPlayerState } from "@/lib/playerState";
import { ELITE_PASS_STARDUST_COST, purchaseElitePass } from "@/lib/battlePassEngine";

describe("purchaseElitePass", () => {
  it("deducts stardust and unlocks elite for the season", () => {
    const base = loadPlayerState();
    const state = { ...base, stardust: ELITE_PASS_STARDUST_COST + 100 };
    const result = purchaseElitePass(state, "season-01");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.stardust).toBe(100);
    expect(result.state.battlePass?.seasons?.["season-01"]?.hasElite).toBe(true);
  });

  it("fails when stardust is insufficient", () => {
    const base = loadPlayerState();
    const state = { ...base, stardust: ELITE_PASS_STARDUST_COST - 1 };
    const result = purchaseElitePass(state, "season-01");
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/stardust/i);
    expect(result.state.stardust).toBe(ELITE_PASS_STARDUST_COST - 1);
  });
});
