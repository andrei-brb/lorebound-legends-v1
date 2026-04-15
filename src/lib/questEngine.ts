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

const DAILY_QUEST_KEY = "mythic-arcana-daily-quests";

function getTodayString(): string {
  return new Date().toISOString().slice(0, 10);
}

function pickRandomQuests(count: number): QuestDefinition[] {
  const shuffled = [...ALL_QUESTS].sort(() => Math.random() - 0.5);
  // Ensure variety — pick different types
  const picked: QuestDefinition[] = [];
  const usedTypes = new Set<QuestType>();
  for (const q of shuffled) {
    if (picked.length >= count) break;
    if (!usedTypes.has(q.type)) {
      picked.push(q);
      usedTypes.add(q.type);
    }
  }
  // Fill remaining if not enough unique types
  for (const q of shuffled) {
    if (picked.length >= count) break;
    if (!picked.includes(q)) picked.push(q);
  }
  return picked;
}

export function loadDailyQuests(): DailyQuestState {
  const today = getTodayString();
  try {
    const raw = localStorage.getItem(DAILY_QUEST_KEY);
    if (raw) {
      const state = JSON.parse(raw) as DailyQuestState;
      if (state.lastResetDate === today) return state;
    }
  } catch { /* ignore */ }

  // Generate new daily quests
  const definitions = pickRandomQuests(3);
  const state: DailyQuestState = {
    quests: definitions.map(d => ({ questId: d.id, current: 0, completed: false, claimed: false })),
    questDefinitions: definitions,
    lastResetDate: today,
  };
  saveDailyQuests(state);
  return state;
}

export function saveDailyQuests(state: DailyQuestState): void {
  localStorage.setItem(DAILY_QUEST_KEY, JSON.stringify(state));
}

export function progressQuest(state: DailyQuestState, type: QuestType, amount: number = 1): DailyQuestState {
  const newState = { ...state, quests: state.quests.map(q => ({ ...q })) };
  for (const quest of newState.quests) {
    const def = newState.questDefinitions.find(d => d.id === quest.questId);
    if (def && def.type === type && !quest.completed) {
      quest.current = Math.min(quest.current + amount, def.target);
      if (quest.current >= def.target) {
        quest.completed = true;
      }
    }
  }
  saveDailyQuests(newState);
  return newState;
}

export function claimQuestReward(
  questState: DailyQuestState,
  questId: string,
  playerState: PlayerState
): { questState: DailyQuestState; playerState: PlayerState } | null {
  const quest = questState.quests.find(q => q.questId === questId);
  const def = questState.questDefinitions.find(d => d.id === questId);
  if (!quest || !def || !quest.completed || quest.claimed) return null;

  const newQuestState = { ...questState, quests: questState.quests.map(q => q.questId === questId ? { ...q, claimed: true } : { ...q }) };
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
