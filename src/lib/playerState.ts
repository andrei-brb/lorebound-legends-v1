import { allCards } from "@/data/cards";
import { type StarProgress, getDefaultStarProgress, processDuplicate } from "./starSystem";

export interface CardProgress {
  level: number;
  xp: number;
  prestigeLevel: number; // 0-3
  starProgress: StarProgress;
}

export type FactionPath = "fire" | "nature" | "shadow";

export interface PlayerProfile {
  avatarId: string;
  titleId: string | null;
  bannerId: string | null;
}

export interface DailyLoginState {
  streak: number;
  lastClaimDate: string | null;
  claimedDays: number[];
}

export interface AppSettings {
  musicVol: number;
  sfxVol: number;
  reduceMotion: boolean;
  animationsOn: boolean;
}

export interface PlayerState {
  gold: number;
  stardust: number;
  ownedCardIds: string[];
  cardProgress: Record<string, CardProgress>;
  pityCounter: number; // pulls since last legendary
  lastFreePackTime: number | null;
  totalPulls: number;
  hasCompletedOnboarding: boolean;
  selectedPath: FactionPath | null;
  tutorialBattlesCompleted?: number; // 0–5: tracks which legendary reward battle the player is on
  shareCollectionWithFriends?: boolean;
  // Battle Pass + cosmetics (client + server)
  battlePass?: BattlePassState;
  cosmeticsOwned?: string[];
  cosmeticsEquipped?: CosmeticsEquipped;
  battlePassXpBoostExpiresAt?: number | null; // epoch ms; doubles BP XP while active
  deckPresets?: DeckPreset[];
  // Profile
  profile?: PlayerProfile;
  unlockedAvatars?: string[];
  unlockedTitles?: string[];
  // Daily engagement
  dailyLogin?: DailyLoginState;
  lastChestClaimAt?: number | null;
  firstWinDate?: string | null; // YYYY-MM-DD of last claimed first-win bonus
  mysteryBoxesPending?: number;
  // QoL
  settings?: AppSettings;
  tutorialsCompleted?: string[];
}

export interface DeckPreset {
  id: string;
  name: string;
  cardIds: string[]; // up to 10
  updatedAt: number; // epoch ms
}

export type BattlePassSeasonId = "season-01" | "season-02" | "season-03";

export interface BattlePassSeasonProgress {
  seasonId: BattlePassSeasonId;
  xp: number;
  hasElite: boolean;
  claimedFreeLevels: number[];
  claimedEliteLevels: number[];
}

export interface BattlePassState {
  activeSeasonId: BattlePassSeasonId;
  seasons: Partial<Record<BattlePassSeasonId, BattlePassSeasonProgress>>;
  daily: { date: string; xpEarned: number }; // XP cap tracking
}

export interface CosmeticsEquipped {
  boardSkinId?: string | null;
  cardFrameId?: string | null;
  cardBackId?: string | null;
  borderId?: string | null;
  titleId?: string | null;
  emoteId?: string | null;
}

export const FACTION_STARTER_CARDS: Record<FactionPath, string[]> = {
  fire: [
    "pyrothos", "fire-dragon", "inferna", "ignis", "magmus",
    "draconus", "warrior-king", "ares", "ferros", "bellator",
    // +5: weapons and rare gods themed for aggro/fire
    "enchanted-sword", "flame-sword", "hephara", "aethon", "terragon",
  ],
  nature: [
    "gaiara", "forest-druid", "verdantia", "sylvana", "vitalis",
    "arachnia", "serpentia", "fenris", "healer", "aquaris",
    // +5: support weapons and rare nature/wind gods
    "nature-staff", "divine-shield", "zephyros", "eirene", "crystalia",
  ],
  shadow: [
    "nyx", "shadow-assassin", "thanatos", "nekros", "umbra",
    "obscura", "corvus", "mortuus", "phantos", "somnia",
    // +5: shadow weapons and rare dark/ice gods
    "shadow-dagger", "storm-hammer", "glacius", "luminara", "aurora",
  ],
};

const STORAGE_KEY = "mythic-arcana-player";

