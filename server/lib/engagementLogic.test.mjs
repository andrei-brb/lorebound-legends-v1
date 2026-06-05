import { describe, it, expect, vi } from "vitest";
import {
  computePostBattleEngagement,
  isFirstWinAvailable,
  battlePassXpForOutcome,
  DEFAULT_BATTLE_PASS,
  FIRST_WIN_GOLD,
} from "./engagementLogic.mjs";

describe("computePostBattleEngagement", () => {
  const basePlayer = {
    id: 1,
    gold: 500,
    firstWinDate: null,
    mysteryBoxesPending: 0,
    dailyQuests: null,
    battlePass: null,
  };

  it("awards first-win bonus only once per day", () => {
    const first = computePostBattleEngagement(basePlayer, {
      outcome: "win",
      goldReward: 50,
      defaultBattlePass: DEFAULT_BATTLE_PASS,
    });
    expect(first.extras.firstWinBonus).toBe(FIRST_WIN_GOLD);
    expect(first.playerData.firstWinDate).toBeTruthy();
    expect(first.playerData.gold).toEqual({ increment: 50 + FIRST_WIN_GOLD });

    const again = computePostBattleEngagement(
      { ...basePlayer, firstWinDate: first.playerData.firstWinDate },
      { outcome: "win", goldReward: 50, defaultBattlePass: DEFAULT_BATTLE_PASS },
    );
    expect(again.extras.firstWinBonus).toBe(0);
    expect(again.playerData.firstWinDate).toBeUndefined();
    expect(again.playerData.gold).toEqual({ increment: 50 });
  });

  it("increments mystery box when drop rolls true", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const result = computePostBattleEngagement(basePlayer, {
      outcome: "loss",
      goldReward: 0,
      defaultBattlePass: DEFAULT_BATTLE_PASS,
    });
    expect(result.extras.mysteryBoxDropped).toBe(true);
    expect(result.playerData.mysteryBoxesPending).toEqual({ increment: 1 });
    vi.restoreAllMocks();
  });

  it("maps battle pass xp by outcome", () => {
    expect(battlePassXpForOutcome("win")).toBe(120);
    expect(battlePassXpForOutcome("draw")).toBe(80);
    expect(battlePassXpForOutcome("loss")).toBe(60);
  });
});

describe("isFirstWinAvailable", () => {
  it("returns false when already claimed today", () => {
    const today = new Date().toISOString().slice(0, 10);
    expect(isFirstWinAvailable(today)).toBe(false);
    expect(isFirstWinAvailable(null)).toBe(true);
  });
});
