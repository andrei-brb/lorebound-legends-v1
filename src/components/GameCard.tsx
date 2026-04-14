import { useState } from "react";
import { Sword, Shield, Sparkles, Zap, Star, ArrowUp, Circle } from "lucide-react";
import type { GameCard as GameCardType } from "@/data/cards";
import { allCards } from "@/data/cards";
import { cn } from "@/lib/utils";
import type { CardProgress } from "@/lib/playerState";
import { getVisualTier, getAbilityEvolutionName, getPassiveAbilities } from "@/lib/progressionEngine";
import { xpForLevel } from "@/lib/playerState";
import { getDupesForNextStar, getStarStatBonuses } from "@/lib/starSystem";

interface GameCardProps {
  card: GameCardType;
  onClick?: () => void;
  selected?: boolean;
  showSynergy?: boolean;
  size?: "sm" | "md" | "lg";
  cardProgress?: CardProgress;
}

const rarityGlow: Record<string, string> = {
  legendary: "glow-legendary",
  rare: "glow-rare",
  common: "glow-common",
};

const rarityBorder: Record<string, string> = {
  legendary: "border-legendary",
  rare: "border-rare",
  common: "border-common",
};

const rarityBadge: Record<string, string> = {
  legendary: "bg-legendary text-primary-foreground",
  rare: "bg-rare text-foreground",
  common: "bg-common text-foreground",
};

const sizeClasses: Record<string, string> = {
  sm: "w-44 h-64",
  md: "w-56 h-80",
  lg: "w-72 h-[420px]",
};

const visualTierClasses: Record<string, string> = {
  base: "",
  shimmer: "card-shimmer",
  premium: "card-premium",
  awakened: "card-awakened",
};

