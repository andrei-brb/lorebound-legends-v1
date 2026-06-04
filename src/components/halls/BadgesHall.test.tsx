import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import BadgesHall from "@/components/halls/BadgesHall";
import { ACHIEVEMENTS, type AchievementState } from "@/lib/achievementEngine";
import { loadPlayerState } from "@/lib/playerState";

vi.mock("@/lib/achievementEngine", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/lib/achievementEngine")>();
  const empty: AchievementState = {
    unlocked: {},
    stats: {
      totalWins: 0,
      totalBattles: 0,
      winStreak: 0,
      maxWinStreak: 0,
      totalPulls: 0,
      totalCrafts: 0,
      totalSacrifices: 0,
    },
  };
  return {
    ...mod,
    loadAchievementState: () => empty,
  };
});

describe("BadgesHall", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders achievement titles from the engine", () => {
    render(<BadgesHall playerState={loadPlayerState()} />);
    const sample = ACHIEVEMENTS[0];
    expect(screen.getByText(sample.title)).toBeInTheDocument();
    expect(screen.getByText(/Hall of Honor/i)).toBeInTheDocument();
  });
});
