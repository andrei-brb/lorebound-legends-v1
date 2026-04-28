import { useMemo } from "react";
import { X } from "lucide-react";
import type { GameCard as GameCardType } from "@/data/cardIndex";
import type { PlayerState } from "@/lib/playerState";
import { getCardProgress } from "@/lib/playerState";
import { getCosmeticById } from "@/data/cosmetics";
import GameCard from "@/components/GameCard";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export default function CardInspectDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  card: GameCardType | null;
  playerState?: PlayerState;
  className?: string;
}) {
  const { open, onOpenChange, card, playerState, className } = props;

  const cardProgress = useMemo(() => {
    if (!card || !playerState) return undefined;
    return getCardProgress(playerState, card.id);
  }, [card, playerState]);

  const equippedFrameImage = useMemo(() => {
    const equippedFrameId = playerState?.cosmeticsEquipped?.cardFrameId || null;
    return equippedFrameId ? (getCosmeticById(equippedFrameId)?.image || null) : null;
  }, [playerState]);

  const equippedCardBackImage = useMemo(() => {
    const equippedCardBackId = playerState?.cosmeticsEquipped?.cardBackId || null;
    return equippedCardBackId ? (getCosmeticById(equippedCardBackId)?.image || null) : null;
  }, [playerState]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "p-0 border-border bg-transparent shadow-none max-w-[min(92vw,980px)]",
          className,
        )}
      >
        <div className="relative w-full flex items-center justify-center py-6">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className={cn(
              "absolute right-2 top-2 z-50",
              "h-9 w-9 rounded-full",
              "bg-black/50 border border-white/10 text-white/90",
              "hover:bg-black/70 hover:text-white transition-colors",
              "flex items-center justify-center",
            )}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>

          {card ? (
            <div className="scale-[0.92] sm:scale-100 origin-center">
              <GameCard
                card={card}
                size="lg"
                cardProgress={cardProgress}
                equippedFrameImage={equippedFrameImage}
                equippedCardBackImage={equippedCardBackImage}
              />
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}

