import { useState, useEffect, useCallback, useRef } from "react";
import { type PlayerState, loadPlayerState, savePlayerState, normalizePlayerState, mergeClientOnlyPlayerState } from "./playerState";
import { hasClaimedMissingDailyCardRewards } from "./dailyPathRewards";
import { api, isAuthenticated } from "./apiClient";
import { toast } from "@/hooks/use-toast";

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
    matchId: string;
    raidBossId?: string;
    won: boolean;
    draw?: boolean;
    turnCount: number;
    deckCardIds: string[];
    actionLog?: import("./battleLockstep").BattleLockstepIntent[];
  }) => Promise<{
    goldReward: number;
    levelUps: Array<{ cardId: string; oldLevel: number; newLevel: number }>;
  } | null>;
  syncEconomy: (gold?: number, stardust?: number) => Promise<void>;
  craftFuse: (inputRarity: string, selectedCardIds: string[]) => Promise<{ resultCardId: string } | null>;
  craftSacrifice: (cardIds: string[]) => Promise<{ totalStardust: number } | null>;
  pullSeasonalPack: (eventId: string) => Promise<{ cardIds: string[]; state: PlayerState } | null>;
  claimDailyLogin: () => Promise<{
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
    state: PlayerState;
  } | null>;
  startPveBattle: (body: {
    deckCardIds: string[];
    raidBossId?: string;
    opponentDeckIds?: string[] | null;
    raidCoopHotseat?: boolean;
  }) => Promise<{
    matchId: string;
    seed?: number;
    enemyDeckIds?: string[];
    skipReplayVerification?: boolean;
  } | null>;
}

const MIGRATION_KEY = "lorebound-migrated";

