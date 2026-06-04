import { Minus, Plus } from "lucide-react";
import type { GameCard } from "@/data/cardIndex";
import type { PlayerState } from "@/lib/playerState";
import { getCardProgress } from "@/lib/playerState";
import { cn } from "@/lib/utils";

const RARITY_SHORT: Record<string, string> = {
  common: "C",
  rare: "R",
  legendary: "L",
  mythic: "M",
};

const RARITY_PILL: Record<string, string> = {
  common: "bg-zinc-500/90 text-white",
  rare: "bg-blue-600/90 text-white",
  legendary: "bg-amber-500/90 text-[#0A0A0A]",
  mythic: "bg-fuchsia-600/90 text-white",
};

export default function DeckCardInspector({
  card,
  playerState,
  countInDeck,
  maxCopies,
  deckFull,
  onAdd,
  onRemove,
}: {
  card: GameCard | null;
  playerState: PlayerState;
  countInDeck: number;
  maxCopies: number;
  deckFull: boolean;
  onAdd: () => void;
  onRemove: () => void;
}) {
  if (!card) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6 text-center">
        <p className="font-lore text-[#9a7b3c] text-sm">Select a card from your collection or deck.</p>
      </div>
    );
  }

  const prog = getCardProgress(playerState, card.id);
  const canAdd = countInDeck < maxCopies && !deckFull && maxCopies > 0;
  const canRemove = countInDeck > 0;
  const isUnit = card.type === "hero" || card.type === "god";

  return (
    <div className="flex h-full flex-col min-h-0 overflow-hidden" data-testid="deck-card-inspector">
      <div className="shrink-0 px-4 pt-4 pb-2 border-b border-[rgba(212,175,55,0.15)]">
        <div className="flex items-start justify-between gap-2">
          <h2 className="font-heading text-[#f8e4a1] text-sm leading-snug line-clamp-2">{card.name}</h2>
          <span
            className={cn(
              "shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded",
              RARITY_PILL[card.rarity] ?? RARITY_PILL.common,
            )}
          >
            {RARITY_SHORT[card.rarity] ?? "?"}
          </span>
        </div>
        {isUnit && (
          <div className="mt-2 flex items-center gap-3 font-stat text-[11px] text-[#c9a74a] tracking-wider">
            <span>ATK {card.attack}</span>
            <span>DEF {card.defense}</span>
            <span>HP {card.hp}</span>
          </div>
        )}
        <div className="mt-1 font-stat text-[10px] uppercase tracking-[0.2em] text-[#9a7b3c]">
          {card.type} · Lv.{prog.level}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3">
        <div
          className="mx-auto w-full max-w-[200px] aspect-[3/4] rounded-lg bg-cover bg-center shadow-lg mb-4"
          style={{
            backgroundImage: `url(${card.image})`,
            border: "2px solid rgba(212,175,55,0.45)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
          }}
        />
        <p className="font-lore text-[11px] text-[#d6c293] leading-relaxed line-clamp-[12]">
          {card.lore || card.specialAbility?.description || "No description."}
        </p>
        {card.specialAbility && (
          <div className="mt-3 p-2 rounded-lg border border-[rgba(212,175,55,0.2)] bg-[rgba(10,6,3,0.5)]">
            <div className="font-heading text-[10px] text-[#f5c842] tracking-wider uppercase">
              {card.specialAbility.name}
            </div>
            <p className="text-[10px] text-[#c9a74a] mt-1">{card.specialAbility.description}</p>
          </div>
        )}
      </div>

      <div className="shrink-0 p-4 border-t border-[rgba(212,175,55,0.18)] space-y-3">
        <div className="text-center font-stat text-[10px] tracking-widest text-[#c9a74a]">
          IN DECK: <span className="text-[#f8e4a1] font-bold">{countInDeck}</span>
          <span className="text-[#9a7b3c]"> / {maxCopies} owned copies</span>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onRemove}
            disabled={!canRemove}
            className={cn(
              "flex-1 flex items-center justify-center gap-1 py-2.5 rounded-lg font-heading text-xs tracking-wider",
              "border border-[rgba(212,175,55,0.35)]",
              canRemove ? "text-[#f8e4a1] hover:bg-[rgba(245,200,66,0.1)]" : "opacity-40 cursor-not-allowed",
            )}
            data-testid="inspector-remove"
          >
            <Minus size={14} /> −1
          </button>
          <button
            type="button"
            onClick={onAdd}
            disabled={!canAdd}
            className={cn(
              "flex-1 flex items-center justify-center gap-1 py-2.5 rounded-lg font-heading text-xs tracking-wider",
              canAdd ? "btn-gold" : "opacity-40 cursor-not-allowed border border-[rgba(212,175,55,0.2)]",
            )}
            data-testid="inspector-add"
          >
            <Plus size={14} /> +1
          </button>
        </div>
      </div>
    </div>
  );
}
