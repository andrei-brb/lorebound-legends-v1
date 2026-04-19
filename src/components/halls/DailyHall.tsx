import { Gift, Calendar, Coins, Sparkles, CheckCircle2, Lock } from "lucide-react";
import type { PlayerState } from "@/lib/playerState";
import HallLayout, { HallSection, HallStat } from "@/components/scene/HallLayout";
import GlassPanel from "@/components/scene/GlassPanel";
import { texTreasure, texParchment, texVelvet, texGilded, texCosmic } from "@/components/scene/panelTextures";
import { cn } from "@/lib/utils";

interface Props { playerState: PlayerState; onStateChange: (s: PlayerState) => void }

const REWARDS = [
  { day: 1, type: "gold", amount: 50 },
  { day: 2, type: "gold", amount: 100 },
  { day: 3, type: "stardust", amount: 10 },
  { day: 4, type: "gold", amount: 200 },
  { day: 5, type: "stardust", amount: 25 },
  { day: 6, type: "gold", amount: 500 },
  { day: 7, type: "pack", amount: 1 },
];

export default function DailyHall({ playerState }: Props) {
  const streak = playerState.dailyLogin?.streak ?? 0;
  const claimedDays = playerState.dailyLogin?.claimedDays ?? [];
  const today = new Date().toISOString().slice(0, 10);
  const claimedToday = playerState.dailyLogin?.lastClaimDate === today;

  return (
    <HallLayout
      sidebar={
        <>
          <HallSection title="Daily Hub" hue="var(--legendary)" glow={0.55} bg={texTreasure}>
            <div className="flex items-center gap-2 mb-3">
              <Gift className="w-4 h-4 text-[hsl(var(--legendary))]" />
              <span className="text-xs text-foreground/85 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">Login rewards & boons</span>
            </div>
            <HallStat label="Current streak" value={`${streak}d`} hue="var(--legendary)" />
            <HallStat label="Claimed this cycle" value={`${claimedDays.length}/7`} />
            <HallStat label="Claimed today" value={claimedToday ? "yes" : "no"} hue={claimedToday ? "var(--synergy)" : "var(--rare)"} />
          </HallSection>

          <HallSection title="Tip" hue="var(--legendary)" glow={0.25} bg={texParchment}>
            <p className="text-xs text-foreground/85 leading-relaxed drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
              Login each day to keep your streak — day 7 always rewards a pack.
            </p>
          </HallSection>
        </>
      }
      header={
        <GlassPanel hue="var(--legendary)" glow={0.4} padding="md" bg={texVelvet}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-foreground/80 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">Weekly Cycle</p>
              <h1 className="font-heading text-lg text-foreground drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">Day {Math.min(7, claimedDays.length + (claimedToday ? 0 : 1))}</h1>
            </div>
            <button
              disabled={claimedToday}
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-[hsl(var(--rare))] to-[hsl(var(--legendary))] text-background font-heading text-xs uppercase tracking-wider disabled:opacity-30 disabled:cursor-not-allowed shadow-lg"
            >
              {claimedToday ? "Claimed" : "Claim Today"}
            </button>
          </div>
        </GlassPanel>
      }
    >
      <GlassPanel hue="var(--legendary)" glow={0.35} padding="md" bg={texGilded} bgTint={0.7}>
        <h3 className="font-heading text-xs uppercase tracking-wider text-foreground drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] mb-4">Reward Path</h3>
        <div className="grid grid-cols-7 gap-2">
          {REWARDS.map((r) => {
            const claimed = claimedDays.includes(r.day);
            const today = !claimedToday && claimedDays.length + 1 === r.day;
            return (
              <div key={r.day} className="flex flex-col items-center gap-1.5">
                <div className={cn(
                  "relative w-full aspect-square rounded-xl flex flex-col items-center justify-center transition-all",
                  claimed
                    ? "bg-[hsl(var(--legendary)/0.2)] ring-1 ring-[hsl(var(--legendary)/0.5)]"
                    : today
                      ? "bg-[hsl(var(--rare)/0.2)] ring-1 ring-[hsl(var(--rare)/0.5)] animate-pulse"
                      : "bg-foreground/5 ring-1 ring-border/30 opacity-60"
                )}>
                  <span className="text-[10px] uppercase text-muted-foreground">Day</span>
                  <span className={cn("font-heading text-base", claimed ? "text-[hsl(var(--legendary))]" : "text-foreground/80")}>{r.day}</span>
                  {claimed && <CheckCircle2 className="absolute -top-1.5 -right-1.5 w-4 h-4 text-[hsl(var(--legendary))] bg-background rounded-full" />}
                  {!claimed && !today && <Lock className="absolute -top-1.5 -right-1.5 w-4 h-4 text-muted-foreground bg-background rounded-full p-0.5" />}
                </div>
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  {r.type === "gold" && <Coins className="w-2.5 h-2.5" />}
                  {r.type === "stardust" && <Sparkles className="w-2.5 h-2.5" />}
                  {r.type === "pack" && <Gift className="w-2.5 h-2.5" />}
                  <span>{r.amount}</span>
                </div>
              </div>
            );
          })}
        </div>
      </GlassPanel>

      <GlassPanel hue="var(--primary)" glow={0.3} padding="md" bg={texCosmic} bgTint={0.7}>
        <h3 className="font-heading text-xs uppercase tracking-wider text-foreground drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] mb-3">Mystery Boxes</h3>
        <div className="flex items-center justify-between">
          <p className="text-sm text-foreground/85 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">{playerState.mysteryBoxesPending ?? 0} pending</p>
          <button
            disabled={(playerState.mysteryBoxesPending ?? 0) === 0}
            className="px-3 py-1.5 rounded-lg bg-primary/15 hover:bg-primary/25 text-primary text-xs uppercase tracking-wider disabled:opacity-30"
          >
            Open
          </button>
        </div>
      </GlassPanel>
    </HallLayout>
  );
}
