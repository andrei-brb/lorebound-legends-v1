import { motion, AnimatePresence } from "framer-motion";
import { Star, ArrowUp, Sparkles } from "lucide-react";
import type { LevelUpResult } from "@/lib/progressionEngine";
import { allCards } from "@/data/cards";

interface CardLevelUpProps {
  levelUps: (LevelUpResult & { cardId: string })[];
  onClose: () => void;
}

export default function CardLevelUp({ levelUps, onClose }: CardLevelUpProps) {
  if (levelUps.length === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[90] flex items-center justify-center bg-background/80 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.8, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.8, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-card border border-border rounded-2xl p-6 max-w-md w-full mx-4 space-y-4"
        >
          <div className="text-center">
            <motion.div
              animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.2, 1] }}
              transition={{ duration: 0.8 }}
            >
              <ArrowUp className="w-12 h-12 text-legendary mx-auto mb-2" />
            </motion.div>
            <h3 className="font-heading text-xl font-bold text-legendary">Level Up!</h3>
          </div>

          <div className="space-y-3">
            {levelUps.map((lu, i) => {
              const card = allCards.find(c => c.id === lu.cardId);
              return (
                <motion.div
                  key={i}
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: i * 0.15 }}
                  className="flex items-center gap-3 p-3 rounded-xl bg-secondary"
                >
                  {card && (
                    <img src={card.image} alt={card.name} className="w-10 h-12 rounded-lg object-cover" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-heading font-bold text-foreground truncate">{card?.name}</p>
                    <div className="flex items-center gap-1 text-xs text-legendary">
                      <span>Lv.{lu.oldLevel}</span>
                      <ArrowUp className="w-3 h-3" />
                      <span className="font-bold">Lv.{lu.newLevel}</span>
                    </div>
                    {lu.milestone && (
                      <div className="flex items-center gap-1 mt-1">
                        <Sparkles className="w-3 h-3 text-synergy" />
                        <span className="text-[10px] text-synergy font-bold">{lu.milestone}</span>
                      </div>
                    )}
                  </div>
                  {lu.newLevel >= 5 && (
                    <div className="flex gap-0.5">
                      {Array.from({ length: Math.min(3, Math.floor(lu.newLevel / 5)) }).map((_, s) => (
                        <Star key={s} className="w-3 h-3 text-legendary fill-legendary" />
                      ))}
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>

          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-heading font-bold text-sm hover:brightness-110 transition-all"
          >
            Continue
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
