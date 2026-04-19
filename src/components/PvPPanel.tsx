import { useEffect, useMemo, useState } from "react";
import { Swords, Users, Crown, RefreshCw, Trophy, Loader2 } from "lucide-react";
import type { PlayerState } from "@/lib/playerState";
import { api } from "@/lib/apiClient";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { allGameCards } from "@/data/cardIndex";
import GlassPanel from "@/components/scene/GlassPanel";
import { texArena, texThrone } from "@/components/scene/panelTextures";

type Props = { playerState: PlayerState };

function cardName(id: string) {
  return allGameCards.find(c => c.id === id)?.name || id;
}

export default function PvPPanel({ playerState }: Props) {
  const [me, setMe] = useState<{ id: number; username: string } | null>(null);
  const [friends, setFriends] = useState<Awaited<ReturnType<typeof api.getFriends>> | null>(null);
  const [history, setHistory] = useState<Awaited<ReturnType<typeof api.pvpHistory>>["matches"]>([]);
  const [loading, setLoading] = useState(false);
  const [rankedPresetId, setRankedPresetId] = useState<string>("");
  const rankedPreset = useMemo(() => playerState.deckPresets?.find((p) => p.id === rankedPresetId) ?? null, [playerState.deckPresets, rankedPresetId]);
  const [queuedMatch, setQueuedMatch] = useState<{ matchId: number; opponentName: string } | null>(null);
  const [queueLoading, setQueueLoading] = useState(false);
  const [liveOpponentId, setLiveOpponentId] = useState<number | null>(null);
  const [liveOpponentQuery, setLiveOpponentQuery] = useState("");
  const [liveOpponentOpen, setLiveOpponentOpen] = useState(false);
  const [liveMatchId, setLiveMatchId] = useState<number | null>(null);
  const [liveMatch, setLiveMatch] = useState<any | null>(null);

  const refresh = async () => {
    setLoading(true);
    try {
      const [meRes, friendsRes, histRes] = await Promise.all([api.getMe(), api.getFriends(), api.pvpHistory()]);
      setMe({ id: meRes.me.id, username: meRes.me.username }); setFriends(friendsRes); setHistory(histRes.matches);
    } catch (e) { toast({ title: "Failed to load PvP", description: e instanceof Error ? e.message : String(e) }); }
    finally { setLoading(false); }
  };

  useEffect(() => { refresh(); }, []);

  useEffect(() => {
    const raw = sessionStorage.getItem("pvp.live.matchId");
    const id = raw ? Number(raw) : NaN;
    if (!Number.isFinite(id)) return;
    sessionStorage.removeItem("pvp.live.matchId");
    setLiveMatchId(id); refreshLive(id);
  }, []);

  useEffect(() => {
    if (!liveMatchId || !liveMatch || liveMatch.id !== liveMatchId) return;
    if (liveMatch.status !== "pending" && liveMatch.status !== "active") return;
    const id = window.setInterval(() => refreshLive(liveMatchId), 2500);
    return () => window.clearInterval(id);
  }, [liveMatchId, liveMatch?.status, liveMatch?.id]);

  const refreshLive = async (id: number) => {
    try { const res = await api.pvpLiveGet(id); setLiveMatch(res.match); }
    catch (e) { toast({ title: "Live match load failed", description: e instanceof Error ? e.message : String(e) }); }
  };

  const myLiveDeck: string[] = useMemo(() => {
    const s = liveMatch?.state; if (!s || !me) return [];
    if (liveMatch.playerA?.id === me.id) return s.deckA || [];
    if (liveMatch.playerB?.id === me.id) return s.deckB || [];
    return [];
  }, [liveMatch, me]);

  const isMyTurn = !!(me && liveMatch?.turnPlayerId === me.id && liveMatch?.status === "active");
  const acceptedFriends = friends?.accepted || [];
  const filteredLiveFriends = liveOpponentQuery.trim() ? acceptedFriends.filter((f) => f.friend.username.toLowerCase().includes(liveOpponentQuery.trim().toLowerCase())) : acceptedFriends;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-heading text-2xl font-bold text-foreground flex items-center gap-2">
            <Swords className="w-6 h-6 text-primary" /> PvP Arena
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Async ranked queue, plus live friend challenges.</p>
        </div>
        <button onClick={refresh} disabled={loading} className={cn("px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 bg-secondary text-secondary-foreground hover:bg-secondary/80", loading && "opacity-50 cursor-not-allowed")}>
          <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} /> Refresh
        </button>
      </div>

      {/* Ranked (async) */}
      <Card className="border-border overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-[hsl(var(--legendary))] to-[hsl(var(--legendary-glow))]" />
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Crown className="w-5 h-5 text-[hsl(var(--legendary))]" /> Ranked (Async)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">Pick a preset as your ranked deck.</p>
              <Select value={rankedPresetId} onValueChange={setRankedPresetId}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select preset..." />
                </SelectTrigger>
                <SelectContent>
                  {(playerState.deckPresets || []).map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <button
                disabled={!rankedPreset}
                onClick={async () => {
                  if (!rankedPreset) return;
                  try { await api.pvpSetRankedDeck(rankedPreset.cardIds); toast({ title: "Ranked deck saved" }); }
                  catch (e) { toast({ title: "Failed to set ranked deck", description: e instanceof Error ? e.message : String(e) }); }
                }}
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-heading font-bold text-sm disabled:opacity-40 transition-all"
              >
                Save ranked deck
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">Find an opponent near your MMR.</p>
              <button
                onClick={async () => {
                  setQueueLoading(true);
                  try { const res = await api.pvpQueue(); setQueuedMatch({ matchId: res.matchId, opponentName: res.opponent.username }); toast({ title: "Match found", description: `Opponent: ${res.opponent.username}` }); }
                  catch (e) { toast({ title: "Queue failed", description: e instanceof Error ? e.message : String(e) }); }
                  finally { setQueueLoading(false); }
                }}
                disabled={queueLoading}
                className="px-4 py-2 rounded-lg bg-secondary text-secondary-foreground font-heading font-bold text-sm flex items-center gap-2 disabled:opacity-50"
              >
                {queueLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                Queue
              </button>
              {queuedMatch && (
                <div className="rounded-xl border border-border bg-secondary/40 p-3 space-y-2">
                  <div className="text-sm font-heading font-bold text-foreground">Vs {queuedMatch.opponentName}</div>
                  <button
                    onClick={async () => {
                      try { const res = await api.pvpResolveAsync(queuedMatch.matchId); toast({ title: "Match resolved", description: `Winner: ${res.result.winner}` }); setQueuedMatch(null); await refresh(); }
                      catch (e) { toast({ title: "Resolve failed", description: e instanceof Error ? e.message : String(e) }); }
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
              <div className="text-center py-8 text-muted-foreground">
                <Trophy className="w-10 h-10 mx-auto mb-2 opacity-20" />
                <p className="text-xs">Play your first ranked match!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {history.slice(0, 8).map((m) => {
                  const won = me && m.result?.winner === me.username;
                  const lost = me && m.result?.winner && m.result.winner !== me.username;
                  return (
                    <div key={m.id} className="flex items-center justify-between bg-secondary/40 border border-border rounded-lg px-3 py-2">
                      <div className="text-xs text-foreground font-heading font-bold">Vs {m.opponent.username}</div>
                      <Badge variant={won ? "default" : lost ? "destructive" : "secondary"} className="text-[10px]">
                        {won ? "WIN" : lost ? "LOSS" : "?"}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Live */}
      <Card className="border-border overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-primary to-primary/60" />
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" /> Live (Friends)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">Challenge a friend.</p>
              <div className="relative">
                <input
                  value={liveOpponentQuery}
                  onChange={(e) => { setLiveOpponentQuery(e.target.value); setLiveOpponentOpen(true); setLiveOpponentId(null); }}
                  onFocus={() => setLiveOpponentOpen(true)}
                  onBlur={() => setTimeout(() => setLiveOpponentOpen(false), 120)}
                  placeholder={acceptedFriends.length === 0 ? "No friends yet" : "Type a friend's name..."}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-secondary border border-border text-foreground placeholder:text-muted-foreground"
                />
                {liveOpponentOpen && filteredLiveFriends.length > 0 && (
                  <div className="absolute z-50 mt-1 w-full rounded-lg border border-border bg-card shadow-lg overflow-hidden">
                    <div className="max-h-56 overflow-y-auto">
                      {filteredLiveFriends.slice(0, 20).map((f) => (
                        <button
                          key={f.friend.id}
                          type="button"
                          className="w-full text-left px-3 py-2 text-xs hover:bg-secondary/80 text-foreground transition-colors"
                          onMouseDown={(e) => { e.preventDefault(); setLiveOpponentId(f.friend.id); setLiveOpponentQuery(f.friend.username); setLiveOpponentOpen(false); }}
                        >
                          <span className="font-heading font-bold">{f.friend.username}</span>
                          <span className="ml-2 text-[10px] text-muted-foreground">#{f.friend.id}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <button
                disabled={!liveOpponentId}
                onClick={async () => {
                  if (!liveOpponentId) return;
                  try { const res = await api.pvpLiveCreate(liveOpponentId); setLiveMatchId(res.matchId); toast({ title: "Live match created", description: `Match #${res.matchId}` }); await refreshLive(res.matchId); }
                  catch (e) { toast({ title: "Create failed", description: e instanceof Error ? e.message : String(e) }); }
                }}
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-heading font-bold text-sm disabled:opacity-40 transition-all"
              >
                Send invite
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">Join an existing match by ID.</p>
              <input
                value={liveMatchId ?? ""}
                onChange={(e) => setLiveMatchId(e.target.value ? Number(e.target.value) : null)}
                placeholder="Match id..."
                className="w-full px-3 py-2 text-xs rounded-lg bg-secondary border border-border text-foreground placeholder:text-muted-foreground"
              />
              <div className="flex gap-2">
                <button disabled={!liveMatchId} onClick={async () => { if (!liveMatchId) return; try { await api.pvpLiveJoin(liveMatchId); toast({ title: "Joined match" }); await refreshLive(liveMatchId); } catch (e) { toast({ title: "Join failed", description: e instanceof Error ? e.message : String(e) }); } }} className="px-4 py-2 rounded-lg bg-secondary text-secondary-foreground font-heading font-bold text-sm disabled:opacity-40">Join</button>
                <button disabled={!liveMatchId} onClick={() => liveMatchId && refreshLive(liveMatchId)} className="px-4 py-2 rounded-lg bg-secondary text-secondary-foreground font-heading font-bold text-sm disabled:opacity-40">Load</button>
              </div>
            </div>
          </div>

          {liveMatch && (
            <div className="rounded-2xl border border-border bg-secondary/30 p-4 space-y-3 animate-fade-in">
              <div className="flex items-center justify-between">
                <div className="text-sm font-heading font-bold text-foreground">
                  Match #{liveMatch.id} • <Badge variant="secondary" className="text-[10px]">{liveMatch.status}</Badge>
                </div>
                <button className="px-3 py-1.5 rounded-lg bg-secondary text-secondary-foreground text-xs font-bold" onClick={() => liveMatchId && refreshLive(liveMatchId)}>Refresh</button>
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
                <div className="text-sm font-heading font-bold text-foreground">Winner: {liveMatch.result.winner}</div>
              )}

              {liveMatch.status === "active" && (
                <div className="space-y-2">
                  {isMyTurn ? (
                    <Badge className="animate-pulse bg-primary text-primary-foreground text-xs">⚔ Your Turn</Badge>
                  ) : (
                    <Badge variant="secondary" className="text-xs">Waiting for opponent...</Badge>
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
                              className={cn("px-3 py-2 rounded-lg text-xs font-bold border transition-all", used ? "opacity-40 bg-secondary border-border" : "bg-primary text-primary-foreground border-primary hover:brightness-110")}
                              onClick={async () => { if (!liveMatchId) return; try { await api.pvpLiveAction(liveMatchId, { type: "play", cardId: id }); await refreshLive(liveMatchId); } catch (e) { toast({ title: "Action failed", description: e instanceof Error ? e.message : String(e) }); } }}
                            >
                              {cardName(id)}
                            </button>
                          );
                        })}
                      </div>
                      <button className="px-4 py-2 rounded-lg bg-secondary text-secondary-foreground font-heading font-bold text-sm" onClick={async () => { if (!liveMatchId) return; await api.pvpLiveAction(liveMatchId, { type: "end" }); await refreshLive(liveMatchId); }}>
                        End turn
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
