import { useState, useMemo } from "react";
import { Crown, Sword, Shield, Wand2, AlertTriangle, Grid3X3, Lock, Unlock } from "lucide-react";
import { allGameCards, type GameCard as GameCardType, type CardType } from "@/data/cardIndex";
import GameCard from "@/components/GameCard";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { PlayerState } from "@/lib/playerState";
import GlassPanel from "@/components/scene/GlassPanel";
import { texCodex } from "@/components/scene/panelTextures";

interface CardCatalogProps {
  playerState: PlayerState;
}

/** Collection ownership + any card id still referenced in a saved deck (avoids catalog "locked" when presets desync from ownedCardIds). */
function getCatalogUnlockedIds(state: PlayerState): Set<string> {
  const ids = new Set(state.ownedCardIds);
  for (const preset of state.deckPresets ?? []) {
    for (const id of preset.cardIds ?? []) {
      if (id) ids.add(id);
    }
  }
  return ids;
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

  const catalogUnlockedSet = useMemo(() => getCatalogUnlockedIds(playerState), [playerState]);

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
  const ownedFiltered = filteredCards.filter((c) => catalogUnlockedSet.has(c.id)).length;

  return (
    <div className="px-4 sm:px-6 max-w-7xl mx-auto pb-8">
      <GlassPanel hue="var(--primary)" glow={0.4} padding="lg" bg={texCodex} bgTint={0.52}>
      {/* Header */}
      <div className="mb-6">
        <h2 className="font-heading text-2xl font-bold text-foreground drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">Card Catalog</h2>
        <p className="text-sm text-foreground/85 mt-1 drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)]">
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
              ? catalogUnlockedSet.size
              : allGameCards.filter((c) => c.type === f.id && catalogUnlockedSet.has(c.id)).length;
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
              <h3 className="font-heading text-lg font-bold text-foreground drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">{info.label}</h3>
              <span className="text-xs text-foreground/75 drop-shadow-[0_1px_2px_rgba(0,0,0,0.75)]">
                ({cards.filter((c) => catalogUnlockedSet.has(c.id)).length}/{cards.length})
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {cards.map((card) => {
                const inCollection = playerState.ownedCardIds.includes(card.id);
                const unlocked = catalogUnlockedSet.has(card.id);
                return (
                  <div
                    key={card.id}
                    className={cn(!unlocked && "grayscale opacity-50 hover:opacity-70 transition-opacity")}
                  >
                    <GameCard
                      card={card}
                      size="sm"
                      onClick={() => setSelectedCard(card)}
                      cardProgress={playerState.cardProgress[card.id]}
                    />
                    {unlocked && !inCollection && (
                      <p className="text-[9px] text-center text-amber-600/90 font-medium mt-1 leading-tight">In a deck only</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
      </GlassPanel>

      {/* Card Detail Modal */}
      <Dialog open={!!selectedCard} onOpenChange={(open) => !open && setSelectedCard(null)}>
        <DialogContent className="bg-transparent border-none shadow-none max-w-fit p-0 [&>button]:hidden">
          {selectedCard && (
            <div className="flex flex-col items-center gap-4">
              <div className={cn(!catalogUnlockedSet.has(selectedCard.id) && "grayscale opacity-60")}>
                <GameCard
                  card={selectedCard}
                  size="lg"
                  cardProgress={playerState.cardProgress[selectedCard.id]}
                />
              </div>
              <div className="flex flex-col items-center gap-1 text-sm font-medium">
                {!catalogUnlockedSet.has(selectedCard.id) ? (
                  <>
                    <div className="flex items-center gap-2">
                      <Lock className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Not yet unlocked</span>
                    </div>
                  </>
                ) : playerState.ownedCardIds.includes(selectedCard.id) ? (
                  <div className="flex items-center gap-2">
                    <Unlock className="w-4 h-4 text-primary" />
                    <span className="text-primary">In your collection</span>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      <Unlock className="w-4 h-4 text-amber-600" />
                      <span className="text-amber-600">In a saved deck</span>
                    </div>
                    <p className="text-xs text-muted-foreground font-normal text-center max-w-xs">
                      This card is listed in a deck preset but not in your collection. Remove it from the deck or pull it again to sync.
                    </p>
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
