import { useState } from "react";
import { Shield, Lock, Check, Coins, Star, Sparkles, Crown, Zap, Package, Award, Palette, Frame, SmilePlus, X, Eye } from "lucide-react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  BATTLE_PASS_SEASONS,
  ACTIVE_BATTLE_PASS_SEASON_ID,
  type Reward,
  type RewardKind,
} from "@/data/battlePassSeasons";

const MILESTONES = new Set([5, 10, 15, 20, 25, 30]);

/* ─── Icons per reward kind ─── */
function RewardIcon({ kind, className }: { kind: RewardKind; className?: string }) {
  const c = className ?? "w-5 h-5";
  switch (kind) {
    case "gold": return <Coins className={cn(c, "text-[hsl(var(--legendary))]")} />;
    case "dust": return <span className={cn("inline-block", c)}>💎</span>;
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

export default function BattlePass() {
  const [seasonId, setSeasonId] = useState(ACTIVE_BATTLE_PASS_SEASON_ID);
  const season = BATTLE_PASS_SEASONS.find((s) => s.id === seasonId) ?? BATTLE_PASS_SEASONS[0];
  const passData = season.passData;

  const [currentLevel] = useState(7);
  const [currentXp] = useState(340);
  const xpToNext = 500;
  const [hasElite] = useState(false);
  const [claimedFree] = useState<Set<number>>(new Set([1, 2, 3, 4, 5, 6]));
  const [claimedElite] = useState<Set<number>>(new Set([1, 2, 3, 4, 5, 6]));
  const [previewReward, setPreviewReward] = useState<{ reward: Reward; level: number; track: "free" | "elite" } | null>(null);

  const isMilestone = (lvl: number) => MILESTONES.has(lvl);

  return (
    <div className="space-y-6">
      {/* Season switcher */}
      <div className="flex flex-wrap gap-2">
        {BATTLE_PASS_SEASONS.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setSeasonId(s.id)}
            className={cn(
              "px-3 py-2 rounded-lg text-sm font-heading font-bold border transition-colors",
              seasonId === s.id
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-muted-foreground border-border hover:text-foreground"
            )}
          >
            {s.emoji ? `${s.emoji} ` : ""}{s.title}
          </button>
        ))}
      </div>

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
          <span className="text-xs text-muted-foreground">{currentXp} / {xpToNext} XP</span>
        </div>
        <Progress value={(currentXp / xpToNext) * 100} className="h-3 bg-secondary" />
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
          {/* Level numbers */}
          <div className="flex gap-1.5 mb-1.5 pl-[72px]">
            {passData.map((r) => (
              <div
                key={`lvl-${r.level}`}
                className={cn(
                  "w-24 text-center text-xs font-heading font-bold shrink-0",
                  r.level === currentLevel ? "text-[hsl(var(--legendary))]" : "text-muted-foreground",
                  isMilestone(r.level) && "text-[hsl(var(--legendary))]"
                )}
              >
                {r.level}
              </div>
            ))}
          </div>

          {/* FREE Row */}
          <div className="flex items-center gap-1.5 mb-1.5">
            <div className="w-16 shrink-0 text-xs font-heading font-bold text-muted-foreground text-right pr-2 uppercase tracking-wider">Free</div>
            {passData.map((r) => (
              <RewardCell
                key={`free-${season.id}-${r.level}`}
                reward={r.free}
                level={r.level}
                currentLevel={currentLevel}
                claimed={claimedFree.has(r.level)}
                milestone={isMilestone(r.level)}
                elite={false}
                onPreview={() => setPreviewReward({ reward: r.free, level: r.level, track: "free" })}
              />
            ))}
          </div>

          {/* ELITE Row */}
          <div className="flex items-center gap-1.5">
            <div className="w-16 shrink-0 text-xs font-heading font-bold text-right pr-2 uppercase tracking-wider">
              <span className="bg-gradient-to-r from-[hsl(var(--legendary))] to-[hsl(280,60%,55%)] bg-clip-text text-transparent">Elite</span>
            </div>
            {passData.map((r) => (
              <RewardCell
                key={`elite-${season.id}-${r.level}`}
                reward={r.elite}
                level={r.level}
                currentLevel={currentLevel}
                claimed={hasElite && claimedElite.has(r.level)}
                milestone={isMilestone(r.level)}
                elite
                locked={!hasElite}
                onPreview={() => setPreviewReward({ reward: r.elite, level: r.level, track: "elite" })}
              />
            ))}
          </div>
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {/* Preview Modal */}
      {previewReward && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm" onClick={() => setPreviewReward(null)}>
          <div
            className={cn(
              "relative max-w-md w-full mx-4 rounded-2xl border p-6 shadow-2xl animate-fade-in",
              previewReward.track === "elite"
                ? "bg-card border-[hsl(var(--legendary))]/40 shadow-[0_0_40px_hsl(var(--legendary)/0.15)]"
                : "bg-card border-border"
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <button onClick={() => setPreviewReward(null)} className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors">
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-4">
              <span className={cn(
                "text-[10px] font-heading font-bold uppercase px-2 py-0.5 rounded-full",
                previewReward.track === "elite"
                  ? "bg-gradient-to-r from-[hsl(var(--legendary))]/20 to-[hsl(280,60%,55%)]/20 text-[hsl(var(--legendary))]"
                  : "bg-secondary text-muted-foreground"
              )}>
                {previewReward.track === "elite" ? "✦ Elite" : "Free"} · Level {previewReward.level}
              </span>
              {previewReward.reward.seasonal && (
                <span className="text-[10px] font-heading font-bold uppercase px-2 py-0.5 rounded-full bg-[hsl(var(--legendary))]/20 text-[hsl(var(--legendary))]">
                  Season Exclusive
                </span>
              )}
            </div>

            {previewReward.reward.image ? (
              <div className="relative rounded-xl overflow-hidden mb-4 border border-border">
                <img
                  src={previewReward.reward.image}
                  alt={previewReward.reward.label}
                  className="w-full h-auto object-cover"
                />
                {previewReward.reward.rarity === "legendary" && (
                  <div className="absolute inset-0 ring-2 ring-inset ring-[hsl(var(--legendary))]/30 rounded-xl pointer-events-none" />
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-32 bg-secondary/50 rounded-xl mb-4 border border-border">
                <RewardIcon kind={previewReward.reward.kind} className="w-16 h-16" />
              </div>
            )}

            <h3 className="font-heading text-lg font-bold text-foreground">{previewReward.reward.label}</h3>
            <p className="text-sm text-muted-foreground mt-1 capitalize">{previewReward.reward.kind.replace(/_/g, " ")}</p>
            {previewReward.reward.rarity && (
              <span className={cn(
                "inline-block mt-2 text-xs font-heading font-bold uppercase px-2 py-0.5 rounded-full",
                previewReward.reward.rarity === "legendary" && "bg-[hsl(var(--legendary))]/20 text-[hsl(var(--legendary))]",
                previewReward.reward.rarity === "rare" && "bg-[hsl(var(--rare))]/20 text-[hsl(var(--rare))]",
                previewReward.reward.rarity === "common" && "bg-secondary text-muted-foreground",
              )}>
                {previewReward.reward.rarity}
              </span>
            )}
            {previewReward.reward.seasonal && (
              <p className="text-xs text-muted-foreground mt-3 italic">⚠ This reward is season exclusive and won&apos;t return after the season ends.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Reward Cell ─── */
function RewardCell({
  reward,
  level,
  currentLevel,
  claimed,
  milestone,
  elite,
  locked,
  onPreview,
}: {
  reward: Reward;
  level: number;
  currentLevel: number;
  claimed: boolean;
  milestone: boolean;
  elite: boolean;
  locked?: boolean;
  onPreview?: () => void;
}) {
  const isCurrent = level === currentLevel;
  const isLocked = level > currentLevel;

  return (
    <div
      onClick={onPreview}
      className={cn(
        "relative w-24 h-24 rounded-xl border flex flex-col items-center justify-center gap-1 shrink-0 transition-all group cursor-pointer hover:scale-105",
        elite
          ? "bg-gradient-to-b from-[hsl(var(--legendary))]/5 to-[hsl(280,60%,55%)]/5 border-[hsl(var(--legendary))]/20"
          : "bg-card border-border",
        milestone && "border-[hsl(var(--legendary))]/60 shadow-[0_0_12px_hsl(var(--legendary)/0.25)]",
        milestone && elite && "border-[hsl(280,60%,55%)]/60 shadow-[0_0_12px_hsl(280,60%,55%,0.2)]",
        isCurrent && "ring-2 ring-[hsl(var(--legendary))]/60 animate-pulse",
        isLocked && "opacity-40",
        claimed && !isLocked && "opacity-70",
      )}
    >
      {reward.seasonal && (
        <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-[hsl(var(--legendary))] text-background text-[8px] font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap font-heading">
          SEASONAL
        </div>
      )}

      {locked && !claimed && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/40 rounded-xl z-10">
          <Lock className="w-4 h-4 text-muted-foreground" />
        </div>
      )}

      {claimed && !isLocked && (
        <div className="absolute top-1 right-1 bg-emerald-500 rounded-full p-0.5 z-10">
          <Check className="w-3 h-3 text-background" />
        </div>
      )}

      {reward.image ? (
        <div className="relative">
          <img src={reward.image} alt={reward.label} className={cn("w-14 h-14 rounded-lg object-cover", milestone && "ring-1 ring-[hsl(var(--legendary))]/50")} loading="lazy" />
          <div className="absolute inset-0 flex items-center justify-center bg-background/50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
            <Eye className="w-4 h-4 text-foreground" />
          </div>
        </div>
      ) : (
        <RewardIcon kind={reward.kind} className={cn("w-6 h-6", milestone && "w-7 h-7")} />
      )}

      <span className={cn(
        "text-[10px] leading-tight text-center font-medium px-1",
        milestone ? "text-[hsl(var(--legendary))] font-heading font-bold" : "text-muted-foreground"
      )}>
        {reward.label}
      </span>

      {reward.seasonal && (
        <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 hidden group-hover:block bg-card border border-border text-[9px] text-muted-foreground px-2 py-1 rounded-lg whitespace-nowrap z-20 shadow-lg">
          Season exclusive — limited time
        </div>
      )}
    </div>
  );
}
