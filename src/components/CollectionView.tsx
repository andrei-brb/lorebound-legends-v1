import { allGameCards, loreArcs, type Rarity, type CardType, type GameCard as GameCardType } from "@/data/cardIndex";
import GameCardComponent from "./GameCard";
import { Star } from "lucide-react";
import { type PlayerState, getCardProgress, xpForLevel } from "@/lib/playerState";
import { canPrestige, prestige } from "@/lib/progressionEngine";
import { getCosmeticById } from "@/data/cosmetics";

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
  // Discovery controls
  searchQuery?: string;
  typeFilter?: "all" | CardType;
  rarityFilter?: "all" | Rarity;
  elementFilter?: "all" | "fire" | "water" | "earth" | "air" | "shadow" | "light" | "neutral";
  inDeckOnly?: boolean;
  sortBy?: "rarity_desc" | "rarity_asc" | "name_asc" | "name_desc" | "attack_desc" | "defense_desc" | "hp_desc" | "level_desc";
}

const rarityRank: Record<Rarity, number> = { common: 1, rare: 2, legendary: 3 };

function applyDiscovery({
  cards,
  ownedIds,
  deckCardIds,
  playerState,
  searchQuery,
  typeFilter,
  rarityFilter,
  elementFilter,
  inDeckOnly,
  sortBy,
}: {
  cards: GameCardType[];
  ownedIds: string[];
  deckCardIds: string[];
  playerState?: PlayerState;
  searchQuery?: string;
  typeFilter?: "all" | CardType;
  rarityFilter?: "all" | Rarity;
  elementFilter?: "all" | "fire" | "water" | "earth" | "air" | "shadow" | "light" | "neutral";
  inDeckOnly?: boolean;
  sortBy?: CollectionViewProps["sortBy"];
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
      case "rarity_asc":
        return rarityRank[a.rarity] - rarityRank[b.rarity] || a.name.localeCompare(b.name);
      case "rarity_desc":
        return rarityRank[b.rarity] - rarityRank[a.rarity] || a.name.localeCompare(b.name);
      case "name_desc":
        return b.name.localeCompare(a.name);
      case "name_asc":
        return a.name.localeCompare(b.name);
      case "level_desc":
        return levelFor(b.id) - levelFor(a.id) || (rarityRank[b.rarity] - rarityRank[a.rarity]) || a.name.localeCompare(b.name);
      case "attack_desc":
        return b.attack - a.attack || (rarityRank[b.rarity] - rarityRank[a.rarity]) || a.name.localeCompare(b.name);
      case "defense_desc":
        return b.defense - a.defense || (rarityRank[b.rarity] - rarityRank[a.rarity]) || a.name.localeCompare(b.name);
      case "hp_desc":
        return b.hp - a.hp || (rarityRank[b.rarity] - rarityRank[a.rarity]) || a.name.localeCompare(b.name);
      default:
        return 0;
    }
  });

  return out;
}

export default function CollectionView({
  onAddToDeck,
  deckCardIds = [],
  playerState,
  onStateChange,
  searchQuery,
  typeFilter = "all",
  rarityFilter = "all",
  elementFilter = "all",
  inDeckOnly = false,
  sortBy = "rarity_desc",
}: CollectionViewProps) {
  const ownedIds = playerState?.ownedCardIds || allGameCards.map(c => c.id);
  const equippedFrameId = playerState?.cosmeticsEquipped?.cardFrameId || null;
  const equippedFrameImage = equippedFrameId ? (getCosmeticById(equippedFrameId)?.image || null) : null;
  const q = (searchQuery || "").trim();
  const discoveryActive = q.length > 0 || typeFilter !== "all" || rarityFilter !== "all" || elementFilter !== "all" || inDeckOnly || sortBy !== "rarity_desc";
  const discoveredCards = discoveryActive
    ? applyDiscovery({
        cards: allGameCards,
        ownedIds,
        deckCardIds,
        playerState,
        searchQuery,
        typeFilter,
        rarityFilter,
        elementFilter,
        inDeckOnly,
        sortBy,
      })
    : [];

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
      {!discoveryActive && (
        <div className="flex flex-wrap gap-3 mb-4">
          {loreArcs.map((arc) => (
            <div key={arc.id} className="px-3 py-1.5 rounded-full bg-secondary border border-border text-xs text-secondary-foreground font-heading">
              {arc.name}
              <span className="ml-1.5 text-muted-foreground">({arc.cardIds.length} cards)</span>
            </div>
          ))}
        </div>
      )}

      {discoveryActive ? (
        <div className="animate-fade-in">
          <h2 className="font-heading text-xl font-bold mb-4 text-foreground">
            Results
            <span className="ml-2 text-sm text-muted-foreground font-body">({discoveredCards.length})</span>
          </h2>
          {discoveredCards.length === 0 ? (
            <p className="text-sm text-muted-foreground">No cards match your filters.</p>
          ) : (
            <div className="flex flex-wrap gap-5">
              {discoveredCards.map((card) => {
                const inDeck = deckCardIds.includes(card.id);
                const hasArcPartner = card.loreArc
                  ? allGameCards.some((c) => c.id !== card.id && c.loreArc === card.loreArc)
                  : false;
                const progress = playerState ? getCardProgress(playerState, card.id) : undefined;
                const canPres = progress ? canPrestige(progress) : false;

                return (
                  <div key={card.id} className="relative">
                    <GameCardComponent
                      card={card}
                      onClick={onAddToDeck ? () => onAddToDeck(card.id) : undefined}
                      selected={inDeck}
                      showSynergy={hasArcPartner}
                      cardProgress={progress}
                      equippedFrameImage={equippedFrameImage}
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
          )}
        </div>
      ) : (
        <>

          {rarityOrder.map((rarity) => {
            const cards = allGameCards.filter((c) => c.rarity === rarity && ownedIds.includes(c.id));
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
                      ? allGameCards.some((c) => c.id !== card.id && c.loreArc === card.loreArc)
                      : false;
                    const progress = playerState ? getCardProgress(playerState, card.id) : undefined;
                    const canPres = progress ? canPrestige(progress) : false;

                    return (
                      <div key={card.id} className="relative">
                        <GameCardComponent
                          card={card}
                          onClick={onAddToDeck ? () => onAddToDeck(card.id) : undefined}
                          selected={inDeck}
                          showSynergy={hasArcPartner}
                          cardProgress={progress}
                          equippedFrameImage={equippedFrameImage}
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
        </>
      )}
    </div>
  );
}
