import { pullCards } from "./gameLogic.mjs";

export const BP_MAX_LEVEL = 30;
export const BP_XP_PER_LEVEL = 500;
export const BP_DAILY_XP_CAP = 1000;
export const ELITE_PASS_STARDUST_COST = 500;

const FILL = {
  1: { free: { kind: "board_skin", cosmeticId: "board_mossy_hearth" }, elite: { kind: "gold", amount: 400 } },
  2: { free: { kind: "dust", amount: 50 }, elite: { kind: "dust", amount: 100 } },
  3: { free: { kind: "gold", amount: 300 }, elite: { kind: "gold", amount: 600 } },
  4: { free: { kind: "dust", amount: 75 }, elite: { kind: "dust", amount: 150 } },
  6: { free: { kind: "xp_boost", xpBoostMinutes: 60 }, elite: { kind: "gold_pack" } },
  7: { free: { kind: "gold", amount: 400 }, elite: { kind: "gold", amount: 500 } },
  8: { free: { kind: "bronze_pack" }, elite: { kind: "dust", amount: 200 } },
  9: { free: { kind: "dust", amount: 100 }, elite: { kind: "xp_boost", xpBoostMinutes: 120 } },
  11: { free: { kind: "gold", amount: 500 }, elite: { kind: "gold_pack" } },
  12: { free: { kind: "dust", amount: 125 }, elite: { kind: "dust", amount: 300 } },
  13: { free: { kind: "xp_boost", xpBoostMinutes: 60 }, elite: { kind: "crafting_mats" } },
  14: { free: { kind: "gold", amount: 600 }, elite: { kind: "gold_pack" } },
  16: { free: { kind: "silver_pack" }, elite: { kind: "gold", amount: 800 } },
  17: { free: { kind: "gold", amount: 700 }, elite: { kind: "gold_pack" } },
  18: { free: { kind: "dust", amount: 150 }, elite: { kind: "dust", amount: 400 } },
  19: { free: { kind: "gold", amount: 800 }, elite: { kind: "gold", amount: 1200 } },
  21: { free: { kind: "gold", amount: 900 }, elite: { kind: "gold_pack" } },
  22: { free: { kind: "dust", amount: 175 }, elite: { kind: "dust", amount: 500 } },
  23: { free: { kind: "bronze_pack" }, elite: { kind: "gold_pack" } },
  24: { free: { kind: "gold", amount: 1000 }, elite: { kind: "gold", amount: 1500 } },
  26: { free: { kind: "silver_pack" }, elite: { kind: "gold_pack" } },
  27: { free: { kind: "gold", amount: 1100 }, elite: { kind: "gold", amount: 1800 } },
  28: { free: { kind: "dust", amount: 200 }, elite: { kind: "dust", amount: 600 } },
  29: { free: { kind: "silver_pack" }, elite: { kind: "gold_pack" } },
};

const SEASON_MILESTONES = {
  "season-01": {
    5: { free: { kind: "card_back", cosmeticId: "cardback_bloom_crest" }, elite: { kind: "card_back", cosmeticId: "cardback_bloom_inferno" } },
    10: { free: { kind: "hero", cardId: "bp-verdant-sprout" }, elite: { kind: "hero", cardId: "bp-pyralis-bloom-knight" } },
    15: { free: { kind: "title", cosmeticId: "title_bloomwalker" }, elite: { kind: "board_skin", cosmeticId: "board_runed_garden" } },
    20: { free: { kind: "hero", cardId: "bp-thornweaver" }, elite: { kind: "hero", cardId: "bp-solara-bloom-empress" } },
    25: { free: { kind: "emote", cosmeticId: "emote_petal_storm" }, elite: { kind: "border", cosmeticId: "border_eternal_bloom" } },
    30: { free: { kind: "card_frame", cosmeticId: "frame_bloom_aura" }, elite: { kind: "hero_variant", cardId: "bp-celestial-solara" } },
  },
};

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

export function getBattlePassLevelFromXp(xp) {
  return Math.max(1, Math.min(BP_MAX_LEVEL, Math.floor(xp / BP_XP_PER_LEVEL) + 1));
}

export function getPassReward(seasonId, level, track) {
  const milestones = SEASON_MILESTONES[seasonId] || {};
  const row = milestones[level] || FILL[level];
  if (!row) return null;
  return row[track] || null;
}

function getSeasonProgress(bp, seasonId) {
  const existing = bp?.seasons?.[seasonId];
  if (existing) return existing;
  return { seasonId, xp: 0, hasElite: false, claimedFreeLevels: [], claimedEliteLevels: [] };
}

function normalizeBpDaily(bp) {
  if (!bp) return null;
  if (bp.daily?.date === todayString()) return bp;
  return { ...bp, daily: { date: todayString(), xpEarned: 0 } };
}

export function awardBattlePassXpOnPlayer(player, baseXp) {
  if (!player.battlePass || baseXp <= 0) return { player, awarded: 0 };
  let bp = normalizeBpDaily(player.battlePass);
  const seasonId = bp.activeSeasonId || "season-01";
  const sp = getSeasonProgress(bp, seasonId);
  const now = Date.now();
  const boostActive = player.battlePassXpBoostExpiresAt && player.battlePassXpBoostExpiresAt.getTime() > now;
  const mult = boostActive ? 2 : 1;
  const effective = Math.trunc(baseXp * mult);
  const remaining = Math.max(0, BP_DAILY_XP_CAP - (bp.daily?.xpEarned || 0));
  const awarded = Math.min(effective, remaining);
  if (awarded <= 0) return { player, awarded: 0 };
  const nextSp = { ...sp, xp: sp.xp + awarded };
  const nextBp = {
    ...bp,
    seasons: { ...(bp.seasons || {}), [seasonId]: nextSp },
    daily: { date: bp.daily.date, xpEarned: (bp.daily.xpEarned || 0) + awarded },
  };
  return {
    player: { ...player, battlePass: nextBp },
    awarded,
  };
}

