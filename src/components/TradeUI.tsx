import { useEffect, useMemo, useState } from "react";
import { ArrowLeftRight, Check, X, Search, ArrowRight, UserCircle2, RefreshCw, Store, Users, Package } from "lucide-react";
import { cn } from "@/lib/utils";
import { allCards } from "@/data/cards";
import type { PlayerState } from "@/lib/playerState";
import GameCard from "./GameCard";
import { getCardProgress } from "@/lib/playerState";
import { api } from "@/lib/apiClient";
import { toast } from "@/hooks/use-toast";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

type TradePhase = "incoming" | "create" | "outgoing" | "friends" | "market";

interface TradeUIProps {
  playerState: PlayerState;
  onStateChange: (state: PlayerState) => void;
}

export default function TradeUI({ playerState, onStateChange }: TradeUIProps) {
  const [phase, setPhase] = useState<TradePhase>("incoming");
  const [offeredCards, setOfferedCards] = useState<string[]>([]);
  const [requestedCards, setRequestedCards] = useState<string[]>([]);
  const [searchOwned, setSearchOwned] = useState("");
  const [searchCatalog, setSearchCatalog] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [selectedFriendId, setSelectedFriendId] = useState<number | null>(null);
  const [friendTradeableCardIds, setFriendTradeableCardIds] = useState<string[]>([]);
  const [friendCardsLoading, setFriendCardsLoading] = useState(false);
  const [friendCardsError, setFriendCardsError] = useState<string | null>(null);
  const [friendQuery, setFriendQuery] = useState("");
  const [friendDropdownOpen, setFriendDropdownOpen] = useState(false);
  const [taxGold, setTaxGold] = useState<number>(0);
  const [taxStardust, setTaxStardust] = useState<number>(0);
  const [friendSearch, setFriendSearch] = useState("");
  const [friendSearchResults, setFriendSearchResults] = useState<
    Array<{ id: number; discordId: string; username: string; avatar?: string | null }>
  >([]);
  const [friendSearchOpen, setFriendSearchOpen] = useState(false);
  const [friendSearchLoading, setFriendSearchLoading] = useState(false);
  const [me, setMe] = useState<{ id: number; discordId: string; username: string; avatar?: string | null } | null>(null);
  const [friends, setFriends] = useState<Awaited<ReturnType<typeof api.getFriends>> | null>(null);
  const [trades, setTrades] = useState<Awaited<ReturnType<typeof api.getTrades>>["trades"]>([]);
  const [listings, setListings] = useState<Awaited<ReturnType<typeof api.getMarket>>["listings"]>([]);
  const [loading, setLoading] = useState(false);

  const refreshAll = async () => {
    setLoading(true);
    try {
      const [meRes, fRes, tRes, mRes] = await Promise.all([api.getMe(), api.getFriends(), api.getTrades(), api.getMarket("open")]);
      setMe(meRes.me); setFriends(fRes); setTrades(tRes.trades); setListings(mRes.listings);
    } catch (e) {
      console.error("[TradeUI] refresh failed", e);
      toast({ title: "Failed to load multiplayer data", description: e instanceof Error ? e.message : String(e) });
    } finally { setLoading(false); }
  };

  useEffect(() => { refreshAll(); }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadFriendCards(friendId: number) {
      setFriendCardsLoading(true);
      setFriendCardsError(null);
      try {
        const res = await api.getFriendTradeableCards(friendId);
        if (!cancelled) setFriendTradeableCardIds(res.cardIds || []);
      } catch (e) {
        if (!cancelled) {
          setFriendTradeableCardIds([]);
          setFriendCardsError(e instanceof Error ? e.message : String(e));
        }
      } finally {
        if (!cancelled) setFriendCardsLoading(false);
      }
    }

    if (!selectedFriendId) {
      setFriendTradeableCardIds([]);
      setFriendCardsLoading(false);
      setFriendCardsError(null);
      return () => { cancelled = true; };
    }

    loadFriendCards(selectedFriendId);
    return () => { cancelled = true; };
  }, [selectedFriendId]);

  useEffect(() => {
    if (friendSearch.trim().length < 2) {
      setFriendSearchResults([]);
      setFriendSearchOpen(false);
      return;
    }
    setFriendSearchLoading(true);
    const timer = window.setTimeout(async () => {
      try {
        const res = await api.searchUsers(friendSearch.trim());
        setFriendSearchResults(res.users);
        setFriendSearchOpen(res.users.length > 0);
      } catch {
        setFriendSearchResults([]);
      } finally {
        setFriendSearchLoading(false);
      }
    }, 300);
    return () => window.clearTimeout(timer);
  }, [friendSearch]);

  const ownedCards = useMemo(() => {
    return playerState.ownedCardIds.map(id => allCards.find(c => c.id === id)).filter(Boolean).filter(c => c!.name.toLowerCase().includes(searchOwned.toLowerCase()));
  }, [playerState.ownedCardIds, searchOwned]);

  const catalogCards = useMemo(() => {
    return allCards.filter(c => (c.type === "hero" || c.type === "god") && !playerState.ownedCardIds.includes(c.id)).filter(c => c.name.toLowerCase().includes(searchCatalog.toLowerCase()));
  }, [playerState.ownedCardIds, searchCatalog]);

  const friendWantedCards = useMemo(() => {
    const allowed = new Set(friendTradeableCardIds);
    return allCards.filter(c => allowed.has(c.id)).filter(c => c.name.toLowerCase().includes(searchCatalog.toLowerCase()));
  }, [friendTradeableCardIds, searchCatalog]);

  const canPickRequested = !!selectedFriendId && !friendCardsLoading && !friendCardsError;

  const toggleOffered = (id: string) => { setOfferedCards(prev => prev.includes(id) ? prev.filter(x => x !== id) : prev.length < 3 ? [...prev, id] : prev); };
  const toggleRequested = (id: string) => {
    if (!canPickRequested) return;
    setRequestedCards(prev => prev.includes(id) ? prev.filter(x => x !== id) : prev.length < 3 ? [...prev, id] : prev);
  };

  const pendingIncoming = me ? trades.filter(t => t.status === "open" && t.to.id === me.id) : [];
  const pendingOutgoing = me ? trades.filter(t => t.status === "open" && t.from.id === me.id) : [];
  const acceptedFriends = friends?.accepted || [];
  const filteredFriends = friendQuery.trim() ? acceptedFriends.filter((f) => f.friend.username.toLowerCase().includes(friendQuery.trim().toLowerCase())) : acceptedFriends;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading text-2xl font-bold text-foreground flex items-center gap-2">
          <ArrowLeftRight className="w-6 h-6 text-primary" /> Trading Post
        </h2>
        <p className="text-sm text-muted-foreground mt-1">Trade cards with friends, or post offers on the market.</p>
      </div>

      {/* Phase tabs */}
      <div className="flex items-center gap-2">
        <Tabs value={phase} onValueChange={(v) => { setPhase(v as TradePhase); if (v === "create") { setOfferedCards([]); setRequestedCards([]); setShowConfirm(false); } }} className="flex-1">
          <TabsList className="bg-secondary/50 h-auto p-1 flex-wrap">
            <TabsTrigger value="incoming" className="text-xs gap-1.5">
              Incoming
              {pendingIncoming.length > 0 && <Badge className="ml-1 h-5 px-1.5 text-[10px]">{pendingIncoming.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="outgoing" className="text-xs gap-1.5">
              Outgoing
              {pendingOutgoing.length > 0 && <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">{pendingOutgoing.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="create" className="text-xs">New Trade</TabsTrigger>
            <TabsTrigger value="friends" className="text-xs gap-1.5"><Users className="w-3 h-3" /> Friends</TabsTrigger>
            <TabsTrigger value="market" className="text-xs gap-1.5"><Store className="w-3 h-3" /> Market</TabsTrigger>
          </TabsList>
        </Tabs>
        <button
          onClick={refreshAll}
          disabled={loading}
          className={cn("px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 bg-secondary text-secondary-foreground hover:bg-secondary/80", loading && "opacity-50 cursor-not-allowed")}
        >
          <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
        </button>
      </div>

      {/* Incoming trades */}
      {phase === "incoming" && (
        <div className="space-y-3">
          {pendingIncoming.length === 0 && (
            <div className="text-center py-12 text-muted-foreground animate-fade-in">
              <Package className="w-14 h-14 mx-auto mb-3 opacity-20" />
              <p className="font-heading font-bold text-foreground">No incoming trades</p>
              <p className="text-xs mt-1">Ask a friend to send you an offer.</p>
            </div>
          )}
          {pendingIncoming.map(trade => (
            <Card key={trade.id} className="bg-card/60 border-border">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <UserCircle2 className="w-5 h-5 text-muted-foreground" />
                    <span className="font-heading font-bold text-sm text-foreground">{trade.from.username}</span>
                    <span className="text-[10px] text-muted-foreground">wants to trade</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">{new Date(trade.createdAt).toLocaleString()}</span>
                </div>
                <div className="grid grid-cols-[1fr_40px_1fr] items-center gap-2">
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase font-bold mb-1 block">They offer</span>
                    <div className="flex gap-1 flex-wrap">
                      {trade.offered.map(({ cardId: id }) => { const card = allCards.find(c => c.id === id); return card ? <div key={id} className="w-28"><GameCard card={card} size="sm" cardProgress={getCardProgress(playerState, id)} /></div> : null; })}
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-primary mx-auto" />
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase font-bold mb-1 block">They want</span>
                    <div className="flex gap-1 flex-wrap">
                      {trade.requested.map(({ cardId: id }) => { const card = allCards.find(c => c.id === id); return card ? <div key={id} className="w-28"><GameCard card={card} size="sm" cardProgress={getCardProgress(playerState, id)} /></div> : null; })}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={async () => {
                      try { const res = await api.acceptTrade(trade.id); onStateChange(res.state); toast({ title: "Trade accepted" }); await refreshAll(); }
                      catch (e) { toast({ title: "Trade failed", description: e instanceof Error ? e.message : String(e) }); }
                    }}
                    className="flex items-center gap-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:brightness-110 transition-all"
                  >
                    <Check className="w-3 h-3" /> Accept
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Outgoing trades */}
      {phase === "outgoing" && (
        <div className="space-y-3">
          {pendingOutgoing.length === 0 && (
            <div className="text-center py-12 text-muted-foreground animate-fade-in">
              <ArrowRight className="w-14 h-14 mx-auto mb-3 opacity-20" />
              <p className="font-heading font-bold text-foreground">No outgoing trades</p>
              <p className="text-xs mt-1">Create a new trade to get started.</p>
            </div>
          )}
          {pendingOutgoing.map(trade => (
            <Card key={trade.id} className="bg-card/60 border-border">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <UserCircle2 className="w-5 h-5 text-muted-foreground" />
                    <span className="font-heading font-bold text-sm text-foreground">To {trade.to.username}</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">{new Date(trade.createdAt).toLocaleString()}</span>
                </div>
                <div className="grid grid-cols-[1fr_40px_1fr] items-center gap-2">
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase font-bold mb-1 block">You offer</span>
                    <div className="flex gap-1 flex-wrap">
                      {trade.offered.map(({ cardId: id }) => { const card = allCards.find(c => c.id === id); return card ? <div key={id} className="w-28"><GameCard card={card} size="sm" cardProgress={getCardProgress(playerState, id)} /></div> : null; })}
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-primary mx-auto" />
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase font-bold mb-1 block">You want</span>
                    <div className="flex gap-1 flex-wrap">
                      {trade.requested.map(({ cardId: id }) => { const card = allCards.find(c => c.id === id); return card ? <div key={id} className="w-28"><GameCard card={card} size="sm" /></div> : null; })}
                    </div>
                  </div>
                </div>
                <div className="flex justify-end">
                  <button
                    onClick={async () => {
                      try { await api.cancelTrade(trade.id); toast({ title: "Trade cancelled" }); await refreshAll(); }
                      catch (e) { toast({ title: "Cancel failed", description: e instanceof Error ? e.message : String(e) }); }
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-destructive/20 text-destructive text-xs font-bold hover:bg-destructive/30 transition-colors"
                  >
                    <X className="w-3 h-3" /> Cancel
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Friends */}
      {phase === "friends" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="bg-card/60 border-border">
              <CardHeader className="pb-3"><CardTitle className="text-sm">Add Friend</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="relative">
                  <Input
                    value={friendSearch}
                    onChange={(e) => setFriendSearch(e.target.value)}
                    onFocus={() => { if (friendSearchResults.length > 0) setFriendSearchOpen(true); }}
                    onBlur={() => setTimeout(() => setFriendSearchOpen(false), 150)}
                    placeholder="Search by username or Discord ID..."
                  />
                  {friendSearchLoading && (
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">searching…</span>
                  )}
                  {friendSearchOpen && friendSearchResults.length > 0 && (
                    <div className="absolute z-50 mt-1 w-full rounded-lg border border-border bg-card shadow-lg overflow-hidden">
                      <div className="max-h-48 overflow-y-auto">
                        {friendSearchResults.map((u) => (
                          <button
                            key={u.id}
                            type="button"
                            className="w-full text-left px-3 py-2 text-xs hover:bg-secondary/80 text-foreground transition-colors"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              setFriendSearch(u.username);
                              setFriendSearchOpen(false);
                            }}
                          >
                            <span className="font-heading font-bold">{u.username}</span>
                            <span className="ml-2 text-[10px] text-muted-foreground">#{u.id}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <button
                  onClick={async () => {
                    try { await api.friendRequest(friendSearch); toast({ title: "Friend request sent" }); setFriendSearch(""); await refreshAll(); }
                    catch (e) { toast({ title: "Friend request failed", description: e instanceof Error ? e.message : String(e) }); }
                  }}
                  disabled={!friendSearch.trim()}
                  className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-heading font-bold text-sm disabled:opacity-40"
                >
                  Send request
                </button>
              </CardContent>
            </Card>

            <Card className="bg-card/60 border-border">
              <CardHeader className="pb-3"><CardTitle className="text-sm">Incoming Requests</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {(friends?.incoming || []).length === 0 ? (
                  <p className="text-xs text-muted-foreground">No incoming requests.</p>
                ) : (
                  friends!.incoming.map((req) => (
                    <div key={req.id} className="flex items-center justify-between gap-2">
                      <span className="text-sm text-foreground font-heading font-bold">{req.from.username}</span>
                      <div className="flex gap-2">
                        <button className="px-3 py-1.5 rounded-lg bg-secondary text-secondary-foreground text-xs font-bold" onClick={async () => { await api.friendRespond(req.id, false); await refreshAll(); }}>Decline</button>
                        <button className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold" onClick={async () => { await api.friendRespond(req.id, true); await refreshAll(); }}>Accept</button>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="bg-card/60 border-border">
            <CardHeader className="pb-3"><CardTitle className="text-sm">Your Friends</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {(friends?.accepted || []).length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="w-10 h-10 mx-auto mb-2 opacity-20" />
                  <p className="text-xs">No friends yet. Send a request above!</p>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {friends!.accepted.map((f) => (
                    <button
                      key={f.friend.id}
                      className={cn(
                        "px-3 py-2 rounded-lg border text-sm font-heading font-bold transition-colors",
                        selectedFriendId === f.friend.id ? "bg-primary text-primary-foreground border-primary" : "bg-secondary text-secondary-foreground border-border hover:bg-secondary/80"
                      )}
                      onClick={() => setSelectedFriendId(f.friend.id)}
                      title={`Trade with ${f.friend.username}`}
                    >
                      {f.friend.username}
                    </button>
                  ))}
                </div>
              )}
              {selectedFriendId && (
                <button className="text-xs text-destructive font-bold" onClick={async () => { await api.friendRemove(selectedFriendId); setSelectedFriendId(null); await refreshAll(); }}>
                  Remove selected friend
                </button>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Market */}
      {phase === "market" && (
        <div className="space-y-3">
          {listings.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground animate-fade-in">
              <Store className="w-14 h-14 mx-auto mb-3 opacity-20" />
              <p className="font-heading font-bold text-foreground">Marketplace is empty</p>
              <p className="text-xs mt-1">Be the first to list a trade!</p>
            </div>
          ) : (
            listings.map((l) => (
              <Card key={l.id} className="bg-card/60 border-border">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <UserCircle2 className="w-4 h-4 text-muted-foreground" />
                      <span className="font-heading font-bold text-foreground text-sm">{l.seller.username}</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground">{new Date(l.createdAt).toLocaleString()}</span>
                  </div>
                  <div className="grid grid-cols-[1fr_40px_1fr] items-center gap-2">
                    <div>
                      <span className="text-[10px] text-muted-foreground uppercase font-bold mb-1 block">Offer</span>
                      <div className="flex gap-1 flex-wrap">
                        {l.offered.map(({ cardId }) => { const card = allCards.find(c => c.id === cardId); return card ? <div key={cardId} className="w-28"><GameCard card={card} size="sm" /></div> : null; })}
                      </div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-primary mx-auto" />
                    <div>
                      <span className="text-[10px] text-muted-foreground uppercase font-bold mb-1 block">Ask</span>
                      <div className="flex gap-1 flex-wrap">
                        {l.requested.map(({ cardId }) => { const card = allCards.find(c => c.id === cardId); return card ? <div key={cardId} className="w-28"><GameCard card={card} size="sm" /></div> : null; })}
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button
                      onClick={async () => {
                        try { const res = await api.buyListing(l.id); onStateChange(res.state); toast({ title: "Purchase complete" }); await refreshAll(); }
                        catch (e) { toast({ title: "Buy failed", description: e instanceof Error ? e.message : String(e) }); }
                      }}
                      className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-heading font-bold text-sm hover:brightness-110 transition-all"
                    >
                      Buy
                    </button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Create new trade */}
      {phase === "create" && !showConfirm && (
        <div className="space-y-4">
          <Card className="bg-card/60 border-border">
            <CardHeader className="pb-3"><CardTitle className="text-sm">Choose Friend</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="relative">
                <input
                  value={friendQuery}
                  onChange={(e) => { setFriendQuery(e.target.value); setFriendDropdownOpen(true); setSelectedFriendId(null); }}
                  onFocus={() => setFriendDropdownOpen(true)}
                  onBlur={() => setTimeout(() => setFriendDropdownOpen(false), 120)}
                  placeholder={acceptedFriends.length === 0 ? "No friends yet (add in Friends tab)" : "Type a friend's name..."}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-secondary border border-border text-foreground placeholder:text-muted-foreground"
                />
                {friendDropdownOpen && filteredFriends.length > 0 && (
                  <div className="absolute z-50 mt-1 w-full rounded-lg border border-border bg-card shadow-lg overflow-hidden">
                    <div className="max-h-56 overflow-y-auto">
                      {filteredFriends.slice(0, 20).map((f) => (
                        <button
                          key={f.friend.id}
                          type="button"
                          className="w-full text-left px-3 py-2 text-xs hover:bg-secondary/80 text-foreground transition-colors"
                          onMouseDown={(e) => { e.preventDefault(); setSelectedFriendId(f.friend.id); setFriendQuery(f.friend.username); setFriendDropdownOpen(false); }}
                        >
                          <span className="font-heading font-bold">{f.friend.username}</span>
                          <span className="ml-2 text-[10px] text-muted-foreground">#{f.friend.id}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Tax display */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-muted-foreground font-bold uppercase">Tax Gold</label>
                  <input type="number" min={0} value={taxGold} onChange={(e) => setTaxGold(Math.max(0, Number(e.target.value) || 0))} className="w-full px-3 py-2 text-xs rounded-lg bg-secondary border border-border text-foreground" />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground font-bold uppercase">Tax Stardust</label>
                  <input type="number" min={0} value={taxStardust} onChange={(e) => setTaxStardust(Math.max(0, Number(e.target.value) || 0))} className="w-full px-3 py-2 text-xs rounded-lg bg-secondary border border-border text-foreground" />
                </div>
              </div>
              {(taxGold > 0 || taxStardust > 0) && (
                <Badge variant="outline" className="text-[10px] text-muted-foreground">
                  Trade cost: {taxGold > 0 && `${taxGold} Gold`}{taxGold > 0 && taxStardust > 0 && " + "}{taxStardust > 0 && `${taxStardust} Stardust`}
                </Badge>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="bg-card/60 border-border">
              <CardHeader className="pb-3"><CardTitle className="text-sm">You Offer ({offeredCards.length}/3)</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
                  <Input type="text" placeholder="Search your cards..." value={searchOwned} onChange={(e) => setSearchOwned(e.target.value)} className="pl-8 h-9 text-xs" />
                </div>
                <div className="grid grid-cols-3 gap-1.5 max-h-[300px] overflow-y-auto pr-1">
                  {ownedCards.slice(0, 30).map(card => card && (
                    <div key={card.id} onClick={() => toggleOffered(card.id)} className={cn("cursor-pointer transition-all", offeredCards.includes(card.id) && "ring-2 ring-primary scale-95")}>
                      <GameCard card={card} size="sm" selected={offeredCards.includes(card.id)} cardProgress={getCardProgress(playerState, card.id)} />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card/60 border-border">
              <CardHeader className="pb-3"><CardTitle className="text-sm">You Want ({requestedCards.length}/3)</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
                  <Input type="text" placeholder="Search catalog..." value={searchCatalog} onChange={(e) => setSearchCatalog(e.target.value)} className="pl-8 h-9 text-xs" />
                </div>
                <div className="grid grid-cols-3 gap-1.5 max-h-[300px] overflow-y-auto pr-1">
                  {!selectedFriendId ? (
                    <div className="col-span-3 text-center text-xs text-muted-foreground py-8">
                      Choose a friend first to see what they can trade.
                    </div>
                  ) : friendCardsLoading ? (
                    <div className="col-span-3 text-center text-xs text-muted-foreground py-8">
                      Loading friend trade pool…
                    </div>
                  ) : friendCardsError ? (
                    <div className="col-span-3 text-center text-xs text-destructive py-8">
                      {friendCardsError}
                    </div>
                  ) : (
                    friendWantedCards.slice(0, 30).map(card => (
                      <div key={card.id} onClick={() => toggleRequested(card.id)} className={cn("cursor-pointer transition-all", requestedCards.includes(card.id) && "ring-2 ring-[hsl(var(--legendary))] scale-95")}>
                        <GameCard card={card} size="sm" selected={requestedCards.includes(card.id)} />
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-center">
            <button
              onClick={() => setShowConfirm(true)}
              disabled={!selectedFriendId || offeredCards.length === 0 || requestedCards.length === 0}
              className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-heading font-bold text-sm hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              Review Trade →
            </button>
          </div>
        </div>
      )}

      {/* Confirmation step */}
      {phase === "create" && showConfirm && (
        <Card className="border-2 border-primary/30">
          <CardContent className="p-6 space-y-4">
            <h3 className="font-heading text-lg font-bold text-foreground text-center">⚠️ Confirm Trade</h3>
            <p className="text-xs text-muted-foreground text-center">Review carefully — this trade is final!</p>

            <div className="grid grid-cols-[1fr_40px_1fr] items-start gap-4">
              <div>
                <span className="text-[10px] text-destructive uppercase font-bold mb-2 block">You Give Away</span>
                <div className="flex gap-1 flex-wrap">
                  {offeredCards.map(id => { const card = allCards.find(c => c.id === id); return card ? <div key={id} className="w-28"><GameCard card={card} size="sm" cardProgress={getCardProgress(playerState, id)} /></div> : null; })}
                </div>
              </div>
              <ArrowLeftRight className="w-5 h-5 text-primary mx-auto mt-8" />
              <div>
                <span className="text-[10px] text-primary uppercase font-bold mb-2 block">You Receive</span>
                <div className="flex gap-1 flex-wrap">
                  {requestedCards.map(id => { const card = allCards.find(c => c.id === id); return card ? <div key={id} className="w-28"><GameCard card={card} size="sm" /></div> : null; })}
                </div>
              </div>
            </div>

            <div className="flex gap-3 justify-center">
              <button onClick={() => setShowConfirm(false)} className="px-5 py-2 rounded-xl bg-secondary text-secondary-foreground font-heading font-bold text-sm">← Back</button>
              <button
                onClick={async () => {
                  if (!selectedFriendId) return;
                  try {
                    await api.createTrade({ toPlayerId: selectedFriendId, offeredCardIds: offeredCards, requestedCardIds: requestedCards, taxGold, taxStardust });
                    toast({ title: "Offer sent" }); setOfferedCards([]); setRequestedCards([]); setShowConfirm(false); setPhase("outgoing"); await refreshAll();
                  } catch (e) { toast({ title: "Failed to send offer", description: e instanceof Error ? e.message : String(e) }); }
                }}
                className="px-5 py-2 rounded-xl bg-primary text-primary-foreground font-heading font-bold text-sm hover:brightness-110 transition-all"
              >
                ✅ Send Offer
              </button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
