import { useState, useRef, useCallback, useMemo } from "react";
import { Sword, Shield, Sparkles, Zap, Star, ArrowUp, Heart } from "lucide-react";
import type { GameCard as GameCardType } from "@/data/cardIndex";
import { allGameCards } from "@/data/cardIndex";
import { cn } from "@/lib/utils";
import type { CardProgress } from "@/lib/playerState";
import { getVisualTier, getAbilityEvolutionName, getPassiveAbilities } from "@/lib/progressionEngine";
import { xpForLevel } from "@/lib/playerState";
import { calculateStars, getDupesForNextStar, getStarStatBonuses } from "@/lib/starSystem";
import { elementEmoji, elementCssClass, elementBgClass } from "@/lib/elementSystem";

interface GameCardProps {
  card: GameCardType;
  onClick?: () => void;
  selected?: boolean;
  showSynergy?: boolean;
  size?: "sm" | "md" | "lg";
  cardProgress?: CardProgress;
  equippedFrameImage?: string | null;
  /** Shown on the flipped (lore) side when a card back cosmetic is equipped. */
  equippedCardBackImage?: string | null;
}

const rarityBadge: Record<string, string> = {
  legendary: "bg-legendary text-primary-foreground",
  rare: "bg-rare text-foreground",
  common: "bg-common text-foreground",
};

const rarityBadgeLabel: Record<string, string> = {
  legendary: "★ Legendary",
  rare: "◆ Rare",
  common: "Common",
};

const rarityFrameClass: Record<string, string> = {
  legendary: "card-frame-legendary",
  rare: "card-frame-rare",
  common: "card-frame-common",
};

const rarityGlowClass: Record<string, string> = {
  legendary: "card-glow-legendary",
  rare: "card-glow-rare",
  common: "card-glow-common",
};

const rarityCornerClass: Record<string, string> = {
  legendary: "card-corners-legendary",
  rare: "card-corners-rare",
  common: "card-corners-common",
};

const typeAccentColors: Record<string, string> = {
  god: "from-amber-500/20 via-transparent to-purple-500/10",
  hero: "from-red-500/15 via-transparent to-orange-500/10",
  weapon: "from-slate-400/15 via-transparent to-blue-400/10",
  spell: "from-purple-500/15 via-transparent to-indigo-500/10",
  trap: "from-emerald-500/15 via-transparent to-cyan-500/10",
};

const sizeClasses: Record<string, string> = {
  sm: "w-44 h-64",
  md: "w-56 h-80",
  lg: "w-72 h-[420px]",
};

// Tilt intensity per rarity
const tiltIntensity: Record<string, number> = {
  legendary: 20,
  rare: 14,
  common: 8,
};

// Holo opacity per rarity
const holoOpacity: Record<string, number> = {
  legendary: 0.35,
  rare: 0.2,
  common: 0.1,
};

// Ember count per rarity on hover
const emberCount: Record<string, number> = {
  legendary: 8,
  rare: 4,
  common: 0,
};

const visualTierClasses: Record<string, string> = {
  base: "",
  shimmer: "card-shimmer",
  premium: "card-premium",
  awakened: "card-awakened",
};

