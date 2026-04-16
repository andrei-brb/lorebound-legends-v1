import { getDiscordAuth } from "./discordEmbedded";

function getApiBase(): string {
  if (typeof window !== "undefined" && window.location.hostname.endsWith("discordsays.com")) {
    return "/.proxy";
  }
  return "";
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
    return handleResponse<{ me: { id: number; discordId: string; username: string; avatar?: string | null } }>(res);
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

  async submitBattleResult(data: {
    won: boolean;
    draw?: boolean;
    turnCount: number;
    deckCardIds: string[];
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

  async syncEconomy(data: { gold: number; stardust: number }) {
    const res = await fetch(`${getApiBase()}/api/player`, {
      method: "PATCH",
      headers: getHeaders(),
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  async getLeaderboard(tab: "wins" | "collection" | "rarest") {
    const res = await fetch(`${getApiBase()}/api/leaderboard?tab=${encodeURIComponent(tab)}`, { headers: getHeaders() });
    return handleResponse<{ entries: Array<{ rank: number; name: string; avatar?: string | null; discordId: string; value: number }> }>(res);
  },

  async getFriends() {
    const res = await fetch(`${getApiBase()}/api/friends`, { headers: getHeaders() });
    return handleResponse<{
      accepted: Array<{ id: number; friend: { id: number; discordId: string; username: string; avatar?: string | null }; createdAt: number }>;
      incoming: Array<{ id: number; from: { id: number; discordId: string; username: string; avatar?: string | null }; createdAt: number }>;
      outgoing: Array<{ id: number; to: { id: number; discordId: string; username: string; avatar?: string | null }; createdAt: number }>;
    }>(res);
  },

  async getNotifications(limit: number = 30) {
    const res = await fetch(`${getApiBase()}/api/notifications?limit=${encodeURIComponent(String(limit))}`, { headers: getHeaders() });
    return handleResponse<{ notifications: Array<{
      id: number;
      type: string;
      title: string;
      body?: string | null;
      data?: any;
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
    return handleResponse<{ ok: true; result: any }>(res);
  },

  async pvpHistory() {
    const res = await fetch(`${getApiBase()}/api/pvp/history`, { headers: getHeaders() });
    return handleResponse<{ matches: Array<{ id: number; createdAt: number; opponent: { id: number; discordId: string; username: string; avatar?: string | null }; result: any }> }>(res);
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
    return handleResponse<{ ok: true; match: any }>(res);
  },

  async pvpLiveAction(matchId: number, action: { type: "play" | "end"; cardId?: string | null }) {
    const res = await fetch(`${getApiBase()}/api/pvp/live/${matchId}/action`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(action),
    });
    return handleResponse<{ ok: true; status: string; state: any; result: any; turnPlayerId: number }>(res);
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
};