const STARTER_CARD_IDS = [
  "warrior-king", "moon-goddess", "fire-dragon", "shadow-assassin", "forest-druid",
  "healer", "divine-shield", "terragon", "tempestia", "nekros",
];

function todayString(): string {
  return new Date().toISOString().slice(0, 10);
}

function getDefaultBattlePassState(): BattlePassState {
  return {
    activeSeasonId: "season-01",
    seasons: {},
    daily: { date: todayString(), xpEarned: 0 },
  };
}

function normalizeBattlePassState(bp: BattlePassState | undefined): BattlePassState {
  const base = bp ?? getDefaultBattlePassState();
  const date = base.daily?.date ?? todayString();
  const daily = date === todayString() ? base.daily : { date: todayString(), xpEarned: 0 };
  return {
    activeSeasonId: (base.activeSeasonId ?? "season-01") as BattlePassSeasonId,
    seasons: base.seasons ?? {},
    daily,
  };
}

function normalizeCosmeticsEquipped(eq: CosmeticsEquipped | undefined): CosmeticsEquipped {
  return {
    boardSkinId: eq?.boardSkinId ?? null,
    cardFrameId: eq?.cardFrameId ?? null,
    cardBackId: eq?.cardBackId ?? null,
    borderId: eq?.borderId ?? null,
    titleId: eq?.titleId ?? null,
    emoteId: eq?.emoteId ?? null,
  };
}

function getDefaultProfile(): PlayerProfile {
  return { avatarId: "default", titleId: null, bannerId: null };
}

function getDefaultDailyLogin(): DailyLoginState {
  return { streak: 0, lastClaimDate: null, claimedDays: [] };
}

function getDefaultSettings(): AppSettings {
  return { musicVol: 0.7, sfxVol: 0.8, reduceMotion: false, animationsOn: true };
}

function normalizeProfile(p: PlayerProfile | undefined): PlayerProfile {
  return {
    avatarId: p?.avatarId || "default",
    titleId: p?.titleId ?? null,
    bannerId: p?.bannerId ?? null,
  };
}

function normalizeDailyLogin(d: DailyLoginState | undefined): DailyLoginState {
  return {
    streak: Number(d?.streak) || 0,
    lastClaimDate: d?.lastClaimDate ?? null,
    claimedDays: Array.isArray(d?.claimedDays) ? d!.claimedDays.map((n) => Number(n)).filter((n) => n >= 1 && n <= 7) : [],
  };
}

function normalizeSettings(s: AppSettings | undefined): AppSettings {
  const def = getDefaultSettings();
  return {
    musicVol: typeof s?.musicVol === "number" ? Math.max(0, Math.min(1, s.musicVol)) : def.musicVol,
    sfxVol: typeof s?.sfxVol === "number" ? Math.max(0, Math.min(1, s.sfxVol)) : def.sfxVol,
    reduceMotion: !!s?.reduceMotion,
    animationsOn: s?.animationsOn !== false,
  };
}

function createDefaultState(): PlayerState {
  return {
    gold: 500,
    stardust: 0,
    ownedCardIds: [],
    cardProgress: {},
    pityCounter: 0,
    lastFreePackTime: null,
    totalPulls: 0,
    hasCompletedOnboarding: false,
    selectedPath: null,
    battlePass: getDefaultBattlePassState(),
    cosmeticsOwned: [],
    cosmeticsEquipped: normalizeCosmeticsEquipped(undefined),
    battlePassXpBoostExpiresAt: null,
    deckPresets: [],
    profile: getDefaultProfile(),
    unlockedAvatars: ["default"],
    unlockedTitles: [],
    dailyLogin: getDefaultDailyLogin(),
    lastChestClaimAt: null,
    firstWinDate: null,
    mysteryBoxesPending: 0,
    settings: getDefaultSettings(),
    tutorialsCompleted: [],
    tutorialBattlesCompleted: 0,
  };
}

