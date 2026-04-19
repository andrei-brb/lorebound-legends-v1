import { useState, useMemo } from "react";
import { allGameCards, loreArcs, type Rarity, type CardType, type GameCard as GameCardType } from "@/data/cardIndex";
import GameCardComponent from "./GameCard";
import { Star, SparklesIcon, BookOpen } from "lucide-react";
import { type PlayerState, getCardProgress, xpForLevel } from "@/lib/playerState";
import { canPrestige, prestige } from "@/lib/progressionEngine";
import { getCosmeticById } from "@/data/cosmetics";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const rarityOrder: Rarity[] = ["legendary", "rare", "common"];
const rarityLabels: Record<Rarity, string> = {
  legendary: "⚜️ Legendary",
  rare: "💎 Rare",
  common: "🗡️ Common",
};

const rarityColors: Record<Rarity, string> = {
  legendary: "text-[hsl(var(--legendary))]",
  rare: "text-[hsl(var(--rare))]",
  common: "text-muted-foreground",
};

interface CollectionViewProps {
  onAddToDeck?: (cardId: string) => void;
  deckCardIds?: string[];
  playerState?: PlayerState;
  onStateChange?: (state: PlayerState) => void;
  searchQuery?: string;
  typeFilter?: "all" | CardType;
  rarityFilter?: "all" | Rarity;
  elementFilter?: "all" | "fire" | "water" | "earth" | "air" | "shadow" | "light" | "neutral";
  inDeckOnly?: boolean;
  sortBy?: "rarity_desc" | "rarity_asc" | "name_asc" | "name_desc" | "attack_desc" | "defense_desc" | "hp_desc" | "level_desc";
  highlightCardIds?: string[];
}

const rarityRank: Record<Rarity, number> = { common: 1, rare: 2, legendary: 3 };

function applyDiscovery({
  cards, ownedIds, deckCardIds, playerState, searchQuery, typeFilter, rarityFilter, elementFilter, inDeckOnly, sortBy,
}: {
  cards: GameCardType[]; ownedIds: string[]; deckCardIds: string[]; playerState?: PlayerState;
  searchQuery?: string; typeFilter?: "all" | CardType; rarityFilter?: "all" | Rarity;
  elementFilter?: "all" | "fire" | "water" | "earth" | "air" | "shadow" | "light" | "neutral";
  inDeckOnly?: boolean; sortBy?: CollectionViewProps["sortBy"];
}): GameCardType[] {
  const q = (searchQuery || "").trim().toLowerCase();
  let out = cards.filter((c) => ownedIds.includes(c.id));
  if (q) out = out.filter((c) => c.name.toLowerCase().includes(q));
  if (typeFilter && typeFilter !== "all") out = out.filter((c) => c.type === typeFilter);
  if (rarityFilter && rarityFilter !== "all") out = out.filter((c) => c.rarity === rarityFilter);
  if (elementFilter && elementFilter !== "all") out = out.filter((c) => (c.element || "neutral") === elementFilter);
  if (inDeckOnly) out = out.filter((c) => deckCardIds.includes(c.id));

  const levelFor = (cardId: string) => (playerState ? getCardProgress(playerState, cardId).level : 1);
  const s = sortBy || "rarity_desc";
  out = [...out].sort((a, b) => {
    switch (s) {
      case "rarity_asc": return rarityRank[a.rarity] - rarityRank[b.rarity] || a.name.localeCompare(b.name);
      case "rarity_desc": return rarityRank[b.rarity] - rarityRank[a.rarity] || a.name.localeCompare(b.name);
      case "name_desc": return b.name.localeCompare(a.name);
      case "name_asc": return a.name.localeCompare(b.name);
      case "level_desc": return levelFor(b.id) - levelFor(a.id) || (rarityRank[b.rarity] - rarityRank[a.rarity]) || a.name.localeCompare(b.name);
      case "attack_desc": return b.attack - a.attack || (rarityRank[b.rarity] - rarityRank[a.rarity]) || a.name.localeCompare(b.name);
      case "defense_desc": return b.defense - a.defense || (rarityRank[b.rarity] - rarityRank[a.rarity]) || a.name.localeCompare(b.name);
      case "hp_desc": return b.hp - a.hp || (rarityRank[b.rarity] - rarityRank[a.rarity]) || a.name.localeCompare(b.name);
      default: return 0;
    }
  });
  return out;
}

