import type { PlayerState } from "./playerState";

export type QuestType = "win_battles" | "pull_packs" | "level_up_card" | "play_cards_in_battle" | "open_free_pack" | "craft_card";

export interface QuestDefinition {
  id: string;
  type: QuestType;
  title: string;
  description: string;
  target: number;
  goldReward: number;
  stardustReward: number;
  icon: string;
}

export interface QuestProgress {
  questId: string;
  current: number;
  completed: boolean;
  claimed: boolean;
}

export interface DailyQuestState {
  quests: QuestProgress[];
  questDefinitions: QuestDefinition[];
  lastResetDate: string; // YYYY-MM-DD
  weeklyQuests: QuestProgress[];
  weeklyQuestDefinitions: QuestDefinition[];
  lastWeeklyResetDate: string; // YYYY-MM-DD (Monday UTC)
}

const ALL_QUESTS: QuestDefinition[] = [
  { id: "win_1", type: "win_battles", title: "Victory!", description: "Win 1 battle", target: 1, goldReward: 50, stardustReward: 5, icon: "⚔️" },
  { id: "win_3", type: "win_battles", title: "Conqueror", description: "Win 3 battles", target: 3, goldReward: 150, stardustReward: 15, icon: "⚔️" },
  { id: "pull_2", type: "pull_packs", title: "Summoner", description: "Pull 2 packs", target: 2, goldReward: 75, stardustReward: 10, icon: "✨" },
  { id: "pull_5", type: "pull_packs", title: "Grand Summoner", description: "Pull 5 packs", target: 5, goldReward: 200, stardustReward: 25, icon: "✨" },
  { id: "level_1", type: "level_up_card", title: "Trainer", description: "Level up a card", target: 1, goldReward: 60, stardustReward: 8, icon: "📈" },
  { id: "level_3", type: "level_up_card", title: "Master Trainer", description: "Level up 3 cards", target: 3, goldReward: 175, stardustReward: 20, icon: "📈" },
  { id: "play_5", type: "play_cards_in_battle", title: "Tactician", description: "Play 5 cards in battle", target: 5, goldReward: 80, stardustReward: 10, icon: "🃏" },
  { id: "play_10", type: "play_cards_in_battle", title: "Strategist", description: "Play 10 cards in battle", target: 10, goldReward: 175, stardustReward: 18, icon: "🃏" },
  { id: "free_pack", type: "open_free_pack", title: "Daily Gift", description: "Claim your free pack", target: 1, goldReward: 30, stardustReward: 5, icon: "🎁" },
  { id: "craft_1", type: "craft_card", title: "Artificer", description: "Craft or fuse a card", target: 1, goldReward: 100, stardustReward: 15, icon: "🔨" },
];

const WEEKLY_QUEST_POOL: QuestDefinition[] = [
  { id: "w_win_10", type: "win_battles", title: "Warlord", description: "Win 10 battles this week", target: 10, goldReward: 400, stardustReward: 40, icon: "⚔️" },
  { id: "w_pull_15", type: "pull_packs", title: "Relic Hunter", description: "Pull 15 packs this week", target: 15, goldReward: 350, stardustReward: 35, icon: "✨" },
  { id: "w_play_40", type: "play_cards_in_battle", title: "Field Commander", description: "Play 40 cards in battle this week", target: 40, goldReward: 300, stardustReward: 30, icon: "🃏" },
  { id: "w_craft_5", type: "craft_card", title: "Master Artificer", description: "Craft or fuse 5 times this week", target: 5, goldReward: 450, stardustReward: 45, icon: "🔨" },
  { id: "w_level_8", type: "level_up_card", title: "Ascension Path", description: "Level up 8 cards this week", target: 8, goldReward: 380, stardustReward: 38, icon: "📈" },
];

const QUEST_STORE_KEY = "mythic-arcana-daily-quests";

function getTodayString(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Monday UTC as YYYY-MM-DD */
export function getWeekStartString(): string {
  const now = new Date();
  const day = now.getUTCDay();
  const daysFromMonday = day === 0 ? 6 : day - 1;
  const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - daysFromMonday));
  return monday.toISOString().slice(0, 10);
}

function pickRandomQuests(pool: QuestDefinition[], count: number): QuestDefinition[] {
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  const picked: QuestDefinition[] = [];
  const usedTypes = new Set<QuestType>();
  for (const q of shuffled) {
    if (picked.length >= count) break;
    if (!usedTypes.has(q.type)) {
      picked.push(q);
      usedTypes.add(q.type);
    }
  }
  for (const q of shuffled) {
    if (picked.length >= count) break;
    if (!picked.includes(q)) picked.push(q);
  }
  return picked;
}

function makeProgress(definitions: QuestDefinition[]): QuestProgress[] {
  return definitions.map((d) => ({ questId: d.id, current: 0, completed: false, claimed: false }));
}

