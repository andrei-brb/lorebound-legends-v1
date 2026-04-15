/**
 * Main server: Discord token exchange, interactions, and game API routes.
 * Run: node server/token-server.mjs
 */
import dotenv from "dotenv";
import http from "node:http";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { PrismaClient } from "@prisma/client";
import { requireAuth } from "./lib/auth.mjs";
import {
  STARTER_CARD_IDS,
  FACTION_STARTER_CARDS,
  PACK_DEFINITIONS,
  FUSION_RECIPES,
  SACRIFICE_STARDUST,
  canClaimFreePack,
  pullCards,
  getCardRarity,
  processDuplicatePull,
  getBattleGoldReward,
  awardXp,
  ALL_CARD_IDS,
  getCardName,
  getCardElement,
} from "./lib/gameLogic.mjs";
import { pickRandomDropCard, buildDropEmbed, processCardClaim } from "./lib/cardDrop.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "..", ".env") });

const prisma = new PrismaClient();
const PORT = Number(process.env.PORT || process.env.DISCORD_TOKEN_PORT) || 3001;

// ─── Helpers ───────────────────────────────────────────────────────────────────

async function fetchAndRetry(url, options, nRetries = 3) {
  const response = await fetch(url, options);
  if (response.status === 429 && nRetries > 0) {
    const retryAfter = Number(response.headers.get("retry_after"));
    if (!Number.isNaN(retryAfter)) {
      await new Promise((r) => setTimeout(r, retryAfter * 1000));
      return fetchAndRetry(url, options, nRetries - 1);
    }
  }
  return response;
}

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (c) => { body += c; });
    req.on("end", () => {
      try { resolve(body ? JSON.parse(body) : {}); }
      catch (e) { reject(e); }
    });
    req.on("error", reject);
  });
}

function sendJson(res, status, data) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
  });
  res.end(JSON.stringify(data));
}

function parsePath(url) {
  return (url || "").split("?")[0].replace(/^\/.proxy/, "");
}

