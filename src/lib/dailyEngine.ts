import type { PlayerState, DailyLoginState } from "./playerState";

export const DAILY_LOGIN_REWARDS = [
  { day: 1, gold: 100, stardust: 0, label: "100 Gold" },
  { day: 2, gold: 150, stardust: 0, label: "150 Gold" },
  { day: 3, gold: 0, stardust: 50, label: "50 Stardust" },
  { day: 4, gold: 250, stardust: 0, label: "250 Gold" },
  { day: 5, gold: 0, stardust: 100, label: "100 Stardust" },
  { day: 6, gold: 400, stardust: 0, label: "400 Gold" },
  { day: 7, gold: 500, stardust: 200, label: "500g + 200 Stardust" },
];

export const HOURLY_CHEST_COOLDOWN_MS = 60 * 60 * 1000;
export const HOURLY_CHEST_GOLD = 60;
export const HOURLY_CHEST_STARDUST = 10;

export const FIRST_WIN_GOLD = 200;
export const FIRST_WIN_BP_XP = 500;

export const MYSTERY_BOX_DROP_CHANCE = 0.05;

function todayString(): string {
  return new Date().toISOString().slice(0, 10);
}

function dayDiff(a: string, b: string): number {
  const ms = new Date(b).getTime() - new Date(a).getTime();
  return Math.round(ms / (24 * 60 * 60 * 1000));
}

export function getNextLoginDay(d: DailyLoginState): number {
  const today = todayString();
  if (d.lastClaimDate === today) {
    const next = (d.claimedDays.at(-1) ?? 0) + 1;
    return next > 7 ? 7 : next;
  }
  const next = (d.claimedDays.at(-1) ?? 0) + 1;
  return next > 7 ? 1 : next;
}

export function canClaimDailyLogin(d: DailyLoginState): boolean {
  return d.lastClaimDate !== todayString();
}

export interface DailyLoginClaimResult {
  state: PlayerState;
  day: number;
  gold: number;
  stardust: number;
  newStreak: number;
}

export function claimDailyLogin(state: PlayerState): DailyLoginClaimResult | null {
  const d = state.dailyLogin ?? { streak: 0, lastClaimDate: null, claimedDays: [] };
  const today = todayString();
  if (d.lastClaimDate === today) return null;

  let newStreak = 1;
  if (d.lastClaimDate) {
    const diff = dayDiff(d.lastClaimDate, today);
    if (diff === 1) newStreak = d.streak + 1;
  }

  let dayIdx = (d.claimedDays.at(-1) ?? 0) + 1;
  let claimedDays = [...d.claimedDays];
  if (dayIdx > 7) {
    dayIdx = 1;
    claimedDays = [];
  }
  claimedDays.push(dayIdx);

  const reward = DAILY_LOGIN_REWARDS[dayIdx - 1];
  const newDaily: DailyLoginState = {
    streak: newStreak,
    lastClaimDate: today,
    claimedDays,
  };

  return {
    state: {
      ...state,
      gold: state.gold + reward.gold,
      stardust: state.stardust + reward.stardust,
      dailyLogin: newDaily,
    },
    day: dayIdx,
    gold: reward.gold,
    stardust: reward.stardust,
    newStreak,
  };
}

export function chestTimeRemaining(state: PlayerState): number {
  if (!state.lastChestClaimAt) return 0;
  const elapsed = Date.now() - state.lastChestClaimAt;
  return Math.max(0, HOURLY_CHEST_COOLDOWN_MS - elapsed);
}

export function canClaimChest(state: PlayerState): boolean {
  return chestTimeRemaining(state) <= 0;
}

export function claimHourlyChest(state: PlayerState): { state: PlayerState; gold: number; stardust: number } | null {
  if (!canClaimChest(state)) return null;
  return {
    state: {
      ...state,
      gold: state.gold + HOURLY_CHEST_GOLD,
      stardust: state.stardust + HOURLY_CHEST_STARDUST,
      lastChestClaimAt: Date.now(),
    },
    gold: HOURLY_CHEST_GOLD,
    stardust: HOURLY_CHEST_STARDUST,
  };
}

export function isFirstWinAvailable(state: PlayerState): boolean {
  return state.firstWinDate !== todayString();
}

export function claimFirstWin(state: PlayerState): { state: PlayerState; gold: number; bpXp: number } | null {
  if (!isFirstWinAvailable(state)) return null;
  return {
    state: {
      ...state,
      gold: state.gold + FIRST_WIN_GOLD,
      firstWinDate: todayString(),
    },
    gold: FIRST_WIN_GOLD,
    bpXp: FIRST_WIN_BP_XP,
  };
}

export function rollMysteryBox(state: PlayerState): PlayerState {
  if (Math.random() > MYSTERY_BOX_DROP_CHANCE) return state;
  return { ...state, mysteryBoxesPending: (state.mysteryBoxesPending ?? 0) + 1 };
}

export function openMysteryBox(state: PlayerState): { state: PlayerState; gold: number; stardust: number } | null {
  if ((state.mysteryBoxesPending ?? 0) <= 0) return null;
  const gold = 50 + Math.floor(Math.random() * 250);
  const stardust = Math.floor(Math.random() * 60);
  return {
    state: {
      ...state,
      gold: state.gold + gold,
      stardust: state.stardust + stardust,
      mysteryBoxesPending: (state.mysteryBoxesPending ?? 1) - 1,
    },
    gold,
    stardust,
  };
}

export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}
