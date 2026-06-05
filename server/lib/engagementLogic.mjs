import { ALL_QUESTS, WEEKLY_QUEST_POOL } from "./questDefs.mjs";
import { awardBattlePassXpOnPlayer } from "./battlePassServer.mjs";

export const DEFAULT_BATTLE_PASS = {
  activeSeasonId: "season-01",
  seasons: {},
  daily: { date: new Date().toISOString().slice(0, 10), xpEarned: 0 },
};

export const HOURLY_CHEST_COOLDOWN_MS = 60 * 60 * 1000;
export const HOURLY_CHEST_GOLD = 60;
export const HOURLY_CHEST_STARDUST = 10;
export const FIRST_WIN_GOLD = 200;
export const FIRST_WIN_BP_XP = 500;
export const MYSTERY_BOX_DROP_CHANCE = 0.05;

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

export function getWeekStartString() {
  const now = new Date();
  const day = now.getUTCDay();
  const daysFromMonday = day === 0 ? 6 : day - 1;
  const monday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - daysFromMonday));
  return monday.toISOString().slice(0, 10);
}

function pickRandomQuests(pool, count) {
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  const picked = [];
  const usedTypes = new Set();
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

function makeProgress(definitions) {
  return definitions.map((d) => ({ questId: d.id, current: 0, completed: false, claimed: false }));
}

function buildFreshDaily() {
  const definitions = pickRandomQuests(ALL_QUESTS, 3);
  return {
    quests: makeProgress(definitions),
    questDefinitions: definitions,
    lastResetDate: todayString(),
  };
}

function buildFreshWeekly() {
  const definitions = pickRandomQuests(WEEKLY_QUEST_POOL, 2);
  return {
    weeklyQuests: makeProgress(definitions),
    weeklyQuestDefinitions: definitions,
    lastWeeklyResetDate: getWeekStartString(),
  };
}

export function normalizeDailyQuests(raw) {
  const today = todayString();
  const weekStart = getWeekStartString();
  if (!raw || typeof raw !== "object") {
    return { ...buildFreshDaily(), ...buildFreshWeekly() };
  }
  let state = {
    quests: Array.isArray(raw.quests) ? raw.quests : [],
    questDefinitions: Array.isArray(raw.questDefinitions) ? raw.questDefinitions : [],
    lastResetDate: String(raw.lastResetDate || today),
    weeklyQuests: Array.isArray(raw.weeklyQuests) ? raw.weeklyQuests : [],
    weeklyQuestDefinitions: Array.isArray(raw.weeklyQuestDefinitions) ? raw.weeklyQuestDefinitions : [],
    lastWeeklyResetDate: String(raw.lastWeeklyResetDate || weekStart),
  };
  if (state.lastResetDate !== today) {
    Object.assign(state, buildFreshDaily());
  }
  if (state.lastWeeklyResetDate !== weekStart) {
    Object.assign(state, buildFreshWeekly());
  }
  if (!state.questDefinitions.length || !state.quests.length) {
    Object.assign(state, buildFreshDaily());
  }
  if (!state.weeklyQuestDefinitions.length || !state.weeklyQuests.length) {
    Object.assign(state, buildFreshWeekly());
  }
  return state;
}

function applyProgressToBucket(quests, definitions, type, amount) {
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

export function progressDailyQuests(questState, type, amount = 1) {
  return {
    ...questState,
    quests: applyProgressToBucket(questState.quests, questState.questDefinitions, type, amount),
    weeklyQuests: applyProgressToBucket(questState.weeklyQuests, questState.weeklyQuestDefinitions, type, amount),
  };
}

export function claimQuestOnState(questState, questId) {
  const inDaily = questState.questDefinitions.some((d) => d.id === questId);
  const quests = inDaily ? questState.quests : questState.weeklyQuests;
  const definitions = inDaily ? questState.questDefinitions : questState.weeklyQuestDefinitions;
  const quest = quests.find((q) => q.questId === questId);
  const def = definitions.find((d) => d.id === questId);
  if (!quest || !def || !quest.completed || quest.claimed) {
    return { ok: false, error: "Quest not ready to claim" };
  }
  const markClaimed = (list) =>
    list.map((q) => (q.questId === questId ? { ...q, claimed: true } : q));
  const newQuestState = {
    ...questState,
    quests: inDaily ? markClaimed(questState.quests) : questState.quests,
    weeklyQuests: inDaily ? questState.weeklyQuests : markClaimed(questState.weeklyQuests),
  };
  return {
    ok: true,
    questState: newQuestState,
    goldReward: def.goldReward,
    stardustReward: def.stardustReward,
    bpXp: 250,
  };
}

export function canClaimHourlyChest(lastChestClaimAt) {
  if (!lastChestClaimAt) return true;
  const ts = lastChestClaimAt instanceof Date ? lastChestClaimAt.getTime() : Number(lastChestClaimAt);
  return Date.now() - ts >= HOURLY_CHEST_COOLDOWN_MS;
}

export function chestTimeRemaining(lastChestClaimAt) {
  if (!lastChestClaimAt) return 0;
  const ts = lastChestClaimAt instanceof Date ? lastChestClaimAt.getTime() : Number(lastChestClaimAt);
  return Math.max(0, HOURLY_CHEST_COOLDOWN_MS - (Date.now() - ts));
}

export function rollMysteryBoxDrop() {
  return Math.random() <= MYSTERY_BOX_DROP_CHANCE;
}

export function openMysteryBoxRewards() {
  const gold = 50 + Math.floor(Math.random() * 250);
  const stardust = Math.floor(Math.random() * 60);
  return { gold, stardust };
}

export function isFirstWinAvailable(firstWinDate) {
  return firstWinDate !== todayString();
}

/** BP XP for battle outcome (before first-win bonus). */
export function battlePassXpForOutcome(outcome) {
  if (outcome === "win") return 120;
  if (outcome === "draw") return 80;
  return 60;
}

/**
 * Build Prisma player update payload + engagement extras for post-battle rewards.
 * @param {object} player - Prisma player row
 * @param {{ outcome: "win"|"draw"|"loss", goldReward?: number, progressWinQuest?: boolean, defaultBattlePass?: object }} opts
 */
export function computePostBattleEngagement(player, opts) {
  const {
    outcome,
    goldReward = 0,
    progressWinQuest = true,
    defaultBattlePass = DEFAULT_BATTLE_PASS,
  } = opts;

  const today = todayString();
  let extraGold = 0;
  let firstWinBonus = 0;
  let mysteryBoxDropped = false;
  const playerData = {};

  const goldIncrement = goldReward;
  if (goldIncrement > 0) {
    playerData.gold = { increment: goldIncrement };
  }

  if (outcome === "win" && isFirstWinAvailable(player.firstWinDate)) {
    extraGold = FIRST_WIN_GOLD;
    firstWinBonus = FIRST_WIN_GOLD;
    playerData.firstWinDate = today;
  }

  if (rollMysteryBoxDrop()) {
    playerData.mysteryBoxesPending = { increment: 1 };
    mysteryBoxDropped = true;
  }

  if (extraGold > 0) {
    playerData.gold = { increment: goldReward + extraGold };
  }

  let questState = normalizeDailyQuests(player.dailyQuests);
  if (progressWinQuest && outcome === "win") {
    questState = progressDailyQuests(questState, "win_battles", 1);
  }
  playerData.dailyQuests = questState;

  const bpPlayer = { ...player, battlePass: player.battlePass || defaultBattlePass };
  let bpXpTotal = battlePassXpForOutcome(outcome);
  if (firstWinBonus > 0) bpXpTotal += FIRST_WIN_BP_XP;
  const bpAward = awardBattlePassXpOnPlayer(bpPlayer, bpXpTotal);
  playerData.battlePass = bpAward.player.battlePass;

  return {
    playerData,
    extras: {
      firstWinBonus,
      mysteryBoxDropped,
      bpXpAwarded: bpAward.awarded,
      goldReward,
      extraGold,
    },
  };
}

/** Apply engagement rewards inside a Prisma transaction. */
export async function applyPostBattleEngagement(tx, player, opts) {
  const { playerData, extras } = computePostBattleEngagement(player, opts);
  await tx.player.update({
    where: { id: player.id },
    data: playerData,
  });
  const updated = await tx.player.findUnique({
    where: { id: player.id },
    include: { cards: true, battleStats: true },
  });
  return { player: updated, ...extras };
}
