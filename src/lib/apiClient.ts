import { getDiscordAuth } from "./discordEmbedded";

export function getApiBase(): string {
  if (typeof window !== "undefined" && window.location.hostname.endsWith("discordsays.com")) {
    return "/.proxy";
  }
  return "";
}

/** Browser-only: `wss://…/.proxy/api/pvp/live/:id/ws?access_token=…` (or `ws` + `/api/…` locally). */
export function getLivePvpWebSocketUrl(matchId: number): string | null {
  if (typeof window === "undefined") return null;
  const auth = getDiscordAuth();
  const token = auth?.access_token;
  if (!token) return null;
  const base = getApiBase();
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  const path = `${base}/api/pvp/live/${matchId}/ws`;
  return `${proto}//${window.location.host}${path}?access_token=${encodeURIComponent(token)}`;
}

export function getLiveRaidWebSocketUrl(matchId: number): string | null {
  if (typeof window === "undefined") return null;
  const auth = getDiscordAuth();
  const token = auth?.access_token;
  if (!token) return null;
  const base = getApiBase();
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  const path = `${base}/api/raid/live/${matchId}/ws`;
  return `${proto}//${window.location.host}${path}?access_token=${encodeURIComponent(token)}`;
}

function getHeaders(): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const auth = getDiscordAuth();
  if (auth?.access_token) {
    headers["Authorization"] = `Bearer ${auth.access_token}`;
  }
  return headers;
}

export function isAuthenticated(): boolean {
  return !!getDiscordAuth()?.access_token;
}

async function handleResponse<T>(res: Response): Promise<T> {
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || `API error ${res.status}`);
  return data as T;
}

