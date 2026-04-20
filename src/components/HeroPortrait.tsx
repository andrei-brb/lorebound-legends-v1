import { Shield, Skull, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface HeroPortraitProps {
  side: "player" | "enemy";
  hp: number;
  maxHp: number;
  shield: number;
  ap: number;
  maxAp: number;
  deckCount: number;
  handCount: number;
  isActiveTurn: boolean;
}

export default function HeroPortrait({
  side,
  hp,
  maxHp,
  shield,
  ap,
  maxAp,
  deckCount,
  handCount,
  isActiveTurn,
}: HeroPortraitProps) {
  const hpPercent = Math.max(0, Math.min(100, (hp / maxHp) * 100));
  const radius = 30;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (hpPercent / 100) * circumference;
  const hpColor = hpPercent > 50 ? "stroke-green-500" : hpPercent > 25 ? "stroke-yellow-500" : "stroke-destructive";

  return (
    <div className={cn("flex items-center gap-3", side === "enemy" ? "flex-row-reverse" : "flex-row")}>
      {/* Portrait circle with HP ring */}
      <div className="relative flex-shrink-0">
        <svg width="72" height="72" viewBox="0 0 72 72" className="transform -rotate-90">
          {/* Background ring */}
          <circle cx="36" cy="36" r={radius} fill="none" stroke="hsl(var(--border))" strokeWidth="4" />
          {/* HP ring */}
          <circle
            cx="36" cy="36" r={radius}
            fill="none"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className={cn(hpColor, "transition-all duration-500")}
          />
        </svg>
        {/* Portrait icon */}
        <div className={cn(
          "absolute inset-0 flex items-center justify-center rounded-full m-2",
          side === "player"
            ? "bg-primary/20 border border-primary/40"
            : "bg-destructive/20 border border-destructive/40",
        )}>
          {side === "player"
            ? <Sparkles className="w-5 h-5 text-primary" />
            : <Skull className="w-5 h-5 text-destructive" />
          }
        </div>
        {/* Active turn indicator */}
        {isActiveTurn && (
          <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-primary animate-pulse" />
        )}
      </div>

      {/* Stats */}
      <div className={cn("flex flex-col gap-1", side === "enemy" ? "items-end" : "items-start")}>
        <span className={cn(
          "font-heading text-xs font-bold uppercase",
          side === "player" ? "text-primary" : "text-destructive"
        )}>
          {side === "player" ? "You" : "Enemy"}
        </span>
        <div className="flex items-center gap-1.5">
          <span className={cn("text-sm font-bold", hpPercent > 50 ? "text-green-400" : hpPercent > 25 ? "text-yellow-400" : "text-destructive")}>
            {hp}/{maxHp}
          </span>
          {shield > 0 && (
            <span className="flex items-center gap-0.5 text-xs text-blue-400">
              <Shield className="w-3 h-3" />{shield}
            </span>
          )}
        </div>
        {/* AP crystals */}
        <div className="flex gap-0.5">
          {Array.from({ length: maxAp }).map((_, i) => (
            <div
              key={i}
              className={cn(
                "w-2.5 h-2.5 rounded-full border",
                i < ap
                  ? "bg-primary border-primary/60 shadow-[0_0_4px_hsl(var(--primary)/0.5)]"
                  : "bg-muted border-border",
              )}
            />
          ))}
        </div>
        <span className="text-[9px] font-heading font-bold tabular-nums text-foreground/90 drop-shadow-[0_1px_2px_rgba(0,0,0,0.75)]">
          AP {ap}/{maxAp}
        </span>
        <span className="text-[9px] text-muted-foreground">
          Deck: {deckCount} {side === "enemy" ? `· Hand: ${handCount}` : ""}
        </span>
      </div>
    </div>
  );
}
