import { useMemo, useState } from "react";
import { Shield, Lock, Check, Star, Sparkles, Crown, Zap, Package, Award, Palette, Frame, SmilePlus, X, Eye, RotateCcw } from "lucide-react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  BATTLE_PASS_SEASONS,
  ACTIVE_BATTLE_PASS_SEASON_ID,
  type Reward,
  type RewardKind,
} from "@/data/battlePassSeasons";
import type { PlayerState, BattlePassSeasonId } from "@/lib/playerState";
import { awardBattlePassXp, claimBattlePassLevelReward, getBattlePassLevelFromXp, getBattlePassSeasonProgress, getBattlePassXpToNextLevel, normalizeBattlePassDaily, setBattlePassActiveSeason, setCosmeticEquipped } from "@/lib/battlePassEngine";
import { toast } from "@/hooks/use-toast";
import { getCosmeticById } from "@/data/cosmetics";
import { getCardById } from "@/data/cardIndex";
import GameCard from "@/components/GameCard";
import { GoldCurrencyIcon, StardustCurrencyIcon } from "@/components/CurrencyIcons";

const MILESTONES = new Set([5, 10, 15, 20, 25, 30]);

function RewardIcon({ kind, className }: { kind: RewardKind; className?: string }) {
  const c = className ?? "w-5 h-5";
  switch (kind) {
    case "gold": return <GoldCurrencyIcon className={cn(c)} />;
    case "dust": return <StardustCurrencyIcon className={cn(c)} />;
    case "xp_boost": return <Zap className={cn(c, "text-emerald-400")} />;
    case "bronze_pack": return <Package className={cn(c, "text-amber-600")} />;
    case "silver_pack": return <Package className={cn(c, "text-slate-300")} />;
    case "gold_pack": return <Package className={cn(c, "text-[hsl(var(--legendary))]")} />;
    case "hero": return <Crown className={cn(c, "text-[hsl(var(--legendary))]")} />;
    case "hero_variant": return <Sparkles className={cn(c, "text-fuchsia-400")} />;
    case "card_back": return <Palette className={cn(c, "text-sky-400")} />;
    case "title": return <Award className={cn(c, "text-[hsl(var(--legendary))]")} />;
    case "emote": return <SmilePlus className={cn(c, "text-pink-400")} />;
    case "board_skin": return <Frame className={cn(c, "text-violet-400")} />;
    case "border": return <Star className={cn(c, "text-fuchsia-400")} />;
    case "card_frame": return <Frame className={cn(c, "text-[hsl(var(--legendary))]")} />;
    case "crafting_mats": return <Sparkles className={cn(c, "text-teal-400")} />;
  }
}

interface BattlePassProps {
  playerState: PlayerState;
  onStateChange: (state: PlayerState) => void;
  isOnline?: boolean;
}

