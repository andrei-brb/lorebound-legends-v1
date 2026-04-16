/**
 * Main server: Discord token exchange, interactions, and game API routes.
 * Run: node server/token-server.mjs
 */
import dotenv from "dotenv";
import http from "node:http";
import crypto from "node:crypto";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { PrismaClient } from "@prisma/client";
import { requireAuth } from "./lib/auth.mjs";
import { getClientIp, rateLimit } from "./lib/rateLimit.mjs";
import {
  STARTER_CARD_IDS,
  FACTION_STARTER_CARDS,
  PACK_DEFINITIONS,
  FUSION_RECIPES,
  SACRIFICE_STARDUST,
  canClaimFreePack,
  pullCards,
  calculateStars,
  getCardRarity,
  processDuplicatePull,
  getBattleGoldReward,
  awardXp,
  ALL_CARD_IDS,
  getCardName,
  getCardElement,
} from "./lib/gameLogic.mjs";
import { replayBattleFromActions, applyBattleLockstepIntent } from "./battleLockstep.mjs";
import { pickRandomDropCard, buildDropEmbed, processCardClaim } from "./lib/cardDrop.mjs";
import { SEASONAL_EVENTS, getSeasonalEventById, isEventActive } from "./lib/seasonalEvents.mjs";
import { simulateBattle as simulateBattleServer } from "./lib/battleSim.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "..", ".env") });

const prisma = new PrismaClient();
const PORT = Number(process.env.PORT || process.env.DISCORD_TOKEN_PORT) || 3001;
const DIST_DIR = join(__dirname, "..", "dist");

/** Tunable via env (defaults reduce shared-NAT pain on /api/*). */
const RATE_LIMIT = {
  interactions: { max: Math.max(1, Number(process.env.RATE_LIMIT_INTERACTIONS_PER_MIN) || 400), windowMs: 60_000 },
  token: {
    max: Math.max(1, Number(process.env.RATE_LIMIT_TOKEN_MAX) || 25),
    windowMs: Math.max(60_000, Number(process.env.RATE_LIMIT_TOKEN_WINDOW_MS) || 15 * 60_000),
  },
  api: { max: Math.max(1, Number(process.env.RATE_LIMIT_API_PER_MIN) || 900), windowMs: 60_000 },
};

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

async function discordBotFetch(path, init = {}) {
  const appId = process.env.DISCORD_CLIENT_ID || process.env.VITE_DISCORD_CLIENT_ID;
  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!appId || !botToken) {
    throw new Error("Missing DISCORD_BOT_TOKEN or DISCORD_CLIENT_ID/VITE_DISCORD_CLIENT_ID");
  }

  const API = "https://discord.com/api/v10";
  const res = await fetchAndRetry(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bot ${botToken}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  const text = await res.text();
  const json = text ? JSON.parse(text) : null;
  if (!res.ok) {
    throw new Error(`Discord API ${res.status} ${res.statusText}: ${text}`);
  }
  return json;
}