export function initializeStarterDeck(state: PlayerState, path: FactionPath): PlayerState {
  const starterIds = FACTION_STARTER_CARDS[path];
  const cardProgress: Record<string, CardProgress> = {};
  for (const id of starterIds) {
    cardProgress[id] = { level: 1, xp: 0, prestigeLevel: 0, starProgress: getDefaultStarProgress() };
  }
  return {
    ...state,
    ownedCardIds: [...starterIds],
    cardProgress,
    hasCompletedOnboarding: true,
    selectedPath: path,
  };
}

export function loadPlayerState(): PlayerState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const state = JSON.parse(raw) as PlayerState;
      if (state.hasCompletedOnboarding === undefined) state.hasCompletedOnboarding = true;
      return normalizePlayerState(state);
    }
  } catch { /* ignore */ }
  return createDefaultState();
}

/**
 * Level-1 free track historically omitted `cosmeticId` for Mossy Hearth, so claims did not add to
 * cosmeticsOwned. If any season shows level 1 claimed, grant the ID once.
 */
function backfillMossyHearthCosmetic(state: PlayerState): PlayerState {
  const id = "board_mossy_hearth";
  const owned = state.cosmeticsOwned || [];
  if (owned.includes(id)) return state;
  const seasons = state.battlePass?.seasons;
  if (!seasons) return state;
  const claimedL1Free = Object.values(seasons).some((sp) => Array.isArray(sp?.claimedFreeLevels) && sp.claimedFreeLevels.includes(1));
  if (!claimedL1Free) return state;
  return { ...state, cosmeticsOwned: [...owned, id] };
}

function normalizeCardProgress(raw: unknown): CardProgress {
  if (!raw || typeof raw !== "object") return { level: 1, xp: 0, prestigeLevel: 0, starProgress: getDefaultStarProgress() };
  const r = raw as Record<string, unknown>;
  const sp = (r.starProgress && typeof r.starProgress === "object") ? r.starProgress as Record<string, unknown> : {};
  return {
    level: Number(r.level) || 1,
    xp: Number(r.xp) || 0,
    prestigeLevel: Number(r.prestigeLevel) || 0,
    starProgress: {
      dupeCount: Number(sp.dupeCount) || 0,
      goldStars: Number(sp.goldStars) || 0,
      redStars: Number(sp.redStars) || 0,
    },
  };
}

/** Keys the API does not persist — keep from local state when merging server responses. */
export const CLIENT_ONLY_PLAYER_KEYS: (keyof PlayerState)[] = [
  "profile",
  "unlockedAvatars",
  "unlockedTitles",
  "lastChestClaimAt",
  "firstWinDate",
  "mysteryBoxesPending",
  "settings",
  "tutorialsCompleted",
];

function mergeDailyLoginPreferProgress(server: PlayerState, local: PlayerState): DailyLoginState {
  const s = normalizeDailyLogin(server.dailyLogin);
  const l = normalizeDailyLogin(local.dailyLogin);
  const sn = s.claimedDays.length;
  const ln = l.claimedDays.length;
  if (ln > sn) return l;
  if (sn > ln) return s;
  const sDate = s.lastClaimDate ?? "";
  const lDate = l.lastClaimDate ?? "";
  if (lDate > sDate) return l;
  return s;
}

/** Merge server-authoritative `server` with client-only fields from `local` (previous / localStorage). */
export function mergeClientOnlyPlayerState(server: PlayerState, local: PlayerState): PlayerState {
  const merged = { ...server };
  for (const key of CLIENT_ONLY_PLAYER_KEYS) {
    const v = local[key];
    if (v !== undefined) {
      (merged as Record<string, unknown>)[key as string] = v as unknown;
    }
  }
  merged.dailyLogin = mergeDailyLoginPreferProgress(server, local);
  return normalizePlayerState(merged);
}

