import { describe, it, expect, beforeEach } from "vitest";
import { getWeekStartString, loadDailyQuests, type DailyQuestState } from "@/lib/questEngine";

const QUEST_STORE_KEY = "mythic-arcana-daily-quests";

function getTodayString(): string {
  return new Date().toISOString().slice(0, 10);
}

describe("loadDailyQuests weekly reset", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("refreshes weekly quests when lastWeeklyResetDate is before the current week", () => {
    const staleWeek = "2000-01-03";
    const stored: DailyQuestState = {
      quests: [{ questId: "win_1", current: 1, completed: false, claimed: false }],
      questDefinitions: [
        {
          id: "win_1",
          type: "win_battles",
          title: "Victory!",
          description: "Win 1 battle",
          target: 1,
          goldReward: 50,
          stardustReward: 5,
          icon: "⚔️",
        },
      ],
      lastResetDate: getTodayString(),
      weeklyQuests: [{ questId: "w_win_10", current: 9, completed: false, claimed: false }],
      weeklyQuestDefinitions: [
        {
          id: "w_win_10",
          type: "win_battles",
          title: "Warlord",
          description: "Win 10 battles this week",
          target: 10,
          goldReward: 400,
          stardustReward: 40,
          icon: "⚔️",
        },
      ],
      lastWeeklyResetDate: staleWeek,
    };
    localStorage.setItem(QUEST_STORE_KEY, JSON.stringify(stored));

    const loaded = loadDailyQuests();
    expect(loaded.lastWeeklyResetDate).toBe(getWeekStartString());
    expect(loaded.weeklyQuests.every((q) => q.current === 0)).toBe(true);
    expect(loaded.weeklyQuests.length).toBe(2);
  });
});
