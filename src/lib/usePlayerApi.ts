import { useState, useEffect, useCallback, useRef } from "react";
import { type PlayerState, loadPlayerState, savePlayerState } from "./playerState";
import { api, isAuthenticated } from "./apiClient";

type LoadingStatus = "loading" | "ready" | "error";

interface UsePlayerApiReturn {
  playerState: PlayerState;
  setPlayerState: (state: PlayerState | ((prev: PlayerState) => PlayerState)) => void;
  status: LoadingStatus;
  isOnline: boolean;
  completeOnboarding: (path: "fire" | "nature" | "shadow") => Promise<PlayerState | null>;
  pullCards: (packId: string) => Promise<{
    pullResults: Array<{
      cardId: string;
      isDuplicate: boolean;
      stardustEarned: number;
      newGoldStar: boolean;
      newRedStar: boolean;
      rarity: string;
    }>;
    state: PlayerState;
  } | null>;
  submitBattleResult: (data: {
    won: boolean;
    draw?: boolean;
    turnCount: number;
    deckCardIds: string[];
  }) => Promise<{
    goldReward: number;
    levelUps: Array<{ cardId: string; oldLevel: number; newLevel: number }>;
  } | null>;
  syncEconomy: (gold: number, stardust: number) => Promise<void>;
  craftFuse: (inputRarity: string, selectedCardIds: string[]) => Promise<{ resultCardId: string } | null>;
  craftSacrifice: (cardIds: string[]) => Promise<{ totalStardust: number } | null>;
  pullSeasonalPack: (eventId: string) => Promise<{ cardIds: string[]; state: PlayerState } | null>;
}

const MIGRATION_KEY = "lorebound-migrated";

export function usePlayerApi(): UsePlayerApiReturn {
  const online = isAuthenticated();
  const [status, setStatus] = useState<LoadingStatus>(online ? "loading" : "ready");
  const [playerState, setPlayerStateInternal] = useState<PlayerState>(loadPlayerState);
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bpSyncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!online) return;

    let cancelled = false;

    async function init() {
      try {
        const localState = loadPlayerState();
        const migrated = localStorage.getItem(MIGRATION_KEY);

        if (!migrated && localState.totalPulls > 0) {
          try {
            const imported = await api.importLocalState(localState) as PlayerState;
            localStorage.setItem(MIGRATION_KEY, "1");
            if (!cancelled) {
              setPlayerStateInternal(imported);
              setStatus("ready");
            }
            return;
          } catch {
            // 409 = already exists, continue loading from server
          }
        }

        localStorage.setItem(MIGRATION_KEY, "1");
        const serverState = await api.getPlayer() as PlayerState;
        if (!cancelled) {
          setPlayerStateInternal(serverState);
          savePlayerState(serverState);
          setStatus("ready");
        }
      } catch (err) {
        console.error("[usePlayerApi] Failed to load from server, using local:", err);
        if (!cancelled) setStatus("ready");
      }
    }

    init();
    return () => { cancelled = true; };
  }, [online]);

  const setPlayerState = useCallback(
    (update: PlayerState | ((prev: PlayerState) => PlayerState)) => {
      setPlayerStateInternal((prev) => {
        const next = typeof update === "function" ? update(prev) : update;
        savePlayerState(next);

        // Online: persist battle pass + cosmetics (debounced).
        if (online) {
          if (bpSyncTimer.current) clearTimeout(bpSyncTimer.current);
          bpSyncTimer.current = setTimeout(() => {
            api.patchPlayer({
              battlePass: next.battlePass,
              cosmeticsOwned: next.cosmeticsOwned,
              cosmeticsEquipped: next.cosmeticsEquipped,
              battlePassXpBoostExpiresAt: next.battlePassXpBoostExpiresAt,
              deckPresets: next.deckPresets,
            }).catch(() => {});
          }, 600);
        }

        return next;
      });
    },
    [online],
  );

  const completeOnboarding = useCallback(
    async (path: "fire" | "nature" | "shadow") => {
      if (!online) return null;
      try {
        const state = (await api.completeOnboarding(path)) as PlayerState;
        setPlayerStateInternal(state);
        savePlayerState(state);
        return state;
      } catch (err) {
        console.error("[usePlayerApi] completeOnboarding failed:", err);
        return null;
      }
    },
    [online],
  );

  const pullCards = useCallback(
    async (packId: string) => {
      if (!online) return null;
      try {
        const result = await api.pullCards(packId);
        setPlayerStateInternal(result.state);
        savePlayerState(result.state);
        return { pullResults: result.pullResults, state: result.state };
      } catch (err) {
        console.error("[usePlayerApi] pullCards failed:", err);
        return null;
      }
    },
    [online],
  );

  const submitBattleResult = useCallback(
    async (data: { won: boolean; draw?: boolean; turnCount: number; deckCardIds: string[] }) => {
      if (!online) return null;
      try {
        const result = await api.submitBattleResult(data);
        setPlayerStateInternal(result.state);
        savePlayerState(result.state);
        return { goldReward: result.goldReward, levelUps: result.levelUps };
      } catch (err) {
        console.error("[usePlayerApi] submitBattleResult failed:", err);
        return null;
      }
    },
    [online],
  );

  const syncEconomy = useCallback(
    async (gold: number, stardust: number) => {
      if (!online) return;
      try {
        await api.syncEconomy({ gold, stardust });
      } catch (err) {
        console.error("[usePlayerApi] syncEconomy failed:", err);
      }
    },
    [online],
  );

  const craftFuse = useCallback(
    async (inputRarity: string, selectedCardIds: string[]) => {
      if (!online) return null;
      try {
        const result = await api.craftFuse(inputRarity, selectedCardIds);
        setPlayerStateInternal(result.state);
        savePlayerState(result.state);
        return { resultCardId: result.resultCardId };
      } catch (err) {
        console.error("[usePlayerApi] craftFuse failed:", err);
        return null;
      }
    },
    [online],
  );

  const craftSacrifice = useCallback(
    async (cardIds: string[]) => {
      if (!online) return null;
      try {
        const result = await api.craftSacrifice(cardIds);
        setPlayerStateInternal(result.state);
        savePlayerState(result.state);
        return { totalStardust: result.totalStardust };
      } catch (err) {
        console.error("[usePlayerApi] craftSacrifice failed:", err);
        return null;
      }
    },
    [online],
  );

  const pullSeasonalPack = useCallback(
    async (eventId: string) => {
      if (!online) return null;
      try {
        const result = await api.pullSeasonalPack(eventId);
        setPlayerStateInternal(result.state);
        savePlayerState(result.state);
        return { cardIds: result.cardIds, state: result.state };
      } catch (err) {
        console.error("[usePlayerApi] pullSeasonalPack failed:", err);
        return null;
      }
    },
    [online],
  );

  return {
    playerState,
    setPlayerState,
    status,
    isOnline: online,
    completeOnboarding,
    pullCards,
    submitBattleResult,
    syncEconomy,
    craftFuse,
    craftSacrifice,
    pullSeasonalPack,
  };
}