function getAdminDiscordIds() {
  return String(process.env.ADMIN_DISCORD_IDS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function isAdminUser(discordId) {
  const allow = getAdminDiscordIds();
  return allow.includes(String(discordId));
}

// ─── Discord Interactions ──────────────────────────────────────────────────────

async function verifyDiscordSignature(rawBody, signature, timestamp, publicKey) {
  try {
    const key = crypto.createPublicKey({
      key: Buffer.concat([
        Buffer.from("302a300506032b6570032100", "hex"),
        Buffer.from(publicKey, "hex"),
      ]),
      format: "der",
      type: "spki",
    });
    return crypto.verify(
      null,
      Buffer.concat([Buffer.from(timestamp, "utf8"), rawBody]),
      key,
      Buffer.from(signature, "hex"),
    );
  } catch { return false; }
}

async function handleInteractions(req, res) {
  const publicKey = process.env.DISCORD_PUBLIC_KEY;
  if (!publicKey) return sendJson(res, 500, { error: "DISCORD_PUBLIC_KEY not set" });

  const signature = req.headers["x-signature-ed25519"];
  const timestamp = req.headers["x-signature-timestamp"];
  const rawBody = await readRawBody(req);

  if (!signature || !timestamp || !(await verifyDiscordSignature(rawBody, signature, timestamp, publicKey))) {
    return sendJson(res, 401, { error: "Invalid signature" });
  }

  const interaction = JSON.parse(rawBody.toString("utf8"));

  // Ping
  if (interaction.type === 1) return sendJson(res, 200, { type: 1 });

  // Slash command: /play → launch activity
  if (interaction.type === 2 && interaction.data?.name === "play") {
    return sendJson(res, 200, { type: 12 });
  }

  // Slash command: /mythic <subcommand>
  if (interaction.type === 2 && interaction.data?.name === "mythic") {
    const sub = interaction.data.options?.[0];
    if (!sub) return sendJson(res, 200, { type: 4, data: { content: "Unknown subcommand.", flags: 64 } });

    const userId = interaction.member?.user?.id || interaction.user?.id;
    const username = interaction.member?.user?.username || interaction.user?.username || "Unknown";
    const avatar = interaction.member?.user?.avatar || interaction.user?.avatar || null;

    if (sub.name === "profile") {
      return await handleMythicProfile(res, userId, username);
    }
    if (sub.name === "daily") {
      return await handleMythicDaily(res, userId, username, avatar);
    }
    if (sub.name === "duel") {
      const opponentId = sub.options?.find((o) => o.name === "opponent")?.value;
      return sendJson(res, 200, {
        type: 4,
        data: {
          content: `⚔️ **${username}** challenges <@${opponentId}> to a duel!\n\nOpen Mythic Arcana with \`/play\` to accept!`,
          allowed_mentions: { users: [opponentId] },
        },
      });
    }
    if (sub.name === "drop") {
      return await handleMythicDrop(res, interaction);
    }

    return sendJson(res, 200, { type: 4, data: { content: "Unknown subcommand.", flags: 64 } });
  }

  // Button interaction: claim_drop_<cardId>
  if (interaction.type === 3 && interaction.data?.custom_id?.startsWith("claim_drop_")) {
    const cardId = interaction.data.custom_id.replace("claim_drop_", "");
    const userId = interaction.member?.user?.id || interaction.user?.id;
    const username = interaction.member?.user?.username || interaction.user?.username || "Unknown";
    const avatar = interaction.member?.user?.avatar || interaction.user?.avatar || null;

    try {
      const result = await processCardClaim(prisma, userId, username, avatar, cardId);
      const cardName = getCardName(cardId);
      const msg = result.isDuplicate
        ? `📦 **${username}** claimed **${cardName}** (duplicate — +50 XP, +${result.stardustEarned ?? 0}💎 stardust & star progress)!`
        : `🎉 **${username}** claimed **${cardName}**! Added to their collection!`;

      return sendJson(res, 200, {
        type: 7, // UPDATE_MESSAGE
        data: {
          content: msg,
          embeds: [],
          components: [], // Remove the claim button
        },
      });
    } catch (err) {
      console.error("Claim error:", err);
      return sendJson(res, 200, {
        type: 4,
        data: { content: "❌ Failed to claim card. Try again!", flags: 64 },
      });
    }
  }

  return sendJson(res, 400, { error: "Unhandled interaction" });
}

// ─── /mythic profile ───────────────────────────────────────────────────────────

async function handleMythicProfile(res, userId, username) {
  const player = await prisma.player.findUnique({
    where: { discordId: userId },
    include: { cards: true, battleStats: true },
  });

  if (!player) {
    return sendJson(res, 200, {
      type: 4,
      data: { content: `❌ **${username}** hasn't started Mythic Arcana yet! Use \`/play\` to begin.`, flags: 64 },
    });
  }

  const stats = player.battleStats;
  const totalCards = player.cards.length;
  const legendaryCount = player.cards.filter((c) => getCardRarity(c.cardId) === "legendary").length;
  const winRate = stats && (stats.wins + stats.losses) > 0
    ? Math.round((stats.wins / (stats.wins + stats.losses)) * 100)
    : 0;

  return sendJson(res, 200, {
    type: 4,
    data: {
      embeds: [
        {
          title: `⚔️ ${username}'s Profile`,
          color: 0xD4A020,
          fields: [
            { name: "💰 Gold", value: `${player.gold}`, inline: true },
            { name: "💎 Stardust", value: `${player.stardust}`, inline: true },
            { name: "🃏 Cards", value: `${totalCards}`, inline: true },
            { name: "⭐ Legendaries", value: `${legendaryCount}`, inline: true },
            { name: "🏆 Wins", value: `${stats?.wins || 0}`, inline: true },
            { name: "📊 Win Rate", value: `${winRate}%`, inline: true },
            { name: "🎯 Total Pulls", value: `${player.totalPulls}`, inline: true },
            { name: "🛤️ Path", value: player.selectedPath ? player.selectedPath.charAt(0).toUpperCase() + player.selectedPath.slice(1) : "None", inline: true },
          ],
          footer: { text: "Use /play to open the full game!" },
        },
      ],
    },
  });
}

// ─── /mythic daily ─────────────────────────────────────────────────────────────

async function handleMythicDaily(res, userId, username, avatar) {
  let player = await prisma.player.findUnique({ where: { discordId: userId } });

  if (!player) {
    player = await prisma.player.create({
      data: {
        discordId: userId,
        username,
        avatar: avatar || null,
        gold: 500,
        stardust: 0,
        pityCounter: 0,
        totalPulls: 0,
        hasCompletedOnboarding: false,
        selectedPath: null,
        battleStats: { create: {} },
      },
    });
  }

  if (player.lastFreePackTime && !canClaimFreePack(player.lastFreePackTime)) {
    const remaining = 24 * 60 * 60 * 1000 - (Date.now() - player.lastFreePackTime.getTime());
    const hours = Math.floor(remaining / 3600000);
    const mins = Math.floor((remaining % 3600000) / 60000);
    return sendJson(res, 200, {
      type: 4,
      data: { content: `⏰ **${username}**, your daily reward refreshes in **${hours}h ${mins}m**!`, flags: 64 },
    });
  }

  // Grant daily reward: 100 gold + 10 stardust
  await prisma.player.update({
    where: { id: player.id },
    data: {
      gold: player.gold + 100,
      stardust: player.stardust + 10,
      lastFreePackTime: new Date(),
    },
  });

  return sendJson(res, 200, {
    type: 4,
    data: {
      content: `🎁 **${username}** claimed their daily reward!\n\n💰 **+100 Gold**\n💎 **+10 Stardust**\n\nCome back tomorrow for more!`,
    },
  });
}

// ─── /mythic drop ──────────────────────────────────────────────────────────────

async function handleMythicDrop(res, interaction) {
  // Only allow in guilds (not DMs)
  if (!interaction.guild_id) {
    return sendJson(res, 200, {
      type: 4,
      data: { content: "❌ Card drops only work in servers!", flags: 64 },
    });
  }

  const cardId = pickRandomDropCard(ALL_CARD_IDS, getCardRarity);
  const cardName = getCardName(cardId);
  const rarity = getCardRarity(cardId);
  const element = getCardElement(cardId);
  const embed = buildDropEmbed(cardId, cardName, rarity, element);

  return sendJson(res, 200, {
    type: 4,
    data: embed,
  });
}

// ─── Token Exchange ────────────────────────────────────────────────────────────

async function handleTokenExchange(req, res) {
  let payload;
  try { payload = await readJsonBody(req); }
  catch { return sendJson(res, 400, { error: "Invalid JSON body" }); }

  const code = payload.code;
  if (!code || typeof code !== "string") return sendJson(res, 400, { error: "Missing code" });

  const clientId = process.env.DISCORD_CLIENT_ID || process.env.VITE_DISCORD_CLIENT_ID;
  const clientSecret = process.env.DISCORD_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return sendJson(res, 500, { error: "Set DISCORD_CLIENT_SECRET and DISCORD_CLIENT_ID" });
  }

  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "authorization_code",
    code,
  });

  const tokenRes = await fetchAndRetry("https://discord.com/api/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  const json = await tokenRes.json();
  if (!tokenRes.ok) return sendJson(res, tokenRes.status, json);
  return sendJson(res, 200, { access_token: json.access_token });
}

