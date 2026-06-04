import { describe, it, expect } from "vitest";
import { loadPlayerState } from "@/lib/playerState";
import { claimDailyLogin, canClaimDailyLogin } from "@/lib/dailyEngine";

describe("claimDailyLogin", () => {
  it("returns null when already claimed today", () => {
    const today = new Date().toISOString().slice(0, 10);
    const base = loadPlayerState();
    const state = {
      ...base,
      dailyLogin: { streak: 1, lastClaimDate: today, claimedDays: [1] },
    };
    expect(canClaimDailyLogin(state.dailyLogin!)).toBe(false);
    expect(claimDailyLogin(state)).toBeNull();
  });

  it("sets lastClaimDate and grants rewards once per day", () => {
    const base = loadPlayerState();
    const first = claimDailyLogin(base);
    expect(first).not.toBeNull();
    if (!first) return;
    expect(first.state.dailyLogin?.lastClaimDate).toBe(new Date().toISOString().slice(0, 10));
    expect(claimDailyLogin(first.state)).toBeNull();
  });
});
