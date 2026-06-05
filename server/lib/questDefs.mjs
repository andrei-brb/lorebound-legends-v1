/** Quest definitions mirrored from src/lib/questEngine.ts (server-authoritative). */

export const ALL_QUESTS = [
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

export const WEEKLY_QUEST_POOL = [
  { id: "w_win_10", type: "win_battles", title: "Warlord", description: "Win 10 battles this week", target: 10, goldReward: 400, stardustReward: 40, icon: "⚔️" },
  { id: "w_pull_15", type: "pull_packs", title: "Relic Hunter", description: "Pull 15 packs this week", target: 15, goldReward: 350, stardustReward: 35, icon: "✨" },
  { id: "w_play_40", type: "play_cards_in_battle", title: "Field Commander", description: "Play 40 cards in battle this week", target: 40, goldReward: 300, stardustReward: 30, icon: "🃏" },
  { id: "w_craft_5", type: "craft_card", title: "Master Artificer", description: "Craft or fuse 5 times this week", target: 5, goldReward: 450, stardustReward: 45, icon: "🔨" },
  { id: "w_level_8", type: "level_up_card", title: "Ascension Path", description: "Level up 8 cards this week", target: 8, goldReward: 380, stardustReward: 38, icon: "📈" },
];
