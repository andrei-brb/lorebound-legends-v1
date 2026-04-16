import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sword, Shield, Heart, Zap, Swords as SwordsIcon, ChevronDown, ChevronUp, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FieldCard, BattleLog } from "@/lib/battleEngine";
import type { ActiveSynergy } from "@/lib/synergyEngine";
import { elementEmoji } from "@/lib/elementSystem";

interface BattleInfoPanelProps {
  selectedCard: FieldCard | null;
  synergies: ActiveSynergy[];
  logs: BattleLog[];
  isMobile?: boolean;
  onClose?: () => void;
}

const logTypeColor: Record<string, string> = {
  attack: "text-destructive/90",
  ability: "text-legendary/90",
  synergy: "text-synergy",
  defeat: "text-destructive font-bold",
  info: "text-muted-foreground",
  spell: "text-synergy/90",
  trap: "text-legendary/90",
  weapon: "text-legendary/90",
  direct: "text-destructive font-bold",
};

export default function BattleInfoPanel({ selectedCard, synergies, logs, isMobile, onClose }: BattleInfoPanelProps) {
  const [logExpanded, setLogExpanded] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [logs.length]);

  const visibleLogs = logExpanded ? logs : logs.slice(-3);

  const content = (
    <div className="flex flex-col h-full">
      {/* Card details */}
      <AnimatePresence mode="wait">
        {selectedCard ? (
          <motion.div
            key={selectedCard.card.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="p-3 space-y-2 border-b border-border"
          >
            {isMobile && (
              <button onClick={onClose} className="absolute top-2 right-2 text-muted-foreground">
                <X className="w-4 h-4" />
              </button>
            )}
            <div className="flex items-center gap-2">
              <div className="w-10 h-12 rounded overflow-hidden border border-border flex-shrink-0">
                <img src={selectedCard.card.image} alt={selectedCard.card.name} className="w-full h-full object-cover" />
              </div>
              <div>
                <h4 className="font-heading text-xs font-bold text-foreground">{selectedCard.card.name}</h4>
                <span className="text-[9px] text-muted-foreground uppercase">{selectedCard.card.rarity} · {selectedCard.card.type}</span>
                {selectedCard.card.element && selectedCard.card.element !== "neutral" && (
                  <span className="ml-1 text-[9px]">{elementEmoji[selectedCard.card.element]}</span>
                )}
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-1 text-[10px]">
              <div className="flex items-center gap-0.5 text-destructive">
                <Sword className="w-3 h-3" />
                <span className="font-bold">{selectedCard.attack}</span>
              </div>
              <div className="flex items-center gap-0.5 text-blue-400">
                <Shield className="w-3 h-3" />
                <span className="font-bold">{selectedCard.defense}</span>
              </div>
              <div className="flex items-center gap-0.5 text-green-400">
                <Heart className="w-3 h-3" />
                <span className="font-bold">{selectedCard.currentHp}/{selectedCard.maxHp}</span>
              </div>
            </div>

            {/* Ability */}
            <div className="text-[10px] space-y-0.5">
              <div className="flex items-center gap-1">
                <Zap className={cn("w-3 h-3", selectedCard.abilityUsed ? "text-muted-foreground" : "text-legendary")} />
                <span className={cn("font-bold", selectedCard.abilityUsed ? "text-muted-foreground line-through" : "text-legendary")}>
                  {selectedCard.card.specialAbility.name}
                </span>
              </div>
              <p className="text-muted-foreground text-[9px] leading-tight">
                {selectedCard.card.specialAbility.description}
              </p>
            </div>

            {/* Passive */}
            {selectedCard.card.passiveAbility && (
              <div className="text-[9px] text-muted-foreground">
                <span className="font-bold text-foreground/70">Passive:</span> {selectedCard.card.passiveAbility.description}
              </div>
            )}

            {/* Weapon */}
            {selectedCard.equippedWeapon && (
              <div className="flex items-center gap-1 text-[9px] text-legendary bg-legendary/10 rounded px-1.5 py-1">
                <SwordsIcon className="w-3 h-3" />
                <span className="font-bold">{selectedCard.equippedWeapon.name}</span>
                <span>+{selectedCard.equippedWeapon.weaponBonus?.attack}⚔ +{selectedCard.equippedWeapon.weaponBonus?.defense}🛡</span>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-3 border-b border-border"
          >
            <p className="text-[10px] text-muted-foreground text-center py-4">
              Hover or tap a card to see details
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Synergies */}
      {synergies.length > 0 && (
        <div className="px-3 py-2 border-b border-border">
          <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold">Synergies</span>
          <div className="space-y-0.5 mt-1">
            {synergies.map((s, i) => (
              <div key={i} className="text-[9px] text-synergy">
                ✦ {s.name} ({s.bonuses.length} cards)
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Battle Log */}
      <div className="flex-1 flex flex-col min-h-0">
        <button
          onClick={() => setLogExpanded(!logExpanded)}
          className="flex items-center justify-between px-3 py-1.5 text-[9px] uppercase tracking-wider text-muted-foreground font-bold hover:text-foreground transition-colors"
        >
          <span>Battle Log</span>
          {logExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
        </button>
        <div
          ref={logRef}
          className={cn(
            "overflow-y-auto px-3 pb-2 space-y-0.5",
            logExpanded ? "max-h-48" : "max-h-20",
          )}
        >
          {visibleLogs.map((log, i) => (
            <motion.div
              key={logs.indexOf(log)}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              className={cn("text-[9px] py-0.5", logTypeColor[log.type] || "text-muted-foreground")}
            >
              {log.message}
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <AnimatePresence>
        {(selectedCard || logExpanded) && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-40"
              onClick={onClose}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border rounded-t-2xl max-h-[50vh] overflow-hidden"
            >
              {content}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    );
  }

  return (
    <div className="w-56 xl:w-60 bg-card border border-border rounded-xl overflow-hidden flex flex-col h-full">
      {content}
    </div>
  );
}
