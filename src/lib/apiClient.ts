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

  async adminGrant(delta: { gold?: number; stardust?: number; pityCounter?: number; totalPulls?: number }) {
    const res = await fetch(`${getApiBase()}/api/admin/grant`, {
      method: "POST",
      headers: getHeaders(),
      body: JSON.stringify(delta),
    });
    return handleResponse<{ ok: true; state: import("./playerState").PlayerState }>(res);
  },
};
