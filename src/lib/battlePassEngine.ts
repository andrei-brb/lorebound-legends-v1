import type { PlayerState, BattlePassSeasonId, BattlePassSeasonProgress } from "@/lib/playerState";
import type { Reward } from "@/data/battlePassSeasons";
import { BATTLE_PASS_SEASONS } from "@/data/battlePassSeasons";
import { addCardToCollection } from "@/lib/playerState";
import { PACK_DEFINITIONS, pullCards } from "@/lib/gachaEngine";
import type { CosmeticType } from "@/data/cosmetics";
import { getCosmeticById } from "@/data/cosmetics";

export const BP_MAX_LEVEL = 30;
export const BP_XP_PER_LEVEL = 500;
export const BP_DAILY_XP_CAP = 1000;

function todayString(): string {
  return new Date().toISOString().slice(0, 10);
}

export function getBattlePassSeasonProgress(state: PlayerState, seasonId: BattlePassSeasonId): BattlePassSeasonProgress {
  const bp = state.battlePass;
  const existing = bp?.seasons?.[seasonId];
  if (existing) return existing;
  return {
    seasonId,
    xp: 0,
    hasElite: false,
    claimedFreeLevels: [],
    claimedEliteLevels: [],
  };
}

export function getBattlePassLevelFromXp(xp: number): number {
  return Math.max(1, Math.min(BP_MAX_LEVEL, Math.floor(xp / BP_XP_PER_LEVEL) + 1));
}

export function getBattlePassXpToNextLevel(xp: number): number {
  const level = getBattlePassLevelFromXp(xp);
  if (level >= BP_MAX_LEVEL) return 0;
  const intoLevel = xp - (level - 1) * BP_XP_PER_LEVEL;
  return Math.max(0, BP_XP_PER_LEVEL - intoLevel);
}

export function normalizeBattlePassDaily(state: PlayerState): PlayerState {
  const bp = state.battlePass;
  if (!bp) return state;
  if (bp.daily?.date === todayString()) return state;
  return {
    ...state,
    battlePass: {
      ...bp,
      daily: { date: todayString(), xpEarned: 0 },
    },
  };
}

export function awardBattlePassXp(state: PlayerState, baseXp: number): { state: PlayerState; awarded: number; capped: boolean } {
  if (!state.battlePass) return { state, awarded: 0, capped: false };
  if (baseXp <= 0) return { state, awarded: 0, capped: false };

  const s = normalizeBattlePassDaily(state);
  const bp = s.battlePass!;
  const seasonId = bp.activeSeasonId;
  const season = getBattlePassSeasonProgress(s, seasonId);

  const now = Date.now();
  const boostActive = !!s.battlePassXpBoostExpiresAt && now < (s.battlePassXpBoostExpiresAt || 0);
  const mult = boostActive ? 2 : 1;
  const effective = Math.trunc(baseXp * mult);

  const remaining = Math.max(0, BP_DAILY_XP_CAP - (bp.daily?.xpEarned || 0));
  const awarded = Math.min(effective, remaining);
  const capped = awarded < effective;
  if (awarded <= 0) return { state: s, awarded: 0, capped: true };

  const nextSeason: BattlePassSeasonProgress = { ...season, xp: season.xp + awarded };
  const next = {
    ...s,
    battlePass: {
      ...bp,
      seasons: { ...(bp.seasons || {}), [seasonId]: nextSeason },
      daily: { date: bp.daily.date, xpEarned: (bp.daily.xpEarned || 0) + awarded },
    },
  };
  return { state: next, awarded, capped };
}

function grantCosmetic(state: PlayerState, cosmeticId: string): PlayerState {
  const cos = getCosmeticById(cosmeticId);
  if (!cos) return state;
  const owned = state.cosmeticsOwned || [];
  if (owned.includes(cosmeticId)) return state;
  return { ...state, cosmeticsOwned: [...owned, cosmeticId] };
}

function equipCosmetic(state: PlayerState, cosmeticId: string): PlayerState {
  const cos = getCosmeticById(cosmeticId);
  if (!cos) return state;
  const eq = state.cosmeticsEquipped || {};
  switch (cos.type) {
    case "board_skin":
      return { ...state, cosmeticsEquipped: { ...eq, boardSkinId: cosmeticId } };
    case "card_frame":
      return { ...state, cosmeticsEquipped: { ...eq, cardFrameId: cosmeticId } };
    case "card_back":
      return { ...state, cosmeticsEquipped: { ...eq, cardBackId: cosmeticId } };
    case "border":
      return { ...state, cosmeticsEquipped: { ...eq, borderId: cosmeticId } };
    case "title":
      return { ...state, cosmeticsEquipped: { ...eq, titleId: cosmeticId } };
    case "emote":
      return { ...state, cosmeticsEquipped: { ...eq, emoteId: cosmeticId } };
    default:
      return state;
  }
}

function grantPack(state: PlayerState, packId: "bronze" | "silver" | "gold"): PlayerState {
  const pack = PACK_DEFINITIONS.find((p) => p.id === packId);
  if (!pack) return state;
  const { cardIds, newPityCounter } = pullCards(pack, state);
  let s = { ...state, pityCounter: newPityCounter };
  for (const id of cardIds) {
    s = addCardToCollection(s, id).state;
  }
  return s;
}

