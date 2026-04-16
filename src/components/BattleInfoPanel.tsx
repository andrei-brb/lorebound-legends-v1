import { motion, AnimatePresence } from "framer-motion";
import { Sword, Shield, Heart, Zap, Swords as SwordsIcon, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FieldCard } from "@/lib/battleEngine";
import { elementEmoji } from "@/lib/elementSystem";

interface BattleCardTooltipProps {
  fieldCard: FieldCard | null;
  position?: { x: number; y: number };
  side?: "player" | "enemy";
  isMobile?: boolean;
  onClose?: () => void;
}

export default function BattleCardTooltip({ fieldCard, position, side, isMobile, onClose }: BattleCardTooltipProps) {
  if (!fieldCard) return null;

  const card = fieldCard.card;

  const content = (
    <div className="p-3 space-y-2 min-w-[200px] max-w-[240px]">
      {isMobile && (
        <button onClick={onClose} className="absolute top-2 right-2 text-muted-foreground">
          <X className="w-4 h-4" />
        </button>
      )}
      <div className="flex items-center gap-2">
        <div className="w-10 h-12 rounded overflow-hidden border border-border flex-shrink-0">
          <img src={card.image} alt={card.name} className="w-full h-full object-cover" />
        </div>
        <div>
          <h4 className="font-heading text-xs font-bold text-foreground">{card.name}</h4>
          <span className="text-[9px] text-muted-foreground uppercase">{card.rarity} · {card.type}</span>
          {card.element && card.element !== "neutral" && (
            <span className="ml-1 text-[9px]">{elementEmoji[card.element]}</span>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-1 text-[10px]">
        <div className="flex items-center gap-0.5 text-destructive">
          <Sword className="w-3 h-3" />
          <span className="font-bold">{fieldCard.attack}</span>
        </div>
        <div className="flex items-center gap-0.5 text-blue-400">
          <Shield className="w-3 h-3" />
          <span className="font-bold">{fieldCard.defense}</span>
        </div>
        <div className="flex items-center gap-0.5 text-green-400">
          <Heart className="w-3 h-3" />
          <span className="font-bold">{fieldCard.currentHp}/{fieldCard.maxHp}</span>
        </div>
      </div>

      {/* Ability */}
      <div className="text-[10px] space-y-0.5">
        <div className="flex items-center gap-1">
          <Zap className={cn("w-3 h-3", fieldCard.abilityUsed ? "text-muted-foreground" : "text-legendary")} />
          <span className={cn("font-bold", fieldCard.abilityUsed ? "text-muted-foreground line-through" : "text-legendary")}>
            {card.specialAbility.name}
          </span>
        </div>
        <p className="text-muted-foreground text-[9px] leading-tight">
          {card.specialAbility.description}
        </p>
      </div>

      {/* Passive */}
      {card.passiveAbility && (
        <div className="text-[9px] text-muted-foreground">
          <span className="font-bold text-foreground/70">Passive:</span> {card.passiveAbility.description}
        </div>
      )}

      {/* Weapon */}
      {fieldCard.equippedWeapon && (
        <div className="flex items-center gap-1 text-[9px] text-legendary bg-legendary/10 rounded px-1.5 py-1">
          <SwordsIcon className="w-3 h-3" />
          <span className="font-bold">{fieldCard.equippedWeapon.name}</span>
          <span>+{fieldCard.equippedWeapon.weaponBonus?.attack}⚔ +{fieldCard.equippedWeapon.weaponBonus?.defense}🛡</span>
        </div>
      )}
    </div>
  );

  // Mobile: bottom sheet
  if (isMobile) {
    return (
      <AnimatePresence>
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
          className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border rounded-t-2xl overflow-hidden"
        >
          {content}
        </motion.div>
      </AnimatePresence>
    );
  }

  // Desktop: floating tooltip near the card
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.15 }}
      className={cn(
        "absolute z-50 bg-card/95 backdrop-blur-md border border-border rounded-xl shadow-2xl pointer-events-none",
        side === "enemy" ? "top-full mt-2" : "bottom-full mb-2",
      )}
      style={position ? { left: position.x, top: position.y } : undefined}
    >
      {content}
    </motion.div>
  );
}