// ─── Player API ────────────────────────────────────────────────────────────────

function playerToClientState(player, cards) {
  const cardProgress = {};
  const ownedCardIds = [];
  for (const c of cards) {
    ownedCardIds.push(c.cardId);
    cardProgress[c.cardId] = {
      level: c.level,
      xp: c.xp,
      prestigeLevel: c.prestigeLevel,
      starProgress: { dupeCount: c.dupeCount, goldStars: c.goldStars, redStars: c.redStars },
    };
  }
  return {
    gold: player.gold,
    stardust: player.stardust,
    ownedCardIds,
    cardProgress,
    pityCounter: player.pityCounter,
    lastFreePackTime: player.lastFreePackTime ? player.lastFreePackTime.getTime() : null,
    totalPulls: player.totalPulls,
    hasCompletedOnboarding: player.hasCompletedOnboarding ?? true,
    selectedPath: player.selectedPath ?? null,
  };
}

async function findOrCreatePlayer(discordUser) {
  let player = await prisma.player.findUnique({
    where: { discordId: discordUser.id },
    include: { cards: true, battleStats: true },
  });

  if (!player) {
    player = await prisma.player.create({
      data: {
        discordId: discordUser.id,
        username: discordUser.username,
        avatar: discordUser.avatar || null,
        gold: 500,
        stardust: 0,
        pityCounter: 0,
        totalPulls: 0,
        hasCompletedOnboarding: false,
        selectedPath: null,
        battleStats: { create: {} },
      },
      include: { cards: true, battleStats: true },
    });
  } else {
    if (player.username !== discordUser.username || player.avatar !== (discordUser.avatar || null)) {
      await prisma.player.update({
        where: { id: player.id },
        data: { username: discordUser.username, avatar: discordUser.avatar || null },
      });
    }
  }

  return player;
}