function CardGridItem({ card, onAddToDeck, deckCardIds, playerState, onStateChange, highlighted }: {
  card: GameCardType; onAddToDeck?: (id: string) => void; deckCardIds: string[];
  playerState?: PlayerState; onStateChange?: (state: PlayerState) => void; highlighted?: boolean;
}) {
  const inDeck = deckCardIds.includes(card.id);
  const hasArcPartner = card.loreArc ? allGameCards.some((c) => c.id !== card.id && c.loreArc === card.loreArc) : false;
  const progress = playerState ? getCardProgress(playerState, card.id) : undefined;
  const canPres = progress ? canPrestige(progress) : false;
  const equippedFrameId = playerState?.cosmeticsEquipped?.cardFrameId || null;
  const equippedFrameImage = equippedFrameId ? (getCosmeticById(equippedFrameId)?.image || null) : null;

  const handlePrestige = () => {
    if (!playerState || !onStateChange || !progress) return;
    if (!canPrestige(progress)) return;
    const newProgress = prestige(progress);
    onStateChange({ ...playerState, cardProgress: { ...playerState.cardProgress, [card.id]: newProgress } });
  };

  return (
    <div className={cn("relative", highlighted && "ring-2 ring-synergy rounded-lg shadow-[0_0_12px_hsl(var(--synergy)/0.5)] animate-pulse")}>
      <GameCardComponent
        card={card}
        onClick={onAddToDeck ? () => onAddToDeck(card.id) : undefined}
        selected={inDeck}
        showSynergy={hasArcPartner}
        cardProgress={progress}
        equippedFrameImage={equippedFrameImage}
      />
      {inDeck && (
        <div className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">✓</div>
      )}
      {canPres && onStateChange && (
        <button
          onClick={(e) => { e.stopPropagation(); handlePrestige(); }}
          className="absolute -bottom-2 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1 px-2 py-1 rounded-full bg-legendary text-primary-foreground text-[9px] font-bold hover:scale-110 transition-transform"
        >
          <Star className="w-3 h-3 fill-current" /> Prestige
        </button>
      )}
      {progress && progress.level < 20 && (
        <div className="mt-1 px-2">
          <div className="h-1 bg-secondary rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${(progress.xp / xpForLevel(progress.level)) * 100}%` }} />
          </div>
          <p className="text-[9px] text-muted-foreground text-center mt-0.5">{progress.xp}/{xpForLevel(progress.level)} XP</p>
        </div>
      )}
      {progress && progress.level >= 20 && (
        <p className="text-[9px] text-[hsl(var(--legendary))] text-center mt-1 font-bold">MAX LEVEL</p>
      )}
    </div>
  );
}

