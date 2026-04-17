import { Shield, Lock, CheckCircle2, Crown, Coins, Sparkles } from "lucide-react";
import type { PlayerState } from "@/lib/playerState";
import HallLayout, { HallSection, HallStat } from "@/components/scene/HallLayout";
import GlassPanel from "@/components/scene/GlassPanel";
import { cn } from "@/lib/utils";

interface Props { playerState: PlayerState; onStateChange: (s: PlayerState) => void }

const TOTAL_LEVELS = 30;

export default function PassHall({ playerState }: Props) {
  const bp = playerState.battlePass;
  const season = bp?.seasons?.[bp.activeSeasonId];
  const currentXp = season?.xp ?? 0;
  const xpPerLevel = 200;
  const currentLevel = Math.min(TOTAL_LEVELS, Math.floor(currentXp / xpPerLevel));
  const xpInLevel = currentXp - currentLevel * xpPerLevel;
  const hasElite = season?.hasElite ?? false;

  return (
    <HallLayout
      sidebarWidth="md"
      sidebar={
        <>
          <HallSection title="Battle Pass" hue="var(--legendary)" glow={0.6}>
            <div className="flex items-center gap-2 mb-3">
              <Shield className="w-4 h-4 text-[hsl(var(--legendary))]" />
              <span className="text-xs text-muted-foreground">Season 1</span>
            </div>
            <HallStat label="Level" value={`${currentLevel}/${TOTAL_LEVELS}`} hue="var(--legendary)" />
            <HallStat label="XP" value={`${xpInLevel}/${xpPerLevel}`} />
            <HallStat label="Tier" value={hasElite ? "Elite" : "Free"} hue={hasElite ? "var(--legendary)" : "var(--primary)"} />
            <div className="mt-3">
              <div className="h-2 rounded-full bg-foreground/10 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--legendary))] transition-all" style={{ width: `${(xpInLevel / xpPerLevel) * 100}%` }} />
              </div>
            </div>
          </HallSection>

          {!hasElite && (
            <HallSection title="Upgrade" hue="var(--legendary)" glow={0.5}>
              <p className="text-xs text-muted-foreground mb-3">Unlock Elite to claim premium rewards on every level.</p>
              <button className="w-full py-2 rounded-lg bg-gradient-to-r from-[hsl(var(--legendary))] to-[hsl(var(--rare))] text-background font-heading text-xs uppercase tracking-wider">
                <Crown className="w-3.5 h-3.5 inline mr-1.5" />
                Go Elite
              </button>
            </HallSection>
          )}
        </>
      }
    >
      <GlassPanel hue="var(--legendary)" glow={0.4} padding="md">
        <h3 className="font-heading text-xs uppercase tracking-wider text-foreground/90 mb-4">Reward Track</h3>
        <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-6 gap-3">
          {Array.from({ length: TOTAL_LEVELS }).map((_, i) => {
            const lvl = i + 1;
            const reached = currentLevel >= lvl;
            const isMilestone = lvl % 5 === 0;
            const reward = isMilestone ? "Pack" : lvl % 2 === 0 ? "Stardust" : "Gold";
            const amount = isMilestone ? 1 : lvl % 2 === 0 ? 25 : 100;
            return (
              <div key={lvl} className="flex flex-col items-center gap-1.5">
                <div className={cn(
                  "relative w-full aspect-square rounded-xl flex flex-col items-center justify-center text-center transition-all",
                  reached
                    ? "bg-[hsl(var(--legendary)/0.15)] ring-1 ring-[hsl(var(--legendary)/0.5)]"
                    : "bg-foreground/5 ring-1 ring-border/30 opacity-70"
                )}>
                  <span className="text-[10px] uppercase text-muted-foreground">Lvl</span>
                  <span className={cn("font-heading text-base", reached ? "text-[hsl(var(--legendary))]" : "text-foreground/50")}>{lvl}</span>
                  {reached ? (
                    <CheckCircle2 className="absolute -top-1.5 -right-1.5 w-4 h-4 text-[hsl(var(--legendary))] bg-background rounded-full" />
                  ) : (
                    <Lock className="absolute -top-1.5 -right-1.5 w-4 h-4 text-muted-foreground bg-background rounded-full p-0.5" />
                  )}
                </div>
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  {reward === "Gold" && <Coins className="w-2.5 h-2.5" />}
                  {reward === "Stardust" && <Sparkles className="w-2.5 h-2.5" />}
                  {reward === "Pack" && <Shield className="w-2.5 h-2.5" />}
                  <span>{amount} {reward}</span>
                </div>
              </div>
            );
          })}
        </div>
      </GlassPanel>
    </HallLayout>
  );
}