function applyReward(state: PlayerState, reward: Reward): PlayerState {
  let s = state;
  switch (reward.kind) {
    case "gold":
      if (reward.amount) s = { ...s, gold: s.gold + reward.amount };
      break;
    case "dust":
      if (reward.amount) s = { ...s, stardust: (s.stardust || 0) + reward.amount };
      break;
    case "xp_boost": {
      const mins = reward.xpBoostMinutes ?? (reward.label.includes("2hr") ? 120 : 60);
      const addMs = mins * 60_000;
      const now = Date.now();
      const prev = s.battlePassXpBoostExpiresAt || 0;
      const base = prev > now ? prev : now;
      s = { ...s, battlePassXpBoostExpiresAt: base + addMs };
      break;
    }
    case "bronze_pack":
      s = grantPack(s, "bronze");
      break;
    case "silver_pack":
      s = grantPack(s, "silver");
      break;
    case "gold_pack":
      s = grantPack(s, "gold");
      break;
    case "hero":
    case "hero_variant":
      if (reward.cardId) s = addCardToCollection(s, reward.cardId).state;
      break;
    case "board_skin":
    case "card_frame":
    case "border":
    case "card_back":
    case "title":
    case "emote":
      if (reward.cosmeticId) s = grantCosmetic(s, reward.cosmeticId);
      break;
    case "crafting_mats":
      // not implemented yet; treat as dust small bonus to keep it functional
      s = { ...s, stardust: (s.stardust || 0) + 50 };
      break;
  }
  return s;
}

export function claimBattlePassLevelReward(
  state: PlayerState,
  seasonId: BattlePassSeasonId,
  level: number,
  track: "free" | "elite",
): { state: PlayerState; ok: true } | { state: PlayerState; ok: false; error: string } {
  if (!state.battlePass) return { state, ok: false, error: "Battle pass not initialized" };
  if (level < 1 || level > BP_MAX_LEVEL) return { state, ok: false, error: "Invalid level" };

  const seasonDef = BATTLE_PASS_SEASONS.find((s) => s.id === seasonId);
  if (!seasonDef) return { state, ok: false, error: "Unknown season" };

  const bp = state.battlePass;
  const sp = getBattlePassSeasonProgress(state, seasonId);
  const currentLevel = getBattlePassLevelFromXp(sp.xp);
  if (level > currentLevel) return { state, ok: false, error: "Level not unlocked yet" };

  const alreadyClaimed = track === "free"
    ? sp.claimedFreeLevels.includes(level)
    : sp.claimedEliteLevels.includes(level);
  if (alreadyClaimed) return { state, ok: false, error: "Already claimed" };

  if (track === "elite" && !sp.hasElite) return { state, ok: false, error: "Elite pass not owned" };

  const row = seasonDef.passData.find((r) => r.level === level);
  if (!row) return { state, ok: false, error: "No reward at that level" };

  const reward = track === "free" ? row.free : row.elite;

  let s = state;
  s = applyReward(s, reward);

  const nextSp: BattlePassSeasonProgress = {
    ...sp,
    claimedFreeLevels: track === "free" ? [...sp.claimedFreeLevels, level] : sp.claimedFreeLevels,
    claimedEliteLevels: track === "elite" ? [...sp.claimedEliteLevels, level] : sp.claimedEliteLevels,
  };
  s = {
    ...s,
    battlePass: {
      ...bp,
      seasons: { ...(bp.seasons || {}), [seasonId]: nextSp },
    },
  };

  return { state: s, ok: true };
}

export function setBattlePassActiveSeason(state: PlayerState, seasonId: BattlePassSeasonId): PlayerState {
  if (!state.battlePass) return state;
  return { ...state, battlePass: { ...state.battlePass, activeSeasonId: seasonId } };
}

export function setCosmeticEquipped(state: PlayerState, cosmeticId: string): PlayerState {
  // Only allow equipping owned cosmetics
  if (!(state.cosmeticsOwned || []).includes(cosmeticId)) return state;
  return equipCosmetic(state, cosmeticId);
}

/** Clear the equipped slot for a cosmetic category (e.g. unequip board skin). */
export function clearCosmeticSlot(state: PlayerState, cosmeticType: CosmeticType): PlayerState {
  const cur = state.cosmeticsEquipped || {};
  const next = {
    boardSkinId: cur.boardSkinId ?? null,
    cardFrameId: cur.cardFrameId ?? null,
    cardBackId: cur.cardBackId ?? null,
    borderId: cur.borderId ?? null,
    titleId: cur.titleId ?? null,
    emoteId: cur.emoteId ?? null,
  };
  switch (cosmeticType) {
    case "board_skin":
      next.boardSkinId = null;
      break;
    case "card_frame":
      next.cardFrameId = null;
      break;
    case "card_back":
      next.cardBackId = null;
      break;
    case "border":
      next.borderId = null;
      break;
    case "title":
      next.titleId = null;
      break;
    case "emote":
      next.emoteId = null;
      break;
  }
  return { ...state, cosmeticsEquipped: next };
}

