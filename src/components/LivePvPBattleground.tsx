import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Loader2, Swords } from "lucide-react";
import { api } from "@/lib/apiClient";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { allGameCards } from "@/data/cardIndex";

function cardName(id: string) {
  return allGameCards.find((c) => c.id === id)?.name || id;
}

type Props = {
  matchId: number;
  onExit: () => void;
};

export default function LivePvPBattleground({ matchId, onExit }: Props) {
  const [me, setMe] = useState<{ id: number; username: string } | null>(null);
  const [liveMatch, setLiveMatch] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = async () => {
    setLoading(true);
    try {
      const [meRes, matchRes] = await Promise.all([api.getMe(), api.pvpLiveGet(matchId)]);
      setMe({ id: meRes.me.id, username: meRes.me.username });
      setLiveMatch(matchRes.match);
    } catch (e) {
      toast({ title: "Live match load failed", description: e instanceof Error ? e.message : String(e) });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId]);

  useEffect(() => {
    if (!liveMatch || liveMatch.id !== matchId) return;
    if (liveMatch.status !== "pending" && liveMatch.status !== "active") return;
    const id = window.setInterval(() => refresh(), 2500);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId, liveMatch?.status, liveMatch?.id]);

  const myLiveDeck: string[] = useMemo(() => {
    const s = liveMatch?.state;
    if (!s || !me) return [];
    if (liveMatch.playerA?.id === me.id) return s.deckA || [];
    if (liveMatch.playerB?.id === me.id) return s.deckB || [];
    return [];
  }, [liveMatch, me]);

  const isMyTurn = !!(me && liveMatch?.turnPlayerId === me.id && liveMatch?.status === "active");

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-heading text-2xl font-bold text-foreground flex items-center gap-2">
            <Swords className="w-6 h-6 text-primary" /> Battleground (Live PvP)
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Play your live friend challenge here.</p>
        </div>
        <button
          onClick={onExit}
          className="px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 bg-secondary text-secondary-foreground hover:bg-secondary/80"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
      </div>

      <Card className="border-border overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-primary to-primary/60" />
        <CardHeader className="pb-3 flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            Match #{matchId}
            {liveMatch?.status && <Badge variant="secondary" className="text-[10px]">{liveMatch.status}</Badge>}
          </CardTitle>
          <button
            onClick={refresh}
            disabled={loading}
            className={cn("px-3 py-1.5 rounded-lg bg-secondary text-secondary-foreground text-xs font-bold flex items-center gap-2", loading && "opacity-50")}
          >
            {loading && <Loader2 className="w-3 h-3 animate-spin" />}
            Refresh
          </button>
        </CardHeader>
        <CardContent className="space-y-4">
          {!liveMatch ? (
            <div className="text-center py-10 text-muted-foreground">
              <Loader2 className="w-10 h-10 mx-auto mb-2 opacity-60 animate-spin" />
              <p className="text-xs">Loading match…</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-border bg-card p-3">
                  <div className="text-xs text-muted-foreground font-bold uppercase">{liveMatch.playerA?.username}</div>
                  <div className="text-lg font-heading font-bold text-foreground">HP {liveMatch.state?.hpA}</div>
                </div>
                <div className="rounded-xl border border-border bg-card p-3">
                  <div className="text-xs text-muted-foreground font-bold uppercase">{liveMatch.playerB?.username}</div>
                  <div className="text-lg font-heading font-bold text-foreground">HP {liveMatch.state?.hpB}</div>
                </div>
              </div>

              {liveMatch.result && (
                <div className="text-sm font-heading font-bold text-foreground">Winner: {liveMatch.result.winner}</div>
              )}

              {liveMatch.status === "active" && (
                <div className="space-y-2">
                  {isMyTurn ? (
                    <Badge className="animate-pulse bg-primary text-primary-foreground text-xs">⚔ Your Turn</Badge>
                  ) : (
                    <Badge variant="secondary" className="text-xs">Waiting for opponent…</Badge>
                  )}

                  {isMyTurn && (
                    <>
                      <div className="flex flex-wrap gap-2">
                        {myLiveDeck.slice(0, 10).map((id) => {
                          const used = (liveMatch.state?.usedA || []).includes(id) || (liveMatch.state?.usedB || []).includes(id);
                          return (
                            <button
                              key={id}
                              disabled={used}
                              className={cn(
                                "px-3 py-2 rounded-lg text-xs font-bold border transition-all",
                                used ? "opacity-40 bg-secondary border-border" : "bg-primary text-primary-foreground border-primary hover:brightness-110"
                              )}
                              onClick={async () => {
                                try {
                                  await api.pvpLiveAction(matchId, { type: "play", cardId: id });
                                  await refresh();
                                } catch (e) {
                                  toast({ title: "Action failed", description: e instanceof Error ? e.message : String(e) });
                                }
                              }}
                            >
                              {cardName(id)}
                            </button>
                          );
                        })}
                      </div>
                      <button
                        className="px-4 py-2 rounded-lg bg-secondary text-secondary-foreground font-heading font-bold text-sm"
                        onClick={async () => {
                          try {
                            await api.pvpLiveAction(matchId, { type: "end" });
                            await refresh();
                          } catch (e) {
                            toast({ title: "End turn failed", description: e instanceof Error ? e.message : String(e) });
                          }
                        }}
                      >
                        End turn
                      </button>
                    </>
                  )}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