export function usePlayerApi(): UsePlayerApiReturn {
  const online = isAuthenticated();
  const [status, setStatus] = useState<LoadingStatus>(online ? "loading" : "ready");
  const [playerState, setPlayerStateInternal] = useState<PlayerState>(loadPlayerState);
  const playerRef = useRef<PlayerState>(loadPlayerState);
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bpSyncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    playerRef.current = playerState;
  }, [playerState]);

  useEffect(() => {
    if (!online) return;

    let cancelled = false;

    async function init() {
      try {
        const localState = loadPlayerState();
        const migrated = localStorage.getItem(MIGRATION_KEY);

        if (!migrated && localState.totalPulls > 0) {
          try {
            const raw = await api.importLocalState(localState) as PlayerState;
            const imported = mergeClientOnlyPlayerState(normalizePlayerState(raw), localState);
            localStorage.setItem(MIGRATION_KEY, "1");
            if (!cancelled) {
              setPlayerStateInternal(imported);
              savePlayerState(imported);
              setStatus("ready");
            }
            return;
          } catch {
            // 409 = already exists, continue loading from server
          }
        }

        localStorage.setItem(MIGRATION_KEY, "1");
        const freshLocal = loadPlayerState();
        const serverState = normalizePlayerState(await api.getPlayer() as PlayerState);
        let merged = mergeClientOnlyPlayerState(serverState, freshLocal);
        if (hasClaimedMissingDailyCardRewards(merged)) {
          try {
            const repair = await api.repairDailyLoginCards();
            merged = mergeClientOnlyPlayerState(normalizePlayerState(repair.state), merged);
          } catch (repairErr) {
            console.error("[usePlayerApi] daily-login repair failed:", repairErr);
          }
        }
        if (!cancelled) {
          setPlayerStateInternal(merged);
          savePlayerState(merged);
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
        const state = normalizePlayerState((await api.completeOnboarding(path)) as PlayerState);
        const prev = loadPlayerState();
        const merged = mergeClientOnlyPlayerState(state, prev);
        setPlayerStateInternal(merged);
        savePlayerState(merged);
        return merged;
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
        const server = normalizePlayerState(result.state);
        let merged: PlayerState | undefined;
        setPlayerStateInternal((prev) => {
          merged = mergeClientOnlyPlayerState(server, prev);
          savePlayerState(merged);
          return merged;
        });
        return { pullResults: result.pullResults, state: merged! };
      } catch (err) {
        console.error("[usePlayerApi] pullCards failed:", err);
        return null;
      }
    },
    [online],
  );

  const submitBattleResult = useCallback(
    async (data: {
      matchId: string;
      won: boolean;
      draw?: boolean;
      turnCount: number;
      deckCardIds: string[];
      raidBossId?: string;
      actionLog?: import("./battleLockstep").BattleLockstepIntent[];
    }) => {
      if (!online) return null;
      try {
        const result = await api.submitBattleResult(data);
        const server = normalizePlayerState(result.state);
        setPlayerStateInternal((prev) => {
          const merged = mergeClientOnlyPlayerState(server, prev);
          savePlayerState(merged);
          return merged;
        });
        return { goldReward: result.goldReward, levelUps: result.levelUps };
      } catch (err) {
        console.error("[usePlayerApi] submitBattleResult failed:", err);
        return null;
      }
    },
    [online],
  );

  const syncEconomy = useCallback(
    async (_gold?: number, _stardust?: number) => {
      if (!online) return;
      try {
        const server = normalizePlayerState((await api.syncEconomy()) as import("./playerState").PlayerState);
        setPlayerStateInternal((prev) => {
          const merged = mergeClientOnlyPlayerState(server, prev);
          savePlayerState(merged);
          return merged;
        });
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
        const server = normalizePlayerState(result.state);
        setPlayerStateInternal((prev) => {
          const merged = mergeClientOnlyPlayerState(server, prev);
          savePlayerState(merged);
          return merged;
        });
        return { resultCardId: result.resultCardId };
      } catch (err) {
        console.error("[usePlayerApi] craftFuse failed:", err);
        const msg = err instanceof Error ? err.message : "Fusion failed";
        toast({ title: "Fusion failed", description: msg, variant: "destructive" });
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
        const server = normalizePlayerState(result.state);
        setPlayerStateInternal((prev) => {
          const merged = mergeClientOnlyPlayerState(server, prev);
          savePlayerState(merged);
          return merged;
        });
        return { totalStardust: result.totalStardust };
      } catch (err) {
        console.error("[usePlayerApi] craftSacrifice failed:", err);
        const msg = err instanceof Error ? err.message : "Sacrifice failed";
        toast({ title: "Sacrifice failed", description: msg, variant: "destructive" });
        return null;
      }
    },
    [online],
  );

  const startPveBattle = useCallback(
    async (body: {
      deckCardIds: string[];
      raidBossId?: string;
      opponentDeckIds?: string[] | null;
      raidCoopHotseat?: boolean;
    }) => {
      if (!online) return null;
      try {
        return await api.startPveBattle(body);
      } catch (err) {
        console.error("[usePlayerApi] startPveBattle failed:", err);
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
        const server = normalizePlayerState(result.state);
        let merged: PlayerState | undefined;
        setPlayerStateInternal((prev) => {
          merged = mergeClientOnlyPlayerState(server, prev);
          savePlayerState(merged);
          return merged;
        });
        return { cardIds: result.cardIds, state: merged! };
      } catch (err) {
        console.error("[usePlayerApi] pullSeasonalPack failed:", err);
        return null;
      }
    },
    [online],
  );

  const claimDailyLogin = useCallback(async () => {
    if (!online) return null;
    try {
      const result = await api.claimDailyLogin();
      const server = normalizePlayerState(result.state);
      const merged = mergeClientOnlyPlayerState(server, playerRef.current);
      playerRef.current = merged;
      savePlayerState(merged);
      setPlayerStateInternal(merged);
      return { preview: result.preview, state: merged };
    } catch (err) {
      console.error("[usePlayerApi] claimDailyLogin failed:", err);
      return null;
    }
  }, [online]);

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
    claimDailyLogin,
    startPveBattle,
  };
}