export default function GameCard({ card, onClick, selected, showSynergy, size = "md", cardProgress, equippedFrameImage, equippedCardBackImage }: GameCardProps) {
  const [flipped, setFlipped] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const rectRef = useRef<DOMRect | null>(null);
  const rafRef = useRef<number | null>(null);
  const pendingRef = useRef<{ x: number; y: number } | null>(null);

  const progress = cardProgress || { level: 1, xp: 0, prestigeLevel: 0, starProgress: { dupeCount: 0, goldStars: 0, redStars: 0 } };
  const visualTier = getVisualTier(progress.level);
  const passives = getPassiveAbilities(progress);
  const abilityName = getAbilityEvolutionName(card.specialAbility.name, progress.level);
  // Back-compat: some older records may have dupeCount but missing computed stars.
  const computedStars = (progress.starProgress.goldStars > 0 || progress.starProgress.redStars > 0)
    ? { goldStars: progress.starProgress.goldStars, redStars: progress.starProgress.redStars }
    : calculateStars(progress.starProgress.dupeCount || 0, card.rarity);

  const starBonuses = getStarStatBonuses(card.rarity, computedStars.goldStars, computedStars.redStars);

  const totalAttack = card.attack + (progress.level - 1) + (progress.prestigeLevel * 2) + starBonuses.attack;
  const totalDefense = card.defense + (progress.level - 1) + (progress.prestigeLevel * 2) + starBonuses.defense;

  const intensity = tiltIntensity[card.rarity] || 8;

  // Stable ember positions (memoized so they don't re-randomize on every render)
  const emberPositions = useMemo(() =>
    Array.from({ length: emberCount[card.rarity] || 0 }).map(() => ({
      w: 2 + Math.random() * 3,
      left: 10 + Math.random() * 80,
      delay: Math.random() * 2,
      duration: 2 + Math.random() * 2,
    })),
    [card.rarity]
  );

  const flushPointerUpdate = useCallback(() => {
    rafRef.current = null;
    const el = cardRef.current;
    const rect = rectRef.current;
    const pending = pendingRef.current;
    if (!el || !rect || !pending) return;
    pendingRef.current = null;

    const x = (pending.x - rect.left) / rect.width;
    const y = (pending.y - rect.top) / rect.height;
    const tiltX = (y - 0.5) * -intensity;
    const tiltY = (x - 0.5) * intensity;
    el.style.setProperty("--tilt-x", `${tiltX.toFixed(2)}deg`);
    el.style.setProperty("--tilt-y", `${tiltY.toFixed(2)}deg`);
    el.style.setProperty("--holo-x", `${Math.max(0, Math.min(100, x * 100)).toFixed(2)}%`);
    el.style.setProperty("--holo-y", `${Math.max(0, Math.min(100, y * 100)).toFixed(2)}%`);
  }, [intensity]);

  const schedulePointerUpdate = useCallback(() => {
    if (rafRef.current !== null) return;
    rafRef.current = requestAnimationFrame(flushPointerUpdate);
  }, [flushPointerUpdate]);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    pendingRef.current = { x: e.clientX, y: e.clientY };
    schedulePointerUpdate();
  }, [schedulePointerUpdate]);

  const handlePointerEnter = useCallback(() => {
    if (!cardRef.current) return;
    rectRef.current = cardRef.current.getBoundingClientRect();
    setIsHovered(true);
  }, []);

  const handlePointerLeave = useCallback(() => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    pendingRef.current = null;
    rectRef.current = null;
    if (cardRef.current) {
      cardRef.current.style.setProperty("--tilt-x", `0deg`);
      cardRef.current.style.setProperty("--tilt-y", `0deg`);
      cardRef.current.style.setProperty("--holo-x", `50%`);
      cardRef.current.style.setProperty("--holo-y", `50%`);
    }
    setIsHovered(false);
  }, []);

  const handleClick = () => {
    if (onClick) onClick();
    else setFlipped(!flipped);
  };

  return (
    <div
      ref={cardRef}
      className={cn(
        "cursor-pointer select-none",
        sizeClasses[size],
        selected && "ring-2 ring-primary scale-105"
      )}
      onPointerMove={handlePointerMove}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      onClick={handleClick}
      style={{
        perspective: "800px",
        // CSS vars for smooth tilt/holo without React rerenders
        ["--tilt-x" as any]: "0deg",
        ["--tilt-y" as any]: "0deg",
        ["--holo-x" as any]: "50%",
        ["--holo-y" as any]: "50%",
      }}
    >
      {/* 3D tilt wrapper */}
      <div
        className="w-full h-full transition-transform duration-150 ease-out will-change-transform"
        style={{
          transform: `rotateX(var(--tilt-x)) rotateY(var(--tilt-y))`,
          transformStyle: "preserve-3d",
        }}
      >
        {/* Flip inner */}
        <div
          className="w-full h-full"
          style={{
            transformStyle: "preserve-3d",
            transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
            transition: "transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        >
          {/* ===== FRONT ===== */}
          <div
            className={cn(
              "absolute inset-0 rounded-xl overflow-hidden flex flex-col",
              showSynergy && "ring-2 ring-synergy",
              visualTierClasses[visualTier]
            )}
            style={{ backfaceVisibility: "hidden" }}
          >
            {/* Equipped cosmetic frame overlay (subtle) */}
            {equippedFrameImage && (
              <div className="absolute inset-0 z-40 pointer-events-none">
                <img
                  src={equippedFrameImage}
                  alt=""
                  className="w-full h-full object-cover opacity-20 mix-blend-screen"
                  loading="lazy"
                />
              </div>
            )}
            {/* Rarity frame */}
            <div className={cn("absolute inset-0 z-30 pointer-events-none rounded-xl", rarityFrameClass[card.rarity])} />

            {/* Corner flourishes */}
            <div className={cn("absolute inset-0 z-30 pointer-events-none", rarityCornerClass[card.rarity])}>
              <div className="absolute top-2 left-2 w-5 h-5 card-corner-tl" />
              <div className="absolute top-2 right-2 w-5 h-5 card-corner-tr" />
              <div className="absolute bottom-2 left-2 w-5 h-5 card-corner-bl" />
              <div className="absolute bottom-2 right-2 w-5 h-5 card-corner-br" />
            </div>

            {/* Awakened overlay */}
            {visualTier === "awakened" && (
              <div className="absolute inset-0 z-20 pointer-events-none bg-gradient-to-t from-legendary/20 via-transparent to-legendary/10 animate-pulse" />
            )}

            {/* Card art area */}
            <div className="relative flex-1 overflow-hidden">
              <img src={card.image} alt={card.name} className="w-full h-full object-cover" loading="lazy" />

              {/* Elemental accent (#5) */}
              <div className={`absolute inset-0 bg-gradient-to-br ${typeAccentColors[card.type] || ""} pointer-events-none`} />

              {/* Light sweep (#3) */}
              <div
                className="absolute inset-0 pointer-events-none demo-light-sweep"
                style={{ opacity: isHovered ? 0.6 : 0.2 }}
              />

              {/* Ember particles (#3) — legendary/rare only */}
              {isHovered && emberPositions.map((em, i) => (
                <div
                  key={i}
                  className="absolute rounded-full demo-card-ember pointer-events-none"
                  style={{
                    width: `${em.w}px`,
                    height: `${em.w}px`,
                    left: `${em.left}%`,
                    bottom: `0%`,
                    animationDelay: `${em.delay}s`,
                    animationDuration: `${em.duration}s`,
                  }}
                />
              ))}

              {/* Holographic rainbow sheen (#1) */}
              <div
                className="absolute inset-0 pointer-events-none transition-opacity duration-300"
                style={{
                  opacity: isHovered ? (holoOpacity[card.rarity] || 0.1) : 0,
                  background: `radial-gradient(circle at var(--holo-x) var(--holo-y), 
                    hsl(0 80% 65% / 0.3),
                    hsl(60 80% 65% / 0.2) 25%,
                    hsl(120 80% 65% / 0.2) 40%,
                    hsl(180 80% 65% / 0.2) 55%,
                    hsl(240 80% 65% / 0.2) 70%,
                    hsl(300 80% 65% / 0.2) 85%,
                    transparent 100%)`,
                  mixBlendMode: "overlay",
                }}
              />

              {/* Rarity badge — hidden when flipped */}
              <div className="absolute top-2 left-2 z-20 transition-opacity duration-300" style={{ opacity: flipped ? 0 : 1 }}>
                <span className={cn("text-[10px] font-bold uppercase px-2 py-0.5 rounded-full shadow-sm", rarityBadge[card.rarity])}>
                  {rarityBadgeLabel[card.rarity]}
                </span>
              </div>

              {/* Type + Element badge — hidden when flipped */}
              <div className="absolute top-2 right-2 z-20 flex items-center gap-1 transition-opacity duration-300" style={{ opacity: flipped ? 0 : 1 }}>
                {card.element && card.element !== "neutral" && (
                  <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-full border", elementBgClass[card.element], elementCssClass[card.element])}>
                    {elementEmoji[card.element]}
                  </span>
                )}
                <span className="text-[10px] font-medium uppercase px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
                  {card.type}
                </span>
              </div>

              {/* Level + Stars */}
              <div className="absolute bottom-2 left-2 flex items-center gap-1 z-20 transition-opacity duration-300" style={{ opacity: flipped ? 0 : 1 }}>
                <div className="bg-primary text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5">
                  <ArrowUp className="w-2.5 h-2.5" />
                  LV {progress.level}
                </div>
                {progress.prestigeLevel > 0 && (
                  <div className="flex gap-0.5">
                    {Array.from({ length: progress.prestigeLevel }).map((_, i) => (
                      <Star key={i} className="w-3 h-3 text-legendary fill-legendary" />
                    ))}
                  </div>
                )}

                {(computedStars.goldStars > 0 || computedStars.redStars > 0) && (
                  <div className="flex items-center gap-0.5 ml-0.5 px-1 py-0.5 rounded bg-black/45 border border-white/10">
                    {Array.from({ length: computedStars.goldStars }).map((_, i) => (
                      <Star key={`g${i}`} className="w-3.5 h-3.5 text-yellow-300 fill-yellow-300 drop-shadow-sm" />
                    ))}
                    {Array.from({ length: computedStars.redStars }).map((_, i) => (
                      <Star key={`r${i}`} className="w-3.5 h-3.5 text-red-500 fill-red-500 drop-shadow-sm" />
                    ))}
                  </div>
                )}
              </div>

              {/* XP bar */}
              {progress.level < 20 && (
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-secondary/50 z-20" style={{ opacity: flipped ? 0 : 1 }}>
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${(progress.xp / xpForLevel(progress.level)) * 100}%` }}
                  />
                </div>
              )}

              {/* Dupe progress bar */}
              {progress.starProgress.dupeCount > 0 && (() => {
                const next = getDupesForNextStar(progress.starProgress.dupeCount, card.rarity);
                if (next.starType === "max") return null;
                return (
                  <div className="absolute bottom-1 left-0 right-0 h-0.5 bg-secondary/30 z-20" style={{ opacity: flipped ? 0 : 1 }}>
                    <div
                      className={cn("h-full transition-all", next.starType === "gold" ? "bg-yellow-400" : "bg-red-500")}
                      style={{ width: `${(next.current / next.needed) * 100}%` }}
                    />
                  </div>
                );
              })()}
            </div>

            {/* Stat area — collapses when flipped */}
            <div
              className="bg-card/95 backdrop-blur-sm border-t-2 border-primary/30 relative z-20 transition-all duration-300 ease-out overflow-hidden"
              style={{
                maxHeight: flipped ? "0px" : "200px",
                padding: flipped ? "0 8px" : isHovered ? "8px 8px 10px" : "8px",
                opacity: flipped ? 0 : 1,
              }}
            >
              <div className="absolute -top-[1px] left-3 right-3 h-[1px] bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
              <h3 className="font-heading text-xs font-bold truncate text-foreground mb-1">{card.name}</h3>

              {/* Stat gems (#4) */}
              <div className="flex items-center gap-1.5">
                <div className="flex items-center gap-1 bg-destructive/15 border border-destructive/30 rounded px-1.5 py-0.5 demo-stat-gem">
                  <Sword className="w-3 h-3 text-destructive" />
                  <span className="font-heading font-bold text-[10px] text-destructive">{totalAttack}</span>
                </div>
                <div className="flex items-center gap-1 bg-rare/15 border border-rare/30 rounded px-1.5 py-0.5 demo-stat-gem">
                  <Shield className="w-3 h-3 text-rare" />
                  <span className="font-heading font-bold text-[10px] text-rare">{totalDefense}</span>
                </div>
                {card.hp > 0 && (
                  <div className="flex items-center gap-1 bg-green-500/15 border border-green-500/30 rounded px-1.5 py-0.5 demo-stat-gem">
                    <Heart className="w-3 h-3 text-green-400" />
                    <span className="font-heading font-bold text-[10px] text-green-400">{card.hp}</span>
                  </div>
                )}
                <div className="ml-auto flex items-center gap-0.5 bg-primary/15 border border-primary/30 rounded px-1 py-0.5">
                  <Sparkles className="w-2.5 h-2.5 text-primary" />
                  <span className="font-heading font-bold text-[8px] text-primary truncate max-w-[60px]">{abilityName}</span>
                </div>
              </div>

              {/* Passive indicators */}
              {passives.length > 0 && (
                <div className="flex gap-1 flex-wrap mt-1">
                  {passives.map(p => (
                    <span key={p.name} className="text-[7px] px-1 py-0.5 rounded bg-synergy/20 text-synergy font-bold">
                      {p.name}
                    </span>
                  ))}
                </div>
              )}

              {/* Hover detail panel (#7) */}
              <div
                className="transition-all duration-300 ease-out overflow-hidden"
                style={{
                  maxHeight: isHovered && !flipped ? "60px" : "0px",
                  opacity: isHovered && !flipped ? 1 : 0,
                  marginTop: isHovered && !flipped ? "4px" : "0px",
                }}
              >
                <div className="rounded bg-secondary/60 p-1.5 border border-border/50">
                  <p className="text-[8px] text-muted-foreground leading-relaxed line-clamp-2">
                    {card.specialAbility.description}
                  </p>
                  {card.synergies.length > 0 && (
                    <span className="text-[7px] font-semibold text-synergy">
                      🔗 {card.synergies.length} synerg{card.synergies.length === 1 ? "y" : "ies"}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Rarity glow */}
            <div className={cn("absolute inset-0 rounded-xl pointer-events-none", rarityGlowClass[card.rarity])} />
          </div>

          {/* ===== BACK ===== */}
          <div
            className={cn(
              "absolute inset-0 rounded-xl overflow-hidden bg-card flex flex-col",
              rarityFrameClass[card.rarity]
            )}
            style={{
              backfaceVisibility: "hidden",
              transform: "rotateY(180deg)",
            }}
          >
            {equippedCardBackImage && (
              <div className="absolute inset-0 z-0 pointer-events-none">
                <img src={equippedCardBackImage} alt="" className="w-full h-full object-cover opacity-35" loading="lazy" />
              </div>
            )}
            <div className="p-2 flex flex-col h-full relative z-20 overflow-hidden">
              <h3 className="font-heading text-[10px] font-bold leading-tight text-foreground mb-1 truncate shrink-0">{card.name}</h3>

              <div className="flex-1 min-h-0 space-y-1 overflow-y-auto pr-1">
                <p className="text-[8px] text-muted-foreground leading-tight">{card.lore}</p>

                <div className="rounded-lg bg-secondary p-1">
                  <div className="flex items-center gap-1 mb-0.5">
                    <Zap className="w-2.5 h-2.5 text-legendary shrink-0" />
                    <span className="text-[8px] font-bold text-foreground truncate">{abilityName}</span>
                  </div>
                  <p className="text-[7px] text-muted-foreground leading-tight">{card.specialAbility.description}</p>
                </div>

                {card.synergies.length > 0 && (
                  <div className="space-y-0.5">
                    <span className="text-[7px] font-semibold uppercase tracking-wider text-synergy">Synergies</span>
                    {card.synergies.map((syn) => {
                      const partner = allGameCards.find((c) => c.id === syn.partnerId);
                      return (
                        <div key={syn.partnerId} className="synergy-highlight rounded p-0.5">
                          <div className="leading-tight">
                            <span className="text-[7px] font-bold text-synergy">{syn.name}</span>
                            <span className="text-[7px] text-muted-foreground"> — {partner?.name}</span>
                          </div>
                          <p className="text-[7px] text-synergy-glow leading-tight">{syn.description}</p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
