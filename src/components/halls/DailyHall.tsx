import { Gift, Calendar, Coins, Sparkles, CheckCircle2, Lock, Star } from "lucide-react";
import type { PlayerState, FactionPath } from "@/lib/playerState";
import { addCardToCollection } from "@/lib/playerState";
import { allCards } from "@/data/cards";
import HallLayout, { HallSection, HallStat } from "@/components/scene/HallLayout";
import GlassPanel from "@/components/scene/GlassPanel";
import { texTreasure, texParchment, texVelvet, texGilded, texCosmic } from "@/components/scene/panelTextures";
import { cn } from "@/lib/utils";

interface Props { playerState: PlayerState; onStateChange: (s: PlayerState) => void }

type RewardType = "gold" | "stardust" | "pack" | "card";

interface DayReward {
  day: number;
  type: RewardType;
  amount?: number;
  cardId?: string;
  label: string;
}

const FACTION_REWARDS: Record<FactionPath, DayReward[]> = {
  fire: [
    { day: 1, type: "card", cardId: "terragon",      label: "Terragon" },
    { day: 2, type: "card", cardId: "ferros",         label: "Ferros" },
    { day: 3, type: "card", cardId: "hephara",        label: "Hephara (Rare)" },
    { day: 4, type: "card", cardId: "aethon",         label: "Aethon" },
    { day: 5, type: "card", cardId: "inferna",        label: "Inferna (Rare)" },
    { day: 6, type: "gold", amount: 500,              label: "500 Gold" },
    { day: 7, type: "pack", amount: 1,                label: "Bronze Pack" },
  ],
  nature: [
    { day: 1, type: "card", cardId: "vitalis",        label: "Vitalis" },
    { day: 2, type: "card", cardId: "healer",         label: "Healer" },
    { day: 3, type: "card", cardId: "zephyros",       label: "Zephyros (Rare)" },
    { day: 4, type: "card", cardId: "eirene",         label: "Eirene" },
    { day: 5, type: "card", cardId: "verdantia",      label: "Verdantia (Rare)" },
    { day: 6, type: "gold", amount: 500,              label: "500 Gold" },
    { day: 7, type: "pack", amount: 1,                label: "Bronze Pack" },
  ],
  shadow: [
    { day: 1, type: "card", cardId: "nekros",         label: "Nekros" },
    { day: 2, type: "card", cardId: "obscura",        label: "Obscura" },
    { day: 3, type: "card", cardId: "glacius",        label: "Glacius (Rare)" },
    { day: 4, type: "card", cardId: "luminara",       label: "Luminara" },
    { day: 5, type: "card", cardId: "umbra",          label: "Umbra (Rare)" },
    { day: 6, type: "gold", amount: 500,              label: "500 Gold" },
    { day: 7, type: "pack", amount: 1,                label: "Bronze Pack" },
  ],
};

const DEFAULT_REWARDS: DayReward[] = [
  { day: 1, type: "gold",     amount: 50,  label: "50 Gold" },
  { day: 2, type: "gold",     amount: 100, label: "100 Gold" },
  { day: 3, type: "stardust", amount: 10,  label: "10 Stardust" },
  { day: 4, type: "gold",     amount: 200, label: "200 Gold" },
  { day: 5, type: "stardust", amount: 25,  label: "25 Stardust" },
  { day: 6, type: "gold",     amount: 500, label: "500 Gold" },
  { day: 7, type: "pack",     amount: 1,   label: "Bronze Pack" },
];

function getRewards(path: FactionPath | null): DayReward[] {
  if (!path) return DEFAULT_REWARDS;
  return FACTION_REWARDS[path] ?? DEFAULT_REWARDS;
}