export default function CollectionView({
  onAddToDeck, deckCardIds = [], playerState, onStateChange,
  searchQuery, typeFilter = "all", rarityFilter = "all", elementFilter = "all", inDeckOnly = false, sortBy = "rarity_desc",
  highlightCardIds = [],
}: CollectionViewProps) {
  const highlightSet = useMemo(() => new Set(highlightCardIds), [highlightCardIds]);
  const ownedIds = playerState?.ownedCardIds || allGameCards.map(c => c.id);
  const [arcFilter, setArcFilter] = useState<string | null>(null);

  const q = (searchQuery || "").trim();
  const discoveryActive = q.length > 0 || typeFilter !== "all" || rarityFilter !== "all" || elementFilter !== "all" || inDeckOnly || sortBy !== "rarity_desc" || arcFilter !== null;
  
  const discoveredCards = discoveryActive
    ? applyDiscovery({
        cards: arcFilter ? allGameCards.filter(c => c.loreArc === arcFilter) : allGameCards,
        ownedIds, deckCardIds, playerState, searchQuery, typeFilter, rarityFilter, elementFilter, inDeckOnly, sortBy,
      })
    : [];

  // Empty state: no cards owned at all
  const totalOwned = ownedIds.length;
  if (totalOwned === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
        <BookOpen className="w-16 h-16 text-muted-foreground/30 mb-4" />
        <h2 className="font-heading text-xl font-bold text-foreground mb-2">No Cards Yet</h2>
        <p className="text-sm text-muted-foreground mb-4">Visit the Summon tab to open packs and build your collection!</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Lore Arcs - clickable */}
      <div className="flex flex-wrap gap-2">
        {loreArcs.map((arc) => (
          <button
            key={arc.id}
            onClick={() => setArcFilter(arcFilter === arc.id ? null : arc.id)}
            className={cn(
              "px-3 py-1.5 rounded-full border text-xs font-heading transition-colors",
              arcFilter === arc.id
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-secondary border-border text-secondary-foreground hover:bg-secondary/80"
            )}
          >
            {arc.name}
            <span className="ml-1.5 text-muted-foreground">({arc.cardIds.length})</span>
          </button>
        ))}
        {arcFilter && (
          <button onClick={() => setArcFilter(null)} className="px-3 py-1.5 rounded-full border border-input text-xs text-muted-foreground hover:text-foreground">
            Clear arc
          </button>
        )}
      </div>

      {discoveryActive ? (
        <div className="animate-fade-in">
          <h2 className="font-heading text-xl font-bold mb-4 text-foreground">
            Results
            <span className="ml-2 text-sm text-muted-foreground font-body">({discoveredCards.length})</span>
          </h2>
          {discoveredCards.length === 0 ? (
            <p className="text-sm text-muted-foreground">No cards match your filters.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-4 gap-4">
              {discoveredCards.map((card) => (
                <CardGridItem key={card.id} card={card} onAddToDeck={onAddToDeck} deckCardIds={deckCardIds} playerState={playerState} onStateChange={onStateChange} highlighted={highlightSet.has(card.id)} />
              ))}
            </div>
          )}
        </div>
      ) : (
        <>
          {rarityOrder.map((rarity) => {
            const cards = allGameCards.filter((c) => c.rarity === rarity && ownedIds.includes(c.id));
            const totalOfRarity = allGameCards.filter((c) => c.rarity === rarity).length;
            if (cards.length === 0) return null;
            const pct = Math.round((cards.length / totalOfRarity) * 100);
            const tex = rarity === "legendary" ? "/src/assets/box-tex-codex.jpg" : "/src/assets/box-tex-library.jpg";
            return (
              <div key={rarity} className="animate-fade-in">
                <div
                  className="rounded-2xl overflow-hidden relative isolate"
                  style={{
                    border: `1px solid hsl(var(--${rarity === "legendary" ? "legendary" : rarity === "rare" ? "rare" : "primary"}) / 0.4)`,
                    boxShadow: `0 8px 32px hsl(var(--background) / 0.6)`,
                  }}
                >
                  <div className="absolute inset-0 -z-10" aria-hidden>
                    <img src={tex} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-card/70" />
                  </div>
                  <div className="p-5">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className={cn("font-heading text-lg flex items-center gap-2 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]", rarityColors[rarity])}>
                        {rarityLabels[rarity]}
                        <span className="text-sm text-foreground/80 font-body">({cards.length})</span>
                      </h3>
                      <Badge variant="outline" className={cn("text-[10px]", rarityColors[rarity])}>
                        {pct}% complete
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-4 gap-4">
                      {cards.map((card) => (
                        <CardGridItem key={card.id} card={card} onAddToDeck={onAddToDeck} deckCardIds={deckCardIds} playerState={playerState} onStateChange={onStateChange} highlighted={highlightSet.has(card.id)} />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}
