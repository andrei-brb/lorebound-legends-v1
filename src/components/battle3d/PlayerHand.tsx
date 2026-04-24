import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export interface HandCard {
  id: string;
  image: string;
  name: string;
  kind: "monster" | "spell";
  characterColor?: string;
  characterAccent?: string;
}

interface PlayerHandProps {
  cards: HandCard[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onHoverChange?: (id: string | null) => void;
  disabled?: boolean;
}

export default function PlayerHand({
  cards,
  selectedId,
  onSelect,
  onHoverChange,
  disabled = false,
}: PlayerHandProps) {
  const [hoverId, setHoverId] = useState<string | null>(null);

  const setHover = (id: string | null) => {
    setHoverId(id);
    onHoverChange?.(id);
  };

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 flex h-44 items-end justify-center">
      <div
        className={cn("pointer-events-auto relative flex items-end justify-center", disabled && "opacity-60 pointer-events-none")}
        style={{ width: Math.max(cards.length, 1) * 70 + 40 }}
      >
        <AnimatePresence>
          {cards.map((card, i) => {
            const total = cards.length;
            const center = (total - 1) / 2;
            const offset = i - center;
            const rot = offset * 4;
            const x = offset * 70;
            const y = Math.abs(offset) * 6;
            const isSelected = selectedId === card.id;
            const isHover = hoverId === card.id;

            return (
              <motion.div
                key={card.id}
                layoutId={`hand-card-${card.id}`}
                className={cn("absolute bottom-0 cursor-pointer", isSelected && "z-50")}
                style={{ width: 110, height: 158 }}
                initial={{ opacity: 0, y: 100 }}
                animate={{
                  opacity: 1,
                  x,
                  y: isHover || isSelected ? -60 : y,
                  rotate: isHover || isSelected ? 0 : rot,
                  scale: isHover || isSelected ? 1.15 : 1,
                }}
                exit={{ opacity: 0, y: -200, scale: 0.5 }}
                transition={{ type: "spring", stiffness: 260, damping: 22 }}
                onMouseEnter={() => setHover(card.id)}
                onMouseLeave={() => setHover(null)}
                onClick={() => onSelect(isSelected ? null : card.id)}
              >
                <div
                  className={cn(
                    "relative h-full w-full overflow-hidden rounded-lg border-2 shadow-xl transition-all",
                    isSelected
                      ? "border-yellow-400 shadow-yellow-400/60"
                      : card.kind === "monster"
                        ? "border-cyan-400/70"
                        : "border-purple-400/70"
                  )}
                >
                  <img src={card.image} alt={card.name} className="h-full w-full object-cover" />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-1">
                    <div className="truncate text-[10px] font-bold text-white">{card.name}</div>
                  </div>
                  {isSelected && <div className="absolute inset-0 animate-pulse bg-yellow-400/20" />}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}

