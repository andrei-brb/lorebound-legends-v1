import { Sword, Shield, Crown, Hourglass } from "lucide-react";
import { cn } from "@/lib/utils";

interface PlayerBarProps {
  name: string;
  lp: number;
  maxLp: number;
  avatar?: string;
  side: "top" | "bottom";
  isActiveTurn?: boolean;
}

export function PlayerBar({ name, lp, maxLp, avatar, side, isActiveTurn }: PlayerBarProps) {
  const pct = Math.max(0, Math.min(100, (lp / maxLp) * 100));
  const lpGradient =
    pct > 50
      ? "from-[hsl(46_95%_72%)] to-[hsl(42_78%_52%)]"
      : pct > 25
        ? "from-[hsl(36_85%_62%)] to-[hsl(20_85%_50%)]"
        : "from-[hsl(0_75%_55%)] to-[hsl(340_70%_45%)]";

  void side;

  return (
    <div className="pointer-events-auto altar-panel rounded-md px-2 py-1.5 flex items-center gap-2 w-[210px]">
      <div
        className={cn(
          "relative h-9 w-9 shrink-0 transition-all duration-500",
          isActiveTurn && "drop-shadow-[0_0_8px_hsl(46_95%_72%/0.85)]"
        )}
        style={{
          clipPath: "polygon(25% 5%, 75% 5%, 100% 50%, 75% 95%, 25% 95%, 0% 50%)",
        }}
      >
        <div
          className={cn(
            "absolute inset-0",
            isActiveTurn
              ? "bg-gradient-to-br from-[hsl(46_95%_72%)] to-[hsl(36_65%_38%)]"
              : "bg-[hsl(250_20%_28%)]"
          )}
        />
        <div
          className="absolute inset-[1.5px] overflow-hidden bg-[hsl(250_40%_8%)]"
          style={{
            clipPath: "polygon(25% 5%, 75% 5%, 100% 50%, 75% 95%, 25% 95%, 0% 50%)",
          }}
        >
          {avatar ? (
            <img src={avatar} alt={name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center font-heading text-sm font-bold text-[hsl(46_95%_72%)]">
              {name[0]}
            </div>
          )}
        </div>
        {isActiveTurn && (
          <Crown className="absolute -top-2.5 left-1/2 h-3 w-3 -translate-x-1/2 text-[hsl(46_95%_72%)] drop-shadow-[0_0_4px_hsl(46_95%_72%/0.9)]" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-1">
          <span className="truncate font-heading text-[10px] font-semibold tracking-[0.1em] altar-text-gold">
            {name.toUpperCase()}
          </span>
          <span
            className="font-heading text-sm font-bold leading-none tabular-nums text-[hsl(46_95%_82%)]"
            style={{ textShadow: "0 0 6px hsl(46 95% 72% / 0.55)" }}
          >
            {lp.toLocaleString()}
          </span>
        </div>

        <div className="mt-1 relative h-1 w-full overflow-hidden rounded-full bg-[hsl(250_40%_4%/0.85)] ring-1 ring-[hsl(46_60%_50%/0.35)]">
          <div
            className={cn("h-full bg-gradient-to-r transition-all duration-700", lpGradient)}
            style={{
              width: `${pct}%`,
              boxShadow: "0 0 6px hsl(46 95% 72% / 0.5)",
            }}
          />
        </div>
      </div>
    </div>
  );
}

interface ZoneStackProps {
  label: string;
  count: number;
  icon?: "sword" | "shield";
}

export function ZoneStack({ label, count, icon }: ZoneStackProps) {
  const Icon = icon === "sword" ? Sword : Shield;
  return (
    <div className="pointer-events-auto altar-panel flex flex-col items-center gap-0.5 rounded-md px-3 py-2 min-w-[58px]">
      <Icon className="h-3.5 w-3.5 text-[hsl(46_85%_68%)]" />
      <div className="font-heading text-base font-bold leading-none altar-text-gold">{count}</div>
      <div className="text-[9px] uppercase tracking-[0.2em] text-[hsl(46_30%_55%/0.7)]">
        {label}
      </div>
    </div>
  );
}

interface PhaseIndicatorProps {
  turn: number;
  phase: string;
  onEndTurn: () => void;
  canEndTurn?: boolean;
  endTurnLabel?: string;
}

const PHASES = ["Main", "Battle", "End"] as const;

export function PhaseIndicator({
  turn,
  phase,
  onEndTurn,
  canEndTurn = true,
  endTurnLabel,
}: PhaseIndicatorProps) {
  return (
    <div className="pointer-events-auto flex flex-col items-end gap-2">
      <div className="altar-panel rounded-md px-3 py-2 flex items-center gap-3">
        <div className="flex flex-col items-start">
          <div className="flex items-center gap-1 text-[9px] uppercase tracking-[0.3em] text-[hsl(46_60%_60%/0.75)]">
            <Hourglass className="h-3 w-3" />
            Turn
          </div>
          <div className="font-heading text-lg font-bold leading-none altar-text-gold">
            {String(turn).padStart(2, "0")}
          </div>
        </div>

        <div className="h-8 w-px bg-gradient-to-b from-transparent via-[hsl(46_60%_50%/0.55)] to-transparent" />

        <div className="flex items-center gap-1">
          {PHASES.map((p) => {
            const active = p === phase;
            return (
              <div
                key={p}
                className={cn(
                  "rounded-sm px-2 py-1 text-[10px] font-heading font-semibold uppercase tracking-[0.18em] transition-all",
                  active
                    ? "bg-gradient-to-b from-[hsl(46_95%_72%)] to-[hsl(36_65%_38%)] text-[hsl(250_40%_8%)] shadow-[0_0_10px_hsl(46_95%_72%/0.55)]"
                    : "text-[hsl(46_40%_55%/0.55)]"
                )}
              >
                {p}
              </div>
            );
          })}
        </div>
      </div>

      <button
        onClick={onEndTurn}
        disabled={!canEndTurn}
        className={cn(
          "group relative overflow-hidden rounded-md px-5 py-2 font-heading text-xs font-bold uppercase tracking-[0.28em] transition-all duration-200",
          canEndTurn ? "text-[hsl(250_40%_8%)] hover:scale-[1.03] active:scale-[0.98]" : "cursor-not-allowed text-[hsl(46_20%_50%/0.6)]"
        )}
        style={
          canEndTurn
            ? {
                background: "var(--gradient-gold)",
                boxShadow:
                  "0 0 18px hsl(46 95% 72% / 0.55), inset 0 1px 0 hsl(46 100% 90% / 0.6), inset 0 -1px 0 hsl(36 65% 28% / 0.6)",
              }
            : {
                background: "hsl(250 25% 14%)",
                boxShadow: "inset 0 0 0 1px hsl(46 30% 35% / 0.35)",
              }
        }
      >
        <span className="relative z-10">{endTurnLabel ?? "Next Phase"}</span>
        {canEndTurn && (
          <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
        )}
      </button>
    </div>
  );
}

