import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { api } from "@/lib/apiClient";
import { toast } from "@/hooks/use-toast";
import BattleArena from "./BattleArena";
import LegacyLivePvPBattleground from "./LegacyLivePvPBattleground";
import type { PlayerState } from "@/lib/playerState";
import type { BattleLockstepIntent } from "@/lib/battleLockstep";

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
    const id = window.setInterval(() => refresh(), 2500);
    return () => window.clearInterval(id);
  }, [liveMatch?.status, liveMatch?.id, refresh]);

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
  const actionLog = (liveMatch.actionLog as BattleLockstepIntent[]) || [];

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
          actionLog,
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
        actionLog,
        isSubmitting: acting,
        onIntent: async (intent) => {
          setActing(true);
          try {
            await api.pvpLiveAction(matchId, { type: "battle", intent });
            await refresh();
          } catch (e: any) {
            toast({ title: "Action failed", description: e?.message || "Could not apply action" });
          } finally {
            setActing(false);
          }
        },
      }}
    />
  );
}