async function handleOnboardingComplete(req, res) {
  const user = await requireAuth(req, res);
  if (!user) return;

  const body = await readJsonBody(req);
  const path = body.path;
  if (!path || !FACTION_STARTER_CARDS[path]) {
    return sendJson(res, 400, { error: "Invalid path" });
  }

  const player = await prisma.player.findUnique({
    where: { discordId: user.id },
    include: { cards: true },
  });
  if (!player) return sendJson(res, 404, { error: "Player not found" });

  if (player.hasCompletedOnboarding) {
    return sendJson(res, 409, { error: "Onboarding already completed" });
  }

  const starterIds = FACTION_STARTER_CARDS[path];

  await prisma.$transaction(async (tx) => {
    await tx.player.update({
      where: { id: player.id },
      data: { hasCompletedOnboarding: true, selectedPath: path },
    });

    for (const cardId of starterIds) {
      await tx.cardProgress.upsert({
        where: { playerId_cardId: { playerId: player.id, cardId } },
        create: {
          playerId: player.id,
          cardId,
          level: 1,
          xp: 0,
          prestigeLevel: 0,
          dupeCount: 0,
          goldStars: 0,
          redStars: 0,
        },
        update: {},
      });
    }
  });

  const updated = await prisma.player.findUnique({
    where: { id: player.id },
    include: { cards: true },
  });

  sendJson(res, 200, playerToClientState(updated, updated.cards));
}

async function handleGetPlayer(req, res) {
  const user = await requireAuth(req, res);
  if (!user) return;

  const player = await findOrCreatePlayer(user);
  const state = playerToClientState(player, player.cards);
  sendJson(res, 200, state);
}

async function handlePatchPlayer(req, res) {
  const user = await requireAuth(req, res);
  if (!user) return;

  const body = await readJsonBody(req);
  const allowed = ["gold", "stardust", "pityCounter", "totalPulls", "lastFreePackTime"];
  const data = {};
  for (const key of allowed) {
    if (body[key] !== undefined) {
      if (key === "lastFreePackTime") {
        data[key] = body[key] ? new Date(body[key]) : null;
      } else {
        data[key] = Number(body[key]);
      }
    }
  }

  const player = await prisma.player.update({
    where: { discordId: user.id },
    data,
    include: { cards: true },
  });
  sendJson(res, 200, playerToClientState(player, player.cards));
}

// ─── Card Pull API ─────────────────────────────────────────────────────────────

async function handleCardPull(req, res) {
  const user = await requireAuth(req, res);
  if (!user) return;

  const body = await readJsonBody(req);
  const packId = body.packId || "bronze";
  const pack = PACK_DEFINITIONS[packId];
  if (!pack) return sendJson(res, 400, { error: "Unknown pack" });

  const player = await prisma.player.findUnique({
    where: { discordId: user.id },
    include: { cards: true },
  });
  if (!player) return sendJson(res, 404, { error: "Player not found" });

  if (packId === "free") {
    if (!canClaimFreePack(player.lastFreePackTime)) {
      return sendJson(res, 400, { error: "Free pack not ready yet" });
    }
  } else if (player.gold < pack.cost) {
    return sendJson(res, 400, { error: "Not enough gold" });
  }

  const { cardIds, newPityCounter } = pullCards(packId, player.pityCounter);

  const pullResults = [];
  let totalStardustEarned = 0;

  for (const cardId of cardIds) {
    const existing = await prisma.cardProgress.findUnique({
      where: { playerId_cardId: { playerId: player.id, cardId } },
    });

    if (existing) {
      const dupeResult = processDuplicatePull(existing, cardId);
      await prisma.cardProgress.update({
        where: { id: existing.id },
        data: {
          dupeCount: dupeResult.dupeCount,
          goldStars: dupeResult.goldStars,
          redStars: dupeResult.redStars,
          xp: existing.xp + dupeResult.xpBonus,
        },
      });
      totalStardustEarned += dupeResult.stardustEarned;
      pullResults.push({
        cardId,
        isDuplicate: true,
        stardustEarned: dupeResult.stardustEarned,
        newGoldStar: dupeResult.newGoldStar,
        newRedStar: dupeResult.newRedStar,
        rarity: getCardRarity(cardId),
      });
    } else {
      await prisma.cardProgress.create({
        data: {
          playerId: player.id,
          cardId,
          level: 1,
          xp: 0,
          prestigeLevel: 0,
          dupeCount: 0,
          goldStars: 0,
          redStars: 0,
        },
      });
      pullResults.push({
        cardId,
        isDuplicate: false,
        stardustEarned: 0,
        newGoldStar: false,
        newRedStar: false,
        rarity: getCardRarity(cardId),
      });
    }
  }

  const updateData = {
    pityCounter: newPityCounter,
    totalPulls: player.totalPulls + pack.cardCount,
    stardust: player.stardust + totalStardustEarned,
  };
  if (packId === "free") {
    updateData.lastFreePackTime = new Date();
  } else {
    updateData.gold = player.gold - pack.cost;
  }

  const updatedPlayer = await prisma.player.update({
    where: { id: player.id },
    data: updateData,
    include: { cards: true },
  });

  sendJson(res, 200, {
    pullResults,
    state: playerToClientState(updatedPlayer, updatedPlayer.cards),
  });
}

