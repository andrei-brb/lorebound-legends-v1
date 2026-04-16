import { useEffect, useMemo, useState } from "react";
import { Swords, Users, Crown, RefreshCw } from "lucide-react";
import type { PlayerState } from "@/lib/playerState";
import { api } from "@/lib/apiClient";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type Props = {
  playerState: PlayerState;
};

export default function PvPPanel({ playerState }: Props) {
  const [me, setMe] = useState<{ id: number; username: string } | null>(null);
  const [friends, setFriends] = useState<Awaited<ReturnType<typeof api.getFriends>> | null>(null);
  const [history, setHistory] = useState<Awaited<ReturnType<typeof api.pvpHistory>>["matches"]>([]);
  const [loading, setLoading] = useState(false);

  const [rankedPresetId, setRankedPresetId] = useState<string>("");
  const rankedPreset = useMemo(() => playerState.deckPresets?.find((p) => p.id === rankedPresetId) ?? null, [playerState.deckPresets, rankedPresetId]);

  const [queuedMatch, setQueuedMatch] = useState<{ matchId: number; opponentName: string } | null>(null);

  const [liveOpponentId, setLiveOpponentId] = useState<number | null>(null);
  const [liveMatchId, setLiveMatchId] = useState<number | null>(null);
  const [liveMatch, setLiveMatch] = useState<any | null>(null);

  const refresh = async () => {
    setLoading(true);
    try {
      const [meRes, friendsRes, histRes] = await Promise.all([api.getMe(), api.getFriends(), api.pvpHistory()]);
      setMe({ id: meRes.me.id, username: meRes.me.username });
      setFriends(friendsRes);
      setHistory(histRes.matches);
    } catch (e) {
      toast({ title: "Failed to load PvP", description: e instanceof Error ? e.message : String(e) });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refreshLive = async (id: number) => {
    try {
      const res = await api.pvpLiveGet(id);
      setLiveMatch(res.match);
    } catch (e) {
      toast({ title: "Live match load failed", description: e instanceof Error ? e.message : String(e) });
    }
  };

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
            <Swords className="w-6 h-6 text-primary" /> PvP Arena
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Async ranked queue, plus live friend challenges.</p>
        </div>
        <button
          onClick={refresh}
          disabled={loading}
          className={cn("px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2", "bg-secondary text-secondary-foreground hover:bg-secondary/80", loading && "opacity-50 cursor-not-allowed")}
        >
          <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} /> Refresh
        </button>
      </div>

      {/* Ranked (async) */}
      <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Crown className="w-5 h-5 text-legendary" />
          <h3 className="font-heading font-bold text-foreground">Ranked (Async)</h3>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Pick a preset as your ranked deck.</p>
            <select
              className="w-full px-3 py-2 text-xs rounded-lg bg-secondary border border-border text-foreground"
              value={rankedPresetId}
              onChange={(e) => setRankedPresetId(e.target.value)}
            >
              <option value="">Select preset...</option>
              {(playerState.deckPresets || []).map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <button
              disabled={!rankedPreset}
              onClick={async () => {
                if (!rankedPreset) return;
                try {
                  await api.pvpSetRankedDeck(rankedPreset.cardIds);
                  toast({ title: "Ranked deck saved" });
                } catch (e) {
                  toast({ title: "Failed to set ranked deck", description: e instanceof Error ? e.message : String(e) });
                }
              }}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-heading font-bold text-sm disabled:opacity-40"
            >
              Save ranked deck
            </button>
          </div>

          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Find an opponent near your MMR.</p>
            <button
              onClick={async () => {
                try {
                  const res = await api.pvpQueue();
                  setQueuedMatch({ matchId: res.matchId, opponentName: res.opponent.username });
                  toast({ title: "Match found", description: `Opponent: ${res.opponent.username}` });
                } catch (e) {
                  toast({ title: "Queue failed", description: e instanceof Error ? e.message : String(e) });
                }
              }}
              className="px-4 py-2 rounded-lg bg-secondary text-secondary-foreground font-heading font-bold text-sm"
            >
              Queue
            </button>
            {queuedMatch && (
              <div className="rounded-xl border border-border bg-secondary/40 p-3 space-y-2">
                <div className="text-sm font-heading font-bold text-foreground">Vs {queuedMatch.opponentName}</div>
                <button
                  onClick={async () => {
                    try {
                      const res = await api.pvpResolveAsync(queuedMatch.matchId);
                      toast({ title: "Match resolved", description: `Winner: ${res.result.winner}` });
                      setQueuedMatch(null);
                      await refresh();
                    } catch (e) {
                      toast({ title: "Resolve failed", description: e instanceof Error ? e.message : String(e) });
                    }
                  }}
                  className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-heading font-bold text-sm"
                >
                  Resolve match
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="pt-2">
          <h4 className="font-heading font-bold text-foreground text-sm mb-2">Recent matches</h4>
          {history.length === 0 ? (
            <p className="text-xs text-muted-foreground">No ranked matches yet.</p>
          ) : (
            <div className="space-y-2">
              {history.slice(0, 8).map((m) => (
                <div key={m.id} className="flex items-center justify-between bg-secondary/40 border border-border rounded-lg px-3 py-2">
                  <div className="text-xs text-foreground font-heading font-bold">Vs {m.opponent.username}</div>
                  <div className="text-[10px] text-muted-foreground">{m.result?.winner ?? "?"}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Live */}
      <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          <h3 className="font-heading font-bold text-foreground">Live (Friends)</h3>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Challenge a friend.</p>
            <select
              className="w-full px-3 py-2 text-xs rounded-lg bg-secondary border border-border text-foreground"
              value={liveOpponentId ?? ""}
              onChange={(e) => setLiveOpponentId(e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">Select friend...</option>
              {(friends?.accepted || []).map((f) => (
                <option key={f.friend.id} value={f.friend.id}>{f.friend.username}</option>
              ))}
            </select>
            <button
              disabled={!liveOpponentId}
              onClick={async () => {
                if (!liveOpponentId) return;
                try {
                  const res = await api.pvpLiveCreate(liveOpponentId);
                  setLiveMatchId(res.matchId);
                  toast({ title: "Live match created", description: `Match #${res.matchId}` });
                  await refreshLive(res.matchId);
                } catch (e) {
                  toast({ title: "Create failed", description: e instanceof Error ? e.message : String(e) });
                }
              }}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-heading font-bold text-sm disabled:opacity-40"
            >
              Create match
            </button>
          </div>

          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Join an existing match by ID.</p>
            <input
              value={liveMatchId ?? ""}
              onChange={(e) => setLiveMatchId(e.target.value ? Number(e.target.value) : null)}
              placeholder="Match id..."
              className="w-full px-3 py-2 text-xs rounded-lg bg-secondary border border-border text-foreground placeholder:text-muted-foreground"
            />
            <div className="flex gap-2">
              <button
                disabled={!liveMatchId}
                onClick={async () => {
                  if (!liveMatchId) return;
                  try {
                    await api.pvpLiveJoin(liveMatchId);
                    toast({ title: "Joined match" });
                    await refreshLive(liveMatchId);
                  } catch (e) {
                    toast({ title: "Join failed", description: e instanceof Error ? e.message : String(e) });
                  }
                }}
                className="px-4 py-2 rounded-lg bg-secondary text-secondary-foreground font-heading font-bold text-sm disabled:opacity-40"
              >
                Join
              </button>
              <button
                disabled={!liveMatchId}
                onClick={() => liveMatchId && refreshLive(liveMatchId)}
                className="px-4 py-2 rounded-lg bg-secondary text-secondary-foreground font-heading font-bold text-sm disabled:opacity-40"
              >
                Load
              </button>
            </div>
          </div>
        </div>

        {liveMatch && (
          <div className="rounded-2xl border border-border bg-secondary/30 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-heading font-bold text-foreground">
                Match #{liveMatch.id} • {liveMatch.status}
              </div>
              <button
                className="px-3 py-1.5 rounded-lg bg-secondary text-secondary-foreground text-xs font-bold"
                onClick={() => liveMatchId && refreshLive(liveMatchId)}
              >
                Refresh
              </button>
            </div>

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
              <div className="text-sm font-heading font-bold text-foreground">
                Winner: {liveMatch.result.winner}
              </div>
            )}

            {liveMatch.status === "active" && (
              <div className="space-y-2">
                <div className={cn("text-xs font-bold uppercase", isMyTurn ? "text-primary" : "text-muted-foreground")}>
                  {isMyTurn ? "Your turn" : "Waiting for opponent"}
                </div>

                {isMyTurn && (
                  <>
                    <div className="flex flex-wrap gap-2">
                      {myLiveDeck.slice(0, 10).map((id) => {
                        const used = (liveMatch.state?.usedA || []).includes(id) || (liveMatch.state?.usedB || []).includes(id);
                        return (
                          <button
                            key={id}
                            disabled={used}
                            className={cn("px-3 py-2 rounded-lg text-xs font-bold border transition-colors", used ? "opacity-40 bg-secondary border-border" : "bg-primary text-primary-foreground border-primary")}
                            onClick={async () => {
                              if (!liveMatchId) return;
                              try {
                                await api.pvpLiveAction(liveMatchId, { type: "play", cardId: id });
                                await refreshLive(liveMatchId);
                              } catch (e) {
                                toast({ title: "Action failed", description: e instanceof Error ? e.message : String(e) });
                              }
                            }}
                            title={id}
                          >
                            Play {id}
                          </button>
                        );
                      })}
                    </div>

                    <button
                      className="px-4 py-2 rounded-lg bg-secondary text-secondary-foreground font-heading font-bold text-sm"
                      onClick={async () => {
                        if (!liveMatchId) return;
                        await api.pvpLiveAction(liveMatchId, { type: "end" });
                        await refreshLive(liveMatchId);
                      }}
                    >
                      End turn
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

