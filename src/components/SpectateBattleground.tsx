import { useCallback, useEffect, useMemo, useState } from "react";
import { Eye, Loader2 } from "lucide-react";
import { api, getLivePvpWebSocketUrl } from "@/lib/apiClient";
import { toast } from "@/hooks/use-toast";
import BattleArena from "./BattleArena";
import LegacyLivePvPBattleground from "./LegacyLivePvPBattleground";
import type { PlayerState } from "@/lib/playerState";
import type { BattleLockstepIntent } from "@/lib/battleLockstep";

type Props = {
  matchId: number;
  onExit: () => void;
  playerState: PlayerState;
};

export default function SpectateBattleground({ matchId, onExit, playerState }: Props) {
  const [liveMatch, setLiveMatch] = useState<{
    status?: string;
    playerA?: { id: number; username: string };
    playerB?: { id: number; username: string };
    seed?: number | null;
    serverActionLog?: unknown;
    state?: unknown;
  } | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoadError(null);
      const matchRes = await api.pvpLiveGet(matchId);
      setLiveMatch(matchRes.match);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setLoadError(msg || "Could not load match.");
      toast({ title: "Spectate failed", description: msg, variant: "destructive" });
    }
  }, [matchId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (!liveMatch) return;
    if (liveMatch.status !== "pending" && liveMatch.status !== "active") return;
    const url = getLivePvpWebSocketUrl(matchId);
    if (!url) return;
    let cancelled = false;
    let ws: WebSocket | null = null;
    const connect = () => {
      ws = new WebSocket(url);
      ws.onmessage = () => { if (!cancelled) void refresh(); };
    };
    connect();
    const poll = window.setInterval(() => { if (!cancelled) void refresh(); }, 4000);
    return () => {
      cancelled = true;
      window.clearInterval(poll);
      ws?.close();
    };
  }, [liveMatch?.status, matchId, refresh]);

  const serverActionLog = useMemo(
    () => (Array.isArray(liveMatch?.serverActionLog) ? liveMatch!.serverActionLog as BattleLockstepIntent[] : []),
    [liveMatch?.serverActionLog],
  );

  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 px-4">
        <p className="text-sm text-muted-foreground text-center">{loadError}</p>
        <button type="button" onClick={onExit} className="px-4 py-2 rounded-lg bg-secondary text-sm font-heading">
          Back
        </button>
      </div>
    );
  }

  if (!liveMatch) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-2">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Loading match…</p>
      </div>
    );
  }

  const s = liveMatch.state || {};
  const isBattle = s.engine === "battle" || s.version === 2;
  if (!isBattle && (liveMatch.status === "pending" || liveMatch.status === "active")) {
    return <LegacyLivePvPBattleground matchId={matchId} onExit={onExit} />;
  }

  const deckA: string[] = s.deckA || [];
  const deckB: string[] = s.deckB || [];
  const seed = liveMatch.seed ?? 0;
  const canWatch = deckA.length > 0 && deckB.length > 0;

  if (!canWatch) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 px-4 text-center">
        <Eye className="w-10 h-10 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">Waiting for both players to ready their decks…</p>
        <button type="button" onClick={onExit} className="px-4 py-2 rounded-lg bg-secondary text-sm font-heading">
          Back
        </button>
      </div>
    );
  }

  const labelA = liveMatch.playerA?.username ?? "Player A";
  const labelB = liveMatch.playerB?.username ?? "Player B";

  return (
    <div className="relative">
      <div className="mb-3 flex items-center justify-between gap-3 px-2 py-2 rounded-lg bg-[hsl(var(--rare)/0.15)] ring-1 ring-[hsl(var(--rare)/0.35)]">
        <span className="flex items-center gap-2 text-xs font-heading uppercase tracking-wider text-[hsl(var(--rare))]">
          <Eye className="w-4 h-4" /> Spectating · {labelA} vs {labelB}
        </span>
        <button type="button" onClick={onExit} className="text-xs text-muted-foreground hover:text-foreground">
          Exit
        </button>
      </div>
      <BattleArena
        playerDeckIds={deckA}
        opponentDeckIds={deckB}
        playerState={playerState}
        onStateChange={() => {}}
        onExit={onExit}
        isOnline={true}
        livePvP={{
          seed,
          deckA,
          deckB,
          viewerIsA: true,
          actionLog: serverActionLog,
          isSubmitting: false,
          spectator: true,
          onIntent: async () => {},
        }}
      />
    </div>
  );
}
