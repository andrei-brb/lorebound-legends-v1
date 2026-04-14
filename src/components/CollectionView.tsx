import { allCards, loreArcs, type Rarity } from "@/data/cards";
import GameCard from "./GameCard";
import { Star } from "lucide-react";
import { type PlayerState, getCardProgress, xpForLevel } from "@/lib/playerState";
import { canPrestige, prestige } from "@/lib/progressionEngine";

const rarityOrder: Rarity[] = ["legendary", "rare", "common"];
const rarityLabels: Record<Rarity, string> = {
  legendary: "⚜️ Legendary",
  rare: "💎 Rare",
  common: "🗡️ Common",
};

interface CollectionViewProps {
  onAddToDeck?: (cardId: string) => void;
  deckCardIds?: string[];
  playerState?: PlayerState;
  onStateChange?: (state: PlayerState) => void;
}

export default function CollectionView({ onAddToDeck, deckCardIds = [], playerState, onStateChange }: CollectionViewProps) {
  const ownedIds = playerState?.ownedCardIds || allCards.map(c => c.id);

  const handlePrestige = (cardId: string) => {
    if (!playerState || !onStateChange) return;
    const progress = getCardProgress(playerState, cardId);
    if (!canPrestige(progress)) return;
    const newProgress = prestige(progress);
    const newState = {
      ...playerState,
      cardProgress: { ...playerState.cardProgress, [cardId]: newProgress },
    };
    onStateChange(newState);
  };

  return (
    <div className="space-y-10">
      {/* Lore Arcs */}
      <div className="flex flex-wrap gap-3 mb-4">
        {loreArcs.map((arc) => (
          <div key={arc.id} className="px-3 py-1.5 rounded-full bg-secondary border border-border text-xs text-secondary-foreground font-heading">
            {arc.name}
            <span className="ml-1.5 text-muted-foreground">({arc.cardIds.length} cards)</span>
          </div>
        ))}
      </div>

      {rarityOrder.map((rarity) => {
        const cards = allCards.filter((c) => c.rarity === rarity && ownedIds.includes(c.id));
        if (cards.length === 0) return null;
        return (
          <div key={rarity} className="animate-fade-in">
            <h2 className="font-heading text-xl font-bold mb-4 text-foreground">
              {rarityLabels[rarity]}
              <span className="ml-2 text-sm text-muted-foreground font-body">({cards.length})</span>
            </h2>
            <div className="flex flex-wrap gap-5">
              {cards.map((card) => {
                const inDeck = deckCardIds.includes(card.id);
                const hasArcPartner = card.loreArc
                  ? allCards.some((c) => c.id !== card.id && c.loreArc === card.loreArc)
                  : false;
                const progress = playerState ? getCardProgress(playerState, card.id) : undefined;
                const canPres = progress ? canPrestige(progress) : false;

                return (
                  <div key={card.id} className="relative">
                    <GameCard
                      card={card}
                      onClick={onAddToDeck ? () => onAddToDeck(card.id) : undefined}
                      selected={inDeck}
                      showSynergy={hasArcPartner}
                      cardProgress={progress}
                    />
                    {inDeck && (
                      <div className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center">
                        ✓
                      </div>
                    )}
                    {/* Prestige button */}
                    {canPres && onStateChange && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handlePrestige(card.id); }}
                        className="absolute -bottom-2 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1 px-2 py-1 rounded-full bg-legendary text-primary-foreground text-[9px] font-bold hover:scale-110 transition-transform"
                      >
                        <Star className="w-3 h-3 fill-current" /> Prestige
                      </button>
                    )}
                    {/* XP Progress under card */}
                    {progress && progress.level < 20 && (
                      <div className="mt-1 px-2">
                        <div className="h-1 bg-secondary rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${(progress.xp / xpForLevel(progress.level)) * 100}%` }} />
                        </div>
                        <p className="text-[9px] text-muted-foreground text-center mt-0.5">
                          {progress.xp}/{xpForLevel(progress.level)} XP
                        </p>
                      </div>
                    )}
                    {progress && progress.level >= 20 && (
                      <p className="text-[9px] text-legendary text-center mt-1 font-bold">MAX LEVEL</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