function migrateLegacyState(raw: Record<string, unknown>): DailyQuestState | null {
  if (!raw.questDefinitions || !Array.isArray(raw.quests)) return null;
  const weekStart = getWeekStartString();
  return {
    quests: raw.quests as QuestProgress[],
    questDefinitions: raw.questDefinitions as QuestDefinition[],
    lastResetDate: String(raw.lastResetDate || getTodayString()),
    weeklyQuests: Array.isArray(raw.weeklyQuests) ? (raw.weeklyQuests as QuestProgress[]) : makeProgress(pickRandomQuests(WEEKLY_QUEST_POOL, 2)),
    weeklyQuestDefinitions: Array.isArray(raw.weeklyQuestDefinitions)
      ? (raw.weeklyQuestDefinitions as QuestDefinition[])
      : pickRandomQuests(WEEKLY_QUEST_POOL, 2),
    lastWeeklyResetDate: String(raw.lastWeeklyResetDate || weekStart),
  };
}

function buildFreshDaily(): Pick<DailyQuestState, "quests" | "questDefinitions" | "lastResetDate"> {
  const definitions = pickRandomQuests(ALL_QUESTS, 3);
  return {
    quests: makeProgress(definitions),
    questDefinitions: definitions,
    lastResetDate: getTodayString(),
  };
}

function buildFreshWeekly(): Pick<DailyQuestState, "weeklyQuests" | "weeklyQuestDefinitions" | "lastWeeklyResetDate"> {
  const definitions = pickRandomQuests(WEEKLY_QUEST_POOL, 2);
  return {
    weeklyQuests: makeProgress(definitions),
    weeklyQuestDefinitions: definitions,
    lastWeeklyResetDate: getWeekStartString(),
  };
}

export function loadDailyQuests(): DailyQuestState {
  const today = getTodayString();
  const weekStart = getWeekStartString();
  try {
    const raw = localStorage.getItem(QUEST_STORE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      const state = migrateLegacyState(parsed);
      if (state) {
        let changed = false;
        if (state.lastResetDate !== today) {
          Object.assign(state, buildFreshDaily());
          changed = true;
        }
        if (state.lastWeeklyResetDate !== weekStart) {
          Object.assign(state, buildFreshWeekly());
          changed = true;
        }
        if (changed) saveDailyQuests(state);
        return state;
      }
    }
  } catch { /* ignore */ }

  const state: DailyQuestState = {
    ...buildFreshDaily(),
    ...buildFreshWeekly(),
  };
  saveDailyQuests(state);
  return state;
}

export function saveDailyQuests(state: DailyQuestState): void {
  localStorage.setItem(QUEST_STORE_KEY, JSON.stringify(state));
}

function applyProgressToBucket(
  quests: QuestProgress[],
  definitions: QuestDefinition[],
  type: QuestType,
  amount: number,
): QuestProgress[] {
  return quests.map((quest) => {
    const def = definitions.find((d) => d.id === quest.questId);
    if (!def || def.type !== type || quest.completed) return quest;
    const current = Math.min(quest.current + amount, def.target);
    return {
      ...quest,
      current,
      completed: current >= def.target,
    };
  });
}

export function progressQuest(state: DailyQuestState, type: QuestType, amount: number = 1): DailyQuestState {
  const newState: DailyQuestState = {
    ...state,
    quests: applyProgressToBucket(state.quests, state.questDefinitions, type, amount),
    weeklyQuests: applyProgressToBucket(state.weeklyQuests, state.weeklyQuestDefinitions, type, amount),
  };
  saveDailyQuests(newState);
  return newState;
}

export function claimQuestReward(
  questState: DailyQuestState,
  questId: string,
  playerState: PlayerState,
): { questState: DailyQuestState; playerState: PlayerState } | null {
  const inDaily = questState.questDefinitions.some((d) => d.id === questId);
  const quests = inDaily ? questState.quests : questState.weeklyQuests;
  const definitions = inDaily ? questState.questDefinitions : questState.weeklyQuestDefinitions;

  const quest = quests.find((q) => q.questId === questId);
  const def = definitions.find((d) => d.id === questId);
  if (!quest || !def || !quest.completed || quest.claimed) return null;

  const markClaimed = (list: QuestProgress[]) =>
    list.map((q) => (q.questId === questId ? { ...q, claimed: true } : q));

  const newQuestState: DailyQuestState = {
    ...questState,
    quests: inDaily ? markClaimed(questState.quests) : questState.quests,
    weeklyQuests: inDaily ? questState.weeklyQuests : markClaimed(questState.weeklyQuests),
  };
  const newPlayerState = {
    ...playerState,
    gold: playerState.gold + def.goldReward,
    stardust: (playerState.stardust || 0) + def.stardustReward,
  };

  saveDailyQuests(newQuestState);
  return { questState: newQuestState, playerState: newPlayerState };
}

export function getQuestTimeUntilReset(): number {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  tomorrow.setUTCHours(0, 0, 0, 0);
  return tomorrow.getTime() - now.getTime();
}

export function getWeeklyQuestTimeUntilReset(): number {
  const now = Date.now();
  const weekStart = getWeekStartString();
  const nextMonday = new Date(`${weekStart}T00:00:00.000Z`);
  nextMonday.setUTCDate(nextMonday.getUTCDate() + 7);
  return Math.max(0, nextMonday.getTime() - now);
}
