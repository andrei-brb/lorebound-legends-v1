/**
 * Path rewards must match `server/lib/dailyPathRewards.mjs` for online claims.
 */
import { useState, useCallback } from "react";
import { Gift, Calendar, Sparkles, CheckCircle2, Lock, Star, Package } from "lucide-react";
import type { PlayerState } from "@/lib/playerState";
import { getRewardsForPath, type DayRewardDef } from "@/lib/dailyPathRewards";
import { addCardToCollection } from "@/lib/playerState";
import { allCards, type GameCard } from "@/data/cards";
import { getCardById } from "@/data/cardIndex";
import HallLayout, { HallSection, HallStat } from "@/components/scene/HallLayout";
import GlassPanel from "@/components/scene/GlassPanel";
import { texTreasure, texParchment, texVelvet, texGilded, texCosmic } from "@/components/scene/panelTextures";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { GoldCurrencyIcon, StardustCurrencyIcon } from "@/components/CurrencyIcons";
import GameCard from "@/components/GameCard";
import { PACK_DEFINITIONS, pullCards } from "@/lib/gachaEngine";
import bronzePackImg from "@/assets/packs/bronze-pack.jpg";
import RewardPopup, { type RewardItem } from "@/components/battle3d/RewardPopup";

export type DailyClaimPreview = {
  kind: string;
  label: string;
  amount?: number;
  cardId?: string | null;
  pullResults?: Array<{
    cardId: string;
    isDuplicate: boolean;
    stardustEarned: number;
    newGoldStar: boolean;
    newRedStar: boolean;
    rarity: string;
  }>;
};

interface Props {
  playerState: PlayerState;
  onStateChange: (s: PlayerState) => void;
  isOnline?: boolean;
  claimDailyLogin?: () => Promise<{ preview: DailyClaimPreview; state: PlayerState } | null>;
}

function RewardTileArt({ r, cardInfo }: { r: DayRewardDef; cardInfo?: GameCard | null }) {
  if (r.type === "gold") {
    return (
      <div className="flex flex-col items-center justify-center gap-1 p-2">
        <GoldCurrencyIcon className="w-10 h-10 drop-shadow-md" />
        <span className="font-heading text-sm text-[hsl(var(--legendary))]">{r.amount}</span>
      </div>
    );
  }
  if (r.type === "stardust") {
    return (
      <div className="flex flex-col items-center justify-center gap-1 p-2">
        <StardustCurrencyIcon className="w-10 h-10 drop-shadow-md" />
        <span className="font-heading text-sm text-[hsl(var(--rare))]">{r.amount}</span>
      </div>
    );
  }
  if (r.type === "pack") {
    return (
      <div className="relative w-full h-full rounded-xl overflow-hidden">
        <img src={bronzePackImg} alt="" className="absolute inset-0 w-full h-full object-cover opacity-85" />
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
        <div className="relative flex flex-col items-center justify-end h-full pb-2 gap-0.5">
          <Package className="w-5 h-5 text-amber-400 drop-shadow" />
          <span className="text-[9px] uppercase tracking-wide text-foreground/90 font-heading px-1 text-center leading-tight">Bronze</span>
        </div>
      </div>
    );
  }
  if (cardInfo?.image) {
    return <img src={cardInfo.image} alt={cardInfo.name} className="w-full h-full object-cover rounded-xl opacity-80" />;
  }
  return null;
}