export async function applyBattlePassReward(tx, player, reward, grantCardFn) {
  let gold = 0;
  let stardust = 0;
  let xpBoostExpiresAt = player.battlePassXpBoostExpiresAt;
  let cosmeticsOwned = Array.isArray(player.cosmeticsOwned) ? [...player.cosmeticsOwned] : [];
  let pityCounter = player.pityCounter;

  switch (reward.kind) {
    case "gold":
      gold = reward.amount || 0;
      break;
    case "dust":
      stardust = reward.amount || 0;
      break;
    case "crafting_mats":
      stardust = 150;
      break;
    case "xp_boost": {
      const mins = reward.xpBoostMinutes ?? 60;
      const addMs = mins * 60_000;
      const now = Date.now();
      const prev = xpBoostExpiresAt ? xpBoostExpiresAt.getTime() : 0;
      const base = prev > now ? prev : now;
      xpBoostExpiresAt = new Date(base + addMs);
      break;
    }
    case "bronze_pack":
    case "silver_pack":
    case "gold_pack": {
      const packId = reward.kind === "bronze_pack" ? "bronze" : reward.kind === "silver_pack" ? "silver" : "gold";
      const { cardIds, newPityCounter } = pullCards(packId, pityCounter);
      pityCounter = newPityCounter;
      for (const cardId of cardIds) {
        const r = await grantCardFn(tx, player.id, cardId);
        stardust += r.stardustEarned || 0;
      }
      break;
    }
    case "hero":
    case "hero_variant":
      if (reward.cardId) {
        const r = await grantCardFn(tx, player.id, reward.cardId);
        stardust += r.stardustEarned || 0;
      }
      break;
    case "board_skin":
    case "card_frame":
    case "border":
    case "card_back":
    case "title":
    case "emote":
      if (reward.cosmeticId && !cosmeticsOwned.includes(reward.cosmeticId)) {
        cosmeticsOwned.push(reward.cosmeticId);
      }
      break;
    default:
      break;
  }

  return { gold, stardust, xpBoostExpiresAt, cosmeticsOwned, pityCounter };
}

export async function claimBattlePassLevel(tx, player, grantCardFn, seasonId, level, track) {
  const bp = player.battlePass;
  if (!bp) return { ok: false, error: "Battle pass not initialized" };
  if (level < 1 || level > BP_MAX_LEVEL) return { ok: false, error: "Invalid level" };
  const sp = getSeasonProgress(bp, seasonId);
  const currentLevel = getBattlePassLevelFromXp(sp.xp);
  if (level > currentLevel) return { ok: false, error: "Level not unlocked yet" };
  const claimed = track === "free" ? sp.claimedFreeLevels : sp.claimedEliteLevels;
  if (claimed.includes(level)) return { ok: false, error: "Already claimed" };
  if (track === "elite" && !sp.hasElite) return { ok: false, error: "Elite pass not owned" };
  const reward = getPassReward(seasonId, level, track);
  if (!reward) return { ok: false, error: "No reward at that level" };

  const applied = await applyBattlePassReward(tx, player, reward, grantCardFn);
  const nextSp = {
    ...sp,
    claimedFreeLevels: track === "free" ? [...sp.claimedFreeLevels, level] : sp.claimedFreeLevels,
    claimedEliteLevels: track === "elite" ? [...sp.claimedEliteLevels, level] : sp.claimedEliteLevels,
  };
  const nextBp = { ...bp, seasons: { ...(bp.seasons || {}), [seasonId]: nextSp } };

  const updated = await tx.player.update({
    where: { id: player.id },
    data: {
      gold: { increment: applied.gold },
      stardust: { increment: applied.stardust },
      pityCounter: applied.pityCounter,
      cosmeticsOwned: applied.cosmeticsOwned,
      battlePassXpBoostExpiresAt: applied.xpBoostExpiresAt,
      battlePass: nextBp,
    },
    include: { cards: true, battleStats: true },
  });

  return { ok: true, player: updated };
}

export async function purchaseElitePassServer(tx, player, seasonId) {
  const bp = player.battlePass;
  if (!bp) return { ok: false, error: "Battle pass not initialized" };
  const sp = getSeasonProgress(bp, seasonId);
  if (sp.hasElite) return { ok: false, error: "Elite pass already owned" };
  if (player.stardust < ELITE_PASS_STARDUST_COST) {
    return { ok: false, error: `Need ${ELITE_PASS_STARDUST_COST} stardust` };
  }
  const nextSp = { ...sp, hasElite: true };
  const nextBp = { ...bp, seasons: { ...(bp.seasons || {}), [seasonId]: nextSp } };
  const paid = await tx.player.updateMany({
    where: { id: player.id, stardust: { gte: ELITE_PASS_STARDUST_COST } },
    data: {
      stardust: { decrement: ELITE_PASS_STARDUST_COST },
      battlePass: nextBp,
    },
  });
  if (paid.count !== 1) return { ok: false, error: "Not enough stardust" };
  const updated = await tx.player.findUnique({
    where: { id: player.id },
    include: { cards: true, battleStats: true },
  });
  return { ok: true, player: updated };
}