export default function GameCard({ card, onClick, selected, showSynergy, size = "md", cardProgress }: GameCardProps) {
  const [flipped, setFlipped] = useState(false);
  const progress = cardProgress || { level: 1, xp: 0, prestigeLevel: 0, starProgress: { dupeCount: 0, goldStars: 0, redStars: 0 } };
  const visualTier = getVisualTier(progress.level);
  const passives = getPassiveAbilities(progress);
  const abilityName = getAbilityEvolutionName(card.specialAbility.name, progress.level);
  const starBonuses = getStarStatBonuses(card.rarity, progress.starProgress.goldStars, progress.starProgress.redStars);

  const handleClick = () => {
    if (onClick) onClick();
    else setFlipped(!flipped);
  };

  return (
    <div
      className={cn(
        "card-flip-container cursor-pointer select-none transition-transform duration-200 hover:scale-105",
        sizeClasses[size],
        selected && "ring-2 ring-primary scale-105"
      )}
      onClick={handleClick}
    >
      <div className={cn("card-flip-inner", flipped && "flipped")}>
        {/* FRONT */}
        <div
          className={cn(
            "card-flip-front rounded-xl border-[3px] overflow-hidden flex flex-col",
            rarityGlow[card.rarity],
            rarityBorder[card.rarity],
            showSynergy && "ring-2 ring-synergy",
            visualTierClasses[visualTier]
          )}
        >
          <div className="absolute inset-0 z-10 pointer-events-none rounded-[10px] border-[6px] border-card/60" />
          <div className="absolute inset-[5px] z-10 pointer-events-none rounded-lg border border-foreground/10" />

          {/* Awakened overlay */}
          {visualTier === "awakened" && (
            <div className="absolute inset-0 z-20 pointer-events-none bg-gradient-to-t from-legendary/20 via-transparent to-legendary/10 animate-pulse" />
          )}

          <div className="relative flex-1 overflow-hidden">
            <img src={card.image} alt={card.name} className="w-full h-full object-cover" loading="lazy" />
            <div className="absolute top-2 left-2">
              <span className={cn("text-[10px] font-bold uppercase px-2 py-0.5 rounded-full", rarityBadge[card.rarity])}>
                {card.rarity}
              </span>
            </div>
            <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
              <span className="text-[10px] font-medium uppercase px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
                {card.type}
              </span>
            </div>
            {/* Level badge */}
            <div className="absolute bottom-2 left-2 flex items-center gap-1">
              <div className="bg-primary text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5">
                <ArrowUp className="w-2.5 h-2.5" />
                LV {progress.level}
              </div>
              {/* Prestige stars */}
              {progress.prestigeLevel > 0 && (
                <div className="flex gap-0.5">
                  {Array.from({ length: progress.prestigeLevel }).map((_, i) => (
                    <Star key={i} className="w-3 h-3 text-legendary fill-legendary" />
                  ))}
                </div>
              )}
            </div>
            {/* Star display */}
            {(progress.starProgress.goldStars > 0 || progress.starProgress.redStars > 0) && (
              <div className="absolute bottom-2 right-2 flex items-center gap-0.5">
                {Array.from({ length: progress.starProgress.goldStars }).map((_, i) => (
                  <Star key={`g${i}`} className="w-3 h-3 text-yellow-400 fill-yellow-400 drop-shadow-sm" />
                ))}
                {Array.from({ length: progress.starProgress.redStars }).map((_, i) => (
                  <Star key={`r${i}`} className="w-3 h-3 text-red-500 fill-red-500 drop-shadow-sm" />
                ))}
              </div>
            )}
            {/* XP bar on card */}
            {progress.level < 20 && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-secondary/50">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${(progress.xp / xpForLevel(progress.level)) * 100}%` }}
                />
              </div>
            )}
            {/* Dupe progress bar (above XP bar) */}
            {progress.starProgress.dupeCount > 0 && (() => {
              const next = getDupesForNextStar(progress.starProgress.dupeCount, card.rarity);
              if (next.starType === "max") return null;
              return (
                <div className="absolute bottom-1 left-0 right-0 h-0.5 bg-secondary/30">
                  <div
                    className={cn("h-full transition-all", next.starType === "gold" ? "bg-yellow-400" : "bg-red-500")}
                    style={{ width: `${(next.current / next.needed) * 100}%` }}
                  />
                </div>
              );
            })()}
          </div>
          <div className="bg-card p-3 space-y-1.5 border-t-2 border-foreground/10 relative z-20">
            <div className="absolute -top-[1px] left-3 right-3 h-[1px] bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
            <h3 className="font-heading text-sm font-bold truncate text-foreground">{card.name}</h3>
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-1 text-destructive">
                <Sword className="w-3 h-3" /> <span className="font-semibold">{card.attack + (progress.level - 1) + (progress.prestigeLevel * 2) + starBonuses.attack}</span>
              </div>
              <div className="flex items-center gap-1 text-rare">
                <Shield className="w-3 h-3" /> <span className="font-semibold">{card.defense + (progress.level - 1) + (progress.prestigeLevel * 2) + starBonuses.defense}</span>
              </div>
              <div className="flex items-center gap-1 text-legendary">
                <Sparkles className="w-3 h-3" />
                <span className="font-semibold text-[10px] truncate max-w-[80px]">{abilityName}</span>
              </div>
            </div>
            {/* Passive indicators */}
            {passives.length > 0 && (
              <div className="flex gap-1 flex-wrap">
                {passives.map(p => (
                  <span key={p.name} className="text-[8px] px-1 py-0.5 rounded bg-synergy/20 text-synergy font-bold">
                    {p.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* BACK */}
        <div
          className={cn(
            "card-flip-back rounded-xl border-[3px] overflow-hidden bg-card flex flex-col",
            rarityBorder[card.rarity],
            rarityGlow[card.rarity]
          )}
        >
          <div className="absolute inset-0 z-10 pointer-events-none rounded-[10px] border-[6px] border-card/60" />
          <div className="absolute inset-[5px] z-10 pointer-events-none rounded-lg border border-foreground/10" />
          <div className="p-3 flex flex-col h-full relative z-20 overflow-hidden">
            <h3 className="font-heading text-xs font-bold text-foreground mb-1 truncate">{card.name}</h3>
            <p className="text-[9px] text-muted-foreground leading-snug flex-1 min-h-0 overflow-auto">{card.lore}</p>

            <div className="mt-1.5 p-1.5 rounded-lg bg-secondary shrink-0">
              <div className="flex items-center gap-1 mb-0.5">
                <Zap className="w-2.5 h-2.5 text-legendary shrink-0" />
                <span className="text-[9px] font-bold text-foreground truncate">{abilityName}</span>
              </div>
              <p className="text-[8px] text-muted-foreground leading-snug">{card.specialAbility.description}</p>
            </div>

            {card.synergies.length > 0 && (
              <div className="mt-1.5 space-y-0.5 shrink-0">
                <span className="text-[8px] font-semibold uppercase tracking-wider text-synergy">Synergies</span>
                {card.synergies.map((syn) => {
                  const partner = allCards.find((c) => c.id === syn.partnerId);
                  return (
                    <div key={syn.partnerId} className="synergy-highlight rounded p-1">
                      <span className="text-[8px] font-bold text-synergy">{syn.name}</span>
                      <span className="text-[8px] text-muted-foreground"> — {partner?.name}</span>
                      <p className="text-[8px] text-synergy-glow mt-0.5 leading-snug">{syn.description}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