export default function DailyHall({ playerState, onStateChange, isOnline, claimDailyLogin }: Props) {
  const [claiming, setClaiming] = useState(false);
  const [preview, setPreview] = useState<DailyClaimPreview | null>(null);
  const [rewardOpen, setRewardOpen] = useState(false);
  const [rewardItems, setRewardItems] = useState<RewardItem[]>([]);
  const [rewardTitle, setRewardTitle] = useState("Daily Boon Claimed");
  const [rewardSubtitle, setRewardSubtitle] = useState("The altar grants its favor.");

  const streak = playerState.dailyLogin?.streak ?? 0;
  const claimedDays = playerState.dailyLogin?.claimedDays ?? [];
  const today = new Date().toISOString().slice(0, 10);
  const claimedToday = playerState.dailyLogin?.lastClaimDate === today;
  const nextDay = claimedDays.length + 1;

  const rewards = getRewardsForPath(playerState.selectedPath ?? null);

  const applyOfflineReward = useCallback(
    (base: PlayerState, reward: DayRewardDef): { state: PlayerState; preview: DailyClaimPreview } => {
      let updated: PlayerState = {
        ...base,
        dailyLogin: {
          streak: (base.dailyLogin?.streak ?? 0) + 1,
          lastClaimDate: today,
          claimedDays: [...(base.dailyLogin?.claimedDays ?? []), nextDay],
        },
      };

      if (reward.type === "gold" && reward.amount) {
        updated = { ...updated, gold: (updated.gold ?? 0) + reward.amount };
        return {
          state: updated,
          preview: { kind: "gold", label: reward.label, amount: reward.amount },
        };
      }
      if (reward.type === "stardust" && reward.amount) {
        updated = { ...updated, stardust: (updated.stardust ?? 0) + reward.amount };
        return {
          state: updated,
          preview: { kind: "stardust", label: reward.label, amount: reward.amount },
        };
      }
      if (reward.type === "card" && reward.cardId) {
        const result = addCardToCollection(updated, reward.cardId);
        updated = result.state;
        return {
          state: updated,
          preview: {
            kind: "card",
            label: reward.label,
            cardId: reward.cardId,
            pullResults: [
              {
                cardId: reward.cardId,
                isDuplicate: result.isDuplicate,
                stardustEarned: result.stardustEarned,
                newGoldStar: result.newGoldStar,
                newRedStar: result.newRedStar,
                rarity: getCardById(reward.cardId)?.rarity ?? "common",
              },
            ],
          },
        };
      }
      if (reward.type === "pack") {
        const pack = PACK_DEFINITIONS.find((p) => p.id === "bronze");
        if (!pack) {
          return { state: updated, preview: { kind: "pack", label: reward.label, pullResults: [] } };
        }
        const { cardIds, newPityCounter } = pullCards(pack, updated);
        updated = { ...updated, pityCounter: newPityCounter };
        const pullResults: NonNullable<DailyClaimPreview["pullResults"]> = [];
        for (const id of cardIds) {
          const r = addCardToCollection(updated, id);
          updated = r.state;
          pullResults.push({
            cardId: id,
            isDuplicate: r.isDuplicate,
            stardustEarned: r.stardustEarned,
            newGoldStar: r.newGoldStar,
            newRedStar: r.newRedStar,
            rarity: getCardById(id)?.rarity ?? "common",
          });
        }
        return {
          state: updated,
          preview: { kind: "pack", label: reward.label, pullResults },
        };
      }
      return { state: updated, preview: { kind: reward.type, label: reward.label } };
    },
    [nextDay, today],
  );

  const handleClaim = async () => {
    if (claimedToday || nextDay > 7 || claiming) return;
    const reward = rewards[nextDay - 1];
    if (!reward) return;

    setClaiming(true);
    try {
      if (isOnline && claimDailyLogin) {
        const res = await claimDailyLogin();
        if (!res) {
          toast({ title: "Claim failed", description: "Could not reach the server. Try again.", variant: "destructive" });
          return;
        }
        setPreview(res.preview);
        setRewardTitle("Daily Boon Claimed");
        setRewardSubtitle(res.preview.label);
        setRewardItems(mapDailyPreviewToRewards(res.preview));
        setRewardOpen(true);
        return;
      }

      const { state, preview: p } = applyOfflineReward(playerState, reward);
      onStateChange(state);
      setPreview(p);
      setRewardTitle("Daily Boon Claimed");
      setRewardSubtitle(reward.label);
      setRewardItems(mapDailyPreviewToRewards(p));
      setRewardOpen(true);
    } finally {
      setClaiming(false);
    }
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
              disabled={claimedToday || nextDay > 7 || claiming}
              onClick={() => void handleClaim()}
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-[hsl(var(--rare))] to-[hsl(var(--legendary))] text-background font-heading text-xs uppercase tracking-wider disabled:opacity-30 disabled:cursor-not-allowed shadow-lg"
            >
              {claiming ? "…" : claimedToday ? "Claimed" : "Claim Today"}
            </button>
          </div>
        </GlassPanel>
      }
    >
      <RewardPopup
        open={rewardOpen}
        onClose={() => setRewardOpen(false)}
        title={rewardTitle}
        subtitle={rewardSubtitle}
        rewards={rewardItems}
        ctaLabel="Claim"
      />
      <GlassPanel hue="var(--legendary)" glow={0.35} padding="md" bg={texGilded} bgTint={0.7}>
        <h3 className="font-heading text-xs uppercase tracking-wider text-foreground drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] mb-4">Reward Path</h3>
        <div className="grid grid-cols-7 gap-2">
          {rewards.map((r) => {
            const claimed = claimedDays.includes(r.day);
            const isToday = !claimedToday && nextDay === r.day;
            const cardInfo = r.type === "card" && r.cardId ? allCards.find((c) => c.id === r.cardId) : null;
            return (
              <div key={r.day} className="flex flex-col items-center gap-1.5">
                <div
                  className={cn(
                    "relative w-full aspect-square rounded-xl flex flex-col items-center justify-center transition-all overflow-hidden",
                    claimed
                      ? "bg-[hsl(var(--legendary)/0.2)] ring-1 ring-[hsl(var(--legendary)/0.5)]"
                      : isToday
                        ? "bg-[hsl(var(--rare)/0.2)] ring-1 ring-[hsl(var(--rare)/0.5)] animate-pulse"
                        : "bg-foreground/5 ring-1 ring-border/30 opacity-60",
                  )}
                >
                  <RewardTileArt r={r} cardInfo={cardInfo} />
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-[10px] uppercase text-muted-foreground drop-shadow">Day</span>
                    <span className={cn("font-heading text-base drop-shadow", claimed ? "text-[hsl(var(--legendary))]" : "text-foreground/90")}>
                      {r.day}
                    </span>
                  </div>
                  {claimed && <CheckCircle2 className="absolute -top-1.5 -right-1.5 w-4 h-4 text-[hsl(var(--legendary))] bg-background rounded-full z-10" />}
                  {!claimed && !isToday && (
                    <Lock className="absolute -top-1.5 -right-1.5 w-4 h-4 text-muted-foreground bg-background rounded-full p-0.5 z-10" />
                  )}
                </div>
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground text-center leading-tight">
                  {r.type === "gold" && <GoldCurrencyIcon className="w-2.5 h-2.5 shrink-0" />}
                  {r.type === "stardust" && <StardustCurrencyIcon className="w-2.5 h-2.5 shrink-0" />}
                  {r.type === "pack" && <Package className="w-2.5 h-2.5 shrink-0 text-amber-500" />}
                  {r.type === "card" && <Star className="w-2.5 h-2.5 shrink-0 text-[hsl(var(--rare))]" />}
                  <span className="truncate">
                    {r.type === "gold" || r.type === "stardust" ? r.amount : r.type === "card" ? (cardInfo?.name ?? r.label) : r.label}
                  </span>
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

      <Dialog open={!!preview} onOpenChange={(open) => !open && setPreview(null)}>
        <DialogContent className="max-w-md border-[hsl(var(--legendary))]/30 shadow-2xl shadow-black/50">
          {preview && (
            <>
              <DialogHeader>
                <DialogTitle className="font-heading text-lg">{preview.label}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {preview.kind === "gold" && preview.amount != null && (
                  <div className="flex flex-col items-center gap-3 py-4">
                    <GoldCurrencyIcon className="w-16 h-16" />
                    <p className="text-2xl font-heading text-[hsl(var(--legendary))]">+{preview.amount} gold</p>
                  </div>
                )}
                {preview.kind === "stardust" && preview.amount != null && (
                  <div className="flex flex-col items-center gap-3 py-4">
                    <StardustCurrencyIcon className="w-16 h-16" />
                    <p className="text-2xl font-heading text-[hsl(var(--rare))]">+{preview.amount} stardust</p>
                  </div>
                )}
                {preview.kind === "pack" && (
                  <div className="space-y-3">
                    <div className="rounded-lg overflow-hidden border border-border">
                      <img src={bronzePackImg} alt="" className="w-full max-h-36 object-cover" />
                    </div>
                    {preview.pullResults && preview.pullResults.length > 0 && (
                      <div className="grid grid-cols-5 gap-2">
                        {preview.pullResults.map((pr) => {
                          const c = getCardById(pr.cardId);
                          return c ? (
                            <GameCard
                              key={pr.cardId}
                              card={c}
                              size="sm"
                              cardProgress={playerState.cardProgress[pr.cardId]}
                            />
                          ) : null;
                        })}
                      </div>
                    )}
                  </div>
                )}
                {preview.kind === "card" && preview.pullResults && preview.pullResults.length > 0 && (
                  <div className="flex flex-col items-center gap-3">
                    {preview.pullResults.map((pr) => {
                      const c = getCardById(pr.cardId);
                      if (!c) return null;
                      return (
                        <div key={pr.cardId} className="w-full max-w-[220px] mx-auto">
                          <GameCard card={c} size="lg" cardProgress={playerState.cardProgress[pr.cardId]} />
                          <p className="text-xs text-center text-muted-foreground mt-2">
                            {pr.isDuplicate ? `Duplicate — +${pr.stardustEarned} stardust` : "Added to your collection"}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </HallLayout>
  );
}

function mapDailyPreviewToRewards(p: DailyClaimPreview): RewardItem[] {
  if (p.kind === "gold") {
    return [{ kind: "gold", amount: p.amount ?? 0, label: p.label, rarity: "legendary" }].filter((x) => (x.amount ?? 0) > 0);
  }
  if (p.kind === "stardust") {
    return [{ kind: "gem", amount: p.amount ?? 0, label: p.label, rarity: "rare" }].filter((x) => (x.amount ?? 0) > 0);
  }
  if (p.kind === "card") {
    return [{ kind: "card", label: p.label, rarity: "mythic" }];
  }
  if (p.kind === "pack") {
    return [{ kind: "relic", label: p.label, rarity: "legendary" }];
  }
  return [{ kind: "relic", label: p.label, rarity: "rare" }];
}