// ─── Card Level / Prestige ─────────────────────────────────────────────────────

async function handlePatchCard(req, res, cardId) {
  const user = await requireAuth(req, res);
  if (!user) return;

  const body = await readJsonBody(req);
  const player = await prisma.player.findUnique({ where: { discordId: user.id } });
  if (!player) return sendJson(res, 404, { error: "Player not found" });

  const card = await prisma.cardProgress.findUnique({
    where: { playerId_cardId: { playerId: player.id, cardId } },
  });
  if (!card) return sendJson(res, 404, { error: "Card not found in collection" });

  if (body.action === "prestige") {
    if (card.level < 20 || card.prestigeLevel >= 3) {
      return sendJson(res, 400, { error: "Cannot prestige" });
    }
    const updated = await prisma.cardProgress.update({
      where: { id: card.id },
      data: { level: 1, xp: 0, prestigeLevel: card.prestigeLevel + 1 },
    });
    return sendJson(res, 200, { card: updated });
  }

  if (body.action === "addXp") {
    const xpAmount = Number(body.xp) || 0;
    const result = awardXp(card, xpAmount);
    const updated = await prisma.cardProgress.update({
      where: { id: card.id },
      data: { level: result.level, xp: result.xp },
    });
    return sendJson(res, 200, { card: updated, levelUps: result.levelUps });
  }

  return sendJson(res, 400, { error: "Unknown action" });
}

// ─── Cards List ────────────────────────────────────────────────────────────────

async function handleGetCards(req, res) {
  const user = await requireAuth(req, res);
  if (!user) return;

  const player = await prisma.player.findUnique({
    where: { discordId: user.id },
    include: { cards: true },
  });
  if (!player) return sendJson(res, 404, { error: "Player not found" });
  sendJson(res, 200, { cards: player.cards });
}

// ─── Decks API ─────────────────────────────────────────────────────────────────

async function handleGetDecks(req, res) {
  const user = await requireAuth(req, res);
  if (!user) return;

  const player = await prisma.player.findUnique({ where: { discordId: user.id } });
  if (!player) return sendJson(res, 404, { error: "Player not found" });

  const decks = await prisma.deck.findMany({ where: { playerId: player.id } });
  sendJson(res, 200, { decks });
}

async function handlePostDeck(req, res) {
  const user = await requireAuth(req, res);
  if (!user) return;

  const body = await readJsonBody(req);
  if (!body.name || !Array.isArray(body.cardIds)) {
    return sendJson(res, 400, { error: "name and cardIds required" });
  }

  const player = await prisma.player.findUnique({ where: { discordId: user.id } });
  if (!player) return sendJson(res, 404, { error: "Player not found" });

  const deck = await prisma.deck.create({
    data: { playerId: player.id, name: body.name, cardIds: body.cardIds },
  });
  sendJson(res, 201, { deck });
}

async function handleDeleteDeck(req, res, deckId) {
  const user = await requireAuth(req, res);
  if (!user) return;

  const player = await prisma.player.findUnique({ where: { discordId: user.id } });
  if (!player) return sendJson(res, 404, { error: "Player not found" });

  const deck = await prisma.deck.findFirst({ where: { id: Number(deckId), playerId: player.id } });
  if (!deck) return sendJson(res, 404, { error: "Deck not found" });

  await prisma.deck.delete({ where: { id: deck.id } });
  sendJson(res, 200, { ok: true });
}

// ─── Battle Result API ─────────────────────────────────────────────────────────

