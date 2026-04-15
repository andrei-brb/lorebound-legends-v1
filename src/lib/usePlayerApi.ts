import { useState, useEffect, useCallback, useRef } from "react";
import { type PlayerState, loadPlayerState, savePlayerState } from "./playerState";
import { api, isAuthenticated } from "./apiClient";

type LoadingStatus = "loading" | "ready" | "error";

interface UsePlayerApiReturn {
  playerState: PlayerState;
  setPlayerState: (state: PlayerState | ((prev: PlayerState) => PlayerState)) => void;
  status: LoadingStatus;
  isOnline: boolean;
  pullCards: (packId: string) => Promise<{
    pullResults: Array<{
      cardId: string;
      isDuplicate: boolean;
      stardustEarned: number;
      newGoldStar: boolean;
      newRedStar: boolean;
      rarity: string;
    }>;
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
}

const MIGRATION_KEY = "lorebound-migrated";

export function usePlayerApi(): UsePlayerApiReturn {
  const online = isAuthenticated();
  const [status, setStatus] = useState<LoadingStatus>(online ? "loading" : "ready");
  const [playerState, setPlayerStateInternal] = useState<PlayerState>(loadPlayerState);
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
        return next;
      });
    },
    [],
  );

  const pullCards = useCallback(
    async (packId: string) => {
      if (!online) return null;
      try {
        const result = await api.pullCards(packId);
        setPlayerStateInternal(result.state);
        savePlayerState(result.state);
        return { pullResults: result.pullResults };
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

  return {
    playerState,
    setPlayerState,
    status,
    isOnline: online,
    pullCards,
    submitBattleResult,
  };
}
