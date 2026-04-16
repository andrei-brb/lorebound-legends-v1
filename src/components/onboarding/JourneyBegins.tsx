import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Swords } from "lucide-react";
import { type FactionPath, FACTION_STARTER_CARDS } from "@/lib/playerState";
import { allCards } from "@/data/cards";

interface JourneyBeginsProps {
  path: FactionPath;
  onEnter: () => void;
}

export default function JourneyBegins({ path, onEnter }: JourneyBeginsProps) {
  const [phase, setPhase] = useState<"assembling" | "reveal" | "ready">("assembling");
  const starterIds = FACTION_STARTER_CARDS[path];
  const cards = starterIds.map((id) => allCards.find((c) => c.id === id)).filter(Boolean);

  const burstParticles = useMemo(
    () =>
      Array.from({ length: 40 }).map(() => {
        const left = `${50 + (Math.random() - 0.5) * 60}%`;
        const top = `${50 + (Math.random() - 0.5) * 60}%`;
        const x = (Math.random() - 0.5) * 200;
        const y = (Math.random() - 0.5) * 200;
        const delay = 1.5 + Math.random() * 1.5;
        return { left, top, x, y, delay };
      }),
    [path]
  );

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("reveal"), 2000);
    const t2 = setTimeout(() => setPhase("ready"), 4000);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  return (
    <motion.div
      className="flex flex-col items-center justify-center min-h-screen px-6 relative overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8 }}
    >
      {/* Particle burst */}
      <div className="absolute inset-0 pointer-events-none">
        {burstParticles.map((p, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 rounded-full bg-primary/40"
            style={{
              left: p.left,
              top: p.top,
            }}
            animate={{
              scale: [0, 1.5, 0],
              opacity: [0, 0.6, 0],
              x: [p.x],
              y: [p.y],
            }}
            transition={{
              duration: 3,
              delay: p.delay,
              ease: "easeOut",
            }}
          />
        ))}
      </div>

      {/* Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-primary/10 blur-[100px] pointer-events-none" />

      <div className="relative z-10 text-center">
        <motion.h2
          className="font-heading text-3xl md:text-4xl font-bold text-primary tracking-wider mb-2"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          Your Deck Is Forged
        </motion.h2>

        <motion.p
          className="text-foreground/60 text-base mb-8 italic"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          The Arcane Realm awaits, Summoner.
        </motion.p>

        {/* Card fan */}
        <div className="relative w-full max-w-xl mx-auto h-64 mb-8">
          {cards.map((card, i) => {
            const total = cards.length;
            const angle = (i - (total - 1) / 2) * 8;
            const offsetX = (i - (total - 1) / 2) * 45;

            return (
              <motion.div
                key={card!.id}
                className="absolute left-1/2 bottom-0 w-20 h-28 rounded-lg overflow-hidden border-2 border-primary/30 shadow-lg shadow-primary/10"
                initial={{
                  opacity: 0,
                  y: -200,
                  x: 0,
                  rotate: 0,
                  scale: 0.5,
                }}
                animate={
                  phase === "assembling"
                    ? { opacity: 1, y: -100, x: 0, rotate: 0, scale: 0.7 }
                    : {
                        opacity: 1,
                        y: 0,
                        x: offsetX - 40,
                        rotate: angle,
                        scale: 1,
                      }
                }
                transition={{
                  duration: phase === "assembling" ? 0.5 : 0.8,
                  delay: phase === "assembling" ? i * 0.1 : i * 0.06,
                  type: "spring",
                  damping: 15,
                }}
                style={{ transformOrigin: "bottom center", zIndex: i }}
              >
                <img
                  src={card!.image}
                  alt={card!.name}
                  className="w-full h-full object-cover"
                />
              </motion.div>
            );
          })}
        </div>

        <AnimatePresence>
          {phase === "ready" && (
            <motion.button
              onClick={onEnter}
              className="inline-flex items-center gap-2 px-10 py-4 rounded-xl bg-primary text-primary-foreground font-heading font-bold tracking-widest uppercase shadow-xl shadow-primary/30 hover:shadow-primary/50 transition-shadow"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", damping: 12 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.97 }}
            >
              <Swords className="w-5 h-5" />
              Enter the Realm
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