async function handleBattleResult(req, res) {
  const user = await requireAuth(req, res);
  if (!user) return;

  const body = await readJsonBody(req);
  const { won, turnCount, deckCardIds } = body;
  if (typeof won !== "boolean" || !turnCount) {
    return sendJson(res, 400, { error: "won (bool) and turnCount required" });
  }

  const player = await prisma.player.findUnique({
    where: { discordId: user.id },
    include: { cards: true },
  });
  if (!player) return sendJson(res, 404, { error: "Player not found" });

  const goldReward = getBattleGoldReward(won, turnCount);
  const outcome = won ? "win" : body.draw ? "draw" : "loss";
  const xpAmount = won ? 50 : outcome === "draw" ? 35 : 20;

  const allLevelUps = [];
  if (Array.isArray(deckCardIds)) {
    for (const cardId of deckCardIds) {
      const card = player.cards.find((c) => c.cardId === cardId);
      if (card && card.level < 20) {
        const result = awardXp(card, xpAmount);
        await prisma.cardProgress.update({
          where: { id: card.id },
          data: { level: result.level, xp: result.xp },
        });
        for (const lu of result.levelUps) {
          allLevelUps.push({ cardId, ...lu });
        }
      }
    }
  }

  await prisma.player.update({
    where: { id: player.id },
    data: { gold: player.gold + goldReward },
  });

  const statsUpdate = { lastBattleAt: new Date(), goldEarned: { increment: goldReward } };
  if (outcome === "win") statsUpdate.wins = { increment: 1 };
  else if (outcome === "draw") statsUpdate.draws = { increment: 1 };
  else statsUpdate.losses = { increment: 1 };

  await prisma.battleStat.upsert({
    where: { playerId: player.id },
    create: {
      playerId: player.id,
      wins: outcome === "win" ? 1 : 0,
      losses: outcome === "loss" ? 1 : 0,
      draws: outcome === "draw" ? 1 : 0,
      goldEarned: goldReward,
      lastBattleAt: new Date(),
    },
    update: statsUpdate,
  });

  const updatedPlayer = await prisma.player.findUnique({
    where: { id: player.id },
    include: { cards: true },
  });

  sendJson(res, 200, {
    goldReward,
    levelUps: allLevelUps,
    state: playerToClientState(updatedPlayer, updatedPlayer.cards),
  });
}

// ─── Import from localStorage (one-time migration) ────────────────────────────

async function handleImport(req, res) {
  const user = await requireAuth(req, res);
  if (!user) return;

  const body = await readJsonBody(req);
  const existing = await prisma.player.findUnique({ where: { discordId: user.id } });
  if (existing) {
    return sendJson(res, 409, { error: "Player already exists — import skipped" });
  }

  const { gold, stardust, ownedCardIds, cardProgress, pityCounter, lastFreePackTime, totalPulls } = body;

  const cardsToCreate = (ownedCardIds || []).map((cardId) => {
    const cp = cardProgress?.[cardId] || {};
    const sp = cp.starProgress || {};
    return {
      cardId,
      level: cp.level || 1,
      xp: cp.xp || 0,
      prestigeLevel: cp.prestigeLevel || 0,
      dupeCount: sp.dupeCount || 0,
      goldStars: sp.goldStars || 0,
      redStars: sp.redStars || 0,
    };
  });

  const player = await prisma.player.create({
    data: {
      discordId: user.id,
      username: user.username,
      avatar: user.avatar || null,
      gold: gold || 500,
      stardust: stardust || 0,
      pityCounter: pityCounter || 0,
      totalPulls: totalPulls || 0,
      lastFreePackTime: lastFreePackTime ? new Date(lastFreePackTime) : null,
      cards: { create: cardsToCreate },
      battleStats: { create: {} },
    },
    include: { cards: true },
  });

  sendJson(res, 201, playerToClientState(player, player.cards));
}

// ─── Crafting API ─────────────────────────────────────────────────────────────

