import { useState, useMemo } from "react";
import { Crown, Sword, Shield, Wand2, AlertTriangle, Grid3X3, Lock, Unlock } from "lucide-react";
import { allGameCards, type GameCard as GameCardType, type CardType } from "@/data/cardIndex";
import GameCard from "@/components/GameCard";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { PlayerState } from "@/lib/playerState";

interface CardCatalogProps {
  playerState: PlayerState;
}

const typeFilters: { id: CardType | "all"; label: string; icon: React.ReactNode }[] = [
  { id: "all", label: "All", icon: <Grid3X3 className="w-3.5 h-3.5" /> },
  { id: "god", label: "Gods", icon: <Crown className="w-3.5 h-3.5" /> },
  { id: "hero", label: "Heroes", icon: <Sword className="w-3.5 h-3.5" /> },
  { id: "weapon", label: "Weapons", icon: <Shield className="w-3.5 h-3.5" /> },
  { id: "spell", label: "Skills", icon: <Wand2 className="w-3.5 h-3.5" /> },
  { id: "trap", label: "Traps", icon: <AlertTriangle className="w-3.5 h-3.5" /> },
];

const rarityOrder = ["legendary", "rare", "common"] as const;

const rarityLabels: Record<string, { label: string; icon: string }> = {
  legendary: { label: "Legendary", icon: "⚜️" },
  rare: { label: "Rare", icon: "💎" },
  common: { label: "Common", icon: "🗡️" },
};

export default function CardCatalog({ playerState }: CardCatalogProps) {
  const [activeFilter, setActiveFilter] = useState<CardType | "all">("all");
  const [selectedCard, setSelectedCard] = useState<GameCardType | null>(null);

  const ownedSet = useMemo(() => new Set(playerState.ownedCardIds), [playerState.ownedCardIds]);

  const filteredCards = useMemo(() => {
    return activeFilter === "all" ? allGameCards : allGameCards.filter((c) => c.type === activeFilter);
  }, [activeFilter]);

  const groupedByRarity = useMemo(() => {
    const groups: Record<string, GameCardType[]> = {};
    for (const r of rarityOrder) {
      const cards = filteredCards.filter((c) => c.rarity === r);
      if (cards.length > 0) groups[r] = cards;
    }
    return groups;
  }, [filteredCards]);

  // Count stats
  const totalFiltered = filteredCards.length;
  const ownedFiltered = filteredCards.filter((c) => ownedSet.has(c.id)).length;

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h2 className="font-heading text-2xl font-bold text-foreground">Card Catalog</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Browse all cards in the game — 
          <span className="text-primary font-semibold"> {ownedFiltered}/{totalFiltered}</span> unlocked
        </p>
      </div>

      {/* Filter Pills */}
      <div className="flex flex-wrap gap-2 mb-6">
        {typeFilters.map((f) => {
          const count =
            f.id === "all"
              ? allGameCards.length
              : allGameCards.filter((c) => c.type === f.id).length;
          const owned =
            f.id === "all"
              ? playerState.ownedCardIds.length
              : allGameCards.filter((c) => c.type === f.id && ownedSet.has(c.id)).length;
          return (
            <button
              key={f.id}
              onClick={() => setActiveFilter(f.id)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                activeFilter === f.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:bg-secondary/80 hover:text-foreground"
              )}
            >
              {f.icon}
              {f.label}
              <span className="opacity-70">
                {owned}/{count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Cards grouped by rarity */}
      {rarityOrder.map((rarity) => {
        const cards = groupedByRarity[rarity];
        if (!cards) return null;
        const info = rarityLabels[rarity];
        return (
          <div key={rarity} className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-lg">{info.icon}</span>
              <h3 className="font-heading text-lg font-bold text-foreground">{info.label}</h3>
              <span className="text-xs text-muted-foreground">
                ({cards.filter((c) => ownedSet.has(c.id)).length}/{cards.length})
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {cards.map((card) => {
                const isOwned = ownedSet.has(card.id);
                return (
                  <div
                    key={card.id}
                    className={cn(!isOwned && "grayscale opacity-50 hover:opacity-70 transition-opacity")}
                  >
                    <GameCard
                      card={card}
                      size="sm"
                      onClick={() => setSelectedCard(card)}
                      cardProgress={playerState.cardProgress[card.id]}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Card Detail Modal */}
      <Dialog open={!!selectedCard} onOpenChange={(open) => !open && setSelectedCard(null)}>
        <DialogContent className="bg-transparent border-none shadow-none max-w-fit p-0 [&>button]:hidden">
          {selectedCard && (
            <div className="flex flex-col items-center gap-4">
              <div className={cn(!ownedSet.has(selectedCard.id) && "grayscale opacity-60")}>
                <GameCard
                  card={selectedCard}
                  size="lg"
                  cardProgress={playerState.cardProgress[selectedCard.id]}
                />
              </div>
              <div className="flex items-center gap-2 text-sm font-medium">
                {ownedSet.has(selectedCard.id) ? (
                  <>
                    <Unlock className="w-4 h-4 text-primary" />
                    <span className="text-primary">Owned</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Not yet unlocked</span>
                  </>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
