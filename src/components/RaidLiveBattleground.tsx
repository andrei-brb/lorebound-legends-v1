import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { api, getLiveRaidWebSocketUrl } from "@/lib/apiClient";
import { toast } from "@/hooks/use-toast";
import type { PlayerState } from "@/lib/playerState";
import type { BattleLockstepIntent } from "@/lib/battleLockstep";
import RaidCoopArena from "@/components/RaidCoopArena";
import { getRaidBoss } from "@/lib/raid/bosses";
import { raidReplayFromLog, type RaidCoopState } from "@/lib/raid/raidCoopEngine";

type LiveRaidMatch = {
  id?: number;
  status?: string;
  playerA?: { id: number; username: string };
  playerB?: { id: number; username: string };
  turnPlayerId?: number | null;
  seed?: number | null;
  actionLog?: BattleLockstepIntent[];
  state?: { bossId?: string; deckA?: string[]; deckB?: string[]; engine?: string };
  result?: unknown;
};

type Props = {
  matchId: number;
  onExit: () => void;
  playerState: PlayerState;
  onStateChange: (s: PlayerState) => void;
  submitBattleResult: (data: {
    matchId: string;
    won: boolean;
    draw?: boolean;
    turnCount: number;
    deckCardIds: string[];
    raidBossId?: string;
  }) => Promise<{
    goldReward: number;
    levelUps: Array<{ cardId: string; oldLevel: number; newLevel: number }>;
  } | null>;
  startPveBattle: (body: {
    deckCardIds: string[];
    raidBossId?: string;
    raidCoopHotseat?: boolean;
  }) => Promise<{
    matchId: string;
    seed?: number;
    enemyDeckIds?: string[];
    skipReplayVerification?: boolean;
  } | null>;
  syncEconomyApi?: (gold?: number, stardust?: number) => Promise<void>;
};

export default function RaidLiveBattleground({
  matchId,
  onExit,
  playerState,
  onStateChange,
  submitBattleResult,
  startPveBattle,
  syncEconomyApi,
}: Props) {
  const [me, setMe] = useState<{ id: number; username: string } | null>(null);
  const [liveMatch, setLiveMatch] = useState<LiveRaidMatch | null>(null);
  const [intentSubmitting, setIntentSubmitting] = useState(false);
  const [liveWsConnected, setLiveWsConnected] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoadError(null);
      const [meRes, matchRes] = await Promise.all([api.getMe(), api.raidLiveGet(matchId)]);
      setMe({ id: meRes.me.id, username: meRes.me.username });
      setLiveMatch(matchRes.match as LiveRaidMatch);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setLoadError(msg || "Could not load raid match.");
      toast({ title: "Raid match load failed", description: msg });
    }
  }, [matchId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!liveMatch) return;
    if (liveMatch.status !== "pending" && liveMatch.status !== "active") return;
    const url = getLiveRaidWebSocketUrl(matchId);
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
        ws = new WebSocket(url);
        ws.onopen = () => {
          if (!cancelled) setLiveWsConnected(true);
        };
        ws.onmessage = (ev) => {
          try {
            const data = JSON.parse(String(ev.data));
            if (data?.type === "live_match" && data?.ok) {
              setLiveMatch(data.match as LiveRaidMatch);
            }
          } catch {
            /* ignore */
          }
        };
        ws.onclose = () => {
          if (!cancelled) setLiveWsConnected(false);
          if (!cancelled) reconnectTimer = window.setTimeout(connect, 2500);
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

  const serverActionLog = useMemo(
    () => (Array.isArray(liveMatch?.actionLog) ? liveMatch!.actionLog! : []) as BattleLockstepIntent[],
    [liveMatch?.actionLog],
  );

  const raid = useMemo((): RaidCoopState | null => {
    if (!liveMatch || !me) return null;
    const s = liveMatch.state || {};
    const deckA = s.deckA || [];
    const deckB = s.deckB || [];
    const bossId = String(s.bossId || "ember-tyrant");
    const boss = getRaidBoss(bossId);
    if (!boss || deckA.length === 0 || deckB.length === 0) return null;
    const seed = liveMatch.seed ?? 0;
    return raidReplayFromLog(deckA, deckB, boss, seed, serverActionLog);
  }, [liveMatch, me, serverActionLog]);

  const patchRaid = useCallback((_fn: (r: RaidCoopState) => void) => {
    /* server-authoritative: no local mutation */
  }, []);

  const myDeckIds = useMemo(() => {
    if (!liveMatch || !me) return [];
    const s = liveMatch.state || {};
    const isA = liveMatch.playerA?.id === me.id;
    return isA ? s.deckA || [] : s.deckB || [];
  }, [liveMatch, me]);

  if (!liveMatch || !me) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4 text-center">
        <Loader2 className="w-10 h-10 animate-spin text-muted-foreground" />
        {loadError ? (
          <>
            <p className="text-sm text-muted-foreground max-w-md">{loadError}</p>
            <div className="flex flex-wrap gap-2 justify-center">
              <button type="button" className="btn-gold" onClick={() => refresh()} data-testid="liveraid-retry">
                Retry
              </button>
              <button type="button" className="btn-ghost" onClick={onExit} data-testid="liveraid-back">
                Back
              </button>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => {
                  sessionStorage.removeItem("raid.live.matchId");
                  onExit();
                }}
                data-testid="liveraid-clear"
              >
                Clear match
              </button>
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground max-w-md">Loading raid match…</p>
        )}
      </div>
    );
  }

  const s = liveMatch.state || {};
  const deckA: string[] = s.deckA || [];
  const deckB: string[] = s.deckB || [];
  const canPlay = liveMatch.status === "active" && deckA.length > 0 && deckB.length > 0;
  const isTerminal = liveMatch.status === "completed" || liveMatch.status === "cancelled";

  if (liveMatch.status === "pending" || !canPlay) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4">
        <Loader2 className="w-10 h-10 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground text-center max-w-md">
          {liveMatch.status === "pending"
            ? "Waiting for ally to join the raid…"
            : "Both decks must be ready before the raid can start."}
        </p>
      </div>
    );
  }

  if (!raid || isTerminal) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3 px-4">
        <p className="text-sm text-muted-foreground">
          {isTerminal ? "This raid match has ended." : "Loading raid state…"}
        </p>
        <button type="button" onClick={onExit} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-heading">
          Back
        </button>
      </div>
    );
  }

  return (
    <RaidCoopArena
      raid={raid}
      onRaidPatch={patchRaid}
      onIntent={async (intent) => {
        setIntentSubmitting(true);
        try {
          await api.raidLiveAction(matchId, intent);
          await refresh();
        } catch (e) {
          toast({ title: "Raid action failed", description: e instanceof Error ? e.message : String(e), variant: "destructive" });
        } finally {
          setIntentSubmitting(false);
        }
      }}
      intentSubmitting={intentSubmitting}
      onExit={onExit}
      playerDeckIds={myDeckIds.length > 0 ? myDeckIds : deckA}
      playerState={playerState}
      onStateChange={onStateChange}
      isOnline={true}
      submitBattleResultApi={submitBattleResult}
      startPveBattleApi={startPveBattle}
      syncEconomyApi={syncEconomyApi}
    />
  );
}
