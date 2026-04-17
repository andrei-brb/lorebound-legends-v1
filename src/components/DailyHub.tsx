import { useEffect, useState } from "react";
import { Calendar, Clock, Trophy, Gift, Flame, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import type { PlayerState } from "@/lib/playerState";
import {
  DAILY_LOGIN_REWARDS,
  HOURLY_CHEST_GOLD,
  HOURLY_CHEST_STARDUST,
  FIRST_WIN_GOLD,
  FIRST_WIN_BP_XP,
  canClaimDailyLogin,
  claimDailyLogin,
  canClaimChest,
  chestTimeRemaining,
  claimHourlyChest,
  isFirstWinAvailable,
  openMysteryBox,
  formatDuration,
} from "@/lib/dailyEngine";
import { playCollect, playFanfare } from "@/lib/sfx";

interface DailyHubProps {
  playerState: PlayerState;
  onStateChange: (state: PlayerState) => void;
  isOnline?: boolean;
  syncEconomyApi?: (gold: number, stardust: number) => Promise<void>;
}

export default function DailyHub({ playerState, onStateChange, isOnline, syncEconomyApi }: DailyHubProps) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const daily = playerState.dailyLogin ?? { streak: 0, lastClaimDate: null, claimedDays: [] };
  const claimedToday = !canClaimDailyLogin(daily);
  const nextDay = (daily.claimedDays.at(-1) ?? 0) + 1 > 7 && claimedToday ? 7 : (daily.claimedDays.at(-1) ?? 0) + (claimedToday ? 0 : 1);

  const chestRemaining = chestTimeRemaining(playerState);
  const chestReady = canClaimChest(playerState);
  const firstWinAvail = isFirstWinAvailable(playerState);
  const boxesPending = playerState.mysteryBoxesPending ?? 0;

  void now;

  const pushState = (next: PlayerState) => {
    onStateChange(next);
    if (isOnline && syncEconomyApi) {
      void syncEconomyApi(next.gold, next.stardust);
    }
  };

  const handleClaimDaily = () => {
    const result = claimDailyLogin(playerState);
    if (!result) return;
    pushState(result.state);
    playFanfare();
    toast({
      title: `Day ${result.day} claimed! 🎁`,
      description: `+${result.gold > 0 ? `${result.gold} gold ` : ""}${result.stardust > 0 ? `+${result.stardust} stardust` : ""} — Streak ${result.newStreak} 🔥`,
    });
  };

  const handleClaimChest = () => {
    const result = claimHourlyChest(playerState);
    if (!result) return;
    pushState(result.state);
    playCollect();
    toast({ title: "Hourly chest opened!", description: `+${result.gold} gold, +${result.stardust} stardust` });
  };

  const handleOpenBox = () => {
    const result = openMysteryBox(playerState);
    if (!result) return;
    pushState(result.state);
    playFanfare();
    toast({ title: "🎁 Mystery box!", description: `+${result.gold} gold${result.stardust > 0 ? `, +${result.stardust} stardust` : ""}` });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading text-2xl font-bold text-foreground flex items-center gap-2">
          <Calendar className="w-6 h-6 text-primary" /> Daily Hub
        </h2>
        <p className="text-sm text-muted-foreground mt-1">Log in, win, and open boxes for daily rewards.</p>
      </div>

      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-heading font-bold text-foreground flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" /> Daily Login
          </h3>
          <span className="text-xs inline-flex items-center gap-1 text-[hsl(var(--legendary))]">
            <Flame className="w-3.5 h-3.5" /> {daily.streak}-day streak
          </span>
        </div>
        <div className="grid grid-cols-7 gap-2">
          {DAILY_LOGIN_REWARDS.map((r) => {
            const isClaimed = daily.claimedDays.includes(r.day);
            const isToday = !claimedToday && r.day === nextDay;
            return (
              <div
                key={r.day}
                className={cn(
                  "rounded-lg border p-2 text-center text-xs flex flex-col items-center justify-center gap-1 min-h-[78px]",
                  isClaimed
                    ? "border-primary/40 bg-primary/10 text-foreground"
                    : isToday
                    ? "border-[hsl(var(--legendary))] bg-[hsl(var(--legendary))]/10 ring-2 ring-[hsl(var(--legendary))]/40 text-foreground"
                    : "border-border bg-secondary/30 text-muted-foreground",
                )}
              >
                <div className="font-heading text-[10px] uppercase">Day {r.day}</div>
                <div className="text-[18px]">{r.stardust > 0 && r.gold === 0 ? "💎" : r.day === 7 ? "🎁" : "🪙"}</div>
                <div className="text-[10px] leading-tight">{r.label}</div>
              </div>
            );
          })}
        </div>
        <div className="mt-4 flex justify-end">
          <Button onClick={handleClaimDaily} disabled={claimedToday}>
            {claimedToday ? "Claimed today — come back tomorrow" : `Claim Day ${nextDay}`}
          </Button>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-5">
          <h3 className="font-heading font-bold text-foreground flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-primary" /> Hourly Chest
          </h3>
          <p className="text-xs text-muted-foreground mb-4">Returns every hour with a small bag of gold and stardust.</p>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-3xl">🎁</div>
              <div>
                <div className="text-sm font-medium text-foreground">+{HOURLY_CHEST_GOLD} gold, +{HOURLY_CHEST_STARDUST} stardust</div>
                <div className="text-xs text-muted-foreground">
                  {chestReady ? "Ready to claim!" : `Ready in ${formatDuration(chestRemaining)}`}
                </div>
              </div>
            </div>
            <Button onClick={handleClaimChest} disabled={!chestReady} size="sm">
              {chestReady ? "Open" : "Locked"}
            </Button>
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="font-heading font-bold text-foreground flex items-center gap-2 mb-2">
            <Trophy className="w-4 h-4 text-[hsl(var(--legendary))]" /> First Win Bonus
          </h3>
          <p className="text-xs text-muted-foreground mb-4">Win your first battle of the day for a bonus reward.</p>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-3xl">🏆</div>
              <div>
                <div className="text-sm font-medium text-foreground">+{FIRST_WIN_GOLD} gold + {FIRST_WIN_BP_XP} BP XP</div>
                <div className="text-xs text-muted-foreground">
                  {firstWinAvail ? "Win a battle to claim!" : "Already claimed today"}
                </div>
              </div>
            </div>
            <span className={cn(
              "px-2.5 py-1 rounded-md text-xs font-medium",
              firstWinAvail ? "bg-[hsl(var(--legendary))]/20 text-[hsl(var(--legendary))]" : "bg-secondary text-muted-foreground",
            )}>
              {firstWinAvail ? "Active" : "Done"}
            </span>
          </div>
        </Card>
      </div>

      <Card className="p-5">
        <h3 className="font-heading font-bold text-foreground flex items-center gap-2 mb-2">
          <Gift className="w-4 h-4 text-primary" /> Mystery Boxes
        </h3>
        <p className="text-xs text-muted-foreground mb-4">5% chance to drop after each battle. Open for random gold + stardust.</p>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-3xl">{boxesPending > 0 ? "📦" : "🫥"}</div>
            <div>
              <div className="text-sm font-medium text-foreground">{boxesPending} pending</div>
              <div className="text-xs text-muted-foreground">Random reward 50-300 gold, 0-60 stardust</div>
            </div>
          </div>
          <Button onClick={handleOpenBox} disabled={boxesPending <= 0} size="sm">
            <Sparkles className="w-3.5 h-3.5" /> Open
          </Button>
        </div>
      </Card>
    </div>
  );
}
