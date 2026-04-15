import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { allCards } from "@/data/cards";
import { allSeasonalCards } from "@/data/seasonalCards";
import { cn } from "@/lib/utils";
import type { Rarity } from "@/data/cards";

interface CardRevealAnimationProps {
  cardId: string;
  onClose: () => void;
}

const RARITY_CONFIG: Record<Rarity, {
  glowColor: string;
  particleCount: number;
  duration: number;
  ringColor: string;
  label: string;
  labelColor: string;
}> = {
  legendary: {
    glowColor: "hsl(40, 90%, 55%)",
    particleCount: 40,
    duration: 3000,
    ringColor: "hsl(40, 90%, 55%)",
    label: "LEGENDARY",
    labelColor: "text-legendary",
  },
  rare: {
    glowColor: "hsl(220, 80%, 60%)",
    particleCount: 24,
    duration: 2000,
    ringColor: "hsl(220, 80%, 60%)",
    label: "RARE",
    labelColor: "text-rare",
  },
  common: {
    glowColor: "hsl(230, 10%, 60%)",
    particleCount: 12,
    duration: 1500,
    ringColor: "hsl(230, 10%, 50%)",
    label: "COMMON",
    labelColor: "text-common",
  },
};

export default function CardRevealAnimation({ cardId, onClose }: CardRevealAnimationProps) {
  const [phase, setPhase] = useState<"burst" | "reveal" | "shown">("burst");
  const card = allCards.find(c => c.id === cardId) || allSeasonalCards.find(c => c.id === cardId);

  if (!card) return null;

  const config = RARITY_CONFIG[card.rarity];

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("reveal"), 600);
    const t2 = setTimeout(() => setPhase("shown"), 1400);
    const t3 = setTimeout(onClose, config.duration);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [config.duration, onClose]);

  // Generate particle data once
  const particles = Array.from({ length: config.particleCount }, (_, i) => {
    const angle = (i / config.particleCount) * Math.PI * 2;
    const distance = 120 + Math.random() * 180;
    const size = 2 + Math.random() * 4;
    return { angle, distance, size, delay: Math.random() * 0.3 };
  });

  // Ring particles for legendary
  const ringParticles = card.rarity === "legendary"
    ? Array.from({ length: 16 }, (_, i) => ({
        angle: (i / 16) * Math.PI * 2,
        delay: i * 0.04,
      }))
    : [];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-center justify-center cursor-pointer"
      onClick={onClose}
      style={{ backgroundColor: "rgba(0,0,0,0.85)" }}
    >
      {/* Radial glow */}
      <motion.div
        className="absolute rounded-full"
        initial={{ width: 0, height: 0, opacity: 0 }}
        animate={{
          width: [0, 500, 400],
          height: [0, 500, 400],
          opacity: [0, 0.6, 0.3],
        }}
        transition={{ duration: 1.2, ease: "easeOut" }}
        style={{
          background: `radial-gradient(circle, ${config.glowColor} 0%, transparent 70%)`,
          filter: "blur(40px)",
        }}
      />

      {/* Particle burst */}
      <div className="absolute pointer-events-none">
        {particles.map((p, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full"
            style={{
              width: p.size,
              height: p.size,
              backgroundColor: config.glowColor,
              left: -p.size / 2,
              top: -p.size / 2,
            }}
            initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
            animate={{
              x: Math.cos(p.angle) * p.distance,
              y: Math.sin(p.angle) * p.distance,
              opacity: [1, 0.8, 0],
              scale: [1, 1.5, 0],
            }}
            transition={{
              duration: 1 + Math.random() * 0.5,
              delay: p.delay,
              ease: "easeOut",
            }}
          />
        ))}
      </div>

      {/* Legendary ring effect */}
      {ringParticles.length > 0 && (
        <div className="absolute pointer-events-none">
          {ringParticles.map((p, i) => (
            <motion.div
              key={`ring-${i}`}
              className="absolute w-2 h-2 rounded-full"
              style={{
                backgroundColor: config.ringColor,
                boxShadow: `0 0 8px 2px ${config.ringColor}`,
              }}
              initial={{ opacity: 0, scale: 0 }}
              animate={{
                x: [0, Math.cos(p.angle) * 160, Math.cos(p.angle + 0.5) * 140],
                y: [0, Math.sin(p.angle) * 160, Math.sin(p.angle + 0.5) * 140],
                opacity: [0, 1, 0],
                scale: [0, 1.5, 0],
              }}
              transition={{
                duration: 2,
                delay: 0.3 + p.delay,
                ease: "easeInOut",
              }}
            />
          ))}
        </div>
      )}

      {/* Card with 3D flip */}
      <motion.div
        className="relative z-10"
        initial={{ scale: 0.1, rotateY: 180, rotateZ: -15, opacity: 0 }}
        animate={
          phase === "burst"
            ? { scale: 0.1, rotateY: 180, rotateZ: -15, opacity: 0 }
            : phase === "reveal"
            ? { scale: 1.15, rotateY: 90, rotateZ: 0, opacity: 1 }
            : { scale: 1, rotateY: 0, rotateZ: 0, opacity: 1 }
        }
        transition={{
          type: "spring",
          damping: card.rarity === "legendary" ? 12 : 18,
          stiffness: 100,
          mass: 1.2,
        }}
        style={{ perspective: "1200px" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="w-52 h-72 sm:w-64 sm:h-88 rounded-2xl overflow-hidden border-2 relative"
          style={{
            borderColor: config.glowColor,
            boxShadow: `0 0 40px 10px ${config.glowColor}40, 0 0 80px 20px ${config.glowColor}20`,
          }}
        >
          <img
            src={card.image}
            alt={card.name}
            className="w-full h-full object-cover"
          />

          {/* Card overlay gradient */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

          {/* Shimmer effect */}
          <motion.div
            className="absolute inset-0 pointer-events-none"
            initial={{ x: "-100%" }}
            animate={{ x: "200%" }}
            transition={{ duration: 1.5, delay: 1, ease: "easeInOut" }}
            style={{
              background: `linear-gradient(105deg, transparent 40%, ${config.glowColor}30 45%, ${config.glowColor}50 50%, ${config.glowColor}30 55%, transparent 60%)`,
            }}
          />

          {/* Floating particles on card (legendary only) */}
          {card.rarity === "legendary" && (
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              {Array.from({ length: 10 }).map((_, i) => (
                <motion.div
                  key={`float-${i}`}
                  className="absolute w-1 h-1 rounded-full bg-legendary"
                  style={{
                    left: `${10 + Math.random() * 80}%`,
                    bottom: 0,
                  }}
                  animate={{
                    y: [0, -200 - Math.random() * 100],
                    opacity: [0, 1, 0],
                    x: [(Math.random() - 0.5) * 20, (Math.random() - 0.5) * 40],
                  }}
                  transition={{
                    duration: 2 + Math.random(),
                    delay: 1 + i * 0.15,
                    repeat: Infinity,
                    repeatDelay: Math.random(),
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Card name + rarity */}
        <motion.div
          className="text-center mt-4"
          initial={{ opacity: 0, y: 20 }}
          animate={phase === "shown" ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ type: "spring", damping: 20, delay: 0.15 }}
        >
          <motion.h3
            className="font-heading text-2xl sm:text-3xl font-bold text-foreground"
            initial={{ scale: 0.8 }}
            animate={phase === "shown" ? { scale: 1 } : { scale: 0.8 }}
            transition={{ type: "spring", damping: 15 }}
          >
            {card.name}
          </motion.h3>
          <motion.p
            className={cn("font-heading text-sm font-bold uppercase tracking-widest mt-1", config.labelColor)}
            initial={{ opacity: 0, letterSpacing: "0.5em" }}
            animate={phase === "shown" ? { opacity: 1, letterSpacing: "0.2em" } : {}}
            transition={{ delay: 0.3 }}
          >
            {config.label}
          </motion.p>
          <motion.p
            className="text-xs text-muted-foreground mt-2"
            initial={{ opacity: 0 }}
            animate={phase === "shown" ? { opacity: 1 } : {}}
            transition={{ delay: 0.5 }}
          >
            Tap anywhere to continue
          </motion.p>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
