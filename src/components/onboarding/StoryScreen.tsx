import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface StoryScreenProps {
  title: string;
  lines: string[];
  onContinue: () => void;
  autoAdvanceMs?: number;
}

export default function StoryScreen({ title, lines, onContinue }: StoryScreenProps) {
  const [revealedLines, setRevealedLines] = useState(0);
  const [showButton, setShowButton] = useState(false);

  useEffect(() => {
    if (revealedLines < lines.length) {
      const timer = setTimeout(() => setRevealedLines((r) => r + 1), 1800);
      return () => clearTimeout(timer);
    } else {
      const timer = setTimeout(() => setShowButton(true), 800);
      return () => clearTimeout(timer);
    }
  }, [revealedLines, lines.length]);

  return (
    <motion.div
      className="flex flex-col items-center justify-center min-h-screen px-6 relative"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1.2 }}
    >
      {/* Floating runes */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 30 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute text-primary/10 font-heading text-xl select-none"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, -40, 0],
              opacity: [0.05, 0.15, 0.05],
              rotate: [0, 360],
            }}
            transition={{
              duration: 8 + Math.random() * 6,
              repeat: Infinity,
              delay: Math.random() * 5,
            }}
          >
            {["✦", "⚔", "◆", "☽", "⚡", "🜲", "⛧"][i % 7]}
          </motion.div>
        ))}
      </div>

      {/* Radial glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/5 blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-2xl text-center space-y-8">
        <motion.h2
          className="font-heading text-3xl md:text-5xl font-bold text-primary tracking-wider"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.3 }}
        >
          {title}
        </motion.h2>

        <div className="space-y-4 min-h-[160px]">
          <AnimatePresence>
            {lines.slice(0, revealedLines).map((line, i) => (
              <motion.p
                key={i}
                className="text-foreground/80 text-lg md:text-xl font-light leading-relaxed italic"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8 }}
              >
                {line}
              </motion.p>
            ))}
          </AnimatePresence>
        </div>

        <AnimatePresence>
          {showButton && (
            <motion.button
              onClick={onContinue}
              className="px-8 py-3 rounded-xl bg-primary/20 border border-primary/40 text-primary font-heading font-bold text-sm tracking-widest uppercase hover:bg-primary/30 transition-colors"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
            >
              Continue
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
