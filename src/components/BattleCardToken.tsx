import { motion } from "framer-motion";
import { Sword, Shield, Zap, Swords as SwordsIcon } from "lucide-react";
import type { FieldCard } from "@/lib/battleEngine";
import { cn } from "@/lib/utils";
import { elementEmoji } from "@/lib/elementSystem";
import CardCharacter3D from "@/components/three/CardCharacter3D";
import gaiaraModelUrl from "@/assets/models/gaiara-earth-mother.glb";

interface BattleCardTokenProps {
  fieldCard: FieldCard;
  side: "player" | "enemy";
  isSelected?: boolean;
  selectable?: boolean;
  onClick?: () => void;
  onHover?: () => void;
  onHoverEnd?: () => void;
  animateAttack?: "lunge-up" | "lunge-down" | null;
  animateHit?: boolean;
  animateDeath?: boolean;
}

const rarityGlow: Record<string, string> = {
  legendary: "shadow-[0_0_12px_2px_hsl(var(--legendary)/0.5)] border-legendary",
  rare: "shadow-[0_0_10px_2px_hsl(var(--rare)/0.4)] border-rare",
  common: "border-border",
};

export default function BattleCardToken({
  fieldCard,
  side: _side,
  isSelected,
  selectable,
  onClick,
  onHover,
  onHoverEnd,
  animateAttack,
  animateHit,
  animateDeath,
}: BattleCardTokenProps) {
  const { card, currentHp, maxHp, attack, equippedWeapon, stunned, abilityUsed } = fieldCard;
  const show3d = card.id === "gaiara" && !animateDeath;

  const lungeVariants = {
    idle: { y: 0, scale: 1, opacity: 1 },
    "lunge-up": { y: [-0, -30, 0], scale: [1, 1.08, 1], transition: { duration: 0.4, ease: "easeInOut" } },
    "lunge-down": { y: [-0, 30, 0], scale: [1, 1.08, 1], transition: { duration: 0.4, ease: "easeInOut" } },
    death: { scale: 0.3, opacity: 0, transition: { duration: 0.4 } },
  };

  return (
    <motion.div
      variants={lungeVariants}
      animate={animateDeath ? "death" : animateAttack || "idle"}
      onClick={onClick}
      onMouseEnter={onHover}
      onMouseLeave={onHoverEnd}
      className={cn(
        "relative w-[72px] h-[92px] sm:w-20 sm:h-[104px] cursor-default transition-all flex-shrink-0",
        isSelected && "scale-110 z-10",
        selectable && "cursor-pointer hover:brightness-125 hover:scale-105",
        stunned && "grayscale opacity-60",
      )}
    >
      {/* 3D character layer (test: Gaiara) — sits ABOVE the clipped card. */}
      {show3d && (
        <CardCharacter3D
          url={gaiaraModelUrl}
          scale={0.9}
          className={cn(
            "pointer-events-none absolute left-1/2 -translate-x-1/2 -top-[74px] w-[150px] h-[150px] sm:-top-[92px] sm:w-[190px] sm:h-[190px] z-30",
            stunned && "opacity-70",
          )}
        />
      )}

      {/* Card shell (clipped/rounded) */}
      <div
        className={cn(
          "relative w-full h-full rounded-lg border-2 overflow-hidden",
          rarityGlow[card.rarity] || rarityGlow.common,
          isSelected && "ring-2 ring-primary ring-offset-1 ring-offset-background",
        )}
      >
        {/* Card art */}
        <img src={card.image} alt={card.name} className="absolute inset-0 w-full h-full object-cover" />

        {/* Dark overlay for readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30" />

        {/* Element pip top-right */}
        {card.element && card.element !== "neutral" && (
          <span className="absolute top-0.5 right-0.5 text-[9px] leading-none drop-shadow-md">
            {elementEmoji[card.element]}
          </span>
        )}

        {/* Weapon overlay top-left */}
        {equippedWeapon && (
          <div className="absolute top-0.5 left-0.5 bg-legendary/90 rounded p-0.5">
            <SwordsIcon className="w-2.5 h-2.5 text-primary-foreground" />
          </div>
        )}

        {/* Ability indicator */}
        {!abilityUsed && !stunned && (
          <div className="absolute top-5 left-0.5">
            <Zap className="w-2.5 h-2.5 text-legendary drop-shadow-md" />
          </div>
        )}

        {/* ATK badge bottom-left */}
        <div className="absolute bottom-0.5 left-0.5 flex items-center gap-px bg-black/70 rounded px-1 py-0.5">
          <Sword className="w-2.5 h-2.5 text-destructive" />
          <span className="text-[9px] font-bold text-destructive-foreground">{attack}</span>
        </div>

        {/* HP badge bottom-right */}
        <div className={cn(
          "absolute bottom-0.5 right-0.5 flex items-center gap-px rounded px-1 py-0.5",
          currentHp > maxHp * 0.5 ? "bg-green-700/80" : currentHp > maxHp * 0.25 ? "bg-yellow-700/80" : "bg-red-700/80",
        )}>
          <span className="text-[9px] font-bold text-white">{currentHp}</span>
        </div>

        {/* Stunned overlay */}
        {stunned && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <span className="text-[8px] font-bold text-destructive uppercase tracking-wider">Stunned</span>
          </div>
        )}

        {/* Hit flash */}
        {animateHit && (
          <motion.div
            initial={{ opacity: 0.8 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            className="absolute inset-0 bg-destructive/50 pointer-events-none battle-slash-effect"
          />
        )}

        {/* Selection pulse */}
        {isSelected && (
          <motion.div
            animate={{ opacity: [0.2, 0.5, 0.2] }}
            transition={{ duration: 1.2, repeat: Infinity }}
            className="absolute inset-0 border-2 border-primary rounded-lg pointer-events-none"
          />
        )}
      </div>
    </motion.div>
  );
}
