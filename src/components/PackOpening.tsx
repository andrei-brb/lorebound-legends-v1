import { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { allCards } from "@/data/cards";
import { allSeasonalCards } from "@/data/seasonalCards";
import { cn } from "@/lib/utils";
import { playWhoosh, playChime, playFanfare } from "@/lib/sfx";
import type { PlayerState } from "@/lib/playerState";

interface PackOpeningProps {
  cardIds: string[];
  onComplete: (cardIds: string[]) => void;
  playerState?: PlayerState;
  /** When set (e.g. online pulls), overrides local duplicate detection — required after server merge updates owned cards. */
  cardIsNew?: boolean[];
}

const rarityGlowBg: Record<string, string> = {
  mythic: "shadow-[0_0_70px_24px_hsl(0,90%,55%,0.65)]",
  legendary: "shadow-[0_0_60px_20px_hsl(40,90%,55%,0.6)]",
  rare: "shadow-[0_0_40px_15px_hsl(220,80%,60%,0.5)]",
  common: "shadow-[0_0_20px_10px_hsl(230,10%,50%,0.3)]",
};

export default function PackOpening({ cardIds, onComplete, playerState, cardIsNew: cardIsNewProp }: PackOpeningProps) {
  const [phase, setPhase] = useState<"intro" | "spread" | "revealing" | "summary">("intro");
  const [revealedIndices, setRevealedIndices] = useState<Set<number>>(new Set());
  const cardPool = useMemo(() => [...allCards, ...allSeasonalCards], []);
  const cards = useMemo(
    () => cardIds.map(id => cardPool.find(card => card.id === id)).filter((card): card is NonNullable<typeof card> => Boolean(card)),
    [cardIds, cardPool]
  );

  /** New = first time this pull adds the card; handles multiple copies in one pack via order walk. */
  const cardNewFlags = useMemo(() => {
    if (cardIsNewProp && cardIsNewProp.length === cardIds.length) return cardIsNewProp;
    if (!playerState) return cardIds.map(() => false);
    const owned = new Set(playerState.ownedCardIds);
    return cardIds.map((id) => {
      const isNew = !owned.has(id);
      owned.add(id);
      return isNew;
    });
  }, [cardIds, playerState, cardIsNewProp]);

  const ambientParticles = useMemo(
    () =>
      Array.from({ length: 30 }).map(() => ({
        x: `${Math.random() * 100}vw`,
        y: `${Math.random() * 100}vh`,
        duration: 2 + Math.random() * 3,
        delay: Math.random() * 1.5,
        repeatDelay: Math.random() * 2,
      })),
    []
  );

  const legendaryBurstSeeds = useMemo(() => {
    return cards.map((c) => {
      if (c.rarity !== "legendary") return null;
      return Array.from({ length: 8 }).map(() => ({
        x: (Math.random() - 0.5) * 40,
        left: `${20 + Math.random() * 60}%`,
      }));
    });
  }, [cards]);

  useEffect(() => {
    const timer = setTimeout(() => setPhase("spread"), 1500);
    return () => clearTimeout(timer);
  }, []);

  const revealCard = useCallback((index: number) => {
    if (phase !== "spread" && phase !== "revealing") return;
    if (revealedIndices.has(index)) return;
    setPhase("revealing");
    const next = new Set(revealedIndices);
    next.add(index);
    setRevealedIndices(next);

    // SFX based on rarity
    const card = cards[index];
    if (card?.rarity === "legendary") {
      playFanfare();
    } else {
      playChime();
    }

    if (next.size === cards.length) {
      setTimeout(() => setPhase("summary"), 1200);
    }
  }, [phase, revealedIndices, cards]);

  const revealAll = useCallback(() => {
    const all = new Set<number>();
    cards.forEach((_, i) => all.add(i));
    setRevealedIndices(all);
    playWhoosh();
    const hasLegendary = cards.some(c => c.rarity === "legendary");
    if (hasLegendary) setTimeout(() => playFanfare(), 200);
    setTimeout(() => setPhase("summary"), 800);
  }, [cards]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-background/95"
    >
      {/* Ambient particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {ambientParticles.map((p, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 rounded-full bg-primary/40"
            initial={{ x: "50vw", y: "50vh", scale: 0 }}
            animate={{
              x: p.x,
              y: p.y,
              scale: [0, 1, 0],
            }}
            transition={{ duration: p.duration, delay: p.delay, repeat: Infinity, repeatDelay: p.repeatDelay }}
          />
        ))}
      </div>
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-background/70 via-transparent to-background/80" />

      {/* Intro */}
      <AnimatePresence>
        {phase === "intro" && (
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 2, opacity: 0 }}
            transition={{ type: "spring", bounce: 0.4 }}
            className="text-center"
          >
            <motion.div
              animate={{ rotate: [0, 5, -5, 0], scale: [1, 1.1, 1] }}
              transition={{ duration: 1, repeat: 1 }}
              className="text-8xl mb-4"
            >
              ✦
            </motion.div>
            <h2 className="font-heading text-3xl font-bold text-foreground">Opening Pack...</h2>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Card Spread */}
      {(phase === "spread" || phase === "revealing") && (
        <div className="flex flex-col items-center gap-8">
          <motion.h3
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-heading text-xl text-muted-foreground"
          >
            Click each card to reveal!
          </motion.h3>
          <div className="flex gap-4 flex-wrap justify-center">
            {cards.map((card, i) => {
              const revealed = revealedIndices.has(i);
              const isNewCard = cardNewFlags[i];
              return (
                <motion.div
                  key={i}
                  initial={{ y: 100, opacity: 0, rotateY: 180 }}
                  animate={{ y: 0, opacity: 1, rotateY: revealed ? 0 : 180 }}
                  transition={{ delay: i * 0.12, type: "spring", bounce: 0.3 }}
                  onClick={() => revealCard(i)}
                  className={cn(
                    "w-40 h-56 rounded-xl cursor-pointer transition-all relative",
                    revealed ? rarityGlowBg[card.rarity] : "hover:scale-105"
                  )}
                  style={{ perspective: "1000px" }}
                >
                  {revealed ? (
                    <motion.div
                      initial={{ scale: 1.3 }}
                      animate={{ scale: 1 }}
                      className="w-full h-full rounded-xl border-2 overflow-hidden relative"
                      style={{
                        borderColor:
                          card.rarity === "mythic"
                            ? "hsl(0 80% 55%)"
                            : card.rarity === "legendary"
                              ? "hsl(40 90% 55%)"
                              : card.rarity === "rare"
                                ? "hsl(220 80% 60%)"
                                : "hsl(230 10% 50%)",
                      }}
                    >
                      {isNewCard && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.6, y: -8 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          transition={{ type: "spring", stiffness: 400, damping: 18 }}
                          className="absolute top-2 left-1/2 -translate-x-1/2 z-10 px-3 py-1 rounded-full font-heading font-extrabold text-[11px] tracking-wide uppercase text-primary-foreground shadow-lg bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 ring-2 ring-white/40"
                        >
                          New
                        </motion.div>
                      )}
                      <img src={card.image} alt={card.name} className="w-full h-full object-cover" />
                      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-3">
                        <p className="font-heading text-xs font-bold text-white truncate">{card.name}</p>
                        <p className="text-[10px] text-white/70 uppercase">{card.rarity}</p>
                      </div>
                      {/* Rarity particles */}
                      {(card.rarity === "legendary" || card.rarity === "mythic") && (
                        <div className="absolute inset-0 pointer-events-none">
                          {(legendaryBurstSeeds[i] || []).map((seed, j) => (
                            <motion.div
                              key={j}
                              className="absolute w-1.5 h-1.5 rounded-full bg-legendary"
                              animate={{
                                y: [0, -60, -120],
                                x: [0, seed.x],
                                opacity: [1, 0.5, 0],
                              }}
                              transition={{ duration: 1.5, delay: j * 0.15, repeat: Infinity }}
                              style={{ left: seed.left, bottom: 0 }}
                            />
                          ))}
                        </div>
                      )}
                    </motion.div>
                  ) : (
                    <div className="w-full h-full rounded-xl border-2 border-border bg-gradient-to-br from-secondary to-card flex items-center justify-center">
                      <div className="text-4xl opacity-30 font-heading">?</div>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
          {revealedIndices.size < cards.length && (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              onClick={revealAll}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors underline"
            >
              Reveal All
            </motion.button>
          )}
        </div>
      )}

      {/* Summary */}
      <AnimatePresence>
        {phase === "summary" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card border border-border rounded-2xl p-6 max-w-lg w-full mx-4"
          >
            <h3 className="font-heading text-xl font-bold text-foreground text-center mb-4">Pack Results</h3>
            <div className="space-y-2 mb-6">
              {cards.map((card, i) => (
                <motion.div
                  key={i}
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: i * 0.1 }}
                  className="flex items-center gap-3 p-2 rounded-lg bg-secondary"
                >
                  <img src={card.image} alt={card.name} className="w-8 h-10 rounded object-cover" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold truncate text-foreground">{card.name}</p>
                    <p className={cn("text-[10px] capitalize", card.rarity === "legendary" ? "text-legendary" : card.rarity === "rare" ? "text-rare" : "text-common")}>
                      {card.rarity} {card.type}
                    </p>
                  </div>
                  {cardNewFlags[i] ? (
                    <span className="text-[9px] font-heading font-extrabold uppercase px-2 py-0.5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 text-primary-foreground shadow-sm">
                      New
                    </span>
                  ) : (
                    <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-primary/20 text-primary">
                      +⭐ Dupe
                    </span>
                  )}
                </motion.div>
              ))}
            </div>
            <button
              onClick={() => onComplete(cardIds)}
              className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-heading font-bold text-sm hover:brightness-110 transition-all"
            >
              Collect All
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