export function normalizePlayerState(state: PlayerState): PlayerState {
  const rawCp = (state.cardProgress && typeof state.cardProgress === "object" && !Array.isArray(state.cardProgress))
    ? state.cardProgress
    : {};
  const safeCardProgress: Record<string, CardProgress> = {};
  for (const [id, entry] of Object.entries(rawCp)) {
    safeCardProgress[id] = normalizeCardProgress(entry);
  }

  const lfpt = state.lastFreePackTime;
  const normalized: PlayerState = {
    ...state,
    gold: Number(state.gold) || 0,
    stardust: Number(state.stardust) || 0,
    pityCounter: Number(state.pityCounter) || 0,
    totalPulls: Number(state.totalPulls) || 0,
    ownedCardIds: Array.isArray(state.ownedCardIds) ? state.ownedCardIds : [],
    cardProgress: safeCardProgress,
    lastFreePackTime: (typeof lfpt === "number") ? lfpt : (typeof lfpt === "string" ? new Date(lfpt).getTime() : null),
    hasCompletedOnboarding: !!state.hasCompletedOnboarding,
    selectedPath: state.selectedPath ?? null,
    shareCollectionWithFriends: !!state.shareCollectionWithFriends,
    battlePass: normalizeBattlePassState(state.battlePass),
    cosmeticsOwned: Array.isArray(state.cosmeticsOwned) ? state.cosmeticsOwned : [],
    cosmeticsEquipped: normalizeCosmeticsEquipped(state.cosmeticsEquipped),
    battlePassXpBoostExpiresAt: state.battlePassXpBoostExpiresAt ?? null,
    deckPresets: Array.isArray(state.deckPresets) ? state.deckPresets : [],
    profile: normalizeProfile(state.profile),
    unlockedAvatars: Array.isArray(state.unlockedAvatars) && state.unlockedAvatars.length > 0
      ? Array.from(new Set([...state.unlockedAvatars, "default"]))
      : ["default"],
    unlockedTitles: Array.isArray(state.unlockedTitles) ? state.unlockedTitles : [],
    dailyLogin: normalizeDailyLogin(state.dailyLogin),
    lastChestClaimAt: typeof state.lastChestClaimAt === "number" ? state.lastChestClaimAt : null,
    firstWinDate: state.firstWinDate ?? null,
    mysteryBoxesPending: Number(state.mysteryBoxesPending) || 0,
    settings: normalizeSettings(state.settings),
    tutorialsCompleted: Array.isArray(state.tutorialsCompleted) ? state.tutorialsCompleted : [],
  };
  return backfillMossyHearthCosmetic(normalized);
}

