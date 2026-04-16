import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { api } from "@/lib/apiClient";
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
};

export default function LivePvPBattleground({ matchId, onExit, playerState, onStateChange }: Props) {
  const [me, setMe] = useState<{ id: number; username: string } | null>(null);
  const [liveMatch, setLiveMatch] = useState<any | null>(null);
  const [acting, setActing] = useState(false);
  /** Last intent applied locally before the server confirms; cleared after sync or on error (rollback). */
  const [pendingIntent, setPendingIntent] = useState<BattleLockstepIntent | null>(null);

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
    if (!liveMatch) return;
    if (liveMatch.status !== "pending" && liveMatch.status !== "active") return;
    const id = window.setInterval(() => refresh(), 1200);
    return () => window.clearInterval(id);
  }, [liveMatch?.status, liveMatch?.id, refresh]);

  useEffect(() => {
    if (!liveMatch) return;
    if (liveMatch.status !== "active") setPendingIntent(null);
  }, [liveMatch?.status, liveMatch?.id]);

  const serverActionLog = (liveMatch?.actionLog as BattleLockstepIntent[]) || [];
  const optimisticActionLog = useMemo(() => {
    if (!pendingIntent) return serverActionLog;
    const last = serverActionLog[serverActionLog.length - 1];
    if (last && intentsEqual(last, pendingIntent)) return serverActionLog;
    return [...serverActionLog, pendingIntent];
  }, [liveMatch?.actionLog, pendingIntent]);

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
          } catch (e: any) {
            toast({ title: "Action failed", description: e?.message || "Could not apply action" });
          } finally {
            setPendingIntent(null);
            setActing(false);
          }
        },
      }}
    />
  );
}
