import { motion } from "framer-motion";
import { Sword, Shield, Heart, Zap, Star, Swords as SwordsIcon } from "lucide-react";
import type { FieldCard } from "@/lib/battleEngine";
import { cn } from "@/lib/utils";

interface BattleCardDisplayProps {
  fieldCard: FieldCard;
  side: "player" | "enemy";
  isActive: boolean;
  onClick?: () => void;
  selectable?: boolean;
}

const rarityBorder: Record<string, string> = {
  legendary: "border-legendary",
  rare: "border-rare",
  common: "border-common",
};

export default function BattleCardDisplay({ fieldCard, side: _side, isActive, onClick, selectable }: BattleCardDisplayProps) {
  const { card, currentHp, maxHp, attack, defense, equippedWeapon, abilityUsed, stunned } = fieldCard;
  const hpPercent = (currentHp / maxHp) * 100;

  return (
    <div
      onClick={onClick}
      className={cn(
        "relative rounded-xl border-2 overflow-hidden bg-card transition-all",
        rarityBorder[card.rarity],
        isActive && "ring-2 ring-primary/60",
        selectable && "cursor-pointer hover:ring-2 hover:ring-legendary/60 hover:scale-105",
        stunned && "opacity-50 grayscale"
      )}
    >
      <div className="flex gap-3 p-3">
        {/* Card Art */}
        <div className="relative w-16 h-20 rounded-lg overflow-hidden flex-shrink-0 border border-border">
          <img src={card.image} alt={card.name} className="w-full h-full object-cover" />
          {isActive && (
            <motion.div
              animate={{ opacity: [0.3, 0.7, 0.3] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="absolute inset-0 bg-primary/20"
            />
          )}
          {/* Type badge */}
          <div className="absolute top-0.5 left-0.5 bg-primary/90 text-primary-foreground text-[7px] font-bold px-1 py-0.5 rounded uppercase">
            {card.type}
          </div>
          {/* Weapon icon */}
          {equippedWeapon && (
            <div className="absolute bottom-0.5 right-0.5 bg-legendary/90 text-primary-foreground rounded p-0.5">
              <SwordsIcon className="w-2.5 h-2.5" />
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="flex-1 min-w-0 space-y-1.5">
          <div>
            <h4 className="font-heading text-[11px] font-bold text-foreground truncate">{card.name}</h4>
            <span className="text-[9px] text-muted-foreground uppercase">{card.rarity}</span>
            {equippedWeapon && (
              <span className="text-[9px] text-legendary ml-1">⚔️ {equippedWeapon.name}</span>
            )}
          </div>

          {/* HP Bar */}
          <div>
            <div className="flex items-center gap-1 mb-0.5">
              <Heart className="w-2.5 h-2.5 text-destructive" />
              <span className="text-[10px] font-bold text-foreground">{currentHp}/{maxHp}</span>
            </div>
            <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
              <motion.div
                className={cn(
                  "h-full rounded-full transition-colors",
                  hpPercent > 50 ? "bg-green-500" : hpPercent > 25 ? "bg-yellow-500" : "bg-destructive"
                )}
                initial={false}
                animate={{ width: `${hpPercent}%` }}
                transition={{ duration: 0.4, ease: "easeOut" }}
              />
            </div>
          </div>

          {/* ATK / DEF */}
          <div className="flex gap-3 text-[10px]">
            <div className="flex items-center gap-0.5 text-destructive">
              <Sword className="w-2.5 h-2.5" />
              <span className="font-bold">{attack}</span>
            </div>
            <div className="flex items-center gap-0.5 text-rare">
              <Shield className="w-2.5 h-2.5" />
              <span className="font-bold">{defense}</span>
            </div>
          </div>

          {/* Ability */}
          <div className="flex items-center gap-0.5">
            <Zap className={cn("w-2.5 h-2.5", abilityUsed ? "text-muted-foreground" : "text-legendary")} />
            <span className={cn("text-[9px] truncate", abilityUsed ? "text-muted-foreground line-through" : "text-muted-foreground")}>{card.specialAbility.name}</span>
          </div>

          {stunned && (
            <span className="text-[8px] px-1 py-0.5 rounded bg-destructive/20 text-destructive font-bold">STUNNED</span>
          )}
        </div>
      </div>
    </div>
  );
}