export function savePlayerState(state: PlayerState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function getCardProgress(state: PlayerState, cardId: string): CardProgress {
  return state.cardProgress[cardId] || { level: 1, xp: 0, prestigeLevel: 0, starProgress: getDefaultStarProgress() };
}

export function xpForLevel(level: number): number {
  return 100 * level;
}

export function canClaimFreePack(state: PlayerState): boolean {
  if (!state.lastFreePackTime) return true;
  return Date.now() - state.lastFreePackTime >= 24 * 60 * 60 * 1000;
}

export function freePackTimeRemaining(state: PlayerState): number {
  if (!state.lastFreePackTime) return 0;
  const elapsed = Date.now() - state.lastFreePackTime;
  const remaining = 24 * 60 * 60 * 1000 - elapsed;
  return Math.max(0, remaining);
}

export function addCardToCollection(state: PlayerState, cardId: string): { state: PlayerState; isDuplicate: boolean; stardustEarned: number; newGoldStar: boolean; newRedStar: boolean } {
  const newState = { ...state, cardProgress: { ...state.cardProgress } };
  
  if (newState.ownedCardIds.includes(cardId)) {
    // Duplicate: process star system
    const card = allCards.find(c => c.id === cardId);
    const rarity = card?.rarity || "common";
    const currentProgress = { ...(newState.cardProgress[cardId] || { level: 1, xp: 0, prestigeLevel: 0, starProgress: getDefaultStarProgress() }) };
    const starResult = processDuplicate(currentProgress.starProgress || getDefaultStarProgress(), rarity);
    
    currentProgress.starProgress = starResult.progress;
    currentProgress.xp += 50; // Keep XP bonus too
    newState.cardProgress[cardId] = currentProgress;
    newState.stardust = (newState.stardust || 0) + starResult.stardustEarned;
    
    return { 
      state: newState, 
      isDuplicate: true, 
      stardustEarned: starResult.stardustEarned,
      newGoldStar: starResult.newGoldStar,
      newRedStar: starResult.newRedStar,
    };
  }
  
  newState.ownedCardIds = [...newState.ownedCardIds, cardId];
  newState.cardProgress[cardId] = { level: 1, xp: 0, prestigeLevel: 0, starProgress: getDefaultStarProgress() };
  return { state: newState, isDuplicate: false, stardustEarned: 0, newGoldStar: false, newRedStar: false };
}

// ─── Daily path rewards (must match `server/lib/dailyPathRewards.mjs`) ───────

/** Must match `server/lib/dailyPathRewards.mjs`. */
export type DayRewardType = "gold" | "stardust" | "pack" | "card";

export interface DayRewardDef {
  day: number;
  type: DayRewardType;
  amount?: number;
  cardId?: string;
  label: string;
}

export const FACTION_REWARDS: Record<FactionPath, DayRewardDef[]> = {
  fire: [
    { day: 1, type: "card", cardId: "terragon", label: "Terragon" },
    { day: 2, type: "card", cardId: "ferros", label: "Ferros" },
    { day: 3, type: "card", cardId: "hephara", label: "Hephara (Rare)" },
    { day: 4, type: "card", cardId: "aethon", label: "Aethon" },
    { day: 5, type: "card", cardId: "inferna", label: "Inferna (Rare)" },
    { day: 6, type: "gold", amount: 500, label: "500 Gold" },
    { day: 7, type: "pack", amount: 1, label: "Bronze Pack" },
  ],
  nature: [
    { day: 1, type: "card", cardId: "vitalis", label: "Vitalis" },
    { day: 2, type: "card", cardId: "healer", label: "Healer" },
    { day: 3, type: "card", cardId: "zephyros", label: "Zephyros (Rare)" },
    { day: 4, type: "card", cardId: "eirene", label: "Eirene" },
    { day: 5, type: "card", cardId: "verdantia", label: "Verdantia (Rare)" },
    { day: 6, type: "gold", amount: 500, label: "500 Gold" },
    { day: 7, type: "pack", amount: 1, label: "Bronze Pack" },
  ],
  shadow: [
    { day: 1, type: "card", cardId: "nekros", label: "Nekros" },
    { day: 2, type: "card", cardId: "obscura", label: "Obscura" },
    { day: 3, type: "card", cardId: "glacius", label: "Glacius (Rare)" },
    { day: 4, type: "card", cardId: "luminara", label: "Luminara" },
    { day: 5, type: "card", cardId: "umbra", label: "Umbra (Rare)" },
    { day: 6, type: "gold", amount: 500, label: "500 Gold" },
    { day: 7, type: "pack", amount: 1, label: "Bronze Pack" },
  ],
};

export const DEFAULT_DAILY_REWARDS: DayRewardDef[] = [
  { day: 1, type: "gold", amount: 50, label: "50 Gold" },
  { day: 2, type: "gold", amount: 100, label: "100 Gold" },
  { day: 3, type: "stardust", amount: 10, label: "10 Stardust" },
  { day: 4, type: "gold", amount: 200, label: "200 Gold" },
  { day: 5, type: "stardust", amount: 25, label: "25 Stardust" },
  { day: 6, type: "gold", amount: 500, label: "500 Gold" },
  { day: 7, type: "pack", amount: 1, label: "Bronze Pack" },
];

export function getRewardsForPath(path: FactionPath | null): DayRewardDef[] {
  if (!path) return DEFAULT_DAILY_REWARDS;
  return FACTION_REWARDS[path] ?? DEFAULT_DAILY_REWARDS;
}

/** True when daily streak UI says card days were claimed but those cards are not owned (e.g. pre-API claims). */
export function hasClaimedMissingDailyCardRewards(state: PlayerState): boolean {
  const claimed = state.dailyLogin?.claimedDays ?? [];
  if (claimed.length === 0) return false;
  const rewards = getRewardsForPath(state.selectedPath ?? null);
  const owned = new Set(state.ownedCardIds);
  for (const day of claimed) {
    const r = rewards.find((x) => x.day === day);
    if (r?.type === "card" && r.cardId && !owned.has(r.cardId)) return true;
  }
  return false;
}