async function upsertDiscordCommand(existingCommands, payload, guildId) {
  const appId = process.env.DISCORD_CLIENT_ID || process.env.VITE_DISCORD_CLIENT_ID;
  const base = guildId
    ? `/applications/${appId}/guilds/${guildId}/commands`
    : `/applications/${appId}/commands`;

  const existing = Array.isArray(existingCommands)
    ? existingCommands.find((c) => c?.type === payload.type && c?.name === payload.name)
    : null;

  if (existing?.id) {
    await discordBotFetch(`${base}/${existing.id}`, { method: "PATCH", body: JSON.stringify(payload) });
    return { action: "updated", id: existing.id, name: payload.name };
  }
  const created = await discordBotFetch(base, { method: "POST", body: JSON.stringify(payload) });
  return { action: "created", id: created?.id, name: payload.name };
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

function contentTypeForPath(p) {
  if (p.endsWith(".html")) return "text/html; charset=utf-8";
  if (p.endsWith(".js")) return "application/javascript; charset=utf-8";
  if (p.endsWith(".css")) return "text/css; charset=utf-8";
  if (p.endsWith(".json")) return "application/json; charset=utf-8";
  if (p.endsWith(".svg")) return "image/svg+xml";
  if (p.endsWith(".png")) return "image/png";
  if (p.endsWith(".jpg") || p.endsWith(".jpeg")) return "image/jpeg";
  if (p.endsWith(".gif")) return "image/gif";
  if (p.endsWith(".webp")) return "image/webp";
  if (p.endsWith(".ico")) return "image/x-icon";
  if (p.endsWith(".txt")) return "text/plain; charset=utf-8";
  return "application/octet-stream";
}

function serveStaticFile(res, absPath, { cache = "public, max-age=31536000, immutable" } = {}) {
  try {
    const st = fs.statSync(absPath);
    if (!st.isFile()) return false;
    const body = fs.readFileSync(absPath);
    res.writeHead(200, {
      "Content-Type": contentTypeForPath(absPath),
      "Cache-Control": cache,
      "Access-Control-Allow-Origin": "*",
    });
    res.end(body);
    return true;
  } catch {
    return false;
  }
}

function tryServeFrontend(req, res, path) {
  if (req.method !== "GET" && req.method !== "HEAD") return false;

  // Never treat API/Discord endpoints as frontend routes.
  if (path.startsWith("/api/") || path === "/api" || path.startsWith("/interactions")) return false;

  // Static asset requests.
  if (path.startsWith("/assets/") || path === "/favicon.ico" || path === "/robots.txt" || path === "/placeholder.svg") {
    const abs = join(DIST_DIR, path);
    return serveStaticFile(res, abs);
  }

  // SPA fallback.
  const indexPath = join(DIST_DIR, "index.html");
  return serveStaticFile(res, indexPath, { cache: "no-cache" });
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

async function adminIncrementForUser(discordUserId, body) {
  if (!isAdminUser(discordUserId)) {
    const err = new Error("Forbidden");
    err.statusCode = 403;
    throw err;
  }

  const allowedKeys = ["gold", "stardust", "pityCounter", "totalPulls"];
  const data = {};

  for (const k of allowedKeys) {
    if (body[k] !== undefined) {
      const n = Number(body[k]);
      if (!Number.isFinite(n)) {
        const err = new Error(`Invalid number for ${k}`);
        err.statusCode = 400;
        throw err;
      }
      data[k] = { increment: Math.trunc(n) };
    }
  }

  if (Object.keys(data).length === 0) {
    const err = new Error("No valid fields provided");
    err.statusCode = 400;
    throw err;
  }

  const updated = await prisma.player.update({
    where: { discordId: discordUserId },
    data,
    include: { cards: true },
  });

  return { ok: true, state: playerToClientState(updated, updated.cards) };
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
    if (sub.name === "admin") {
      const isGuild = Boolean(interaction.guild_id);
      if (!isGuild) {
        return sendJson(res, 200, { type: 4, data: { content: "❌ Admin command can only be used in servers.", flags: 64 } });
      }

      const action = sub.options?.find((o) => o.name === "action")?.value;
      const amount = sub.options?.find((o) => o.name === "amount")?.value;

      const userId = interaction.member?.user?.id || interaction.user?.id;
      if (!userId) return sendJson(res, 200, { type: 4, data: { content: "❌ Missing user.", flags: 64 } });

      try {
        const delta = { [String(action)]: Number(amount) };
        const result = await adminIncrementForUser(userId, delta);
        const newVal =
          String(action) === "gold" ? result.state.gold :
          String(action) === "stardust" ? (result.state.stardust ?? 0) :
          String(action) === "pityCounter" ? result.state.pityCounter :
          String(action) === "totalPulls" ? result.state.totalPulls :
          null;

        return sendJson(res, 200, {
          type: 4,
          data: { content: `✅ Granted **${amount} ${action}**. New ${action}: **${newVal ?? "updated"}**`, flags: 64 },
        });
      } catch (e) {
        const msg = e?.message || "Admin grant failed";
        return sendJson(res, 200, { type: 4, data: { content: `❌ ${msg}`, flags: 64 } });
      }
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
    shareCollectionWithFriends: !!player.shareCollectionWithFriends,
    battlePass: player.battlePass ?? undefined,
    cosmeticsOwned: player.cosmeticsOwned ?? undefined,
    cosmeticsEquipped: player.cosmeticsEquipped ?? undefined,
    battlePassXpBoostExpiresAt: player.battlePassXpBoostExpiresAt ? player.battlePassXpBoostExpiresAt.getTime() : null,
    deckPresets: player.deckPresets ?? undefined,
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
        battlePass: null,
        cosmeticsOwned: [],
        cosmeticsEquipped: {},
        battlePassXpBoostExpiresAt: null,
        deckPresets: [],
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

async function handleGetMe(req, res) {
  const user = await requireAuth(req, res);
  if (!user) return;

  const player = await findOrCreatePlayer(user);
  return sendJson(res, 200, { me: toPublicPlayer(player) });
}

async function handlePatchPlayer(req, res) {
  const user = await requireAuth(req, res);
  if (!user) return;

  const body = await readJsonBody(req);
  const data = {};
  if (body.gold !== undefined) data.gold = Number(body.gold);
  if (body.stardust !== undefined) data.stardust = Number(body.stardust);
  if (body.pityCounter !== undefined) data.pityCounter = Number(body.pityCounter);
  if (body.totalPulls !== undefined) data.totalPulls = Number(body.totalPulls);
  if (body.lastFreePackTime !== undefined) data.lastFreePackTime = body.lastFreePackTime ? new Date(body.lastFreePackTime) : null;

  // Battle pass + cosmetics
  if (body.battlePass !== undefined) data.battlePass = body.battlePass;
  if (body.cosmeticsOwned !== undefined) data.cosmeticsOwned = body.cosmeticsOwned;
  if (body.cosmeticsEquipped !== undefined) data.cosmeticsEquipped = body.cosmeticsEquipped;
  if (body.battlePassXpBoostExpiresAt !== undefined) {
    data.battlePassXpBoostExpiresAt = body.battlePassXpBoostExpiresAt ? new Date(body.battlePassXpBoostExpiresAt) : null;
  }
  if (body.deckPresets !== undefined) data.deckPresets = body.deckPresets;

  const player = await prisma.player.update({
    where: { discordId: user.id },
    data,
    include: { cards: true },
  });
  sendJson(res, 200, playerToClientState(player, player.cards));
}

// ─── Friends API ───────────────────────────────────────────────────────────────

function toPublicPlayer(p) {
  return { id: p.id, discordId: p.discordId, username: p.username, avatar: p.avatar || null };
}

async function createNotification(tx, playerId, type, title, body = null, data = null) {
  return tx.notification.create({
    data: {
      playerId,
      type,
      title,
      body,
      data,
    },
  });
}

async function handleGetNotifications(req, res) {
  const user = await requireAuth(req, res);
  if (!user) return;

  const url = new URL(`http://localhost${req.url}`);
  const limit = Math.min(50, Math.max(1, Number(url.searchParams.get("limit") || 30)));

  const me = await prisma.player.findUnique({ where: { discordId: user.id } });
  if (!me) return sendJson(res, 404, { error: "Player not found" });

  const rows = await prisma.notification.findMany({
    where: { playerId: me.id },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return sendJson(res, 200, {
    notifications: rows.map((n) => ({
      id: n.id,
      type: n.type,
      title: n.title,
      body: n.body,
      data: n.data,
      createdAt: n.createdAt.getTime(),
      readAt: n.readAt ? n.readAt.getTime() : null,
    })),
  });
}

async function handleGetUnreadCount(req, res) {
  const user = await requireAuth(req, res);
  if (!user) return;

  const me = await prisma.player.findUnique({ where: { discordId: user.id } });
  if (!me) return sendJson(res, 404, { error: "Player not found" });

  const count = await prisma.notification.count({
    where: { playerId: me.id, readAt: null },
  });

  return sendJson(res, 200, { unread: count });
}

async function handleMarkNotificationsRead(req, res) {
  const user = await requireAuth(req, res);
  if (!user) return;

  const body = await readJsonBody(req);
  const ids = Array.isArray(body.ids) ? body.ids.map(Number).filter(Number.isFinite) : [];

  const me = await prisma.player.findUnique({ where: { discordId: user.id } });
  if (!me) return sendJson(res, 404, { error: "Player not found" });

  if (ids.length === 0) {
    await prisma.notification.updateMany({
      where: { playerId: me.id, readAt: null },
      data: { readAt: new Date() },
    });
    return sendJson(res, 200, { ok: true });
  }

  await prisma.notification.updateMany({
    where: { playerId: me.id, id: { in: ids } },
    data: { readAt: new Date() },
  });
  return sendJson(res, 200, { ok: true });
}

async function handleGetFriends(req, res) {
  const user = await requireAuth(req, res);
  if (!user) return;

  const me = await prisma.player.findUnique({ where: { discordId: user.id } });
  if (!me) return sendJson(res, 404, { error: "Player not found" });

  const [accepted, incoming, outgoing] = await Promise.all([
    prisma.friendship.findMany({
      where: { playerId: me.id, status: "accepted" },
      include: { friend: true },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.friendship.findMany({
      where: { friendPlayerId: me.id, status: "pending" },
      include: { player: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.friendship.findMany({
      where: { playerId: me.id, status: "pending" },
      include: { friend: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return sendJson(res, 200, {
    accepted: accepted.map((f) => ({ id: f.id, friend: toPublicPlayer(f.friend), createdAt: f.createdAt.getTime() })),
    incoming: incoming.map((f) => ({ id: f.id, from: toPublicPlayer(f.player), createdAt: f.createdAt.getTime() })),
    outgoing: outgoing.map((f) => ({ id: f.id, to: toPublicPlayer(f.friend), createdAt: f.createdAt.getTime() })),
  });
}

async function handleSearchUsers(req, res) {
  const user = await requireAuth(req, res);
  if (!user) return;

  const url = new URL(`http://localhost${req.url}`);
  const q = (url.searchParams.get("q") || "").trim();
  if (q.length < 2) return sendJson(res, 200, { users: [] });

  const me = await prisma.player.findUnique({ where: { discordId: user.id } });
  if (!me) return sendJson(res, 404, { error: "Player not found" });

  const results = await prisma.player.findMany({
    where: {
      AND: [
        { id: { not: me.id } },
        { username: { contains: q, mode: "insensitive" } },
      ],
    },
    take: 8,
    orderBy: { username: "asc" },
  });

  return sendJson(res, 200, { users: results.map(toPublicPlayer) });
}

async function handleFriendRequest(req, res) {
  const user = await requireAuth(req, res);
  if (!user) return;

  const body = await readJsonBody(req);
  const q = String(body.usernameOrDiscordId || "").trim();
  if (!q) return sendJson(res, 400, { error: "usernameOrDiscordId required" });

  const me = await prisma.player.findUnique({ where: { discordId: user.id } });
  if (!me) return sendJson(res, 404, { error: "Player not found" });

  // Prefer discordId exact match when the query looks like an id.
  const looksLikeId = /^[0-9]{10,25}$/.test(q);
  const target = looksLikeId
    ? await prisma.player.findUnique({ where: { discordId: q } })
    : await prisma.player.findFirst({
        where: { username: { equals: q, mode: "insensitive" } },
      }) || await prisma.player.findFirst({
        where: { username: { contains: q, mode: "insensitive" } },
      });

  if (!target) return sendJson(res, 404, { error: "User not found" });
  if (target.id === me.id) return sendJson(res, 400, { error: "Cannot friend yourself" });

  const existing = await prisma.friendship.findUnique({
    where: { playerId_friendPlayerId: { playerId: me.id, friendPlayerId: target.id } },
  });
  if (existing) {
    return sendJson(res, 200, { ok: true, status: existing.status, friend: toPublicPlayer(target) });
  }

  // If they already requested you, accept immediately.
  const reverse = await prisma.friendship.findUnique({
    where: { playerId_friendPlayerId: { playerId: target.id, friendPlayerId: me.id } },
  });
  if (reverse && reverse.status === "pending") {
    await prisma.$transaction(async (tx) => {
      await tx.friendship.update({ where: { id: reverse.id }, data: { status: "accepted" } });
      await tx.friendship.upsert({
        where: { playerId_friendPlayerId: { playerId: me.id, friendPlayerId: target.id } },
        create: { playerId: me.id, friendPlayerId: target.id, status: "accepted" },
        update: { status: "accepted" },
      });

      await createNotification(
        tx,
        target.id,
        "friend_accepted",
        `${me.username} accepted your friend request`,
        null,
        { fromPlayerId: me.id, friendshipId: reverse.id }
      );
    });
    return sendJson(res, 200, { ok: true, status: "accepted", friend: toPublicPlayer(target) });
  }

  const reqRow = await prisma.$transaction(async (tx) => {
    const created = await tx.friendship.create({
      data: { playerId: me.id, friendPlayerId: target.id, status: "pending" },
    });

    await createNotification(
      tx,
      target.id,
      "friend_request",
      `Friend request from ${me.username}`,
      "Open Friends to accept or decline.",
      { fromPlayerId: me.id, friendshipId: created.id }
    );

    return created;
  });
  return sendJson(res, 200, { ok: true, status: reqRow.status, requestId: reqRow.id, friend: toPublicPlayer(target) });
}

async function handleFriendRespond(req, res) {
  const user = await requireAuth(req, res);
  if (!user) return;

  const body = await readJsonBody(req);
  const requestId = Number(body.requestId);
  const accept = !!body.accept;
  if (!Number.isFinite(requestId)) return sendJson(res, 400, { error: "requestId required" });

  const me = await prisma.player.findUnique({ where: { discordId: user.id } });
  if (!me) return sendJson(res, 404, { error: "Player not found" });

  const reqRow = await prisma.friendship.findUnique({ where: { id: requestId }, include: { player: true, friend: true } });
  if (!reqRow || reqRow.friendPlayerId !== me.id) return sendJson(res, 404, { error: "Friend request not found" });
  if (reqRow.status !== "pending") return sendJson(res, 400, { error: "Request is not pending" });

  if (!accept) {
    await prisma.$transaction(async (tx) => {
      await tx.friendship.delete({ where: { id: reqRow.id } });
      await createNotification(
        tx,
        reqRow.playerId,
        "friend_accepted",
        `${me.username} declined your friend request`,
        null,
        { toPlayerId: me.id, friendshipId: reqRow.id }
      );
    });
    return sendJson(res, 200, { ok: true, status: "denied" });
  }

  await prisma.$transaction(async (tx) => {
    await tx.friendship.update({ where: { id: reqRow.id }, data: { status: "accepted" } });
    await tx.friendship.upsert({
      where: { playerId_friendPlayerId: { playerId: me.id, friendPlayerId: reqRow.playerId } },
      create: { playerId: me.id, friendPlayerId: reqRow.playerId, status: "accepted" },
      update: { status: "accepted" },
    });

    await createNotification(
      tx,
      reqRow.playerId,
      "friend_accepted",
      `${me.username} accepted your friend request`,
      null,
      { toPlayerId: me.id, friendshipId: reqRow.id }
    );
  });

  return sendJson(res, 200, { ok: true, status: "accepted", friend: toPublicPlayer(reqRow.player) });
}

async function handleFriendRemove(req, res) {
  const user = await requireAuth(req, res);
  if (!user) return;

  const body = await readJsonBody(req);
  const friendIdRaw = body.friendId;
  if (friendIdRaw === undefined || friendIdRaw === null) return sendJson(res, 400, { error: "friendId required" });

  const me = await prisma.player.findUnique({ where: { discordId: user.id } });
  if (!me) return sendJson(res, 404, { error: "Player not found" });

  let target = null;
  if (typeof friendIdRaw === "number" || /^[0-9]+$/.test(String(friendIdRaw))) {
    const n = Number(friendIdRaw);
    if (Number.isFinite(n)) target = await prisma.player.findUnique({ where: { id: n } });
  }
  if (!target) {
    const q = String(friendIdRaw).trim();
    if (/^[0-9]{10,25}$/.test(q)) target = await prisma.player.findUnique({ where: { discordId: q } });
  }
  if (!target) return sendJson(res, 404, { error: "Friend not found" });

  await prisma.friendship.deleteMany({
    where: {
      OR: [
        { playerId: me.id, friendPlayerId: target.id },
        { playerId: target.id, friendPlayerId: me.id },
      ],
    },
  });

  return sendJson(res, 200, { ok: true });
}

async function handleGetFriendTradeableCards(req, res, friendId) {
  const user = await requireAuth(req, res);
  if (!user) return;

  const me = await prisma.player.findUnique({ where: { discordId: user.id } });
  if (!me) return sendJson(res, 404, { error: "Player not found" });

  const friend = await prisma.player.findUnique({ where: { id: friendId } });
  if (!friend) return sendJson(res, 404, { error: "Friend not found" });

  const friendship = await prisma.friendship.findFirst({
    where: {
      OR: [
        { playerId: me.id, friendPlayerId: friend.id, status: "accepted" },
        { playerId: friend.id, friendPlayerId: me.id, status: "accepted" },
      ],
    },
  });
  if (!friendship) return sendJson(res, 403, { error: "Not friends" });

  if (!friend.shareCollectionWithFriends) {
    return sendJson(res, 403, { error: "Friend has not enabled collection sharing" });
  }

  const rows = await prisma.cardProgress.findMany({
    where: { playerId: friend.id },
    select: { cardId: true },
  });

  // Only return tradeable cards.
  const cardIds = rows.map((r) => r.cardId).filter((id) => !UNTRADEABLE_CARD_IDS.has(id));
  return sendJson(res, 200, { cardIds });
}

// ─── Trading API ───────────────────────────────────────────────────────────────

const UNTRADEABLE_CARD_IDS = new Set(
  String(process.env.UNTRADEABLE_CARD_IDS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
);
for (const e of SEASONAL_EVENTS) {
  for (const id of e.seasonalCardIds) UNTRADEABLE_CARD_IDS.add(id);
}

function assertTradeable(cardId) {
  if (UNTRADEABLE_CARD_IDS.has(cardId)) {
    const err = new Error(`Card is untradeable: ${cardId}`);
    err.statusCode = 400;
    throw err;
  }
}

async function handleGetTrades(req, res) {
  const user = await requireAuth(req, res);
  if (!user) return;

  const me = await prisma.player.findUnique({ where: { discordId: user.id } });
  if (!me) return sendJson(res, 404, { error: "Player not found" });

  const trades = await prisma.trade.findMany({
    where: {
      OR: [{ fromPlayerId: me.id }, { toPlayerId: me.id }],
    },
    include: {
      fromPlayer: true,
      toPlayer: true,
      items: true,
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return sendJson(res, 200, {
    trades: trades.map((t) => ({
      id: t.id,
      status: t.status,
      createdAt: t.createdAt.getTime(),
      from: toPublicPlayer(t.fromPlayer),
      to: toPublicPlayer(t.toPlayer),
      taxGold: t.taxGold,
      taxStardust: t.taxStardust,
      message: t.message || null,
      offered: t.items.filter((i) => i.side === "from").map((i) => ({ cardId: i.cardId, quantity: i.quantity })),
      requested: t.items.filter((i) => i.side === "to").map((i) => ({ cardId: i.cardId, quantity: i.quantity })),
    })),
  });
}

async function handleCreateTrade(req, res) {
  const user = await requireAuth(req, res);
  if (!user) return;

  const body = await readJsonBody(req);
  const toPlayerId = Number(body.toPlayerId);
  const offeredCardIds = Array.isArray(body.offeredCardIds) ? body.offeredCardIds.map(String) : [];
  const requestedCardIds = Array.isArray(body.requestedCardIds) ? body.requestedCardIds.map(String) : [];
  const taxGold = Math.max(0, Math.floor(Number(body.taxGold) || 0));
  const taxStardust = Math.max(0, Math.floor(Number(body.taxStardust) || 0));
  const message = body.message ? String(body.message).slice(0, 200) : null;

  if (!Number.isFinite(toPlayerId)) return sendJson(res, 400, { error: "toPlayerId required" });
  if (offeredCardIds.length === 0 && requestedCardIds.length === 0) return sendJson(res, 400, { error: "No items in trade" });

  const me = await prisma.player.findUnique({ where: { discordId: user.id } });
  if (!me) return sendJson(res, 404, { error: "Player not found" });
  if (me.id === toPlayerId) return sendJson(res, 400, { error: "Cannot trade with yourself" });

  const other = await prisma.player.findUnique({ where: { id: toPlayerId } });
  if (!other) return sendJson(res, 404, { error: "Target player not found" });

  for (const id of [...offeredCardIds, ...requestedCardIds]) assertTradeable(id);

  // Validate both sides actually own the cards being traded.
  // Note: a single owned copy is enough (dupes are preferred during transfer).
  const uniqueOffered = [...new Set(offeredCardIds)];
  const uniqueRequested = [...new Set(requestedCardIds)];

  const [meOwnedRows, otherOwnedRows] = await Promise.all([
    uniqueOffered.length
      ? prisma.cardProgress.findMany({
          where: { playerId: me.id, cardId: { in: uniqueOffered } },
          select: { cardId: true },
        })
      : Promise.resolve([]),
    uniqueRequested.length
      ? prisma.cardProgress.findMany({
          where: { playerId: other.id, cardId: { in: uniqueRequested } },
          select: { cardId: true },
        })
      : Promise.resolve([]),
  ]);

  const meOwned = new Set(meOwnedRows.map((r) => r.cardId));
  const otherOwned = new Set(otherOwnedRows.map((r) => r.cardId));

  for (const cardId of uniqueOffered) {
    if (!meOwned.has(cardId)) return sendJson(res, 400, { error: `Sender does not own: ${cardId}` });
  }
  for (const cardId of uniqueRequested) {
    if (!otherOwned.has(cardId)) return sendJson(res, 400, { error: `Recipient does not own: ${cardId}` });
  }

  const trade = await prisma.$transaction(async (tx) => {
    const created = await tx.trade.create({
      data: {
        fromPlayerId: me.id,
        toPlayerId,
        taxGold,
        taxStardust,
        message,
        items: {
          create: [
            ...offeredCardIds.map((cardId) => ({ side: "from", cardId, quantity: 1 })),
            ...requestedCardIds.map((cardId) => ({ side: "to", cardId, quantity: 1 })),
          ],
        },
      },
      include: { items: true, fromPlayer: true, toPlayer: true },
    });

    await createNotification(
      tx,
      toPlayerId,
      "trade_received",
      `New trade from ${me.username}`,
      created.message || "Open Trading to review and accept/cancel.",
      { tradeId: created.id, fromPlayerId: me.id }
    );

    return created;
  });

  return sendJson(res, 200, { ok: true, tradeId: trade.id });
}

async function handleCancelTrade(req, res, tradeId) {
  const user = await requireAuth(req, res);
  if (!user) return;

  const me = await prisma.player.findUnique({ where: { discordId: user.id } });
  if (!me) return sendJson(res, 404, { error: "Player not found" });

  const t = await prisma.trade.findUnique({ where: { id: tradeId } });
  if (!t) return sendJson(res, 404, { error: "Trade not found" });
  if (t.fromPlayerId !== me.id) return sendJson(res, 403, { error: "Only the sender can cancel" });
  if (t.status !== "open") return sendJson(res, 400, { error: "Trade is not open" });

  await prisma.$transaction(async (tx) => {
    await tx.trade.update({ where: { id: tradeId }, data: { status: "cancelled" } });
    await createNotification(
      tx,
      t.toPlayerId,
      "trade_cancelled",
      `Trade cancelled by ${me.username}`,
      null,
      { tradeId: t.id, fromPlayerId: me.id }
    );
  });
  return sendJson(res, 200, { ok: true });
}

async function transferOneCardCopy(tx, fromPlayerId, toPlayerId, cardId) {
  assertTradeable(cardId);

  const fromRow = await tx.cardProgress.findUnique({
    where: { playerId_cardId: { playerId: fromPlayerId, cardId } },
  });
  if (!fromRow) {
    const err = new Error(`Sender does not own: ${cardId}`);
    err.statusCode = 400;
    throw err;
  }

  const toRow = await tx.cardProgress.findUnique({
    where: { playerId_cardId: { playerId: toPlayerId, cardId } },
  });

  const rarity = getCardRarity(cardId);

  // Prefer trading a duplicate copy when available.
  if (fromRow.dupeCount > 0) {
    const newDupe = fromRow.dupeCount - 1;
    const stars = calculateStars(newDupe, rarity);
    await tx.cardProgress.update({
      where: { id: fromRow.id },
      data: { dupeCount: newDupe, goldStars: stars.goldStars, redStars: stars.redStars },
    });

    if (toRow) {
      const toNewDupe = toRow.dupeCount + 1;
      const toStars = calculateStars(toNewDupe, rarity);
      await tx.cardProgress.update({
        where: { id: toRow.id },
        data: { dupeCount: toNewDupe, goldStars: toStars.goldStars, redStars: toStars.redStars },
      });
    } else {
      await tx.cardProgress.create({
        data: {
          playerId: toPlayerId,
          cardId,
          level: 1,
          xp: 0,
          prestigeLevel: 0,
          dupeCount: 0,
          goldStars: 0,
          redStars: 0,
        },
      });
    }
    return;
  }

  // Otherwise transfer the base card progress (if receiver has it, convert to dupe).
  if (toRow) {
    const toNewDupe = toRow.dupeCount + 1;
    const toStars = calculateStars(toNewDupe, rarity);
    await tx.cardProgress.update({
      where: { id: toRow.id },
      data: { dupeCount: toNewDupe, goldStars: toStars.goldStars, redStars: toStars.redStars },
    });
    await tx.cardProgress.delete({ where: { id: fromRow.id } });
  } else {
    await tx.cardProgress.update({
      where: { id: fromRow.id },
      data: { playerId: toPlayerId },
    });
  }
}

async function handleAcceptTrade(req, res, tradeId) {
  const user = await requireAuth(req, res);
  if (!user) return;

  const me = await prisma.player.findUnique({ where: { discordId: user.id } });
  if (!me) return sendJson(res, 404, { error: "Player not found" });

  const trade = await prisma.trade.findUnique({
    where: { id: tradeId },
    include: { items: true },
  });
  if (!trade) return sendJson(res, 404, { error: "Trade not found" });
  if (trade.toPlayerId !== me.id) return sendJson(res, 403, { error: "Only the recipient can accept" });
  if (trade.status !== "open") return sendJson(res, 400, { error: "Trade is not open" });

  try {
    await prisma.$transaction(async (tx) => {
      const fromPlayer = await tx.player.findUnique({ where: { id: trade.fromPlayerId } });
      const toPlayer = await tx.player.findUnique({ where: { id: trade.toPlayerId } });
      if (!fromPlayer || !toPlayer) throw new Error("Player not found");

      if (fromPlayer.gold < trade.taxGold || toPlayer.gold < trade.taxGold) {
        const err = new Error("Not enough gold to pay trade tax");
        err.statusCode = 400;
        throw err;
      }
      if (fromPlayer.stardust < trade.taxStardust || toPlayer.stardust < trade.taxStardust) {
        const err = new Error("Not enough stardust to pay trade tax");
        err.statusCode = 400;
        throw err;
      }

      // Apply tax to both parties.
      if (trade.taxGold || trade.taxStardust) {
        await tx.player.update({
          where: { id: fromPlayer.id },
          data: { gold: fromPlayer.gold - trade.taxGold, stardust: fromPlayer.stardust - trade.taxStardust },
        });
        await tx.player.update({
          where: { id: toPlayer.id },
          data: { gold: toPlayer.gold - trade.taxGold, stardust: toPlayer.stardust - trade.taxStardust },
        });
      }

      // Execute swaps.
      const offered = trade.items.filter((i) => i.side === "from");
      const requested = trade.items.filter((i) => i.side === "to");

      for (const item of offered) {
        for (let i = 0; i < (item.quantity || 1); i++) {
          await transferOneCardCopy(tx, trade.fromPlayerId, trade.toPlayerId, item.cardId);
        }
      }
      for (const item of requested) {
        for (let i = 0; i < (item.quantity || 1); i++) {
          await transferOneCardCopy(tx, trade.toPlayerId, trade.fromPlayerId, item.cardId);
        }
      }

      await tx.trade.update({ where: { id: trade.id }, data: { status: "accepted" } });

      await createNotification(
        tx,
        trade.fromPlayerId,
        "trade_accepted",
        `${toPlayer.username} accepted your trade`,
        null,
        { tradeId: trade.id, toPlayerId: trade.toPlayerId }
      );
    });
  } catch (e) {
    const code = e?.statusCode || 500;
    return sendJson(res, code, { error: e?.message || "Trade accept failed" });
  }

  const updated = await prisma.player.findUnique({
    where: { discordId: user.id },
    include: { cards: true },
  });
  return sendJson(res, 200, { ok: true, state: playerToClientState(updated, updated.cards) });
}

// ─── Marketplace API ───────────────────────────────────────────────────────────

async function handleGetMarket(req, res) {
  const url = new URL(`http://localhost${req.url}`);
  const status = url.searchParams.get("status") || "open";

  const listings = await prisma.marketplaceListing.findMany({
    where: { status },
    include: { seller: true, items: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return sendJson(res, 200, {
    listings: listings.map((l) => ({
      id: l.id,
      status: l.status,
      createdAt: l.createdAt.getTime(),
      seller: toPublicPlayer(l.seller),
      taxGold: l.taxGold,
      taxStardust: l.taxStardust,
      note: l.note || null,
      offered: l.items.filter((i) => i.side === "from").map((i) => ({ cardId: i.cardId, quantity: i.quantity })),
      requested: l.items.filter((i) => i.side === "to").map((i) => ({ cardId: i.cardId, quantity: i.quantity })),
    })),
  });
}

async function handleCreateListing(req, res) {
  const user = await requireAuth(req, res);
  if (!user) return;

  const body = await readJsonBody(req);
  const offeredCardIds = Array.isArray(body.offeredCardIds) ? body.offeredCardIds.map(String) : [];
  const requestedCardIds = Array.isArray(body.requestedCardIds) ? body.requestedCardIds.map(String) : [];
  const taxGold = Math.max(0, Math.floor(Number(body.taxGold) || 0));
  const taxStardust = Math.max(0, Math.floor(Number(body.taxStardust) || 0));
  const note = body.note ? String(body.note).slice(0, 200) : null;

  if (offeredCardIds.length === 0 || requestedCardIds.length === 0) {
    return sendJson(res, 400, { error: "offeredCardIds and requestedCardIds required" });
  }

  const me = await prisma.player.findUnique({ where: { discordId: user.id } });
  if (!me) return sendJson(res, 404, { error: "Player not found" });

  for (const id of [...offeredCardIds, ...requestedCardIds]) assertTradeable(id);

  const listing = await prisma.marketplaceListing.create({
    data: {
      sellerPlayerId: me.id,
      taxGold,
      taxStardust,
      note,
      items: {
        create: [
          ...offeredCardIds.map((cardId) => ({ side: "from", cardId, quantity: 1 })),
          ...requestedCardIds.map((cardId) => ({ side: "to", cardId, quantity: 1 })),
        ],
      },
    },
  });

  return sendJson(res, 200, { ok: true, listingId: listing.id });
}

async function handleCancelListing(req, res, listingId) {
  const user = await requireAuth(req, res);
  if (!user) return;

  const me = await prisma.player.findUnique({ where: { discordId: user.id } });
  if (!me) return sendJson(res, 404, { error: "Player not found" });

  const listing = await prisma.marketplaceListing.findUnique({ where: { id: listingId } });
  if (!listing) return sendJson(res, 404, { error: "Listing not found" });
  if (listing.sellerPlayerId !== me.id) return sendJson(res, 403, { error: "Only seller can cancel" });
  if (listing.status !== "open") return sendJson(res, 400, { error: "Listing is not open" });

  await prisma.marketplaceListing.update({ where: { id: listingId }, data: { status: "cancelled" } });
  return sendJson(res, 200, { ok: true });
}

async function handleBuyListing(req, res, listingId) {
  const user = await requireAuth(req, res);
  if (!user) return;

  const buyer = await prisma.player.findUnique({ where: { discordId: user.id } });
  if (!buyer) return sendJson(res, 404, { error: "Player not found" });

  const listing = await prisma.marketplaceListing.findUnique({
    where: { id: listingId },
    include: { items: true },
  });
  if (!listing) return sendJson(res, 404, { error: "Listing not found" });
  if (listing.status !== "open") return sendJson(res, 400, { error: "Listing is not open" });
  if (listing.sellerPlayerId === buyer.id) return sendJson(res, 400, { error: "Cannot buy your own listing" });

  try {
    await prisma.$transaction(async (tx) => {
      const fresh = await tx.marketplaceListing.findUnique({ where: { id: listing.id } });
      if (!fresh || fresh.status !== "open") {
        const err = new Error("Listing is no longer available");
        err.statusCode = 400;
        throw err;
      }

      const seller = await tx.player.findUnique({ where: { id: listing.sellerPlayerId } });
      const buyerRow = await tx.player.findUnique({ where: { id: buyer.id } });
      if (!seller || !buyerRow) throw new Error("Player not found");

      if (seller.gold < listing.taxGold || buyerRow.gold < listing.taxGold) {
        const err = new Error("Not enough gold to pay market tax");
        err.statusCode = 400;
        throw err;
      }
      if (seller.stardust < listing.taxStardust || buyerRow.stardust < listing.taxStardust) {
        const err = new Error("Not enough stardust to pay market tax");
        err.statusCode = 400;
        throw err;
      }

      if (listing.taxGold || listing.taxStardust) {
        await tx.player.update({
          where: { id: seller.id },
          data: { gold: seller.gold - listing.taxGold, stardust: seller.stardust - listing.taxStardust },
        });
        await tx.player.update({
          where: { id: buyerRow.id },
          data: { gold: buyerRow.gold - listing.taxGold, stardust: buyerRow.stardust - listing.taxStardust },
        });
      }

      const offered = listing.items.filter((i) => i.side === "from");
      const requested = listing.items.filter((i) => i.side === "to");

      for (const item of offered) {
        for (let i = 0; i < (item.quantity || 1); i++) {
          await transferOneCardCopy(tx, listing.sellerPlayerId, buyerRow.id, item.cardId);
        }
      }
      for (const item of requested) {
        for (let i = 0; i < (item.quantity || 1); i++) {
          await transferOneCardCopy(tx, buyerRow.id, listing.sellerPlayerId, item.cardId);
        }
      }

      await tx.marketplaceListing.update({ where: { id: listing.id }, data: { status: "fulfilled" } });

      await createNotification(
        tx,
        listing.sellerPlayerId,
        "market_listing_sold",
        `Marketplace sale: your listing was bought`,
        `Bought by ${buyerRow.username}.`,
        { listingId: listing.id, buyerPlayerId: buyerRow.id }
      );
    });
  } catch (e) {
    const code = e?.statusCode || 500;
    return sendJson(res, code, { error: e?.message || "Buy failed" });
  }

  const updated = await prisma.player.findUnique({
    where: { discordId: user.id },
    include: { cards: true },
  });
  return sendJson(res, 200, { ok: true, state: playerToClientState(updated, updated.cards) });
}

// ─── PvP (async ranked) API ────────────────────────────────────────────────────

const DEFAULT_PVP_SEASON_ID = "season-01";

async function getOrCreateRating(tx, playerId, seasonId) {
  const existing = await tx.pvPRating.findUnique({
    where: { playerId_seasonId: { playerId, seasonId } },
  });
  if (existing) return existing;
  return tx.pvPRating.create({ data: { playerId, seasonId, mmr: 1000, rankTier: "Bronze", gamesPlayed: 0 } });
}

function expectedScore(a, b) {
  return 1 / (1 + Math.pow(10, (b - a) / 400));
}

function applyElo(aMmr, bMmr, outcomeA, k = 32) {
  const ea = expectedScore(aMmr, bMmr);
  const eb = expectedScore(bMmr, aMmr);
  const na = Math.round(aMmr + k * (outcomeA - ea));
  const nb = Math.round(bMmr + k * ((1 - outcomeA) - eb));
  return { na, nb };
}

async function handleSetRankedDeck(req, res) {
  const user = await requireAuth(req, res);
  if (!user) return;

  const body = await readJsonBody(req);
  const seasonId = String(body.seasonId || DEFAULT_PVP_SEASON_ID);
  const deckCardIds = Array.isArray(body.deckCardIds) ? body.deckCardIds.map(String) : null;
  if (!deckCardIds || deckCardIds.length === 0) return sendJson(res, 400, { error: "deckCardIds required" });

  const me = await prisma.player.findUnique({ where: { discordId: user.id } });
  if (!me) return sendJson(res, 404, { error: "Player not found" });

  await prisma.pvPDeckSnapshot.upsert({
    where: { playerId_seasonId: { playerId: me.id, seasonId } },
    create: { playerId: me.id, seasonId, deckCardIds },
    update: { deckCardIds },
  });

  // Ensure rating exists.
  await prisma.pvPRating.upsert({
    where: { playerId_seasonId: { playerId: me.id, seasonId } },
    create: { playerId: me.id, seasonId, mmr: 1000, rankTier: "Bronze", gamesPlayed: 0 },
    update: {},
  });

  return sendJson(res, 200, { ok: true });
}

async function handleQueueAsync(req, res) {
  const user = await requireAuth(req, res);
  if (!user) return;

  const body = await readJsonBody(req);
  const seasonId = String(body.seasonId || DEFAULT_PVP_SEASON_ID);

  const me = await prisma.player.findUnique({ where: { discordId: user.id } });
  if (!me) return sendJson(res, 404, { error: "Player not found" });

  const mySnap = await prisma.pvPDeckSnapshot.findUnique({
    where: { playerId_seasonId: { playerId: me.id, seasonId } },
  });
  if (!mySnap) return sendJson(res, 400, { error: "Set a ranked deck first" });

  const myRating = await prisma.pvPRating.findUnique({
    where: { playerId_seasonId: { playerId: me.id, seasonId } },
  }) ?? { mmr: 1000 };

  // Find best opponent by closest MMR who has a snapshot.
  const candidates = await prisma.pvPRating.findMany({
    where: {
      seasonId,
      playerId: { not: me.id },
      player: { pvpDeckSnapshots: { some: { seasonId } } },
    },
    include: { player: true },
    take: 50,
  });
  if (candidates.length === 0) return sendJson(res, 404, { error: "No opponents available yet" });

  candidates.sort((a, b) => Math.abs(a.mmr - myRating.mmr) - Math.abs(b.mmr - myRating.mmr));
  const opponent = candidates[0];

  const seed = Math.floor(Math.random() * 2 ** 31);
  const match = await prisma.pvPMatch.create({
    data: {
      type: "async",
      status: "pending",
      playerAId: me.id,
      playerBId: opponent.playerId,
      seasonId,
      seed,
    },
  });

  return sendJson(res, 200, { ok: true, matchId: match.id, opponent: toPublicPlayer(opponent.player) });
}

/** Shared completion for async ranked matches (server sim or client-played battle). */
async function finalizeAsyncMatchWithResult(match, resultPayload) {
  const seasonId = match.seasonId || DEFAULT_PVP_SEASON_ID;
  const winner = resultPayload.winner;
  const outcomeA = winner === "draw" ? 0.5 : winner === "playerA" ? 1 : 0;

  await prisma.$transaction(async (tx) => {
    const ra = await getOrCreateRating(tx, match.playerAId, seasonId);
    const rb = await getOrCreateRating(tx, match.playerBId, seasonId);
    const { na, nb } = applyElo(ra.mmr, rb.mmr, outcomeA);

    await tx.pvPRating.update({
      where: { id: ra.id },
      data: { mmr: na, gamesPlayed: { increment: 1 } },
    });
    await tx.pvPRating.update({
      where: { id: rb.id },
      data: { mmr: nb, gamesPlayed: { increment: 1 } },
    });

    const aUpdate = winner === "draw" ? { draws: { increment: 1 } } : winner === "playerA" ? { wins: { increment: 1 } } : { losses: { increment: 1 } };
    const bUpdate = winner === "draw" ? { draws: { increment: 1 } } : winner === "playerB" ? { wins: { increment: 1 } } : { losses: { increment: 1 } };
    await tx.battleStat.upsert({
      where: { playerId: match.playerAId },
      create: { playerId: match.playerAId, wins: winner === "playerA" ? 1 : 0, losses: winner === "playerB" ? 1 : 0, draws: winner === "draw" ? 1 : 0, goldEarned: 0, lastBattleAt: new Date() },
      update: { ...aUpdate, lastBattleAt: new Date() },
    });
    await tx.battleStat.upsert({
      where: { playerId: match.playerBId },
      create: { playerId: match.playerBId, wins: winner === "playerB" ? 1 : 0, losses: winner === "playerA" ? 1 : 0, draws: winner === "draw" ? 1 : 0, goldEarned: 0, lastBattleAt: new Date() },
      update: { ...bUpdate, lastBattleAt: new Date() },
    });

    await tx.pvPMatch.update({
      where: { id: match.id },
      data: { status: "completed", result: resultPayload },
    });

    await createNotification(
      tx,
      match.playerAId,
      "pvp_match_ready",
      "Ranked PvP match resolved",
      "Open PvP → History to view the result.",
      { matchId: match.id, type: "async", seasonId }
    );
    await createNotification(
      tx,
      match.playerBId,
      "pvp_match_ready",
      "Ranked PvP match resolved",
      "Open PvP → History to view the result.",
      { matchId: match.id, type: "async", seasonId }
    );
  });
}

/** GET — queue starter loads both decks to play the real battle vs AI (opponent deck). */
async function handleGetAsyncPlay(req, res, matchId) {
  const user = await requireAuth(req, res);
  if (!user) return;

  const me = await prisma.player.findUnique({ where: { discordId: user.id } });
  if (!me) return sendJson(res, 404, { error: "Player not found" });

  const match = await prisma.pvPMatch.findUnique({
    where: { id: matchId },
    include: { playerA: true, playerB: true },
  });
  if (!match) return sendJson(res, 404, { error: "Match not found" });
  if (match.type !== "async") return sendJson(res, 400, { error: "Not an async match" });
  if (match.status !== "pending") return sendJson(res, 400, { error: "Match is not pending" });
  if (match.playerAId !== me.id) {
    return sendJson(res, 403, { error: "Only the player who queued can fight this ranked match" });
  }

  const seasonId = match.seasonId || DEFAULT_PVP_SEASON_ID;
  const [snapA, snapB] = await Promise.all([
    prisma.pvPDeckSnapshot.findUnique({ where: { playerId_seasonId: { playerId: match.playerAId, seasonId } } }),
    prisma.pvPDeckSnapshot.findUnique({ where: { playerId_seasonId: { playerId: match.playerBId, seasonId } } }),
  ]);
  if (!snapA || !snapB) return sendJson(res, 400, { error: "Missing ranked deck snapshot" });

  return sendJson(res, 200, {
    ok: true,
    matchId: match.id,
    opponent: toPublicPlayer(match.playerB),
    myDeckCardIds: snapA.deckCardIds,
    opponentDeckCardIds: snapB.deckCardIds,
  });
}

/** POST — queue starter submits outcome after playing BattleArena vs AI (opponent deck). */
async function handleSubmitAsyncBattle(req, res, matchId) {
  const user = await requireAuth(req, res);
  if (!user) return;

  const body = await readJsonBody(req);
  const won = !!body.won;
  const isDraw = !!body.draw;
  const turnCount = Number(body.turnCount) || 0;

  const me = await prisma.player.findUnique({ where: { discordId: user.id } });
  if (!me) return sendJson(res, 404, { error: "Player not found" });

  const match = await prisma.pvPMatch.findUnique({ where: { id: matchId } });
  if (!match) return sendJson(res, 404, { error: "Match not found" });
  if (match.type !== "async") return sendJson(res, 400, { error: "Not an async match" });
  if (match.playerAId !== me.id) {
    return sendJson(res, 403, { error: "Only the player who queued can submit this ranked battle" });
  }
  if (match.status !== "pending") return sendJson(res, 400, { error: "Match is not pending" });

  const winner = isDraw ? "draw" : won ? "playerA" : "playerB";
  const seasonId = match.seasonId || DEFAULT_PVP_SEASON_ID;

  const resultPayload = {
    winner,
    turnCount,
    seasonId,
    kind: "ranked_client",
    resolvedAt: Date.now(),
  };

  await finalizeAsyncMatchWithResult(match, resultPayload);

  return sendJson(res, 200, { ok: true, result: resultPayload });
}

async function handleResolveAsync(req, res, matchId) {
  const user = await requireAuth(req, res);
  if (!user) return;

  const me = await prisma.player.findUnique({ where: { discordId: user.id } });
  if (!me) return sendJson(res, 404, { error: "Player not found" });

  const match = await prisma.pvPMatch.findUnique({ where: { id: matchId } });
  if (!match) return sendJson(res, 404, { error: "Match not found" });
  if (match.type !== "async") return sendJson(res, 400, { error: "Not an async match" });
  if (match.playerAId !== me.id && match.playerBId !== me.id) return sendJson(res, 403, { error: "Not your match" });
  if (match.status === "completed") return sendJson(res, 200, { ok: true, result: match.result });
  if (match.status !== "pending") return sendJson(res, 400, { error: "Match is not pending" });

  const seasonId = match.seasonId || DEFAULT_PVP_SEASON_ID;

  const [snapA, snapB] = await Promise.all([
    prisma.pvPDeckSnapshot.findUnique({ where: { playerId_seasonId: { playerId: match.playerAId, seasonId } } }),
    prisma.pvPDeckSnapshot.findUnique({ where: { playerId_seasonId: { playerId: match.playerBId, seasonId } } }),
  ]);
  if (!snapA || !snapB) return sendJson(res, 400, { error: "Missing ranked deck snapshot" });

  const sim = simulateBattleServer({
    deckA: snapA.deckCardIds,
    deckB: snapB.deckCardIds,
    seed: match.seed ?? 12345,
  });

  const winner =
    sim.winner === "draw" ? "draw" :
    sim.winner === "A" ? "playerA" : "playerB";

  const resultPayload = {
    winner,
    turnCount: sim.turnCount,
    scoreA: sim.scoreA,
    scoreB: sim.scoreB,
    powA: sim.powA,
    powB: sim.powB,
    seasonId,
    seed: match.seed ?? null,
    kind: "server_sim",
    resolvedAt: Date.now(),
  };

  await finalizeAsyncMatchWithResult(match, resultPayload);

  return sendJson(res, 200, { ok: true, result: resultPayload });
}

async function handlePvPHistory(req, res) {
  const user = await requireAuth(req, res);
  if (!user) return;

  const me = await prisma.player.findUnique({ where: { discordId: user.id } });
  if (!me) return sendJson(res, 404, { error: "Player not found" });

  const matches = await prisma.pvPMatch.findMany({
    where: {
      type: "async",
      status: "completed",
      OR: [{ playerAId: me.id }, { playerBId: me.id }],
    },
    include: { playerA: true, playerB: true },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  return sendJson(res, 200, {
    matches: matches.map((m) => {
      const w = m.result?.winner;
      const youWon =
        w === "draw" || w == null ? null : w === "playerA" ? m.playerAId === me.id : m.playerBId === me.id;
      return {
        id: m.id,
        createdAt: m.createdAt.getTime(),
        opponent: m.playerAId === me.id ? toPublicPlayer(m.playerB) : toPublicPlayer(m.playerA),
        result: m.result || null,
        youWon,
        youArePlayerA: m.playerAId === me.id,
      };
    }),
  });
}

// ─── PvP (live turn-based, polling) API ────────────────────────────────────────

function liveCardDamage(cardId) {
  const r = getCardRarity(cardId);
  if (r === "legendary") return 6;
  if (r === "rare") return 4;
  return 3;
}

function sanitizeDeckIds(deckCardIds) {
  if (!Array.isArray(deckCardIds)) return [];
  return deckCardIds.map(String).slice(0, 10);
}

async function handleLiveBattleTx(tx, match, me, body) {
  const intent = body.intent;
  if (!intent || typeof intent.kind !== "string") {
    const err = new Error("intent required");
    err.statusCode = 400;
    throw err;
  }

  const seed = match.seed;
  const s = match.state || {};
  const deckA = s.deckA || [];
  const deckB = s.deckB || [];
  const prevLog = Array.isArray(match.actionLog) ? match.actionLog : [];

  const before = replayBattleFromActions(seed, deckA, deckB, prevLog);
  const expectedTurnPlayerId =
    before.phase === "game-over"
      ? null
      : before.turn === "player"
        ? match.playerAId
        : match.playerBId;
  if (expectedTurnPlayerId !== me.id) {
    const err = new Error("Not your turn");
    err.statusCode = 400;
    throw err;
  }

  const after = applyBattleLockstepIntent(before, intent);
  if (after === before) {
    const err = new Error("Invalid action");
    err.statusCode = 400;
    throw err;
  }

  const nextLog = [...prevLog, intent].slice(-500);

  let nextResult = match.result;
  let nextStatus = match.status;
  let nextTurnPlayerId = match.turnPlayerId;

  if (after.phase === "game-over") {
    nextStatus = "completed";
    let winner = null;
    if (after.winner === "draw") winner = null;
    else if (after.winner === "player") winner = "playerA";
    else if (after.winner === "enemy") winner = "playerB";
    nextResult = {
      winner,
      resolvedAt: Date.now(),
      kind: "live_battle",
      seed: match.seed ?? null,
    };
    nextTurnPlayerId = null;
  } else {
    nextTurnPlayerId = after.turn === "player" ? match.playerAId : match.playerBId;
  }

  const updated = await tx.pvPMatch.update({
    where: { id: match.id },
    data: {
      status: nextStatus,
      result: nextResult,
      actionLog: nextLog,
      turnPlayerId: nextTurnPlayerId,
      lastActionAt: new Date(),
    },
  });

  if (nextStatus === "completed") {
    await createNotification(
      tx,
      match.playerAId,
      "pvp_live_result",
      "Live PvP match completed",
      "Open PvP → Live to view the result.",
      { matchId: match.id, seasonId: match.seasonId || DEFAULT_PVP_SEASON_ID }
    );
    await createNotification(
      tx,
      match.playerBId,
      "pvp_live_result",
      "Live PvP match completed",
      "Open PvP → Live to view the result.",
      { matchId: match.id, seasonId: match.seasonId || DEFAULT_PVP_SEASON_ID }
    );
  }

  return updated;
}

async function handleLiveCreate(req, res) {
  const user = await requireAuth(req, res);
  if (!user) return;

  const body = await readJsonBody(req);
  const opponentId = Number(body.opponentPlayerId);
  const seasonId = String(body.seasonId || DEFAULT_PVP_SEASON_ID);
  const deckCardIds = sanitizeDeckIds(body.deckCardIds);
  if (!Number.isFinite(opponentId)) return sendJson(res, 400, { error: "opponentPlayerId required" });

  const me = await prisma.player.findUnique({ where: { discordId: user.id } });
  if (!me) return sendJson(res, 404, { error: "Player not found" });
  if (me.id === opponentId) return sendJson(res, 400, { error: "Cannot challenge yourself" });

  const opp = await prisma.player.findUnique({ where: { id: opponentId } });
  if (!opp) return sendJson(res, 404, { error: "Opponent not found" });

  // Use provided deck or player's ranked deck snapshot if present.
  let deckA = deckCardIds;
  if (deckA.length === 0) {
    const snap = await prisma.pvPDeckSnapshot.findUnique({ where: { playerId_seasonId: { playerId: me.id, seasonId } } });
    deckA = snap ? sanitizeDeckIds(snap.deckCardIds) : [];
  }
  if (deckA.length === 0) return sendJson(res, 400, { error: "Provide deckCardIds or set ranked deck first" });

  // Opponent uses ranked snapshot if available; otherwise must supply later.
  const snapB = await prisma.pvPDeckSnapshot.findUnique({ where: { playerId_seasonId: { playerId: opp.id, seasonId } } });
  const deckB = snapB ? sanitizeDeckIds(snapB.deckCardIds) : [];

  const seed = Math.floor(Math.random() * 2 ** 31);
  const state = {
    version: 2,
    engine: "battle",
    deckA,
    deckB,
    createdAt: Date.now(),
  };

  const match = await prisma.$transaction(async (tx) => {
    const created = await tx.pvPMatch.create({
      data: {
        type: "live",
        status: "pending",
        playerAId: me.id,
        playerBId: opp.id,
        seasonId,
        seed,
        state,
        actionLog: [],
        turnPlayerId: me.id,
        lastActionAt: new Date(),
      },
    });

    await createNotification(
      tx,
      opp.id,
      "pvp_live_invite",
      `Live PvP challenge from ${me.username}`,
      "Open PvP → Live to join the match.",
      { matchId: created.id, fromPlayerId: me.id, seasonId }
    );

    return created;
  });

  return sendJson(res, 200, { ok: true, matchId: match.id });
}

async function handleLiveJoin(req, res, matchId) {
  const user = await requireAuth(req, res);
  if (!user) return;

  const me = await prisma.player.findUnique({ where: { discordId: user.id } });
  if (!me) return sendJson(res, 404, { error: "Player not found" });

  const match = await prisma.pvPMatch.findUnique({ where: { id: matchId } });
  if (!match) return sendJson(res, 404, { error: "Match not found" });
  if (match.type !== "live") return sendJson(res, 400, { error: "Not a live match" });
  if (me.id !== match.playerAId && me.id !== match.playerBId) return sendJson(res, 403, { error: "Not your match" });
  if (match.status === "cancelled") return sendJson(res, 400, { error: "Match was declined/cancelled" });
  if (match.status === "completed") return sendJson(res, 200, { ok: true, status: match.status });

  // If playerB is joining and their deck isn't set, use their ranked deck.
  let nextState = match.state || {};
  if (me.id === match.playerBId) {
    const s = nextState;
    if (!Array.isArray(s.deckB) || s.deckB.length === 0) {
      const seasonId = match.seasonId || DEFAULT_PVP_SEASON_ID;
      const snap = await prisma.pvPDeckSnapshot.findUnique({ where: { playerId_seasonId: { playerId: me.id, seasonId } } });
      if (snap) {
        nextState = { ...s, deckB: sanitizeDeckIds(snap.deckCardIds) };
      }
    }
  }

  const updated = await prisma.pvPMatch.update({
    where: { id: match.id },
    data: {
      status: "active",
      state: nextState,
      lastActionAt: new Date(),
    },
  });
  return sendJson(res, 200, { ok: true, status: updated.status });
}

async function handleLiveDecline(req, res, matchId) {
  const user = await requireAuth(req, res);
  if (!user) return;

  const me = await prisma.player.findUnique({ where: { discordId: user.id } });
  if (!me) return sendJson(res, 404, { error: "Player not found" });

  try {
    const out = await prisma.$transaction(async (tx) => {
      const match = await tx.pvPMatch.findUnique({ where: { id: matchId } });
      if (!match) {
        const err = new Error("Match not found");
        err.statusCode = 404;
        throw err;
      }
      if (match.type !== "live") {
        const err = new Error("Not a live match");
        err.statusCode = 400;
        throw err;
      }
      if (match.status !== "pending") {
        const err = new Error("Match is not pending");
        err.statusCode = 400;
        throw err;
      }
      // Only the invitee can decline.
      if (me.id !== match.playerBId) {
        const err = new Error("Only the invited player can decline");
        err.statusCode = 403;
        throw err;
      }

      const updated = await tx.pvPMatch.update({
        where: { id: match.id },
        data: { status: "cancelled", lastActionAt: new Date(), turnPlayerId: null },
      });

      await createNotification(
        tx,
        match.playerAId,
        "pvp_live_result",
        `${me.username} declined your Live PvP challenge`,
        null,
        { matchId: match.id, declined: true, seasonId: match.seasonId || DEFAULT_PVP_SEASON_ID }
      );

      return updated;
    });

    return sendJson(res, 200, { ok: true, status: out.status });
  } catch (e) {
    const code = e?.statusCode || 500;
    return sendJson(res, code, { error: e?.message || "Decline failed" });
  }
}

async function handleLiveGet(req, res, matchId) {
  const user = await requireAuth(req, res);
  if (!user) return;

  const me = await prisma.player.findUnique({ where: { discordId: user.id } });
  if (!me) return sendJson(res, 404, { error: "Player not found" });

  const match = await prisma.pvPMatch.findUnique({
    where: { id: matchId },
    include: { playerA: true, playerB: true },
  });
  if (!match) return sendJson(res, 404, { error: "Match not found" });
  if (match.type !== "live") return sendJson(res, 400, { error: "Not a live match" });
  if (me.id !== match.playerAId && me.id !== match.playerBId) return sendJson(res, 403, { error: "Not your match" });

  return sendJson(res, 200, {
    ok: true,
    match: {
      id: match.id,
      status: match.status,
      createdAt: match.createdAt.getTime(),
      playerA: toPublicPlayer(match.playerA),
      playerB: toPublicPlayer(match.playerB),
      turnPlayerId: match.turnPlayerId,
      seed: match.seed,
      actionLog: match.actionLog || [],
      state: match.state || null,
      result: match.result || null,
    },
  });
}

async function handleLiveAction(req, res, matchId) {
  const user = await requireAuth(req, res);
  if (!user) return;

  const me = await prisma.player.findUnique({ where: { discordId: user.id } });
  if (!me) return sendJson(res, 404, { error: "Player not found" });

  const body = await readJsonBody(req);
  const actionType = String(body.type || "");
  const cardId = body.cardId ? String(body.cardId) : null;

  try {
    const out = await prisma.$transaction(async (tx) => {
      const match = await tx.pvPMatch.findUnique({ where: { id: matchId } });
      if (!match) {
        const err = new Error("Match not found");
        err.statusCode = 404;
        throw err;
      }
      if (match.type !== "live") {
        const err = new Error("Not a live match");
        err.statusCode = 400;
        throw err;
      }
      if (me.id !== match.playerAId && me.id !== match.playerBId) {
        const err = new Error("Not your match");
        err.statusCode = 403;
        throw err;
      }
      if (match.status !== "active") {
        const err = new Error("Match is not active");
        err.statusCode = 400;
        throw err;
      }

      const s = match.state || {};
      const isBattleEngine = s.engine === "battle" || s.version === 2;
      if (isBattleEngine) {
        return await handleLiveBattleTx(tx, match, me, body);
      }

      if (match.turnPlayerId !== me.id) {
        const err = new Error("Not your turn");
        err.statusCode = 400;
        throw err;
      }

      const isA = me.id === match.playerAId;
      const myKey = isA ? "A" : "B";
      const oppKey = isA ? "B" : "A";
      const myDeck = (myKey === "A" ? s.deckA : s.deckB) || [];
      const myUsed = (myKey === "A" ? s.usedA : s.usedB) || [];

      let nextState = { ...s };
      let nextResult = match.result;
      let nextStatus = match.status;

      if (actionType === "end") {
        // no-op but pass turn
      } else if (actionType === "play") {
        if (!cardId) {
          const err = new Error("cardId required");
          err.statusCode = 400;
          throw err;
        }
        assertTradeable(cardId); // also blocks seasonal/mythic-like
        if (!myDeck.includes(cardId)) {
          const err = new Error("Card not in your deck");
          err.statusCode = 400;
          throw err;
        }
        if (myUsed.includes(cardId)) {
          const err = new Error("Card already used");
          err.statusCode = 400;
          throw err;
        }

        const dmg = liveCardDamage(cardId);
        if (oppKey === "B") nextState.hpB = Math.max(0, (Number(nextState.hpB) || 0) - dmg);
        else nextState.hpA = Math.max(0, (Number(nextState.hpA) || 0) - dmg);

        const usedNext = [...myUsed, cardId];
        if (myKey === "A") nextState.usedA = usedNext;
        else nextState.usedB = usedNext;
      } else {
        const err = new Error("Unknown action type");
        err.statusCode = 400;
        throw err;
      }

      // Check win
      if ((Number(nextState.hpA) || 0) <= 0 || (Number(nextState.hpB) || 0) <= 0) {
        const winner = (Number(nextState.hpA) || 0) <= 0 ? "playerB" : "playerA";
        nextStatus = "completed";
        nextResult = { winner, resolvedAt: Date.now(), kind: "live_simple", seed: match.seed ?? null };
      }

      // Switch turn if still active
      const nextTurnPlayerId = nextStatus === "active"
        ? (me.id === match.playerAId ? match.playerBId : match.playerAId)
        : match.turnPlayerId;

      // Append action log
      const log = Array.isArray(match.actionLog) ? match.actionLog : [];
      const logEntry = { at: Date.now(), by: me.id, type: actionType, cardId };
      const nextLog = [...log, logEntry].slice(-200);

      const updated = await tx.pvPMatch.update({
        where: { id: match.id },
        data: {
          status: nextStatus,
          state: nextState,
          result: nextResult,
          actionLog: nextLog,
          turnPlayerId: nextTurnPlayerId,
          lastActionAt: new Date(),
        },
      });

      if (nextStatus === "completed") {
        await createNotification(
          tx,
          match.playerAId,
          "pvp_live_result",
          "Live PvP match completed",
          "Open PvP → Live to view the result.",
          { matchId: match.id, seasonId: match.seasonId || DEFAULT_PVP_SEASON_ID }
        );
        await createNotification(
          tx,
          match.playerBId,
          "pvp_live_result",
          "Live PvP match completed",
          "Open PvP → Live to view the result.",
          { matchId: match.id, seasonId: match.seasonId || DEFAULT_PVP_SEASON_ID }
        );
      }

      return updated;
    });

    return sendJson(res, 200, { ok: true, status: out.status, state: out.state, result: out.result, turnPlayerId: out.turnPlayerId });
  } catch (e) {
    const code = e?.statusCode || 500;
    return sendJson(res, code, { error: e?.message || "Action failed" });
  }
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

  const requested = body.cardIds.map(String).slice(0, 60);
  const unique = [...new Set(requested)];
  const ownedRows = unique.length
    ? await prisma.cardProgress.findMany({
        where: { playerId: player.id, cardId: { in: unique } },
        select: { cardId: true },
      })
    : [];
  const owned = new Set(ownedRows.map((r) => r.cardId));
  const missing = unique.filter((id) => !owned.has(id));
  if (missing.length > 0) {
    return sendJson(res, 400, { error: `Deck contains unowned cards: ${missing.slice(0, 10).join(", ")}${missing.length > 10 ? ", ..." : ""}` });
  }

  const deck = await prisma.deck.create({
    data: { playerId: player.id, name: body.name, cardIds: requested },
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

  const {
    gold,
    stardust,
    ownedCardIds,
    cardProgress,
    pityCounter,
    lastFreePackTime,
    totalPulls,
    battlePass,
    cosmeticsOwned,
    cosmeticsEquipped,
    battlePassXpBoostExpiresAt,
    deckPresets,
  } = body;

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
      battlePass: battlePass || null,
      cosmeticsOwned: Array.isArray(cosmeticsOwned) ? cosmeticsOwned : [],
      cosmeticsEquipped: cosmeticsEquipped || {},
      battlePassXpBoostExpiresAt: battlePassXpBoostExpiresAt ? new Date(battlePassXpBoostExpiresAt) : null,
      deckPresets: Array.isArray(deckPresets) ? deckPresets : [],
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
      include: { player: { select: { id: true, username: true, avatar: true } } },
    });
    entries = entries.map((e, i) => ({
      rank: i + 1,
      name: e.player.username,
      avatar: e.player.avatar,
      playerId: e.player.id,
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
        playerId: p.id,
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
      return { id: p.id, name: p.username, avatar: p.avatar, score };
    });
    scored.sort((a, b) => b.score - a.score);
    entries = scored
      .filter((e) => e.score > 0)
      .slice(0, 20)
      .map((e, i) => ({
        rank: i + 1,
        name: e.name,
        avatar: e.avatar,
        playerId: e.id,
        value: e.score,
      }));
  }

  sendJson(res, 200, { entries });
}

// ─── Seasonal Events API ───────────────────────────────────────────────────────

async function handleSeasonalPull(req, res) {
  const user = await requireAuth(req, res);
  if (!user) return;

  const body = await readJsonBody(req);
  const eventId = body.eventId;
  if (!eventId || typeof eventId !== "string") return sendJson(res, 400, { error: "eventId required" });

  const event = getSeasonalEventById(eventId);
  if (!event) return sendJson(res, 404, { error: "Unknown event" });
  if (!isEventActive(event)) return sendJson(res, 400, { error: "Event not active" });

  const player = await prisma.player.findUnique({
    where: { discordId: user.id },
    include: { cards: true },
  });
  if (!player) return sendJson(res, 404, { error: "Player not found" });
  if (player.gold < event.packCost) return sendJson(res, 400, { error: "Not enough gold" });

  const pool = event.seasonalCardIds;
  if (!Array.isArray(pool) || pool.length === 0) return sendJson(res, 500, { error: "Empty seasonal pool" });

  const pulledIds = [];
  // 3-card seasonal pack
  for (let i = 0; i < 3; i++) {
    const cardId = pool[Math.floor(Math.random() * pool.length)];
    pulledIds.push(cardId);
  }

  await prisma.$transaction(async (tx) => {
    await tx.player.update({ where: { id: player.id }, data: { gold: player.gold - event.packCost } });
    let totalStardustEarned = 0;
    for (const cardId of pulledIds) {
      const existing = await tx.cardProgress.findUnique({
        where: { playerId_cardId: { playerId: player.id, cardId } },
      });

      if (existing) {
        const dupeResult = processDuplicatePull(existing, cardId);
        totalStardustEarned += dupeResult.stardustEarned;
        await tx.cardProgress.update({
          where: { id: existing.id },
          data: {
            dupeCount: dupeResult.dupeCount,
            goldStars: dupeResult.goldStars,
            redStars: dupeResult.redStars,
            xp: existing.xp + dupeResult.xpBonus,
          },
        });
      } else {
        await tx.cardProgress.create({
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
      }
    }

    if (totalStardustEarned > 0) {
      await tx.player.update({
        where: { id: player.id },
        data: { stardust: { increment: totalStardustEarned } },
      });
    }
  });

  const updated = await prisma.player.findUnique({ where: { id: player.id }, include: { cards: true } });
  return sendJson(res, 200, { cardIds: pulledIds, state: playerToClientState(updated, updated.cards) });
}

// ─── Admin API (cheats) ─────────────────────────────────────────────────────────

async function handleAdminGrant(req, res) {
  const user = await requireAuth(req, res);
  if (!user) return;
  try {
    const body = await readJsonBody(req);
    const result = await adminIncrementForUser(user.id, body);
    return sendJson(res, 200, result);
  } catch (e) {
    const code = e?.statusCode || 500;
    return sendJson(res, code, { error: e?.message || "Admin grant failed" });
  }
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
  const clientIp = getClientIp(req);

  try {
    // Rate limits (per IP; trust X-Forwarded-For when behind Railway/nginx)
    if (method !== "OPTIONS") {
      if (method === "POST" && path === "/interactions") {
        const rl = rateLimit(`interactions:${clientIp}`, RATE_LIMIT.interactions);
        if (!rl.ok) {
          res.writeHead(429, { "Content-Type": "application/json", "Retry-After": String(rl.retryAfterSec ?? 60) });
          res.end(JSON.stringify({ error: "Too many requests" }));
          return;
        }
      }
      if (method === "POST" && path === "/api/token") {
        const rl = rateLimit(`token:${clientIp}`, RATE_LIMIT.token);
        if (!rl.ok) {
          res.writeHead(429, { "Content-Type": "application/json", "Retry-After": String(rl.retryAfterSec ?? 60) });
          res.end(JSON.stringify({ error: "Too many token requests. Try again later." }));
          return;
        }
      } else if (path.startsWith("/api/")) {
        const rl = rateLimit(`api:${clientIp}`, RATE_LIMIT.api);
        if (!rl.ok) {
          res.writeHead(429, { "Content-Type": "application/json", "Retry-After": String(rl.retryAfterSec ?? 60) });
          res.end(JSON.stringify({ error: "Too many requests" }));
          return;
        }
      }
    }

    // Frontend (SPA) + static assets
    if (tryServeFrontend(req, res, path)) return;

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
    if (method === "GET" && path === "/api/me") return await handleGetMe(req, res);
    if (method === "PATCH" && path === "/api/player") return await handlePatchPlayer(req, res);
    if (method === "GET" && path === "/api/notifications") return await handleGetNotifications(req, res);
    if (method === "GET" && path === "/api/notifications/unread-count") return await handleGetUnreadCount(req, res);
    if (method === "POST" && path === "/api/notifications/mark-read") return await handleMarkNotificationsRead(req, res);
    if (method === "GET" && path === "/api/users/search") return await handleSearchUsers(req, res);
    if (method === "GET" && path === "/api/friends") return await handleGetFriends(req, res);
    if (method === "POST" && path === "/api/friends/request") return await handleFriendRequest(req, res);
    if (method === "POST" && path === "/api/friends/respond") return await handleFriendRespond(req, res);
    if (method === "POST" && path === "/api/friends/remove") return await handleFriendRemove(req, res);
    if (method === "GET" && path === "/api/trades") return await handleGetTrades(req, res);
    if (method === "POST" && path === "/api/trades") return await handleCreateTrade(req, res);
    if (method === "GET" && path === "/api/market") return await handleGetMarket(req, res);
    if (method === "POST" && path === "/api/market") return await handleCreateListing(req, res);
    if (method === "POST" && path === "/api/pvp/deck") return await handleSetRankedDeck(req, res);
    if (method === "POST" && path === "/api/pvp/queue") return await handleQueueAsync(req, res);
    if (method === "GET" && path === "/api/pvp/history") return await handlePvPHistory(req, res);
    if (method === "POST" && path === "/api/pvp/live/create") return await handleLiveCreate(req, res);
    if (method === "POST" && path === "/api/onboarding/complete") return await handleOnboardingComplete(req, res);
    if (method === "GET" && path === "/api/cards") return await handleGetCards(req, res);
    if (method === "POST" && path === "/api/cards/pull") return await handleCardPull(req, res);
    if (method === "GET" && path === "/api/decks") return await handleGetDecks(req, res);
    if (method === "POST" && path === "/api/decks") return await handlePostDeck(req, res);
    if (method === "POST" && path === "/api/battle/result") return await handleBattleResult(req, res);
    if (method === "POST" && path === "/api/import") return await handleImport(req, res);
    if (method === "POST" && path === "/api/seasonal/pull") return await handleSeasonalPull(req, res);
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

    // /api/friends/:id/tradeable-cards
    const friendCardsMatch = path.match(/^\/api\/friends\/(\d+)\/tradeable-cards$/);
    if (friendCardsMatch && method === "GET") {
      const friendId = Number(friendCardsMatch[1]);
      if (!Number.isFinite(friendId)) return sendJson(res, 400, { error: "Invalid friend id" });
      return await handleGetFriendTradeableCards(req, res, friendId);
    }

    // /api/trades/:id/cancel or /api/trades/:id/accept
    const tradeMatch = path.match(/^\/api\/trades\/(\d+)\/(cancel|accept)$/);
    if (tradeMatch && method === "POST") {
      const tradeId = Number(tradeMatch[1]);
      const action = tradeMatch[2];
      if (action === "cancel") return await handleCancelTrade(req, res, tradeId);
      if (action === "accept") return await handleAcceptTrade(req, res, tradeId);
    }

    // /api/market/:id/cancel or /api/market/:id/buy
    const marketMatch = path.match(/^\/api\/market\/(\d+)\/(cancel|buy)$/);
    if (marketMatch && method === "POST") {
      const listingId = Number(marketMatch[1]);
      const action = marketMatch[2];
      if (!Number.isFinite(listingId)) return sendJson(res, 400, { error: "Invalid listing id" });
      if (action === "cancel") return await handleCancelListing(req, res, listingId);
      if (action === "buy") return await handleBuyListing(req, res, listingId);
    }

    // /api/pvp/async/:id/play | submit | resolve
    const pvpAsyncPath = path.match(/^\/api\/pvp\/async\/(\d+)\/(play|submit|resolve)$/);
    if (pvpAsyncPath) {
      const matchId = Number(pvpAsyncPath[1]);
      const sub = pvpAsyncPath[2];
      if (!Number.isFinite(matchId)) return sendJson(res, 400, { error: "Invalid match id" });
      if (sub === "play" && method === "GET") return await handleGetAsyncPlay(req, res, matchId);
      if (sub === "submit" && method === "POST") return await handleSubmitAsyncBattle(req, res, matchId);
      if (sub === "resolve" && method === "POST") return await handleResolveAsync(req, res, matchId);
    }

    const pvpLiveJoin = path.match(/^\/api\/pvp\/live\/(\d+)\/join$/);
    if (pvpLiveJoin && method === "POST") {
      const matchId = Number(pvpLiveJoin[1]);
      if (!Number.isFinite(matchId)) return sendJson(res, 400, { error: "Invalid match id" });
      return await handleLiveJoin(req, res, matchId);
    }

    const pvpLiveDecline = path.match(/^\/api\/pvp\/live\/(\d+)\/decline$/);
    if (pvpLiveDecline && method === "POST") {
      const matchId = Number(pvpLiveDecline[1]);
      if (!Number.isFinite(matchId)) return sendJson(res, 400, { error: "Invalid match id" });
      return await handleLiveDecline(req, res, matchId);
    }

    const pvpLiveGet = path.match(/^\/api\/pvp\/live\/(\d+)$/);
    if (pvpLiveGet && method === "GET") {
      const matchId = Number(pvpLiveGet[1]);
      if (!Number.isFinite(matchId)) return sendJson(res, 400, { error: "Invalid match id" });
      return await handleLiveGet(req, res, matchId);
    }

    const pvpLiveAction = path.match(/^\/api\/pvp\/live\/(\d+)\/action$/);
    if (pvpLiveAction && method === "POST") {
      const matchId = Number(pvpLiveAction[1]);
      if (!Number.isFinite(matchId)) return sendJson(res, 400, { error: "Invalid match id" });
      return await handleLiveAction(req, res, matchId);
    }

    sendJson(res, 404, { error: "Not found" });
  } catch (err) {
    console.error("Request error:", err);
    sendJson(res, 500, { error: "Internal server error" });
  }
});

server.listen(PORT, () => {
  console.log(`Lorebound API listening on http://127.0.0.1:${PORT}`);
});

// ─── Optional: Auto-register Discord commands on boot ───────────────────────────

async function autoRegisterDiscordCommands() {
  if (String(process.env.AUTO_REGISTER_COMMANDS || "").trim() !== "1") return;

  const appId = process.env.DISCORD_CLIENT_ID || process.env.VITE_DISCORD_CLIENT_ID;
  const botToken = process.env.DISCORD_BOT_TOKEN;
  if (!appId || !botToken) {
    console.warn("[autoRegister] Skipping: missing DISCORD_BOT_TOKEN or DISCORD_CLIENT_ID/VITE_DISCORD_CLIENT_ID");
    return;
  }

  const guildId = String(process.env.DISCORD_GUILD_ID || "").trim() || null;
  // IMPORTANT: PRIMARY_ENTRY_POINT commands must be registered globally (Discord constraint).
  const globalBase = `/applications/${appId}/commands`;
  console.log("[autoRegister] Registering /launch globally…");
  const existingGlobal = await discordBotFetch(globalBase, { method: "GET" });
  await upsertDiscordCommand(existingGlobal, {
    name: "launch",
    description: "Launch Mythic Arcana",
    type: 4, // PRIMARY_ENTRY_POINT
    handler: 2, // DISCORD_LAUNCH_ACTIVITY
    integration_types: [0, 1],
    contexts: [0, 1, 2],
  }, null);

  // Register chat commands either to a guild (instant) or globally (slower propagation)
  const chatBase = guildId
    ? `/applications/${appId}/guilds/${guildId}/commands`
    : globalBase;
  console.log(`[autoRegister] Registering chat commands (${guildId ? `guild ${guildId}` : "global"})…`);
  const existingChat = await discordBotFetch(chatBase, { method: "GET" });

  await upsertDiscordCommand(existingChat, {
    name: "play",
    description: "Open Mythic Arcana",
    type: 1,
    integration_types: [0, 1],
    contexts: [0, 1, 2],
  }, guildId);

  await upsertDiscordCommand(existingChat, {
    name: "mythic",
    description: "Mythic Arcana commands",
    type: 1,
    integration_types: [0, 1],
    contexts: [0, 1, 2],
    options: [
      { name: "profile", description: "View your Mythic Arcana profile", type: 1 },
      { name: "daily", description: "Claim your daily reward", type: 1 },
      {
        name: "duel",
        description: "Challenge another player to a duel",
        type: 1,
        options: [{ name: "opponent", description: "The player to challenge", type: 6, required: true }],
      },
      { name: "drop", description: "Trigger a card drop event in this channel (admin only)", type: 1 },
      {
        name: "admin",
        description: "Admin tools (allowlisted only)",
        type: 1,
        options: [
          {
            name: "action",
            description: "What to grant",
            type: 3,
            required: true,
            choices: [
              { name: "gold", value: "gold" },
              { name: "stardust", value: "stardust" },
              { name: "pityCounter", value: "pityCounter" },
              { name: "totalPulls", value: "totalPulls" },
            ],
          },
          { name: "amount", description: "How much to add (can be negative)", type: 4, required: true },
        ],
      },
    ],
  }, guildId);

  console.log("[autoRegister] Done.");
}

autoRegisterDiscordCommands().catch((e) => {
  console.warn("[autoRegister] Failed:", e?.message || e);
});
