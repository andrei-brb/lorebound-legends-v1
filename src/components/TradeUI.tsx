import { useState, useMemo } from "react";
import { ArrowLeftRight, Check, X, Search, ArrowRight, UserCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { allCards } from "@/data/cards";
import type { PlayerState } from "@/lib/playerState";
import GameCard from "./GameCard";
import { getCardProgress } from "@/lib/playerState";

type TradePhase = "browse" | "create" | "confirm" | "history";

interface TradeOffer {
  id: string;
  fromPlayer: string;
  toPlayer: string;
  offeredCardIds: string[];
  requestedCardIds: string[];
  status: "pending" | "accepted" | "rejected" | "countered";
  createdAt: number;
}

// Mock incoming trade offers
const mockIncoming: TradeOffer[] = [
  {
    id: "t1",
    fromPlayer: "DragonSlayer99",
    toPlayer: "You",
    offeredCardIds: ["pyrothos"],
    requestedCardIds: ["moon-goddess"],
    status: "pending",
    createdAt: Date.now() - 3600000,
  },
  {
    id: "t2",
    fromPlayer: "MythicQueen",
    toPlayer: "You",
    offeredCardIds: ["glacius", "verdantia"],
    requestedCardIds: ["nyx"],
    status: "pending",
    createdAt: Date.now() - 7200000,
  },
];

interface TradeUIProps {
  playerState: PlayerState;
  onStateChange: (state: PlayerState) => void;
}

export default function TradeUI({ playerState, onStateChange }: TradeUIProps) {
  const [phase, setPhase] = useState<TradePhase>("browse");
  const [offeredCards, setOfferedCards] = useState<string[]>([]);
  const [requestedCards, setRequestedCards] = useState<string[]>([]);
  const [searchOwned, setSearchOwned] = useState("");
  const [searchCatalog, setSearchCatalog] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);
  const [trades, setTrades] = useState<TradeOffer[]>(mockIncoming);

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

  const handleAcceptTrade = (tradeId: string) => {
    const trade = trades.find(t => t.id === tradeId);
    if (!trade) return;

    // Add offered cards, remove requested cards
    const newOwned = [...playerState.ownedCardIds.filter(id => !trade.requestedCardIds.includes(id)), ...trade.offeredCardIds];
    const newProgress = { ...playerState.cardProgress };
    for (const id of trade.offeredCardIds) {
      if (!newProgress[id]) newProgress[id] = { level: 1, xp: 0, prestigeLevel: 0, starProgress: { dupeCount: 0, goldStars: 0, redStars: 0 } };
    }
    for (const id of trade.requestedCardIds) {
      delete newProgress[id];
    }

    onStateChange({ ...playerState, ownedCardIds: newOwned, cardProgress: newProgress });
    setTrades(prev => prev.map(t => t.id === tradeId ? { ...t, status: "accepted" } : t));
  };

  const handleRejectTrade = (tradeId: string) => {
    setTrades(prev => prev.map(t => t.id === tradeId ? { ...t, status: "rejected" } : t));
  };

  const handleSendOffer = () => {
    if (offeredCards.length === 0 || requestedCards.length === 0) return;
    setTrades(prev => [...prev, {
      id: `t-${Date.now()}`,
      fromPlayer: "You",
      toPlayer: "Someone",
      offeredCardIds: offeredCards,
      requestedCardIds: requestedCards,
      status: "pending",
      createdAt: Date.now(),
    }]);
    setOfferedCards([]);
    setRequestedCards([]);
    setPhase("browse");
    setShowConfirm(false);
  };

  const pendingIncoming = trades.filter(t => t.status === "pending" && t.toPlayer === "You");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading text-2xl font-bold text-foreground flex items-center gap-2">
          <ArrowLeftRight className="w-6 h-6 text-primary" /> Trading Post
        </h2>
        <p className="text-sm text-muted-foreground mt-1">Trade cards with other players in your server</p>
      </div>

      {/* Phase tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setPhase("browse")}
          className={cn("px-4 py-2 rounded-lg text-sm font-medium transition-colors", phase === "browse" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/80")}
        >
          Incoming ({pendingIncoming.length})
        </button>
        <button
          onClick={() => { setPhase("create"); setOfferedCards([]); setRequestedCards([]); }}
          className={cn("px-4 py-2 rounded-lg text-sm font-medium transition-colors", phase === "create" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/80")}
        >
          New Trade
        </button>
        <button
          onClick={() => setPhase("history")}
          className={cn("px-4 py-2 rounded-lg text-sm font-medium transition-colors", phase === "history" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/80")}
        >
          History
        </button>
      </div>

      {/* Incoming trades */}
      {phase === "browse" && (
        <div className="space-y-3">
          {pendingIncoming.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <ArrowLeftRight className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p className="font-heading font-bold">No incoming trades</p>
              <p className="text-xs mt-1">Create a new trade offer to get started!</p>
            </div>
          )}
          {pendingIncoming.map(trade => (
            <div key={trade.id} className="bg-card border border-border rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <UserCircle2 className="w-5 h-5 text-muted-foreground" />
                  <span className="font-heading font-bold text-sm text-foreground">{trade.fromPlayer}</span>
                  <span className="text-[10px] text-muted-foreground">wants to trade</span>
                </div>
                <span className="text-[10px] text-muted-foreground">{new Date(trade.createdAt).toLocaleString()}</span>
              </div>

              <div className="grid grid-cols-[1fr_40px_1fr] items-center gap-2">
                {/* They offer */}
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase font-bold mb-1 block">They offer</span>
                  <div className="flex gap-1 flex-wrap">
                    {trade.offeredCardIds.map(id => {
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
                    {trade.requestedCardIds.map(id => {
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
                  onClick={() => handleRejectTrade(trade.id)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-destructive/20 text-destructive text-xs font-bold hover:bg-destructive/30"
                >
                  <X className="w-3 h-3" /> Decline
                </button>
                <button
                  onClick={() => handleAcceptTrade(trade.id)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold hover:brightness-110"
                >
                  <Check className="w-3 h-3" /> Accept
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create new trade */}
      {phase === "create" && !showConfirm && (
        <div className="space-y-4">
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
              disabled={offeredCards.length === 0 || requestedCards.length === 0}
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
              onClick={handleSendOffer}
              className="px-5 py-2 rounded-xl bg-primary text-primary-foreground font-heading font-bold text-sm hover:brightness-110"
            >
              ✅ Send Offer
            </button>
          </div>
        </div>
      )}

      {/* Trade history */}
      {phase === "history" && (
        <div className="space-y-2">
          {trades.filter(t => t.status !== "pending").length === 0 && (
            <p className="text-center text-muted-foreground py-8 text-sm">No trade history yet</p>
          )}
          {trades.filter(t => t.status !== "pending").map(trade => (
            <div key={trade.id} className="bg-card border border-border rounded-lg p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-heading font-bold text-foreground">
                  {trade.fromPlayer} → {trade.toPlayer}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {trade.offeredCardIds.length} card(s) ↔ {trade.requestedCardIds.length} card(s)
                </span>
              </div>
              <span className={cn(
                "text-[10px] font-bold px-2 py-0.5 rounded-full uppercase",
                trade.status === "accepted" ? "bg-green-500/20 text-green-400" :
                trade.status === "rejected" ? "bg-destructive/20 text-destructive" :
                "bg-secondary text-muted-foreground"
              )}>
                {trade.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
