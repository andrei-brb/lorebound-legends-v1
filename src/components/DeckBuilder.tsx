import { useState } from "react";
import { allCards } from "@/data/cards";
import CollectionView from "./CollectionView";
import { Sword, Shield, Sparkles, X, Swords } from "lucide-react";
import type { PlayerState } from "@/lib/playerState";
import { getCardProgress } from "@/lib/playerState";
import { getStatBonuses } from "@/lib/progressionEngine";

const MAX_DECK_SIZE = 10;

interface DeckBuilderProps {
  onStartBattle?: (deckIds: string[]) => void;
  playerState: PlayerState;
}

export default function DeckBuilder({ onStartBattle, playerState }: DeckBuilderProps) {
  const [deckIds, setDeckIds] = useState<string[]>([]);

  const toggleCard = (cardId: string) => {
    if (!playerState.ownedCardIds.includes(cardId)) return;
    setDeckIds((prev) =>
      prev.includes(cardId)
        ? prev.filter((id) => id !== cardId)
        : prev.length < MAX_DECK_SIZE
        ? [...prev, cardId]
        : prev
    );
  };

  const deckCards = deckIds.map((id) => allCards.find((c) => c.id === id)!).filter(Boolean);

  const activeSynergies: { name: string; description: string; cards: string[] }[] = [];
  for (const card of deckCards) {
    for (const syn of card.synergies) {
      if (deckIds.includes(syn.partnerId) && !activeSynergies.find((s) => s.name === syn.name)) {
        const partner = allCards.find((c) => c.id === syn.partnerId);
        activeSynergies.push({ name: syn.name, description: syn.description, cards: [card.name, partner?.name || ""] });
      }
    }
  }

  const heroGodCount = deckCards.filter(c => c.type === "hero" || c.type === "god").length;
  const weaponCount = deckCards.filter(c => c.type === "weapon").length;
  const spellCount = deckCards.filter(c => c.type === "spell").length;
  const trapCount = deckCards.filter(c => c.type === "trap").length;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-8">
      <div>
        <h2 className="font-heading text-lg font-bold text-foreground mb-4">
          Choose Cards <span className="text-muted-foreground font-body text-sm">({deckIds.length}/{MAX_DECK_SIZE})</span>
        </h2>
        <CollectionView onAddToDeck={toggleCard} deckCardIds={deckIds} playerState={playerState} />
      </div>

      <div className="xl:sticky xl:top-20 xl:self-start space-y-4">
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="font-heading text-lg font-bold text-foreground mb-4">Your Deck</h3>

          {deckCards.length === 0 ? (
            <p className="text-sm text-muted-foreground">Click cards to add them to your deck.</p>
          ) : (
            <>
              {/* Deck composition */}
              <div className="flex flex-wrap gap-2 mb-4 text-xs">
                <span className="px-2 py-1 rounded bg-primary/20 text-primary font-bold">Heroes/Gods: {heroGodCount}</span>
                <span className="px-2 py-1 rounded bg-legendary/20 text-legendary font-bold">Weapons: {weaponCount}</span>
                <span className="px-2 py-1 rounded bg-synergy/20 text-synergy font-bold">Spells: {spellCount}</span>
                <span className="px-2 py-1 rounded bg-destructive/20 text-destructive font-bold">Traps: {trapCount}</span>
              </div>

              {onStartBattle && deckIds.length >= 4 && (
                <button
                  onClick={() => onStartBattle(deckIds)}
                  className="w-full mb-4 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-destructive text-destructive-foreground font-heading font-bold text-sm hover:brightness-110 transition-all hover:scale-[1.02] active:scale-95"
                >
                  <Swords className="w-5 h-5" /> Battle! ({deckIds.length} cards)
                </button>
              )}

              <div className="space-y-2 mb-4">
                {deckCards.map((card) => {
                  const progress = getCardProgress(playerState, card.id);
                  return (
                    <div key={card.id} className="flex items-center gap-3 p-2 rounded-lg bg-secondary group">
                      <img src={card.image} alt={card.name} className="w-8 h-10 rounded object-cover" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold truncate text-foreground">{card.name}</p>
                        <p className="text-[10px] text-muted-foreground capitalize">{card.rarity} {card.type} · Lv.{progress.level}</p>
                      </div>
                      <button
                        onClick={() => toggleCard(card.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {activeSynergies.length > 0 && (
            <div className="border-t border-border pt-4">
              <div className="flex items-center gap-1 mb-2">
                <Sparkles className="w-4 h-4 text-synergy" />
                <span className="text-xs font-bold uppercase tracking-wider text-synergy">Active Synergies</span>
              </div>
              <div className="space-y-2">
                {activeSynergies.map((syn) => (
                  <div key={syn.name} className="synergy-highlight rounded-lg p-3">
                    <p className="text-xs font-bold text-synergy">{syn.name}</p>
                    <p className="text-[10px] text-muted-foreground">{syn.cards.join(" + ")}</p>
                    <p className="text-[10px] text-synergy-glow mt-1">{syn.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
