import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { allCards } from "@/data/cards";
import { cn } from "@/lib/utils";
import { playWhoosh, playShatter, playCollect } from "@/lib/sfx";

interface SacrificeAnimationProps {
  cardIds: string[];
  totalStardust: number;
  onComplete: () => void;
}

const SHARD_COUNT = 24;
const DUST_COUNT = 16;

export default function SacrificeAnimation({ cardIds, totalStardust, onComplete }: SacrificeAnimationProps) {
  const [phase, setPhase] = useState<"gather" | "shatter" | "collect" | "done">("gather");
  const cards = cardIds.map(id => allCards.find(c => c.id === id)!).filter(Boolean);

  useEffect(() => {
    const t1 = setTimeout(() => { setPhase("shatter"); playShatter(); }, 1200);
    const t2 = setTimeout(() => { setPhase("collect"); playWhoosh(); }, 2400);
    const t3 = setTimeout(() => { setPhase("done"); playCollect(); }, 4200);
    const t4 = setTimeout(onComplete, 4600);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, [onComplete]);

  // Pre-generate shard directions
  const shards = Array.from({ length: SHARD_COUNT }, (_, i) => {
    const angle = (i / SHARD_COUNT) * Math.PI * 2;
    return {
      x: Math.cos(angle) * (120 + Math.random() * 80),
      y: Math.sin(angle) * (120 + Math.random() * 80),
      rotate: Math.random() * 720 - 360,
      scale: 0.3 + Math.random() * 0.7,
      delay: Math.random() * 0.3,
    };
  });

  const dustParticles = Array.from({ length: DUST_COUNT }, (_, i) => ({
    startX: (Math.random() - 0.5) * 200,
    startY: (Math.random() - 0.5) * 200,
    delay: 0.1 + Math.random() * 0.5,
  }));

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-background/95 backdrop-blur-md"
    >
      {/* Ambient dark particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 20 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 rounded-full bg-destructive/30"
            initial={{ x: "50vw", y: "50vh", scale: 0 }}
            animate={{
              x: `${Math.random() * 100}vw`,
              y: `${Math.random() * 100}vh`,
              scale: [0, 1, 0],
            }}
            transition={{ duration: 2 + Math.random() * 2, delay: Math.random(), repeat: Infinity }}
          />
        ))}
      </div>

      {/* Phase: Gather — cards converge to center */}
      <AnimatePresence>
        {phase === "gather" && (
          <div className="relative">
            {cards.map((card, i) => {
              const startAngle = (i / cards.length) * Math.PI * 2;
              const startX = Math.cos(startAngle) * 150;
              const startY = Math.sin(startAngle) * 150;
              return (
                <motion.div
                  key={i}
                  initial={{ x: startX, y: startY, opacity: 0, scale: 0.5, rotate: Math.random() * 30 - 15 }}
                  animate={{ x: 0, y: 0, opacity: 1, scale: 1, rotate: 0 }}
                  transition={{ duration: 0.8, delay: i * 0.1, type: "spring", bounce: 0.3 }}
                  className="absolute w-20 h-28 rounded-lg border-2 border-destructive/50 overflow-hidden"
                  style={{ top: "-56px", left: "-40px" }}
                >
                  <img src={card.image} alt={card.name} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-destructive/20" />
                </motion.div>
              );
            })}
            {/* Central glow */}
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: [0, 1.5, 1], opacity: [0, 0.8, 0.6] }}
              transition={{ duration: 1, delay: 0.5 }}
              className="absolute w-32 h-32 rounded-full bg-destructive/20 blur-xl"
              style={{ top: "-64px", left: "-64px" }}
            />
          </div>
        )}
      </AnimatePresence>

      {/* Phase: Shatter — crystal shards explode outward */}
      <AnimatePresence>
        {phase === "shatter" && (
          <div className="relative">
            {/* Flash */}
            <motion.div
              initial={{ scale: 0, opacity: 1 }}
              animate={{ scale: 8, opacity: 0 }}
              transition={{ duration: 0.6 }}
              className="absolute w-16 h-16 rounded-full bg-primary/60 blur-md"
              style={{ top: "-32px", left: "-32px" }}
            />

            {/* Crystal shards */}
            {shards.map((shard, i) => (
              <motion.div
                key={i}
                initial={{ x: 0, y: 0, opacity: 1, scale: 1, rotate: 0 }}
                animate={{
                  x: shard.x,
                  y: shard.y,
                  opacity: [1, 1, 0],
                  scale: [1, shard.scale, 0],
                  rotate: shard.rotate,
                }}
                transition={{ duration: 1, delay: shard.delay, ease: "easeOut" }}
                className="absolute"
                style={{ top: 0, left: 0 }}
              >
                <div
                  className="bg-gradient-to-br from-primary via-accent to-primary/50"
                  style={{
                    width: `${6 + Math.random() * 10}px`,
                    height: `${8 + Math.random() * 14}px`,
                    clipPath: "polygon(50% 0%, 100% 40%, 80% 100%, 20% 100%, 0% 40%)",
                  }}
                />
              </motion.div>
            ))}

            {/* Shockwave ring */}
            <motion.div
              initial={{ scale: 0, opacity: 0.8 }}
              animate={{ scale: 6, opacity: 0 }}
              transition={{ duration: 0.8 }}
              className="absolute w-20 h-20 rounded-full border-2 border-primary/60"
              style={{ top: "-40px", left: "-40px" }}
            />
          </div>
        )}
      </AnimatePresence>

      {/* Phase: Collect — stardust flies to counter */}
      <AnimatePresence>
        {phase === "collect" && (
          <div className="relative flex flex-col items-center">
            {/* Stardust particles flying upward to counter */}
            {dustParticles.map((p, i) => (
              <motion.div
                key={i}
                initial={{ x: p.startX, y: p.startY, opacity: 0, scale: 0 }}
                animate={{
                  x: [p.startX, p.startX * 0.3, 0],
                  y: [p.startY, p.startY * 0.3, -120],
                  opacity: [0, 1, 1, 0.8],
                  scale: [0, 1.5, 1, 0.5],
                }}
                transition={{ duration: 1.2, delay: p.delay, ease: "easeInOut" }}
                className="absolute w-3 h-3 rounded-full bg-primary shadow-[0_0_12px_4px_hsl(var(--primary)/0.6)]"
              />
            ))}

            {/* Counter badge */}
            <motion.div
              initial={{ scale: 0, y: -120 }}
              animate={{ scale: [0, 1.3, 1], y: -120 }}
              transition={{ duration: 0.5, delay: 1.2, type: "spring", bounce: 0.4 }}
              className="absolute flex items-center gap-2 px-6 py-3 rounded-2xl bg-card border-2 border-primary shadow-[0_0_30px_10px_hsl(var(--primary)/0.3)]"
            >
              <span className="text-2xl">💎</span>
              <motion.span
                className="font-heading text-3xl font-bold text-primary"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.4 }}
              >
                +{totalStardust}
              </motion.span>
              <span className="text-sm text-muted-foreground font-heading">Stardust</span>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Phase: Done — summary */}
      <AnimatePresence>
        {phase === "done" && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.2, 1] }}
              transition={{ type: "spring", bounce: 0.5 }}
              className="text-5xl mb-4"
            >
              💎
            </motion.div>
            <h3 className="font-heading text-2xl font-bold text-foreground mb-1">
              Sacrifice Complete
            </h3>
            <p className="text-primary font-heading text-lg font-bold">
              +{totalStardust} Stardust
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {cards.length} card{cards.length > 1 ? "s" : ""} returned to the void
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
