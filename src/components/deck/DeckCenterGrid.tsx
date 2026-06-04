import { Pencil } from "lucide-react";
import type { GameCard } from "@/data/cardIndex";
import { cn } from "@/lib/utils";

const RARITY_SHORT: Record<string, string> = {
  common: "C",
  rare: "R",
  legendary: "L",
  mythic: "M",
};

const RARITY_TAG: Record<string, string> = {
  common: "bg-zinc-600",
  rare: "bg-blue-700",
  legendary: "bg-amber-600 text-[#0A0A0A]",
  mythic: "bg-fuchsia-700",
};

export default function DeckCenterGrid({
  deckName,
  onDeckNameChange,
  deckSlots,
  maxSize,
  selectedCardId,
  onSelectCard,
}: {
  deckName: string;
  onDeckNameChange: (name: string) => void;
  deckSlots: Array<{ card: GameCard; slotKey: string }>;
  maxSize: number;
  selectedCardId: string | null;
  onSelectCard: (cardId: string) => void;
}) {
  const emptyCount = Math.max(0, maxSize - deckSlots.length);

  return (
    <div className="flex h-full flex-col min-h-0" data-testid="deck-center-grid">
      <div
        className="shrink-0 flex items-center gap-2 px-4 py-3 border-b border-[rgba(212,175,55,0.2)]"
        style={{
          background: "linear-gradient(180deg, rgba(18,12,6,0.95), rgba(10,6,3,0.85))",
        }}
      >
        <Pencil size={14} className="text-[#9a7b3c] shrink-0" />
        <input
          value={deckName}
          onChange={(e) => onDeckNameChange(e.target.value)}
          placeholder="Deck name…"
          className="flex-1 bg-transparent font-heading text-[#f8e4a1] text-sm tracking-wide outline-none placeholder:text-[#9a7b3c]"
          data-testid="deck-name-input"
        />
        <span className="font-stat text-[10px] tracking-widest text-[#c9a74a] whitespace-nowrap">
          DECK {deckSlots.length}/{maxSize}
        </span>
      </div>

      <div
        className="flex-1 min-h-0 overflow-y-auto p-4"
        style={{
          background:
            "repeating-linear-gradient(0deg, rgba(255,255,255,0.02) 0px, rgba(255,255,255,0.02) 1px, transparent 1px, transparent 6px)",
        }}
      >
        <div className="font-stat text-[10px] tracking-[0.25em] text-[#9a7b3c] mb-3 uppercase">Main deck</div>
        <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-2">
          {deckSlots.map(({ card, slotKey }) => {
            const selected = selectedCardId === card.id;
            return (
              <button
                key={slotKey}
                type="button"
                onClick={() => onSelectCard(card.id)}
                className={cn(
                  "relative aspect-[3/4] rounded-md overflow-hidden transition-all",
                  "hover:ring-2 hover:ring-[#f5c842]/60",
                  selected && "ring-2 ring-[#f5c842] shadow-[0_0_16px_rgba(245,200,66,0.4)]",
                )}
                data-testid={`deck-slot-${card.id}`}
              >
                <img src={card.image} alt={card.name} className="w-full h-full object-cover" />
                <span
                  className={cn(
                    "absolute top-0.5 right-0.5 text-[8px] font-bold px-1 rounded-sm",
                    RARITY_TAG[card.rarity] ?? RARITY_TAG.common,
                  )}
                >
                  {RARITY_SHORT[card.rarity]}
                </span>
              </button>
            );
          })}
          {Array.from({ length: emptyCount }).map((_, i) => (
            <div
              key={`empty-${i}`}
              className="aspect-[3/4] rounded-md border border-dashed border-[rgba(212,175,55,0.15)] bg-[rgba(0,0,0,0.25)]"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