export const api = {
  async getMe() {
    const res = await fetch(`${getApiBase()}/api/me`, { headers: getHeaders() });
    return handleResponse<{
      me: {
        id: number;
        discordId: string;
        username: string;
        avatar?: string | null;
        pvp: { mmr: number; rankTier: string; gamesPlayed: number; seasonId: string };
      };
    }>(res);
  },

  async getPlayer() {
    const res = await fetch(`${getApiBase()}/api/player`, { headers: getHeaders() });
    return handleResponse(res);
  },

  async completeOnboarding(path: "fire" | "nature" | "shadow") {
    const res = await fetch(`${getApiBase()}/api/onboarding/complete`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ path }),
    });
    return handleResponse(res);
  },

  async patchPlayer(data: Record<string, unknown>) {
    const res = await fetch(`${getApiBase()}/api/player`, {
      method: "PATCH",
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  async pullCards(packId: string) {
    const res = await fetch(`${getApiBase()}/api/cards/pull`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ packId }),
    });
    return handleResponse<{
      pullResults: Array<{
        cardId: string;
        isDuplicate: boolean;
        stardustEarned: number;
        newGoldStar: boolean;
        newRedStar: boolean;
        rarity: string;
      }>;
      state: import("./playerState").PlayerState;
    }>(res);
  },

  async claimDailyLogin() {
    const res = await fetch(`${getApiBase()}/api/player/daily-login-claim`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({}),
    });
    return handleResponse<{
      preview: {
        kind: string;
        label: string;
        amount?: number;
        cardId?: string | null;
        pullResults?: Array<{
          cardId: string;
          isDuplicate: boolean;
          stardustEarned: number;
          newGoldStar: boolean;
          newRedStar: boolean;
          rarity: string;
        }>;
      };
      state: import("./playerState").PlayerState;
    }>(res);
  },

  async patchCard(cardId: string, action: string, extra?: Record<string, unknown>) {
    const res = await fetch(`${getApiBase()}/api/cards/${cardId}`, {
      method: "PATCH",
      headers: getHeaders(),
      body: JSON.stringify({ action, ...extra }),
    });
    return handleResponse(res);
  },

  async getDecks() {
    const res = await fetch(`${getApiBase()}/api/decks`, { headers: getHeaders() });
    return handleResponse(res);
  },

  async getUserDecks(playerId: number) {
    const res = await fetch(`${getApiBase()}/api/users/${playerId}/decks`, { headers: getHeaders() });
    return handleResponse<{
      ok: true;
      player: { id: number; discordId: string; username: string; avatar?: string | null };
      decks: Array<{ id: number; playerId: number; name: string; cardIds: unknown }>;
      deckPresets: unknown[];
    }>(res);
  },

  async saveDeck(name: string, cardIds: string[]) {
    const res = await fetch(`${getApiBase()}/api/decks`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ name, cardIds }),
    });
    return handleResponse(res);
  },

  async deleteDeck(deckId: number) {
    const res = await fetch(`${getApiBase()}/api/decks/${deckId}`, {
      method: "DELETE",
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  async startPveBattle(body: {
    deckCardIds: string[];
    raidBossId?: string;
    opponentDeckIds?: string[] | null;
    raidCoopHotseat?: boolean;
  }) {
    const res = await fetch(`${getApiBase()}/api/battle/start`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(body),
    });
    return handleResponse<{
      matchId: string;
      seed?: number;
      enemyDeckIds?: string[];
      skipReplayVerification?: boolean;
    }>(res);
  },

  async submitBattleResult(data: {
    matchId: string;
    won: boolean;
    draw?: boolean;
    turnCount: number;
    deckCardIds: string[];
    raidBossId?: string;
    actionLog?: import("./battleLockstep").BattleLockstepIntent[];
  }) {
    const res = await fetch(`${getApiBase()}/api/battle/result`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse<{
      goldReward: number;
      levelUps: Array<{ cardId: string; oldLevel: number; newLevel: number }>;
      state: import("./playerState").PlayerState;
    }>(res);
  },

  async importLocalState(state: import("./playerState").PlayerState) {
    const res = await fetch(`${getApiBase()}/api/import`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(state),
    });
    return handleResponse(res);
  },

  async craftFuse(inputRarity: string, selectedCardIds: string[]) {
    const res = await fetch(`${getApiBase()}/api/craft/fuse`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ inputRarity, selectedCardIds }),
    });
    return handleResponse<{
      resultCardId: string;
      state: import("./playerState").PlayerState;
    }>(res);
  },

  async craftSacrifice(cardIds: string[]) {
    const res = await fetch(`${getApiBase()}/api/craft/sacrifice`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ cardIds }),
    });
    return handleResponse<{
      totalStardust: number;
      state: import("./playerState").PlayerState;
    }>(res);
  },

  /** Re-fetch authoritative economy from server (PATCH no longer accepts gold/stardust). */
  async syncEconomy() {
    return this.getPlayer();
  },

  async getLeaderboard(tab: "wins" | "collection" | "rarest") {
    const res = await fetch(`${getApiBase()}/api/leaderboard?tab=${encodeURIComponent(tab)}`, { headers: getHeaders() });
    return handleResponse<{ entries: Array<{ rank: number; name: string; avatar?: string | null; playerId: number; value: number }> }>(res);
  },

  async getFriends() {
    const res = await fetch(`${getApiBase()}/api/friends`, { headers: getHeaders() });
    return handleResponse<{
      accepted: Array<{ id: number; friend: { id: number; discordId: string; username: string; avatar?: string | null }; createdAt: number }>;
      incoming: Array<{ id: number; from: { id: number; discordId: string; username: string; avatar?: string | null }; createdAt: number }>;
      outgoing: Array<{ id: number; to: { id: number; discordId: string; username: string; avatar?: string | null }; createdAt: number }>;
    }>(res);
  },

  async getFriendTradeableCards(friendId: number) {
    const res = await fetch(`${getApiBase()}/api/friends/${friendId}/tradeable-cards`, { headers: getHeaders() });
    return handleResponse<{ cardIds: string[] }>(res);
  },

  async getNotifications(limit: number = 30) {
    const res = await fetch(`${getApiBase()}/api/notifications?limit=${encodeURIComponent(String(limit))}`, { headers: getHeaders() });
    return handleResponse<{ notifications: Array<{
      id: number;
      type: string;
      title: string;
      body?: string | null;
      data?: unknown;
      createdAt: number;
      readAt?: number | null;
    }> }>(res);
  },

  async getNotificationUnreadCount() {
    const res = await fetch(`${getApiBase()}/api/notifications/unread-count`, { headers: getHeaders() });
    return handleResponse<{ unread: number }>(res);
  },

  async markNotificationsRead(ids?: number[]) {
    const res = await fetch(`${getApiBase()}/api/notifications/mark-read`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ ids: ids || [] }),
    });
    return handleResponse<{ ok: true }>(res);
  },

  async searchUsers(q: string) {
    const res = await fetch(`${getApiBase()}/api/users/search?q=${encodeURIComponent(q)}`, { headers: getHeaders() });
    return handleResponse<{ users: Array<{ id: number; discordId: string; username: string; avatar?: string | null }> }>(res);
  },

  async friendRequest(usernameOrDiscordId: string) {
    const res = await fetch(`${getApiBase()}/api/friends/request`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ usernameOrDiscordId }),
    });
    return handleResponse(res);
  },

  async friendRespond(requestId: number, accept: boolean) {
    const res = await fetch(`${getApiBase()}/api/friends/respond`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ requestId, accept }),
    });
    return handleResponse(res);
  },

  async friendRemove(friendId: number) {
    const res = await fetch(`${getApiBase()}/api/friends/remove`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ friendId }),
    });
    return handleResponse(res);
  },

  async getTrades() {
    const res = await fetch(`${getApiBase()}/api/trades`, { headers: getHeaders() });
    return handleResponse<{ trades: Array<{
      id: number;
      status: string;
      createdAt: number;
      from: { id: number; discordId: string; username: string; avatar?: string | null };
      to: { id: number; discordId: string; username: string; avatar?: string | null };
      taxGold: number;
      taxStardust: number;
      message?: string | null;
      offered: Array<{ cardId: string; quantity: number }>;
      requested: Array<{ cardId: string; quantity: number }>;
    }> }>(res);
  },

  async createTrade(data: { toPlayerId: number; offeredCardIds: string[]; requestedCardIds: string[]; taxGold?: number; taxStardust?: number; message?: string | null }) {
    const res = await fetch(`${getApiBase()}/api/trades`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  async cancelTrade(tradeId: number) {
    const res = await fetch(`${getApiBase()}/api/trades/${tradeId}/cancel`, {
      method: "POST",
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  async acceptTrade(tradeId: number) {
    const res = await fetch(`${getApiBase()}/api/trades/${tradeId}/accept`, {
      method: "POST",
      headers: getHeaders(),
    });
    return handleResponse<{ ok: true; state: import("./playerState").PlayerState }>(res);
  },

  async getMarket(status: string = "open") {
    const res = await fetch(`${getApiBase()}/api/market?status=${encodeURIComponent(status)}`, { headers: getHeaders() });
    return handleResponse<{ listings: Array<{
      id: number;
      status: string;
      createdAt: number;
      seller: { id: number; discordId: string; username: string; avatar?: string | null };
      taxGold: number;
      taxStardust: number;
      note?: string | null;
      offered: Array<{ cardId: string; quantity: number }>;
      requested: Array<{ cardId: string; quantity: number }>;
    }> }>(res);
  },

  async createListing(data: { offeredCardIds: string[]; requestedCardIds: string[]; taxGold?: number; taxStardust?: number; note?: string | null }) {
    const res = await fetch(`${getApiBase()}/api/market`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  async cancelListing(listingId: number) {
    const res = await fetch(`${getApiBase()}/api/market/${listingId}/cancel`, {
      method: "POST",
      headers: getHeaders(),
    });
    return handleResponse(res);
  },

  async buyListing(listingId: number) {
    const res = await fetch(`${getApiBase()}/api/market/${listingId}/buy`, {
      method: "POST",
      headers: getHeaders(),
    });
    return handleResponse<{ ok: true; state: import("./playerState").PlayerState }>(res);
  },

  async pvpSetRankedDeck(deckCardIds: string[], seasonId?: string) {
    const res = await fetch(`${getApiBase()}/api/pvp/deck`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ deckCardIds, seasonId }),
    });
    return handleResponse(res);
  },

  async pvpQueue(seasonId?: string) {
    const res = await fetch(`${getApiBase()}/api/pvp/queue`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ seasonId }),
    });
    return handleResponse<{ ok: true; matchId: number; opponent: { id: number; discordId: string; username: string; avatar?: string | null } }>(res);
  },

  async pvpResolveAsync(matchId: number) {
    const res = await fetch(`${getApiBase()}/api/pvp/async/${matchId}/resolve`, {
      method: "POST",
      headers: getHeaders(),
    });
    return handleResponse<{ ok: true; result: unknown }>(res);
  },

  /** Queue starter: load decks for Battle vs AI (opponent's ranked deck). */
  async pvpAsyncGetPlay(matchId: number) {
    const res = await fetch(`${getApiBase()}/api/pvp/async/${matchId}/play`, { headers: getHeaders() });
    return handleResponse<{
      ok: true;
      matchId: number;
      opponent: { id: number; discordId: string; username: string; avatar?: string | null };
      myDeckCardIds: string[];
      opponentDeckCardIds: string[];
      seed: number | null;
    }>(res);
  },

  /** Queue starter: submit ranked outcome after playing BattleArena. */
  async pvpAsyncSubmit(
    matchId: number,
    body: {
      won: boolean;
      draw?: boolean;
      turnCount: number;
      actionLog?: import("./battleLockstep").BattleLockstepIntent[];
      seed?: number;
    },
  ) {
    const res = await fetch(`${getApiBase()}/api/pvp/async/${matchId}/submit`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(body),
    });
    return handleResponse<{ ok: true; result: unknown }>(res);
  },

  async pvpHistory() {
    const res = await fetch(`${getApiBase()}/api/pvp/history`, { headers: getHeaders() });
    return handleResponse<{
      matches: Array<{
        id: number;
        createdAt: number;
        opponent: { id: number; discordId: string; username: string; avatar?: string | null };
        result: unknown;
        youWon: boolean | null;
        youArePlayerA: boolean;
      }>;
    }>(res);
  },

  async pvpLiveCreate(opponentPlayerId: number, deckCardIds?: string[], seasonId?: string) {
    const res = await fetch(`${getApiBase()}/api/pvp/live/create`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ opponentPlayerId, deckCardIds, seasonId }),
    });
    return handleResponse<{ ok: true; matchId: number }>(res);
  },

  async pvpLiveJoin(matchId: number) {
    const res = await fetch(`${getApiBase()}/api/pvp/live/${matchId}/join`, {
      method: "POST",
      headers: getHeaders(),
    });
    return handleResponse<{ ok: true; status: string }>(res);
  },

  async pvpLiveDecline(matchId: number) {
    const res = await fetch(`${getApiBase()}/api/pvp/live/${matchId}/decline`, {
      method: "POST",
      headers: getHeaders(),
    });
    return handleResponse<{ ok: true; status: string }>(res);
  },

  async pvpLiveGet(matchId: number) {
    const res = await fetch(`${getApiBase()}/api/pvp/live/${matchId}`, { headers: getHeaders() });
    return handleResponse<{ ok: true; match: unknown }>(res);
  },

  async pvpLiveAction(
    matchId: number,
    action:
      | { type: "play" | "end"; cardId?: string | null }
      | { type: "battle"; intent: import("./battleLockstep").BattleLockstepIntent }
  ) {
    const res = await fetch(`${getApiBase()}/api/pvp/live/${matchId}/action`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(action),
    });
    return handleResponse<{ ok: true; status: string; state: unknown; result: unknown; turnPlayerId: number }>(res);
  },

  async raidLiveCreate(opponentPlayerId: number, bossId: string, deckCardIds: string[]) {
    const res = await fetch(`${getApiBase()}/api/raid/live/create`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ opponentPlayerId, bossId, deckCardIds }),
    });
    return handleResponse<{ ok: true; matchId: number }>(res);
  },

  async raidLiveJoin(matchId: number, deckCardIds?: string[]) {
    const res = await fetch(`${getApiBase()}/api/raid/live/${matchId}/join`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ deckCardIds: deckCardIds ?? [] }),
    });
    return handleResponse<{ ok: true; status: string }>(res);
  },

  async raidLiveGet(matchId: number) {
    const res = await fetch(`${getApiBase()}/api/raid/live/${matchId}`, { headers: getHeaders() });
    return handleResponse<{ ok: true; match: unknown }>(res);
  },

  async raidLiveAction(matchId: number, intent: import("./battleLockstep").BattleLockstepIntent) {
    const res = await fetch(`${getApiBase()}/api/raid/live/${matchId}/action`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ intent }),
    });
    return handleResponse<{ ok: true; matchId: number; status: string }>(res);
  },

  async adminGrant(delta: { gold?: number; stardust?: number; pityCounter?: number; totalPulls?: number }) {
    const res = await fetch(`${getApiBase()}/api/admin/grant`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(delta),
    });
    return handleResponse<{ ok: true; state: import("./playerState").PlayerState }>(res);
  },

  async pullSeasonalPack(eventId: string) {
    const res = await fetch(`${getApiBase()}/api/seasonal/pull`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ eventId }),
    });
    return handleResponse<{ cardIds: string[]; state: import("./playerState").PlayerState }>(res);
  },

  // ── Social: presence ──
  async presenceHeartbeat() {
    const res = await fetch(`${getApiBase()}/api/presence/heartbeat`, { method: "POST", headers: getHeaders() });
    return handleResponse<{ ok: true }>(res);
  },
  async getFriendsOnline() {
    const res = await fetch(`${getApiBase()}/api/friends/online`, { headers: getHeaders() });
    return handleResponse<{
      friends: Array<{ id: number; discordId: string; username: string; avatar?: string | null; online: boolean; lastSeenAt: number | null; friendshipId: number }>;
    }>(res);
  },

  // ── Chat ──
  async getChat(channel: "global" | `guild:${number}`, limit = 50) {
    const path = channel === "global" ? "/api/chat/global" : `/api/chat/guild/${channel.split(":")[1]}`;
    const res = await fetch(`${getApiBase()}${path}?limit=${limit}`, { headers: getHeaders() });
    return handleResponse<{
      messages: Array<{ id: number; channel: string; playerId: number; username: string; avatar: string | null; body: string; createdAt: number }>;
    }>(res);
  },
  async postChat(channel: string, body: string) {
    const res = await fetch(`${getApiBase()}/api/chat/post`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ channel, body }),
    });
    return handleResponse<{ message: { id: number; channel: string; playerId: number; username: string; avatar: string | null; body: string; createdAt: number } }>(res);
  },

  // ── Guilds ──
  async listGuilds() {
    const res = await fetch(`${getApiBase()}/api/guilds`, { headers: getHeaders() });
    return handleResponse<{ guilds: GuildPublic[] }>(res);
  },
  async getMyGuild() {
    const res = await fetch(`${getApiBase()}/api/guilds/me`, { headers: getHeaders() });
    return handleResponse<{ guild: GuildPublic | null; members: Array<{ id: number; discordId: string; username: string; avatar?: string | null; online: boolean; lastSeenAt: number | null }> }>(res);
  },
  async createGuild(data: { name: string; tag: string; description?: string }) {
    const res = await fetch(`${getApiBase()}/api/guilds`, { method: "POST", headers: getHeaders(), body: JSON.stringify(data) });
    return handleResponse<{ ok: true; guild: GuildPublic }>(res);
  },
  async joinGuild(guildId: number) {
    const res = await fetch(`${getApiBase()}/api/guilds/${guildId}/join`, { method: "POST", headers: getHeaders() });
    return handleResponse<{ ok: true }>(res);
  },
  async leaveGuild() {
    const res = await fetch(`${getApiBase()}/api/guilds/leave`, { method: "POST", headers: getHeaders() });
    return handleResponse<{ ok: true; disbanded?: boolean }>(res);
  },
  async inviteToGuild(username: string) {
    const res = await fetch(`${getApiBase()}/api/guilds/invite`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ username }),
    });
    return handleResponse<{ ok: true; invite: GuildInvitePublic }>(res);
  },
  async getIncomingGuildInvites(limit = 3) {
    const res = await fetch(`${getApiBase()}/api/guilds/invites/incoming?limit=${encodeURIComponent(String(limit))}`, { headers: getHeaders() });
    return handleResponse<{ invites: GuildInvitePublic[] }>(res);
  },
  async respondGuildInvite(inviteId: number, accept: boolean) {
    const res = await fetch(`${getApiBase()}/api/guilds/invites/${inviteId}/respond`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify({ accept }),
    });
    return handleResponse<{ ok: true; invite: GuildInvitePublic }>(res);
  },

  // ── Spectate ──
  async getSpectateActive() {
    const res = await fetch(`${getApiBase()}/api/spectate/active`, { headers: getHeaders() });
    return handleResponse<{
      matches: Array<{
        id: number;
        playerA: { id: number; discordId: string; username: string; avatar?: string | null };
        playerB: { id: number; discordId: string; username: string; avatar?: string | null };
        turnPlayerId: number | null;
        lastActionAt: number | null;
        createdAt: number;
      }>;
    }>(res);
  },
};

export interface GuildPublic {
  id: number;
  name: string;
  tag: string;
  description: string | null;
  ownerPlayerId: number;
  memberCount: number;
  weeklyGoal: { key: string; target: number; progress: number; resetAt: number };
  createdAt: number;
}

export interface GuildInvitePublic {
  id: number;
  status: "pending" | "accepted" | "declined" | "cancelled";
  createdAt: number;
  respondedAt: number | null;
  guild: GuildPublic | null;
  fromPlayer: { id: number; discordId: string; username: string; avatar?: string | null; online: boolean; lastSeenAt: number | null } | null;
}
