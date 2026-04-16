import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Flame, TreePine, Skull } from "lucide-react";
import { type FactionPath, FACTION_STARTER_CARDS } from "@/lib/playerState";
import { allCards } from "@/data/cards";

interface PathSelectionProps {
  onSelect: (path: FactionPath) => void;
}

const PATHS: { id: FactionPath; name: string; subtitle: string; description: string; icon: React.ReactNode; gradient: string; borderColor: string; glowColor: string }[] = [
  {
    id: "fire",
    name: "Path of Fire",
    subtitle: "Fury & Destruction",
    description: "Command the flames of war. Your cards hit hard with devastating attacks and relentless aggression.",
    icon: <Flame className="w-8 h-8" />,
    gradient: "from-red-900/60 via-orange-900/40 to-transparent",
    borderColor: "border-red-500/40 hover:border-red-400/70",
    glowColor: "shadow-red-500/20",
  },
  {
    id: "nature",
    name: "Path of Nature",
    subtitle: "Balance & Synergy",
    description: "Harness the living world. Your cards thrive together with powerful synergies and sustain.",
    icon: <TreePine className="w-8 h-8" />,
    gradient: "from-emerald-900/60 via-green-900/40 to-transparent",
    borderColor: "border-emerald-500/40 hover:border-emerald-400/70",
    glowColor: "shadow-emerald-500/20",
  },
  {
    id: "shadow",
    name: "Path of Shadow",
    subtitle: "Strategy & Dominion",
    description: "Embrace the darkness. Your cards debuff enemies and control the battlefield with cunning.",
    icon: <Skull className="w-8 h-8" />,
    gradient: "from-purple-900/60 via-violet-900/40 to-transparent",
    borderColor: "border-purple-500/40 hover:border-purple-400/70",
    glowColor: "shadow-purple-500/20",
  },
];

export default function PathSelection({ onSelect }: PathSelectionProps) {
  const [selected, setSelected] = useState<FactionPath | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  const handleConfirm = () => {
    if (!selected) return;
    setConfirmed(true);
    setTimeout(() => onSelect(selected), 1200);
  };

  const previewCards = (path: FactionPath) => {
    const ids = FACTION_STARTER_CARDS[path].slice(0, 3);
    return ids.map((id) => allCards.find((c) => c.id === id)).filter(Boolean);
  };

  return (
    <motion.div
      className="flex flex-col items-center justify-center min-h-screen px-6 relative"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8 }}
    >
      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] rounded-full bg-primary/5 blur-[150px]" />
      </div>

      <div className="relative z-10 w-full max-w-5xl">
        <motion.div
          className="text-center mb-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <h2 className="font-heading text-3xl md:text-5xl font-bold text-primary tracking-wider mb-3">
            Choose Your Path
          </h2>
          <p className="text-muted-foreground text-base">
            Your choice shapes your starting deck. Choose wisely, Summoner.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {PATHS.map((path, i) => {
            const isSelected = selected === path.id;
            const cards = previewCards(path.id);

            return (
              <motion.button
                key={path.id}
                onClick={() => !confirmed && setSelected(path.id)}
                className={`relative rounded-2xl border-2 p-6 text-left transition-all duration-300 bg-gradient-to-b ${path.gradient} ${isSelected ? path.borderColor.replace("hover:", "") + " shadow-lg " + path.glowColor : "border-border/30 hover:border-border/60"} ${confirmed && !isSelected ? "opacity-30 scale-95" : ""}`}
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4 + i * 0.15, type: "spring", damping: 20 }}
                whileHover={!confirmed ? { scale: 1.03 } : {}}
                whileTap={!confirmed ? { scale: 0.98 } : {}}
              >
                {isSelected && (
                  <motion.div
                    className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", damping: 10 }}
                  >
                    ✓
                  </motion.div>
                )}

                <div className="flex items-center gap-3 mb-3">
                  <div className="text-primary">{path.icon}</div>
                  <div>
                    <h3 className="font-heading text-lg font-bold text-foreground">{path.name}</h3>
                    <p className="text-xs text-muted-foreground">{path.subtitle}</p>
                  </div>
                </div>

                <p className="text-sm text-foreground/70 mb-4 leading-relaxed">{path.description}</p>

                {/* Card previews */}
                <div className="flex gap-2 justify-center">
                  {cards.map((card, j) => (
                    <motion.div
                      key={card!.id}
                      className="w-16 h-22 rounded-lg overflow-hidden border border-border/40 shadow-md"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.8 + i * 0.15 + j * 0.1 }}
                    >
                      <img
                        src={card!.image}
                        alt={card!.name}
                        className="w-full h-full object-cover"
                      />
                    </motion.div>
                  ))}
                </div>
              </motion.button>
            );
          })}
        </div>

        <AnimatePresence>
          {selected && !confirmed && (
            <motion.div
              className="text-center"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <motion.button
                onClick={handleConfirm}
                className="px-10 py-3 rounded-xl bg-primary text-primary-foreground font-heading font-bold text-sm tracking-widest uppercase shadow-lg hover:shadow-xl transition-shadow"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.97 }}
              >
                Forge My Deck
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
