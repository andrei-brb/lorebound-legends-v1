import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Check } from "lucide-react";
import { allCards } from "@/data/cards";
import type { PlayerState } from "@/lib/playerState";
import type { GameCard } from "@/data/cards";

// Which card type is offered per tutorial battle (1-indexed)
const BATTLE_REWARD_TYPE: Record<number, GameCard["type"]> = {
  1: "god",
  2: "hero",
  3: "weapon",
  4: "spell",
  5: "trap",
};

const BATTLE_REWARD_LABEL: Record<number, string> = {
  1: "Legendary God",
  2: "Legendary Hero",
  3: "Legendary Weapon",
  4: "Legendary Spell",
  5: "Legendary Trap",
};

// How many to show per type (rest are randomly sampled)
const MAX_SHOWN = 4;

interface LegendaryPickerProps {
  battleNumber: 1 | 2 | 3 | 4 | 5;
  playerState: PlayerState;
  onPick: (cardId: string) => void;
}

export default function LegendaryPicker({ battleNumber, playerState, onPick }: LegendaryPickerProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  const cardType = BATTLE_REWARD_TYPE[battleNumber];
  const rewardLabel = BATTLE_REWARD_LABEL[battleNumber];

  const choices = useMemo(() => {
    const owned = new Set(playerState.ownedCardIds);
    const pool = allCards.filter(
      (c) => c.type === cardType && c.rarity === "legendary" && !owned.has(c.id),
    );
    // If all are owned already, include owned ones too
    const source = pool.length > 0 ? pool : allCards.filter((c) => c.type === cardType && c.rarity === "legendary");
    // Deterministic shuffle seeded by battleNumber so the same player always sees the same options
    const seeded = [...source].sort((a, b) => {
      const ha = simpleHash(a.id + battleNumber);
      const hb = simpleHash(b.id + battleNumber);
      return ha - hb;
    });
    return seeded.slice(0, MAX_SHOWN);
  }, [cardType, playerState.ownedCardIds, battleNumber]);

  const handleConfirm = () => {
    if (!selected) return;
    setConfirmed(true);
    setTimeout(() => onPick(selected), 900);
  };

  // Auto-award if only 1 option
  if (choices.length === 1 && !confirmed) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
      >
        <motion.div
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-b from-[#1a1028] to-[#0d0a1a] border border-[hsl(var(--legendary)/0.4)] rounded-2xl p-8 max-w-sm w-full mx-4 text-center shadow-2xl"
        >
          <div className="text-4xl mb-3">🏆</div>
          <h2 className="font-heading text-xl text-[hsl(var(--legendary))] mb-1">Victory Reward</h2>
          <p className="text-sm text-muted-foreground mb-6">You have earned a {rewardLabel}!</p>
          <div className="flex justify-center mb-6">
            <CardPreview card={choices[0]} selected />
          </div>
          <button
            onClick={() => { setConfirmed(true); setTimeout(() => onPick(choices[0].id), 900); }}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-[hsl(var(--legendary)/0.8)] to-[hsl(var(--rare)/0.8)] font-heading text-sm uppercase tracking-wider text-white shadow-lg"
          >
            Claim {choices[0].name}
          </button>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="bg-gradient-to-b from-[#1a1028] to-[#0d0a1a] border border-[hsl(var(--legendary)/0.4)] rounded-2xl p-6 max-w-2xl w-full mx-4 shadow-2xl"
      >
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-2 mb-1">
            <Sparkles className="w-5 h-5 text-[hsl(var(--legendary))]" />
            <h2 className="font-heading text-xl text-[hsl(var(--legendary))]">Victory Reward — Battle {battleNumber}</h2>
            <Sparkles className="w-5 h-5 text-[hsl(var(--legendary))]" />
          </div>
          <p className="text-sm text-muted-foreground">Choose your {rewardLabel}</p>
        </div>

        <div className={`grid gap-3 mb-6 ${choices.length <= 2 ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-4"}`}>
          {choices.map((card) => (
            <button
              key={card.id}
              onClick={() => setSelected(card.id)}
              className="relative focus:outline-none"
            >
              <CardPreview card={card} selected={selected === card.id} />
            </button>
          ))}
        </div>

        <AnimatePresence>
          {selected && (
            <motion.button
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={handleConfirm}
              disabled={confirmed}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-[hsl(var(--legendary)/0.8)] to-[hsl(var(--rare)/0.8)] font-heading text-sm uppercase tracking-wider text-white shadow-lg disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {confirmed ? (
                <><Check className="w-4 h-4" /> Claimed!</>
              ) : (
                <>Claim {allCards.find(c => c.id === selected)?.name}</>
              )}
            </motion.button>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}

function CardPreview({ card, selected }: { card: GameCard; selected?: boolean }) {
  return (
    <motion.div
      animate={{ scale: selected ? 1.04 : 1 }}
      className={`relative rounded-xl overflow-hidden border-2 transition-all ${
        selected
          ? "border-[hsl(var(--legendary))] shadow-[0_0_16px_hsl(var(--legendary)/0.5)]"
          : "border-border/30 hover:border-[hsl(var(--legendary)/0.4)]"
      }`}
    >
      {card.image && (
        <img src={card.image} alt={card.name} className="w-full aspect-[3/4] object-cover" />
      )}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-2">
        <p className="font-heading text-[10px] text-[hsl(var(--legendary))] uppercase leading-tight">{card.name}</p>
        {card.specialAbility && (
          <p className="text-[9px] text-muted-foreground leading-tight mt-0.5 line-clamp-2">{card.specialAbility.description}</p>
        )}
      </div>
      {selected && (
        <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[hsl(var(--legendary))] flex items-center justify-center">
          <Check className="w-3 h-3 text-black" />
        </div>
      )}
    </motion.div>
  );
}

function simpleHash(s: string | number): number {
  const str = String(s);
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return h;
}