export default function DailyHall({ playerState, onStateChange }: Props) {
  const streak = playerState.dailyLogin?.streak ?? 0;
  const claimedDays = playerState.dailyLogin?.claimedDays ?? [];
  const today = new Date().toISOString().slice(0, 10);
  const claimedToday = playerState.dailyLogin?.lastClaimDate === today;
  const nextDay = claimedDays.length + 1;

  const rewards = getRewards(playerState.selectedPath ?? null);

  const handleClaim = () => {
    if (claimedToday || nextDay > 7) return;
    const reward = rewards[nextDay - 1];
    if (!reward) return;

    let updated: PlayerState = {
      ...playerState,
      dailyLogin: {
        streak: (playerState.dailyLogin?.streak ?? 0) + 1,
        lastClaimDate: today,
        claimedDays: [...claimedDays, nextDay],
      },
    };

    if (reward.type === "gold" && reward.amount) {
      updated = { ...updated, gold: (updated.gold ?? 0) + reward.amount };
    } else if (reward.type === "stardust" && reward.amount) {
      updated = { ...updated, stardust: (updated.stardust ?? 0) + reward.amount };
    } else if (reward.type === "card" && reward.cardId) {
      const result = addCardToCollection(updated, reward.cardId);
      updated = result.state;
    }
    // pack type: handled by PackShop flow; here we just mark claimed and show notification
    onStateChange(updated);
  };

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
            {playerState.selectedPath && (
              <HallStat label="Path" value={playerState.selectedPath} hue="var(--rare)" />
            )}
          </HallSection>

          <HallSection title="Tip" hue="var(--legendary)" glow={0.25} bg={texParchment}>
            <p className="text-xs text-foreground/85 leading-relaxed drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
              {playerState.selectedPath
                ? `Your ${playerState.selectedPath} path rewards include faction cards on days 1–5.`
                : "Login each day to keep your streak — day 7 always rewards a pack."}
            </p>
          </HallSection>
        </>
      }
      header={
        <GlassPanel hue="var(--legendary)" glow={0.4} padding="md" bg={texVelvet}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-foreground/80 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">Weekly Cycle</p>
              <h1 className="font-heading text-lg text-foreground drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">Day {Math.min(7, nextDay)}</h1>
            </div>
            <button
              disabled={claimedToday || nextDay > 7}
              onClick={handleClaim}
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
          {rewards.map((r) => {
            const claimed = claimedDays.includes(r.day);
            const isToday = !claimedToday && nextDay === r.day;
            const cardInfo = r.type === "card" && r.cardId ? allCards.find(c => c.id === r.cardId) : null;
            return (
              <div key={r.day} className="flex flex-col items-center gap-1.5">
                <div className={cn(
                  "relative w-full aspect-square rounded-xl flex flex-col items-center justify-center transition-all",
                  claimed
                    ? "bg-[hsl(var(--legendary)/0.2)] ring-1 ring-[hsl(var(--legendary)/0.5)]"
                    : isToday
                      ? "bg-[hsl(var(--rare)/0.2)] ring-1 ring-[hsl(var(--rare)/0.5)] animate-pulse"
                      : "bg-foreground/5 ring-1 ring-border/30 opacity-60"
                )}>
                  {cardInfo?.image ? (
                    <img src={cardInfo.image} alt={cardInfo.name} className="w-full h-full object-cover rounded-xl opacity-70" />
                  ) : null}
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-[10px] uppercase text-muted-foreground">Day</span>
                    <span className={cn("font-heading text-base", claimed ? "text-[hsl(var(--legendary))]" : "text-foreground/80")}>{r.day}</span>
                  </div>
                  {claimed && <CheckCircle2 className="absolute -top-1.5 -right-1.5 w-4 h-4 text-[hsl(var(--legendary))] bg-background rounded-full" />}
                  {!claimed && !isToday && <Lock className="absolute -top-1.5 -right-1.5 w-4 h-4 text-muted-foreground bg-background rounded-full p-0.5" />}
                </div>
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground text-center leading-tight">
                  {r.type === "gold" && <Coins className="w-2.5 h-2.5 shrink-0" />}
                  {r.type === "stardust" && <Sparkles className="w-2.5 h-2.5 shrink-0" />}
                  {r.type === "pack" && <Gift className="w-2.5 h-2.5 shrink-0" />}
                  {r.type === "card" && <Star className="w-2.5 h-2.5 shrink-0 text-[hsl(var(--rare))]" />}
                  <span className="truncate">{r.type === "gold" || r.type === "stardust" ? r.amount : r.type === "card" ? cardInfo?.name ?? r.label : r.label}</span>
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