async function handleCraftFuse(req, res) {
  const user = await requireAuth(req, res);
  if (!user) return;

  const body = await readJsonBody(req);
  const { inputRarity, selectedCardIds } = body;

  const recipe = FUSION_RECIPES.find((r) => r.inputRarity === inputRarity);
  if (!recipe) return sendJson(res, 400, { error: "Unknown fusion recipe" });
  if (!Array.isArray(selectedCardIds) || selectedCardIds.length !== recipe.inputCount) {
    return sendJson(res, 400, { error: `Must select exactly ${recipe.inputCount} cards` });
  }

  const player = await prisma.player.findUnique({
    where: { discordId: user.id },
    include: { cards: true },
  });
  if (!player) return sendJson(res, 404, { error: "Player not found" });
  if (player.gold < recipe.goldCost) return sendJson(res, 400, { error: "Not enough gold" });

  // Verify ownership of all selected cards with correct rarity
  for (const cardId of selectedCardIds) {
    const owned = player.cards.find((c) => c.cardId === cardId);
    if (!owned) return sendJson(res, 400, { error: `Card not owned: ${cardId}` });
    if (getCardRarity(cardId) !== recipe.inputRarity) {
      return sendJson(res, 400, { error: `Card ${cardId} is not ${recipe.inputRarity}` });
    }
  }

  // Pick random output card of the target rarity (not already owned)
  const outputPool = ALL_CARD_IDS.filter((id) => {
    if (getCardRarity(id) !== recipe.outputRarity) return false;
    // Prefer cards not already owned, fall back to any if needed
    return !player.cards.find((c) => c.cardId === id);
  });
  const fallbackPool = ALL_CARD_IDS.filter((id) => getCardRarity(id) === recipe.outputRarity);
  const finalPool = outputPool.length > 0 ? outputPool : fallbackPool;
  if (finalPool.length === 0) return sendJson(res, 500, { error: "No cards available for fusion" });
  const resultCardId = finalPool[Math.floor(Math.random() * finalPool.length)];

  await prisma.$transaction(async (tx) => {
    // Remove input cards
    for (const cardId of selectedCardIds) {
      const card = player.cards.find((c) => c.cardId === cardId);
      if (card) await tx.cardProgress.delete({ where: { id: card.id } });
    }
    // Add result card
    await tx.cardProgress.upsert({
      where: { playerId_cardId: { playerId: player.id, cardId: resultCardId } },
      create: { playerId: player.id, cardId: resultCardId, level: 1, xp: 0, prestigeLevel: 0, dupeCount: 0, goldStars: 0, redStars: 0 },
      update: {},
    });
    // Deduct gold
    await tx.player.update({ where: { id: player.id }, data: { gold: player.gold - recipe.goldCost } });
  });

  const updated = await prisma.player.findUnique({ where: { id: player.id }, include: { cards: true } });
  sendJson(res, 200, { resultCardId, state: playerToClientState(updated, updated.cards) });
}

async function handleCraftSacrifice(req, res) {
  const user = await requireAuth(req, res);
  if (!user) return;

  const body = await readJsonBody(req);
  const { cardIds } = body;
  if (!Array.isArray(cardIds) || cardIds.length === 0) {
    return sendJson(res, 400, { error: "cardIds array required" });
  }

  const player = await prisma.player.findUnique({
    where: { discordId: user.id },
    include: { cards: true },
  });
  if (!player) return sendJson(res, 404, { error: "Player not found" });

  let totalStardust = 0;
  const toDelete = [];
  for (const cardId of cardIds) {
    const owned = player.cards.find((c) => c.cardId === cardId);
    if (!owned) return sendJson(res, 400, { error: `Card not owned: ${cardId}` });
    const rarity = getCardRarity(cardId);
    totalStardust += SACRIFICE_STARDUST[rarity] ?? 10;
    toDelete.push(owned.id);
  }

  await prisma.$transaction(async (tx) => {
    for (const id of toDelete) {
      await tx.cardProgress.delete({ where: { id } });
    }
    await tx.player.update({ where: { id: player.id }, data: { stardust: { increment: totalStardust } } });
  });

  const updated = await prisma.player.findUnique({ where: { id: player.id }, include: { cards: true } });
  sendJson(res, 200, { totalStardust, state: playerToClientState(updated, updated.cards) });
}

// ─── Leaderboard API ───────────────────────────────────────────────────────────

async function handleLeaderboard(req, res) {
  const url = new URL(`http://localhost${req.url}`);
  const tab = url.searchParams.get("tab") || "wins";

  let entries;

  if (tab === "wins") {
    entries = await prisma.battleStat.findMany({
      where: { OR: [{ wins: { gt: 0 } }, { losses: { gt: 0 } }, { draws: { gt: 0 } }] },
      orderBy: { wins: "desc" },
      take: 20,
      include: { player: { select: { username: true, avatar: true, discordId: true } } },
    });
    entries = entries.map((e, i) => ({
      rank: i + 1,
      name: e.player.username,
      avatar: e.player.avatar,
      discordId: e.player.discordId,
      value: e.wins,
    }));
  } else if (tab === "collection") {
    const players = await prisma.player.findMany({
      include: { _count: { select: { cards: true } } },
      orderBy: { cards: { _count: "desc" } },
      take: 50,
    });
    const totalCards = ALL_CARD_IDS.length;
    entries = players
      .filter((p) => p._count.cards > 0)
      .slice(0, 20)
      .map((p, i) => ({
        rank: i + 1,
        name: p.username,
        avatar: p.avatar,
        discordId: p.discordId,
        value: Math.round((p._count.cards / totalCards) * 100),
      }));
  } else {
    // rarest — score by legendary=10, rare=3, common=1
    const players = await prisma.player.findMany({
      include: { cards: true },
      take: 50,
    });
    const scored = players.map((p) => {
      const score = p.cards.reduce((sum, c) => {
        const r = getCardRarity(c.cardId);
        return sum + (r === "legendary" ? 10 : r === "rare" ? 3 : 1);
      }, 0);
      return { name: p.username, avatar: p.avatar, discordId: p.discordId, score };
    });
    scored.sort((a, b) => b.score - a.score);
    entries = scored
      .filter((e) => e.score > 0)
      .slice(0, 20)
      .map((e, i) => ({
      rank: i + 1,
      name: e.name,
      avatar: e.avatar,
      discordId: e.discordId,
      value: e.score,
    }));
  }

  sendJson(res, 200, { entries });
}

