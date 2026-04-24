import { motion, AnimatePresence } from "framer-motion";
import { Sword, Shield, Star } from "lucide-react";

export type DetailCard = {
  id: string;
  image: string;
  name: string;
  kindLabel?: string;
  levelLabel?: string;
  stars?: number;
  atk?: number;
  def?: number;
  description?: string;
};

interface Props {
  card: DetailCard | null;
}

export default function CardDetailPanel({ card }: Props) {
  return (
    <AnimatePresence>
      {card && (
        <motion.div
          key={card.id}
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 40 }}
          transition={{ type: "spring", stiffness: 280, damping: 26 }}
          className="pointer-events-none absolute right-4 top-1/2 z-40 w-72 -translate-y-1/2"
        >
          <div className="overflow-hidden rounded-xl border border-yellow-500/40 bg-gradient-to-b from-slate-900/95 via-slate-950/95 to-black/95 shadow-2xl backdrop-blur-md">
            <div className="flex items-center justify-between border-b border-yellow-500/40 bg-gradient-to-r from-yellow-700/40 via-yellow-600/30 to-yellow-700/40 px-3 py-2">
              <h3 className="truncate text-base font-bold tracking-wide text-yellow-100 drop-shadow">
                {card.name}
              </h3>
              <div className="flex h-7 w-7 items-center justify-center rounded-full border border-yellow-400/50 bg-black/40">
                <span className="text-[10px] font-bold text-yellow-200">
                  {(card.kindLabel ?? "Card").slice(0, 1).toUpperCase()}
                </span>
              </div>
            </div>

            <div className="flex gap-3 p-3">
              <div className="relative h-40 w-28 shrink-0 overflow-hidden rounded-md border-2 border-yellow-500/60 shadow-lg">
                <img src={card.image} alt={card.name} className="h-full w-full object-cover" />
                {card.levelLabel && (
                  <div className="absolute inset-x-0 bottom-0 bg-black/80 px-1 py-0.5 text-center">
                    <span className="text-[9px] font-bold tracking-widest text-yellow-200">
                      {card.levelLabel}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex flex-1 flex-col justify-center gap-2 text-sm">
                {typeof card.stars === "number" && (
                  <div className="flex items-center gap-2 text-yellow-300">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span className="font-mono font-bold">{card.stars}</span>
                  </div>
                )}
                {typeof card.atk === "number" && (
                  <div className="flex items-center gap-2 text-orange-300">
                    <Sword className="h-4 w-4" />
                    <span className="font-mono font-bold">{card.atk}</span>
                  </div>
                )}
                {typeof card.def === "number" && (
                  <div className="flex items-center gap-2 text-cyan-300">
                    <Shield className="h-4 w-4" />
                    <span className="font-mono font-bold">{card.def}</span>
                  </div>
                )}
              </div>
            </div>

            {card.kindLabel && (
              <div className="border-y border-yellow-500/30 bg-gradient-to-r from-yellow-800/30 to-yellow-700/20 px-3 py-1.5">
                <span className="text-xs font-semibold text-yellow-100">[{card.kindLabel}]</span>
              </div>
            )}

            {card.description && (
              <div className="px-3 py-3 text-xs leading-relaxed text-slate-200">{card.description}</div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

