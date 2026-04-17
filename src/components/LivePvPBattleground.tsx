import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { api, getLivePvpWebSocketUrl } from "@/lib/apiClient";
import { toast } from "@/hooks/use-toast";
import BattleArena from "./BattleArena";
import LegacyLivePvPBattleground from "./LegacyLivePvPBattleground";
import type { PlayerState } from "@/lib/playerState";
import type { BattleLockstepIntent } from "@/lib/battleLockstep";

function intentsEqual(a: BattleLockstepIntent, b: BattleLockstepIntent): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

type Props = {
  matchId: number;
  onExit: () => void;
  playerState: PlayerState;
  onStateChange: (s: PlayerState) => void;
  syncEconomyApi?: (gold: number, stardust: number) => Promise<void>;
};

export default function LivePvPBattleground({ matchId, onExit, playerState, onStateChange, syncEconomyApi }: Props) {
  const [me, setMe] = useState<{ id: number; username: string } | null>(null);
  const [liveMatch, setLiveMatch] = useState<{
    id?: number;
    status?: "pending" | "active" | "completed" | "cancelled" | string;
    playerA?: { id: number; username: string; deckCardIds?: string[] | null };
    playerB?: { id: number; username: string; deckCardIds?: string[] | null };
    turnPlayerId?: number | null;
    serverActionLog?: unknown;
    seed?: number | null;
    result?: unknown;
    state?: unknown;
  } | null>(null);
  const [acting, setActing] = useState(false);
  /** Last intent applied locally before the server confirms; cleared after sync or on error (rollback). */
  const [pendingIntent, setPendingIntent] = useState<BattleLockstepIntent | null>(null);
  const [liveWsConnected, setLiveWsConnected] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const [meRes, matchRes] = await Promise.all([api.getMe(), api.pvpLiveGet(matchId)]);
      setMe({ id: meRes.me.id, username: meRes.me.username });
      setLiveMatch(matchRes.match);
    } catch (e) {
      toast({ title: "Match load failed", description: e instanceof Error ? e.message : String(e) });
    }
  }, [matchId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const onResume = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    window.addEventListener("pageshow", onResume);
    document.addEventListener("visibilitychange", onResume);
    return () => {
      window.removeEventListener("pageshow", onResume);
      document.removeEventListener("visibilitychange", onResume);
    };
  }, [refresh]);

  useEffect(() => {
    if (!liveMatch) return;
    if (liveMatch.status !== "pending" && liveMatch.status !== "active") return;
    const url = getLivePvpWebSocketUrl(matchId);
    if (!url) {
      setLiveWsConnected(false);
      return;
    }
    let cancelled = false;
    let ws: WebSocket | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;

    const connect = () => {
      if (cancelled) return;
      try {
        ws?.close();
        ws = new WebSocket(url);
        ws.onopen = () => {
          if (!cancelled) setLiveWsConnected(true);
        };
        ws.onmessage = (ev) => {
          try {
            const data = JSON.parse(String(ev.data)) as { type?: string; ok?: boolean; match?: unknown };
            if (data.type === "live_match" && data.ok && data.match) {
              setLiveMatch(data.match);
            }
          } catch {
            /* ignore */
          }
        };
        ws.onclose = () => {
          if (!cancelled) setLiveWsConnected(false);
          if (!cancelled) {
            reconnectTimer = window.setTimeout(connect, 2500);
          }
        };
        ws.onerror = () => {
          ws?.close();
        };
      } catch {
        if (!cancelled) reconnectTimer = window.setTimeout(connect, 2500);
      }
    };

    connect();
    return () => {
      cancelled = true;
      if (reconnectTimer !== undefined) window.clearTimeout(reconnectTimer);
      ws?.close();
      setLiveWsConnected(false);
    };
  }, [matchId, liveMatch]);

  useEffect(() => {
    if (!liveMatch) return;
    if (liveMatch.status !== "pending" && liveMatch.status !== "active") return;
    const intervalMs = liveWsConnected ? 30_000 : 1200;
    const id = window.setInterval(() => refresh(), intervalMs);
    return () => window.clearInterval(id);
  }, [liveMatch, refresh, liveWsConnected]);

  useEffect(() => {
    if (!liveMatch) return;
    if (liveMatch.status !== "active") setPendingIntent(null);
  }, [liveMatch]);

  const serverActionLog = useMemo(
    () => (liveMatch?.actionLog as BattleLockstepIntent[]) || [],
    [liveMatch?.actionLog]
  );
  const optimisticActionLog = useMemo(() => {
    if (!pendingIntent) return serverActionLog;
    const last = serverActionLog[serverActionLog.length - 1];
    if (last && intentsEqual(last, pendingIntent)) return serverActionLog;
    return [...serverActionLog, pendingIntent];
  }, [serverActionLog, pendingIntent]);

  if (!liveMatch || !me) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const s = liveMatch.state || {};
  const isBattle = s.engine === "battle" || s.version === 2;

  if (!isBattle && (liveMatch.status === "pending" || liveMatch.status === "active")) {
    return <LegacyLivePvPBattleground matchId={matchId} onExit={onExit} />;
  }

  const isA = liveMatch.playerA?.id === me.id;
  const deckA: string[] = s.deckA || [];
  const deckB: string[] = s.deckB || [];
  const seed = liveMatch.seed ?? 0;

  const canPlay = liveMatch.status === "active" && deckA.length > 0 && deckB.length > 0;
  const isTerminal = liveMatch.status === "completed" || liveMatch.status === "cancelled";

  if (isBattle && isTerminal && deckA.length > 0 && deckB.length > 0) {
    return (
      <BattleArena
        playerDeckIds={deckA}
        opponentDeckIds={deckB}
        playerState={playerState}
        onStateChange={onStateChange}
        onExit={onExit}
        isOnline={true}
        syncEconomyApi={syncEconomyApi}
        livePvP={{
          seed,
          deckA,
          deckB,
          viewerIsA: isA,
          actionLog: serverActionLog,
          isSubmitting: false,
          onIntent: async () => {},
        }}
      />
    );
  }

  if (liveMatch.status === "pending" || !canPlay) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4">
        <Loader2 className="w-10 h-10 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground text-center max-w-md">
          {liveMatch.status === "pending"
            ? "Waiting for opponent to join…"
            : "Both decks must be ready. Ensure the invitee has a ranked deck snapshot or joins with a deck."}
        </p>
      </div>
    );
  }

  return (
    <BattleArena
      playerDeckIds={deckA}
      opponentDeckIds={deckB}
      playerState={playerState}
      onStateChange={onStateChange}
      onExit={onExit}
      isOnline={true}
      syncEconomyApi={syncEconomyApi}
      livePvP={{
        seed,
        deckA,
        deckB,
        viewerIsA: isA,
        actionLog: optimisticActionLog,
        isSubmitting: acting,
        onIntent: async (intent) => {
          setPendingIntent(intent);
          setActing(true);
          try {
            await api.pvpLiveAction(matchId, { type: "battle", intent });
            await refresh();
          } catch (e: unknown) {
            const message = e instanceof Error ? e.message : "Could not apply action";
            toast({ title: "Action failed", description: message });
          } finally {
            setPendingIntent(null);
            setActing(false);
          }
        },
      }}
    />
  );
}