// ─── Admin API (cheats) ─────────────────────────────────────────────────────────

async function handleAdminGrant(req, res) {
  const user = await requireAuth(req, res);
  if (!user) return;

  if (!isAdminUser(user.id)) {
    return sendJson(res, 403, { error: "Forbidden" });
  }

  const body = await readJsonBody(req);
  const allowedKeys = ["gold", "stardust", "pityCounter", "totalPulls"];
  const data = {};

  for (const k of allowedKeys) {
    if (body[k] !== undefined) {
      const n = Number(body[k]);
      if (!Number.isFinite(n)) return sendJson(res, 400, { error: `Invalid number for ${k}` });
      data[k] = { increment: Math.trunc(n) };
    }
  }

  if (Object.keys(data).length === 0) {
    return sendJson(res, 400, { error: "No valid fields provided" });
  }

  const updated = await prisma.player.update({
    where: { discordId: user.id },
    data,
    include: { cards: true },
  });

  return sendJson(res, 200, { ok: true, state: playerToClientState(updated, updated.cards) });
}

// ─── Router ────────────────────────────────────────────────────────────────────

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
    });
    res.end();
    return;
  }

  const path = parsePath(req.url);
  const method = req.method;

  try {
    if (method === "GET" && (path === "/" || path === "/health")) {
      return sendJson(res, 200, { ok: true, service: "lorebound-api" });
    }

    if (method === "POST" && (path === "/interactions")) {
      return await handleInteractions(req, res);
    }

    if (method === "POST" && path === "/api/token") {
      return await handleTokenExchange(req, res);
    }

    // Game API routes
    if (method === "GET" && path === "/api/player") return await handleGetPlayer(req, res);
    if (method === "PATCH" && path === "/api/player") return await handlePatchPlayer(req, res);
  if (method === "POST" && path === "/api/onboarding/complete") return await handleOnboardingComplete(req, res);
    if (method === "GET" && path === "/api/cards") return await handleGetCards(req, res);
    if (method === "POST" && path === "/api/cards/pull") return await handleCardPull(req, res);
    if (method === "GET" && path === "/api/decks") return await handleGetDecks(req, res);
    if (method === "POST" && path === "/api/decks") return await handlePostDeck(req, res);
    if (method === "POST" && path === "/api/battle/result") return await handleBattleResult(req, res);
    if (method === "POST" && path === "/api/import") return await handleImport(req, res);
    if (method === "POST" && path === "/api/craft/fuse") return await handleCraftFuse(req, res);
    if (method === "POST" && path === "/api/craft/sacrifice") return await handleCraftSacrifice(req, res);
    if (method === "GET" && path === "/api/leaderboard") return await handleLeaderboard(req, res);
    if (method === "POST" && path === "/api/admin/grant") return await handleAdminGrant(req, res);

    // /api/cards/:cardId
    const cardMatch = path.match(/^\/api\/cards\/([^/]+)$/);
    if (cardMatch && method === "PATCH") return await handlePatchCard(req, res, cardMatch[1]);

    // /api/decks/:id
    const deckMatch = path.match(/^\/api\/decks\/(\d+)$/);
    if (deckMatch && method === "DELETE") return await handleDeleteDeck(req, res, deckMatch[1]);

    sendJson(res, 404, { error: "Not found" });
  } catch (err) {
    console.error("Request error:", err);
    sendJson(res, 500, { error: "Internal server error" });
  }
});

server.listen(PORT, () => {
  console.log(`Lorebound API listening on http://127.0.0.1:${PORT}`);
});