export default function BattlePass({ playerState, onStateChange }: BattlePassProps) {
  const normalizedState = useMemo(() => normalizeBattlePassDaily(playerState), [playerState]);
  const activeSeasonId = (normalizedState.battlePass?.activeSeasonId ?? ACTIVE_BATTLE_PASS_SEASON_ID) as BattlePassSeasonId;
  const [seasonId, setSeasonIdLocal] = useState<BattlePassSeasonId>(activeSeasonId);
  const season = BATTLE_PASS_SEASONS.find((s) => s.id === seasonId) ?? BATTLE_PASS_SEASONS[0];
  const passData = season.passData;

  const seasonProgress = getBattlePassSeasonProgress(normalizedState, seasonId);
  const currentLevel = getBattlePassLevelFromXp(seasonProgress.xp);
  const xpToNext = getBattlePassXpToNextLevel(seasonProgress.xp) || 0;
  const currentXp = seasonProgress.xp - (currentLevel - 1) * 500;
  const hasElite = seasonProgress.hasElite;
  const claimedFree = new Set<number>(seasonProgress.claimedFreeLevels);
  const claimedElite = new Set<number>(seasonProgress.claimedEliteLevels);

  const [previewReward, setPreviewReward] = useState<{ reward: Reward; level: number; track: "free" | "elite" } | null>(null);

  const isMilestone = (lvl: number) => MILESTONES.has(lvl);

  const setSeasonId = (id: BattlePassSeasonId) => {
    setSeasonIdLocal(id);
    const next = setBattlePassActiveSeason(normalizedState, id);
    onStateChange(next);
  };

  const handleClaim = (level: number, track: "free" | "elite") => {
    const res = claimBattlePassLevelReward(normalizedState, seasonId, level, track);
    if (!res.ok) { toast({ title: "Cannot claim", description: (res as { error: string }).error, variant: "destructive" }); return; }
    onStateChange(res.state);
    toast({ title: "Claimed!", description: `Collected ${track.toUpperCase()} reward for level ${level}.` });
  };

  const handleEquip = (reward: Reward) => {
    if (!reward.cosmeticId) return;
    const cos = getCosmeticById(reward.cosmeticId);
    if (!cos) return;
    const next = setCosmeticEquipped(normalizedState, reward.cosmeticId);
    onStateChange(next);
    toast({ title: "Equipped", description: `${cos.name} equipped.` });
  };

  return (
    <div className="space-y-6">
      {/* Season switcher - Tabs */}
      <Tabs value={seasonId} onValueChange={(v) => setSeasonId(v as BattlePassSeasonId)}>
        <TabsList className="bg-secondary/50 h-auto p-1 flex-wrap">
          {BATTLE_PASS_SEASONS.map((s) => (
            <TabsTrigger key={s.id} value={s.id} className="text-xs font-heading">
              {s.emoji ? `${s.emoji} ` : ""}{s.title}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Optional season banner */}
      {season.banner && (
        <div className="rounded-xl overflow-hidden border border-border">
          <img src={season.banner} alt="" className="w-full h-auto max-h-40 object-cover" />
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-heading text-2xl font-bold text-foreground flex items-center gap-2">
            <Shield className="w-6 h-6 text-[hsl(var(--legendary))]" />
            {season.emoji && <span aria-hidden>{season.emoji}</span>}
            {season.title}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">{season.subtitle}</p>
        </div>
        {!hasElite && (
          <button className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[hsl(var(--legendary))] to-[hsl(280,60%,55%)] text-background font-heading font-bold text-sm hover:brightness-110 transition-all shadow-lg shadow-[hsl(var(--legendary))]/20">
            ✦ Upgrade to Elite Pass
          </button>
        )}
      </div>

      {/* XP Progress */}
      <div className="bg-card border border-border rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-heading font-bold text-foreground">Level {currentLevel}</span>
          <span className="text-xs text-muted-foreground">{currentXp} / {Math.max(1, xpToNext)} XP</span>
        </div>
        <Progress value={(currentXp / Math.max(1, xpToNext)) * 100} className="h-3 bg-secondary" />
      </div>

      {/* Track Legend */}
      <div className="flex flex-wrap items-center gap-6 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-secondary border border-border inline-block" /> FREE</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-gradient-to-r from-[hsl(var(--legendary))]/30 to-[hsl(280,60%,55%)]/30 border border-[hsl(var(--legendary))]/40 inline-block" /> ELITE</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm border-2 border-[hsl(var(--legendary))] inline-block animate-pulse" /> Milestone</span>
        <span className="flex items-center gap-1.5"><Check className="w-3 h-3 text-emerald-400" /> Claimed</span>
      </div>

      {/* Scrollable Grid */}
      <ScrollArea className="w-full">
        <div className="pb-4" style={{ minWidth: `${passData.length * 110 + 20}px` }}>
          <div className="flex gap-1.5 mb-1.5 pl-[72px]">
            {passData.map((r) => (
              <div key={`lvl-${r.level}`} className={cn("w-24 text-center text-xs font-heading font-bold shrink-0", r.level === currentLevel ? "text-[hsl(var(--legendary))]" : "text-muted-foreground", isMilestone(r.level) && "text-[hsl(var(--legendary))]")}>
                {r.level}
              </div>
            ))}
          </div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <div className="w-16 shrink-0 text-xs font-heading font-bold text-muted-foreground text-right pr-2 uppercase tracking-wider">Free</div>
            {passData.map((r) => (
              <RewardCell key={`free-${season.id}-${r.level}`} reward={r.free} level={r.level} currentLevel={currentLevel} claimed={claimedFree.has(r.level)} milestone={isMilestone(r.level)} elite={false} onClaim={() => handleClaim(r.level, "free")} onPreview={() => setPreviewReward({ reward: r.free, level: r.level, track: "free" })} />
            ))}
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-16 shrink-0 text-xs font-heading font-bold text-right pr-2 uppercase tracking-wider">
              <span className="bg-gradient-to-r from-[hsl(var(--legendary))] to-[hsl(280,60%,55%)] bg-clip-text text-transparent">Elite</span>
            </div>
            {passData.map((r) => (
              <RewardCell key={`elite-${season.id}-${r.level}`} reward={r.elite} level={r.level} currentLevel={currentLevel} claimed={hasElite && claimedElite.has(r.level)} milestone={isMilestone(r.level)} elite locked={!hasElite} onClaim={() => handleClaim(r.level, "elite")} onPreview={() => setPreviewReward({ reward: r.elite, level: r.level, track: "elite" })} />
            ))}
          </div>
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {/* Preview Modal - now using shadcn Dialog */}
      <Dialog open={!!previewReward} onOpenChange={(open) => !open && setPreviewReward(null)}>
        <DialogContent className={cn(
          "max-w-md",
          previewReward?.track === "elite"
            ? "border-[hsl(var(--legendary))]/40 shadow-[0_0_40px_hsl(var(--legendary)/0.15)]"
            : ""
        )}>
          {previewReward && (() => {
            const cardData = previewReward.reward.cardId ? getCardById(previewReward.reward.cardId) : null;
            return (
              <>
                <DialogHeader>
                  <DialogTitle className="font-heading text-lg">{previewReward.reward.label}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Badge variant={previewReward.track === "elite" ? "default" : "secondary"} className="text-[10px]">
                      {previewReward.track === "elite" ? "✦ Elite" : "Free"} · Level {previewReward.level}
                    </Badge>
                    {previewReward.reward.seasonal && (
                      <Badge className="text-[10px] bg-[hsl(var(--legendary))]/20 text-[hsl(var(--legendary))]">Season Exclusive</Badge>
                    )}
                  </div>

                  {cardData ? (
                    <div className="flex flex-col items-center gap-3">
                      <GameCard card={cardData} size="lg" />
                      <p className="text-xs text-muted-foreground flex items-center gap-1.5"><RotateCcw className="w-3 h-3" /> Click card to flip</p>
                    </div>
                  ) : previewReward.reward.image ? (
                    <div className="relative rounded-xl overflow-hidden border border-border">
                      <img src={previewReward.reward.image} alt={previewReward.reward.label} className="w-full h-auto object-cover" />
                      {previewReward.reward.rarity === "legendary" && (
                        <div className="absolute inset-0 ring-2 ring-inset ring-[hsl(var(--legendary))]/30 rounded-xl pointer-events-none" />
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-32 bg-secondary/50 rounded-xl border border-border">
                      <RewardIcon kind={previewReward.reward.kind} className="w-16 h-16" />
                    </div>
                  )}

                  <p className="text-sm text-muted-foreground capitalize">{previewReward.reward.kind.replace(/_/g, " ")}</p>
                  {previewReward.reward.rarity && (
                    <Badge variant="outline" className={cn(
                      "text-xs",
                      previewReward.reward.rarity === "legendary" && "text-[hsl(var(--legendary))] border-[hsl(var(--legendary))]/30",
                      previewReward.reward.rarity === "rare" && "text-[hsl(var(--rare))] border-[hsl(var(--rare))]/30",
                    )}>
                      {previewReward.reward.rarity}
                    </Badge>
                  )}
                  {previewReward.reward.seasonal && (
                    <p className="text-xs text-muted-foreground italic">⚠ This reward is season exclusive and won't return after the season ends.</p>
                  )}
                  {previewReward.reward.cosmeticId && (normalizedState.cosmeticsOwned || []).includes(previewReward.reward.cosmeticId) && (
                    <button onClick={() => handleEquip(previewReward.reward)} className="w-full px-4 py-2 rounded-xl bg-primary text-primary-foreground font-heading font-bold text-sm hover:brightness-110 transition-all">
                      Equip
                    </button>
                  )}
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ─── Reward Cell ─── */
function RewardCell({
  reward, level, currentLevel, claimed, milestone, elite, locked, onClaim, onPreview,
}: {
  reward: Reward; level: number; currentLevel: number; claimed: boolean;
  milestone: boolean; elite: boolean; locked?: boolean; onClaim?: () => void; onPreview?: () => void;
}) {
  const isCurrent = level === currentLevel;
  const isLocked = level > currentLevel;
  const canClaim = !isLocked && !claimed && (!locked || !elite);

  return (
    <div
      onClick={onPreview}
      className={cn(
        "relative w-24 h-24 rounded-xl border flex flex-col items-center justify-center gap-1 shrink-0 transition-all group cursor-pointer hover:scale-105",
        elite ? "bg-gradient-to-b from-[hsl(var(--legendary))]/5 to-[hsl(280,60%,55%)]/5 border-[hsl(var(--legendary))]/20" : "bg-card border-border",
        milestone && "border-[hsl(var(--legendary))]/60 shadow-[0_0_12px_hsl(var(--legendary)/0.25)]",
        milestone && elite && "border-[hsl(280,60%,55%)]/60 shadow-[0_0_12px_hsl(280,60%,55%,0.2)]",
        isCurrent && "ring-2 ring-[hsl(var(--legendary))]/60 animate-pulse",
        isLocked && "opacity-40",
        claimed && !isLocked && "opacity-70",
      )}
    >
      {reward.seasonal && (
        <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-[hsl(var(--legendary))] text-background text-[8px] font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap font-heading">SEASONAL</div>
      )}
      {locked && !claimed && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/40 rounded-xl z-10"><Lock className="w-4 h-4 text-muted-foreground" /></div>
      )}
      {claimed && !isLocked && (
        <div className="absolute top-1 right-1 bg-emerald-500 rounded-full p-0.5 z-10"><Check className="w-3 h-3 text-background" /></div>
      )}
      {reward.image ? (
        <div className="relative">
          <img src={reward.image} alt={reward.label} className={cn("w-14 h-14 rounded-lg object-cover", milestone && "ring-1 ring-[hsl(var(--legendary))]/50")} loading="lazy" />
          <div className="absolute inset-0 flex items-center justify-center bg-background/50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"><Eye className="w-4 h-4 text-foreground" /></div>
        </div>
      ) : (
        <RewardIcon kind={reward.kind} className={cn("w-6 h-6", milestone && "w-7 h-7")} />
      )}
      <span className={cn("text-[10px] leading-tight text-center font-medium px-1", milestone ? "text-[hsl(var(--legendary))] font-heading font-bold" : "text-muted-foreground")}>
        {reward.label}
      </span>
      {reward.seasonal && (
        <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 hidden group-hover:block bg-card border border-border text-[9px] text-muted-foreground px-2 py-1 rounded-lg whitespace-nowrap z-20 shadow-lg">
          Season exclusive — limited time
        </div>
      )}
      {canClaim && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onClaim?.(); }}
          className={cn("absolute bottom-1 left-1 right-1 text-[9px] font-bold rounded-md py-1 transition-colors", elite ? "bg-[hsl(var(--legendary))]/25 text-[hsl(var(--legendary))] hover:bg-[hsl(var(--legendary))]/35" : "bg-primary/15 text-primary hover:bg-primary/25")}
        >
          Claim
        </button>
      )}
    </div>
  );
}
