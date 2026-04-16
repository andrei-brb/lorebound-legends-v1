import { useEffect, useMemo, useState } from "react";
import { ArrowLeftRight, Check, X, Search, ArrowRight, UserCircle2, RefreshCw, Store, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { allCards } from "@/data/cards";
import type { PlayerState } from "@/lib/playerState";
import GameCard from "./GameCard";
import { getCardProgress } from "@/lib/playerState";
import { api } from "@/lib/apiClient";
import { toast } from "@/hooks/use-toast";

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
  const [friendQuery, setFriendQuery] = useState("");
  const [friendDropdownOpen, setFriendDropdownOpen] = useState(false);
  const [taxGold, setTaxGold] = useState<number>(0);
  const [taxStardust, setTaxStardust] = useState<number>(0);
  const [friendSearch, setFriendSearch] = useState("");
  const [friendSearchResults, setFriendSearchResults] = useState<Array<{ id: number; discordId: string; username: string; avatar?: string | null }>>([]);
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
      const [meRes, fRes, tRes, mRes] = await Promise.all([
        api.getMe(),
        api.getFriends(),
        api.getTrades(),
        api.getMarket("open"),
      ]);
      setMe(meRes.me);
      setFriends(fRes);
      setTrades(tRes.trades);
      setListings(mRes.listings);
    } catch (e) {
      console.error("[TradeUI] refresh failed", e);
      toast({ title: "Failed to load multiplayer data", description: e instanceof Error ? e.message : String(e) });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (friendSearch.trim().length < 2) {
      setFriendSearchResults([]);
      setFriendSearchOpen(false);
      return;
    }
    setFriendSearchLoading(true);
    const timer = setTimeout(async () => {
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
    return () => clearTimeout(timer);
  }, [friendSearch]);

  const ownedCards = useMemo(() => {
    return playerState.ownedCardIds
      .map(id => allCards.find(c => c.id === id))
      .filter(Boolean)
      .filter(c => c!.name.toLowerCase().includes(searchOwned.toLowerCase()));
  }, [playerState.ownedCardIds, searchOwned]);

  const catalogCards = useMemo(() => {
    return allCards
      .filter(c => (c.type === "hero" || c.type === "god") && !playerState.ownedCardIds.includes(c.id))
      .filter(c => c.name.toLowerCase().includes(searchCatalog.toLowerCase()));
  }, [playerState.ownedCardIds, searchCatalog]);

  const toggleOffered = (id: string) => {
    setOfferedCards(prev => prev.includes(id) ? prev.filter(x => x !== id) : prev.length < 3 ? [...prev, id] : prev);
  };

  const toggleRequested = (id: string) => {
    setRequestedCards(prev => prev.includes(id) ? prev.filter(x => x !== id) : prev.length < 3 ? [...prev, id] : prev);
  };

  const pendingIncoming = me ? trades.filter(t => t.status === "open" && t.to.id === me.id) : [];
  const pendingOutgoing = me ? trades.filter(t => t.status === "open" && t.from.id === me.id) : [];
  const acceptedFriends = friends?.accepted || [];
  const filteredFriends = friendQuery.trim()
    ? acceptedFriends.filter((f) => f.friend.username.toLowerCase().includes(friendQuery.trim().toLowerCase()))
    : acceptedFriends;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading text-2xl font-bold text-foreground flex items-center gap-2">
          <ArrowLeftRight className="w-6 h-6 text-primary" /> Trading Post
        </h2>
        <p className="text-sm text-muted-foreground mt-1">Trade cards with friends, or post offers on the market.</p>
      </div>

      {/* Phase tabs */}
      <div className="flex flex-wrap gap-2 items-center">
        <button
          onClick={() => setPhase("incoming")}
          className={cn("px-4 py-2 rounded-lg text-sm font-medium transition-colors", phase === "incoming" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/80")}
        >
          Incoming ({pendingIncoming.length})
        </button>
        <button
          onClick={() => { setPhase("outgoing"); }}
          className={cn("px-4 py-2 rounded-lg text-sm font-medium transition-colors", phase === "outgoing" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/80")}
        >
          Outgoing ({pendingOutgoing.length})
        </button>
        <button
          onClick={() => { setPhase("create"); setOfferedCards([]); setRequestedCards([]); setShowConfirm(false); }}
          className={cn("px-4 py-2 rounded-lg text-sm font-medium transition-colors", phase === "create" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/80")}
        >
          New Trade
        </button>
        <button
          onClick={() => setPhase("friends")}
          className={cn("px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2", phase === "friends" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/80")}
        >
          <Users className="w-4 h-4" /> Friends
        </button>
        <button
          onClick={() => setPhase("market")}
          className={cn("px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2", phase === "market" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/80")}
        >
          <Store className="w-4 h-4" /> Market
        </button>

        <button
          onClick={refreshAll}
          disabled={loading}
          className={cn("ml-auto px-3 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2", "bg-secondary text-secondary-foreground hover:bg-secondary/80", loading && "opacity-50 cursor-not-allowed")}
        >
          <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} /> Refresh
        </button>
      </div>

      {/* Incoming trades */}
      {phase === "incoming" && (
        <div className="space-y-3">
          {pendingIncoming.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <ArrowLeftRight className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-heading font-bold">No trades yet</p>
              <p className="text-xs mt-1">Ask a friend to send you an offer.</p>
            </div>
          )}
          {pendingIncoming.map(trade => (
            <div key={trade.id} className="bg-card border border-border rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <UserCircle2 className="w-5 h-5 text-muted-foreground" />
                  <span className="font-heading font-bold text-sm text-foreground">{trade.from.username}</span>
                  <span className="text-[10px] text-muted-foreground">wants to trade</span>
                </div>
                <span className="text-[10px] text-muted-foreground">{new Date(trade.createdAt).toLocaleString()}</span>
              </div>

              <div className="grid grid-cols-[1fr_40px_1fr] items-center gap-2">
                {/* They offer */}
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase font-bold mb-1 block">They offer</span>
                  <div className="flex gap-1 flex-wrap">
                    {trade.offered.map(({ cardId: id }) => {
                      const card = allCards.find(c => c.id === id);
                      return card ? (
                        <div key={id} className="w-28">
                          <GameCard card={card} size="sm" cardProgress={getCardProgress(playerState, id)} />
                        </div>
                      ) : null;
                    })}
                  </div>
                </div>

                <ArrowRight className="w-5 h-5 text-primary mx-auto" />

                {/* They want */}
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase font-bold mb-1 block">They want</span>
                  <div className="flex gap-1 flex-wrap">
                    {trade.requested.map(({ cardId: id }) => {
                      const card = allCards.find(c => c.id === id);
                      return card ? (
                        <div key={id} className="w-28">
                          <GameCard card={card} size="sm" cardProgress={getCardProgress(playerState, id)} />
                        </div>
                      ) : null;
                    })}
                  </div>
                </div>
              </div>

              <div className="flex gap-2 justify-end">
                <button
                  onClick={async () => {
                    try {
                      const res = await api.acceptTrade(trade.id);
                      onStateChange(res.state);
                      toast({ title: "Trade accepted" });
                      await refreshAll();
                    } catch (e) {
                      toast({ title: "Trade failed", description: e instanceof Error ? e.message : String(e) });
                    }
                  }}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:brightness-110"
                >
                  <Check className="w-3 h-3" /> Accept
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Outgoing trades */}
      {phase === "outgoing" && (
        <div className="space-y-3">
          {pendingOutgoing.length === 0 && (
            <p className="text-center text-muted-foreground py-8 text-sm">No outgoing trades.</p>
          )}
          {pendingOutgoing.map(trade => (
            <div key={trade.id} className="bg-card border border-border rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <UserCircle2 className="w-5 h-5 text-muted-foreground" />
                  <span className="font-heading font-bold text-sm text-foreground">To {trade.to.username}</span>
                </div>
                <span className="text-[10px] text-muted-foreground">{new Date(trade.createdAt).toLocaleString()}</span>
              </div>
              <div className="flex justify-end">
                <button
                  onClick={async () => {
                    try {
                      await api.cancelTrade(trade.id);
                      toast({ title: "Trade cancelled" });
                      await refreshAll();
                    } catch (e) {
                      toast({ title: "Cancel failed", description: e instanceof Error ? e.message : String(e) });
                    }
                  }}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-destructive/20 text-destructive text-xs font-bold hover:bg-destructive/30"
                >
                  <X className="w-3 h-3" /> Cancel
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Friends */}
      {phase === "friends" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-card border border-border rounded-xl p-4 space-y-3">
              <h3 className="font-heading font-bold text-foreground text-sm">Add Friend</h3>
              <div className="relative">
                <input
                  value={friendSearch}
                  onChange={(e) => setFriendSearch(e.target.value)}
                  onFocus={() => { if (friendSearchResults.length > 0) setFriendSearchOpen(true); }}
                  onBlur={() => setTimeout(() => setFriendSearchOpen(false), 150)}
                  placeholder="Search by username..."
                  className="w-full px-3 py-2 text-xs rounded-lg bg-secondary border border-border text-foreground placeholder:text-muted-foreground"
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
                          className="w-full text-left px-3 py-2 text-xs hover:bg-secondary/80 text-foreground"
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
                  try {
                    await api.friendRequest(friendSearch);
                    toast({ title: "Friend request sent" });
                    setFriendSearch("");
                    setFriendSearchResults([]);
                    setFriendSearchOpen(false);
                    await refreshAll();
                  } catch (e) {
                    toast({ title: "Friend request failed", description: e instanceof Error ? e.message : String(e) });
                  }
                }}
                disabled={!friendSearch.trim()}
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-heading font-bold text-sm disabled:opacity-40"
              >
                Send request
              </button>
            </div>

            <div className="bg-card border border-border rounded-xl p-4 space-y-3">
              <h3 className="font-heading font-bold text-foreground text-sm">Incoming Requests</h3>
              {(friends?.incoming || []).length === 0 ? (
                <p className="text-xs text-muted-foreground">No incoming requests.</p>
              ) : (
                <div className="space-y-2">
                  {friends!.incoming.map((req) => (
                    <div key={req.id} className="flex items-center justify-between gap-2">
                      <span className="text-sm text-foreground font-heading font-bold">{req.from.username}</span>
                      <div className="flex gap-2">
                        <button
                          className="px-3 py-1.5 rounded-lg bg-secondary text-secondary-foreground text-xs font-bold"
                          onClick={async () => { await api.friendRespond(req.id, false); await refreshAll(); }}
                        >
                          Decline
                        </button>
                        <button
                          className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold"
                          onClick={async () => { await api.friendRespond(req.id, true); await refreshAll(); }}
                        >
                          Accept
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-4 space-y-3">
            <h3 className="font-heading font-bold text-foreground text-sm">Your Friends</h3>
            {(friends?.accepted || []).length === 0 ? (
              <p className="text-xs text-muted-foreground">No friends yet.</p>
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
              <button
                className="text-xs text-destructive font-bold"
                onClick={async () => { await api.friendRemove(selectedFriendId); setSelectedFriendId(null); await refreshAll(); }}
              >
                Remove selected friend
              </button>
            )}
          </div>
        </div>
      )}

      {/* Market */}
      {phase === "market" && (
        <div className="space-y-3">
          {listings.length === 0 ? (
            <p className="text-center text-muted-foreground py-8 text-sm">No listings yet.</p>
          ) : (
            listings.map((l) => (
              <div key={l.id} className="bg-card border border-border rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-heading font-bold text-foreground text-sm">{l.seller.username}</span>
                  <span className="text-[10px] text-muted-foreground">{new Date(l.createdAt).toLocaleString()}</span>
                </div>
                <div className="grid grid-cols-[1fr_40px_1fr] items-center gap-2">
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase font-bold mb-1 block">Offer</span>
                    <div className="flex gap-1 flex-wrap">
                      {l.offered.map(({ cardId }) => {
                        const card = allCards.find(c => c.id === cardId);
                        return card ? <div key={cardId} className="w-28"><GameCard card={card} size="sm" /></div> : null;
                      })}
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-primary mx-auto" />
                  <div>
                    <span className="text-[10px] text-muted-foreground uppercase font-bold mb-1 block">Ask</span>
                    <div className="flex gap-1 flex-wrap">
                      {l.requested.map(({ cardId }) => {
                        const card = allCards.find(c => c.id === cardId);
                        return card ? <div key={cardId} className="w-28"><GameCard card={card} size="sm" /></div> : null;
                      })}
                    </div>
                  </div>
                </div>
                <div className="flex justify-end">
                  <button
                    onClick={async () => {
                      try {
                        const res = await api.buyListing(l.id);
                        onStateChange(res.state);
                        toast({ title: "Purchase complete" });
                        await refreshAll();
                      } catch (e) {
                        toast({ title: "Buy failed", description: e instanceof Error ? e.message : String(e) });
                      }
                    }}
                    className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-heading font-bold text-sm"
                  >
                    Buy
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Create new trade */}
      {phase === "create" && !showConfirm && (
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-xl p-4 space-y-3">
            <h3 className="font-heading text-sm font-bold text-foreground">Choose Friend</h3>
            <div className="relative">
              <input
                value={friendQuery}
                onChange={(e) => {
                  setFriendQuery(e.target.value);
                  setFriendDropdownOpen(true);
                  // If the user starts typing again, clear the previous selection.
                  setSelectedFriendId(null);
                }}
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
                        className="w-full text-left px-3 py-2 text-xs hover:bg-secondary/80 text-foreground"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setSelectedFriendId(f.friend.id);
                          setFriendQuery(f.friend.username);
                          setFriendDropdownOpen(false);
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

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-muted-foreground font-bold uppercase">Tax Gold</label>
                <input
                  type="number"
                  min={0}
                  value={taxGold}
                  onChange={(e) => setTaxGold(Math.max(0, Number(e.target.value) || 0))}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-secondary border border-border text-foreground"
                />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground font-bold uppercase">Tax Stardust</label>
                <input
                  type="number"
                  min={0}
                  value={taxStardust}
                  onChange={(e) => setTaxStardust(Math.max(0, Number(e.target.value) || 0))}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-secondary border border-border text-foreground"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Your cards to offer */}
            <div className="space-y-2">
              <h3 className="font-heading text-sm font-bold text-foreground">You Offer ({offeredCards.length}/3)</h3>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search your cards..."
                  value={searchOwned}
                  onChange={(e) => setSearchOwned(e.target.value)}
                  className="w-full pl-7 pr-3 py-2 text-xs rounded-lg bg-secondary border border-border text-foreground placeholder:text-muted-foreground"
                />
              </div>
              <div className="grid grid-cols-3 gap-1.5 max-h-[300px] overflow-y-auto pr-1">
                {ownedCards.slice(0, 30).map(card => card && (
                  <div
                    key={card.id}
                    onClick={() => toggleOffered(card.id)}
                    className={cn("cursor-pointer transition-all", offeredCards.includes(card.id) && "ring-2 ring-primary scale-95")}
                  >
                    <GameCard card={card} size="sm" selected={offeredCards.includes(card.id)} cardProgress={getCardProgress(playerState, card.id)} />
                  </div>
                ))}
              </div>
            </div>

            {/* Cards you want */}
            <div className="space-y-2">
              <h3 className="font-heading text-sm font-bold text-foreground">You Want ({requestedCards.length}/3)</h3>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search catalog..."
                  value={searchCatalog}
                  onChange={(e) => setSearchCatalog(e.target.value)}
                  className="w-full pl-7 pr-3 py-2 text-xs rounded-lg bg-secondary border border-border text-foreground placeholder:text-muted-foreground"
                />
              </div>
              <div className="grid grid-cols-3 gap-1.5 max-h-[300px] overflow-y-auto pr-1">
                {catalogCards.slice(0, 30).map(card => (
                  <div
                    key={card.id}
                    onClick={() => toggleRequested(card.id)}
                    className={cn("cursor-pointer transition-all", requestedCards.includes(card.id) && "ring-2 ring-legendary scale-95")}
                  >
                    <GameCard card={card} size="sm" selected={requestedCards.includes(card.id)} />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-center">
            <button
              onClick={() => setShowConfirm(true)}
              disabled={!selectedFriendId || offeredCards.length === 0 || requestedCards.length === 0}
              className="px-6 py-2.5 rounded-xl bg-primary text-primary-foreground font-heading font-bold text-sm hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Review Trade →
            </button>
          </div>
        </div>
      )}

      {/* Confirmation step */}
      {phase === "create" && showConfirm && (
        <div className="bg-card border-2 border-primary/30 rounded-xl p-6 space-y-4">
          <h3 className="font-heading text-lg font-bold text-foreground text-center">⚠️ Confirm Trade</h3>
          <p className="text-xs text-muted-foreground text-center">Review carefully — this trade is final!</p>

          <div className="grid grid-cols-[1fr_40px_1fr] items-start gap-4">
            <div>
              <span className="text-[10px] text-destructive uppercase font-bold mb-2 block">You Give Away</span>
              <div className="flex gap-1 flex-wrap">
                {offeredCards.map(id => {
                  const card = allCards.find(c => c.id === id);
                  return card ? <div key={id} className="w-28"><GameCard card={card} size="sm" cardProgress={getCardProgress(playerState, id)} /></div> : null;
                })}
              </div>
            </div>
            <ArrowLeftRight className="w-5 h-5 text-primary mx-auto mt-8" />
            <div>
              <span className="text-[10px] text-primary uppercase font-bold mb-2 block">You Receive</span>
              <div className="flex gap-1 flex-wrap">
                {requestedCards.map(id => {
                  const card = allCards.find(c => c.id === id);
                  return card ? <div key={id} className="w-28"><GameCard card={card} size="sm" /></div> : null;
                })}
              </div>
            </div>
          </div>

          <div className="flex gap-3 justify-center">
            <button
              onClick={() => setShowConfirm(false)}
              className="px-5 py-2 rounded-xl bg-secondary text-secondary-foreground font-heading font-bold text-sm"
            >
              ← Back
            </button>
            <button
              onClick={async () => {
                if (!selectedFriendId) return;
                try {
                  await api.createTrade({
                    toPlayerId: selectedFriendId,
                    offeredCardIds: offeredCards,
                    requestedCardIds: requestedCards,
                    taxGold,
                    taxStardust,
                  });
                  toast({ title: "Offer sent" });
                  setOfferedCards([]);
                  setRequestedCards([]);
                  setShowConfirm(false);
                  setPhase("outgoing");
                  await refreshAll();
                } catch (e) {
                  toast({ title: "Failed to send offer", description: e instanceof Error ? e.message : String(e) });
                }
              }}
              className="px-5 py-2 rounded-xl bg-primary text-primary-foreground font-heading font-bold text-sm hover:brightness-110"
            >
              ✅ Send Offer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
