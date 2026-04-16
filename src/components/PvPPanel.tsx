import { useEffect, useMemo, useState } from "react";
import { Swords, Users, Crown, RefreshCw, Trophy, Loader2 } from "lucide-react";
import type { PlayerState } from "@/lib/playerState";
import { api } from "@/lib/apiClient";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Props = {
  playerState: PlayerState;
  /** Live duel: open Battle tab with LivePvPBattleground */
  onNavigateBattle?: (matchId: number) => void;
  /** Ranked: load decks and open Battle tab vs AI (opponent's deck) */
  onStartRankedBattle?: (matchId: number) => Promise<void>;
};

export default function PvPPanel({ playerState, onNavigateBattle, onStartRankedBattle }: Props) {
  const [friends, setFriends] = useState<Awaited<ReturnType<typeof api.getFriends>> | null>(null);
  const [history, setHistory] = useState<Awaited<ReturnType<typeof api.pvpHistory>>["matches"]>([]);
  const [loading, setLoading] = useState(false);
  const [rankedPresetId, setRankedPresetId] = useState<string>("");
  const rankedPreset = useMemo(() => playerState.deckPresets?.find((p) => p.id === rankedPresetId) ?? null, [playerState.deckPresets, rankedPresetId]);
  const [queuedMatch, setQueuedMatch] = useState<{ matchId: number; opponentName: string } | null>(null);
  const [queueLoading, setQueueLoading] = useState(false);
  const [rankedFightLoading, setRankedFightLoading] = useState(false);
  const [liveOpponentId, setLiveOpponentId] = useState<number | null>(null);
  const [liveOpponentQuery, setLiveOpponentQuery] = useState("");
  const [liveOpponentOpen, setLiveOpponentOpen] = useState(false);
  const [liveMatchId, setLiveMatchId] = useState<number | null>(null);
  const [pvpRating, setPvpRating] = useState<{ mmr: number; rankTier: string; gamesPlayed: number } | null>(null);

  const refresh = async () => {
    setLoading(true);
    try {
      const [friendsRes, histRes] = await Promise.all([api.getFriends(), api.pvpHistory()]);
      setFriends(friendsRes);
      setHistory(histRes.matches);
      try {
        const meRes = await api.getMe();
        setPvpRating(meRes.me.pvp);
      } catch {
        setPvpRating(null);
      }
    } catch (e) {
      toast({ title: "Failed to load PvP", description: e instanceof Error ? e.message : String(e) });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const acceptedFriends = friends?.accepted || [];
  const filteredLiveFriends = liveOpponentQuery.trim()
    ? acceptedFriends.filter((f) => f.friend.username.toLowerCase().includes(liveOpponentQuery.trim().toLowerCase()))
    : acceptedFriends;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-heading text-2xl font-bold text-foreground flex items-center gap-2">
            <Swords className="w-6 h-6 text-primary" /> PvP Arena
          </h2>
          {pvpRating && (
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
              <Badge variant="secondary" className="font-heading gap-1.5">
                <Trophy className="w-3.5 h-3.5 text-[hsl(var(--legendary))]" />
                {pvpRating.rankTier} · MMR {pvpRating.mmr}
              </Badge>
              <span className="text-muted-foreground">{pvpRating.gamesPlayed} ranked games</span>
            </div>
          )}
          <p className="text-sm text-muted-foreground mt-1">
            <span className="font-heading text-foreground/90">Ranked</span> — fight another player&apos;s deck with the AI piloting them.{" "}
            <span className="font-heading text-foreground/90">Duel</span> — invite a friend; you both play live.
          </p>
        </div>
        <button
          onClick={refresh}
          disabled={loading}
          className={cn(
            "px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 bg-secondary text-secondary-foreground hover:bg-secondary/80",
            loading && "opacity-50 cursor-not-allowed",
          )}
        >
          <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} /> Refresh
        </button>
      </div>

      {/* Ranked — AI plays opponent's deck */}
      <Card className="border-border overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-[hsl(var(--legendary))] to-[hsl(var(--legendary-glow))]" />
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Crown className="w-5 h-5 text-[hsl(var(--legendary))]" /> Ranked ladder
          </CardTitle>
          <p className="text-xs text-muted-foreground font-normal">
            Queue to face a similar MMR. You play the full battle; the AI controls your opponent&apos;s cards using their ranked deck snapshot.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">Ranked deck (saved to the server)</p>
              <Select value={rankedPresetId} onValueChange={setRankedPresetId}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Select preset..." />
                </SelectTrigger>
                <SelectContent>
                  {(playerState.deckPresets || []).map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-heading font-bold text-sm disabled:opacity-40 transition-all"
              >
                Save ranked deck
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">Find an opponent near your MMR</p>
              <button
                onClick={async () => {
                  setQueueLoading(true);
                  try {
                    const res = await api.pvpQueue();
                    setQueuedMatch({ matchId: res.matchId, opponentName: res.opponent.username });
                    toast({ title: "Match found", description: `Opponent: ${res.opponent.username}` });
                  } catch (e) {
                    toast({ title: "Queue failed", description: e instanceof Error ? e.message : String(e) });
                  } finally {
                    setQueueLoading(false);
                  }
                }}
                disabled={queueLoading}
                className="px-4 py-2 rounded-lg bg-secondary text-secondary-foreground font-heading font-bold text-sm flex items-center gap-2 disabled:opacity-50"
              >
                {queueLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                Queue
              </button>
              {queuedMatch && (
                <div className="rounded-xl border border-border bg-secondary/40 p-3 space-y-2">
                  <div className="text-sm font-heading font-bold text-foreground">vs {queuedMatch.opponentName}</div>
                  <p className="text-[10px] text-muted-foreground">Opens the same battle board as vs AI — their deck, AI pilot.</p>
                  <button
                    disabled={!onStartRankedBattle || rankedFightLoading}
                    onClick={async () => {
                      if (!onStartRankedBattle) return;
                      setRankedFightLoading(true);
                      try {
                        await onStartRankedBattle(queuedMatch.matchId);
                        setQueuedMatch(null);
                      } catch {
                        /* toast from parent */
                      } finally {
                        setRankedFightLoading(false);
                      }
                    }}
                    className="w-full px-4 py-2 rounded-lg bg-primary text-primary-foreground font-heading font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-40"
                  >
                    {rankedFightLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                    Fight ranked battle
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const res = await api.pvpResolveAsync(queuedMatch.matchId);
                        toast({ title: "Auto-resolved (sim)", description: `Winner: ${res.result.winner}` });
                        setQueuedMatch(null);
                        await refresh();
                      } catch (e) {
                        toast({ title: "Resolve failed", description: e instanceof Error ? e.message : String(e) });
                      }
                    }}
                    className="w-full text-[10px] text-muted-foreground underline hover:text-foreground"
                  >
                    Skip battle — server-only sim (debug)
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="pt-2">
            <h4 className="font-heading font-bold text-foreground text-sm mb-2">Recent ranked</h4>
            {history.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Trophy className="w-10 h-10 mx-auto mb-2 opacity-20" />
                <p className="text-xs">Play your first ranked match!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {history.slice(0, 8).map((m) => {
                  const yw = m.youWon;
                  const won = yw === true;
                  const lost = yw === false;
                  const draw = yw === null && m.result?.winner === "draw";
                  return (
                    <div key={m.id} className="flex items-center justify-between bg-secondary/40 border border-border rounded-lg px-3 py-2">
                      <div className="text-xs text-foreground font-heading font-bold">vs {m.opponent.username}</div>
                      <Badge variant={won ? "default" : lost ? "destructive" : "secondary"} className="text-[10px]">
                        {won ? "WIN" : lost ? "LOSS" : draw ? "DRAW" : "—"}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Duel — live human vs human */}
      <Card className="border-border overflow-hidden">
        <div className="h-1.5 bg-gradient-to-r from-primary to-primary/60" />
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" /> Duel (live)
          </CardTitle>
          <p className="text-xs text-muted-foreground font-normal">
            Your friend gets an invite and controls their own cards. Battle opens on the Combat → Battle tab.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">Invite a friend</p>
              <div className="relative">
                <input
                  value={liveOpponentQuery}
                  onChange={(e) => {
                    setLiveOpponentQuery(e.target.value);
                    setLiveOpponentOpen(true);
                    setLiveOpponentId(null);
                  }}
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
                          onMouseDown={(e) => {
                            e.preventDefault();
                            setLiveOpponentId(f.friend.id);
                            setLiveOpponentQuery(f.friend.username);
                            setLiveOpponentOpen(false);
                          }}
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
                  try {
                    const res = await api.pvpLiveCreate(liveOpponentId);
                    toast({ title: "⚔ Invite sent", description: `Match #${res.matchId} — Battle tab opens for you.` });
                    onNavigateBattle?.(res.matchId);
                  } catch (e) {
                    toast({ title: "Create failed", description: e instanceof Error ? e.message : String(e) });
                  }
                }}
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-heading font-bold text-sm disabled:opacity-40 transition-all"
              >
                Send duel invite
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">Join by match ID</p>
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
                      toast({ title: "Joined duel" });
                      onNavigateBattle?.(liveMatchId);
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
                  onClick={() => liveMatchId && onNavigateBattle?.(liveMatchId)}
                  className="px-4 py-2 rounded-lg bg-secondary text-secondary-foreground font-heading font-bold text-sm disabled:opacity-40"
                >
                  Open battle
                </button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
