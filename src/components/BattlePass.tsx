import { useState } from "react";
import { Shield, Lock, Check, Coins, Star, Sparkles, Crown, Zap, Package, Award, Palette, Frame, SmilePlus, X, Eye } from "lucide-react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

/* ─── Asset imports ─── */
import heroVerdantSprout from "@/assets/battlepass/hero-verdant-sprout.jpg";
import heroThornweaver from "@/assets/battlepass/hero-thornweaver.jpg";
import heroPyralis from "@/assets/battlepass/hero-pyralis.jpg";
import heroSolara from "@/assets/battlepass/hero-solara.jpg";
import heroCelestialSolara from "@/assets/battlepass/hero-celestial-solara.jpg";
import cardbackBloomCrest from "@/assets/battlepass/cardback-bloom-crest.jpg";
import cardbackBloomInferno from "@/assets/battlepass/cardback-bloom-inferno.jpg";
import boardRunedGarden from "@/assets/battlepass/board-runed-garden.jpg";
import boardMossyHearth from "@/assets/battlepass/board-mossy-hearth.jpg";
import frameBloomAura from "@/assets/battlepass/frame-bloom-aura.jpg";
import borderEternalBloom from "@/assets/battlepass/border-eternal-bloom.jpg";

/* ─── Reward type definitions ─── */
type RewardKind = "gold" | "dust" | "xp_boost" | "bronze_pack" | "silver_pack" | "gold_pack" | "hero" | "card_back" | "title" | "emote" | "board_skin" | "border" | "card_frame" | "hero_variant" | "crafting_mats";

interface Reward {
  kind: RewardKind;
  label: string;
  amount?: number;
  seasonal?: boolean;
  rarity?: "common" | "rare" | "legendary";
  image?: string;
}

interface LevelRewards {
  level: number;
  free: Reward;
  elite: Reward;
}

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

/* ─── 30-level reward data ─── */
const PASS_DATA: LevelRewards[] = [
  { level: 1, free: { kind: "board_skin", label: "Mossy Hearth", image: boardMossyHearth }, elite: { kind: "gold", label: "400 Gold", amount: 400 } },
  { level: 2, free: { kind: "dust", label: "50 Dust", amount: 50 }, elite: { kind: "dust", label: "100 Dust", amount: 100 } },
  { level: 3, free: { kind: "gold", label: "300 Gold", amount: 300 }, elite: { kind: "gold", label: "600 Gold", amount: 600 } },
  { level: 4, free: { kind: "dust", label: "75 Dust", amount: 75 }, elite: { kind: "dust", label: "150 Dust", amount: 150 } },
  { level: 5, free: { kind: "card_back", label: "Bloom Crest", seasonal: true, rarity: "legendary", image: cardbackBloomCrest }, elite: { kind: "card_back", label: "Bloom Inferno", seasonal: true, rarity: "legendary", image: cardbackBloomInferno } },
  { level: 6, free: { kind: "xp_boost", label: "2x XP (1hr)" }, elite: { kind: "gold_pack", label: "Gold Pack" } },
  { level: 7, free: { kind: "gold", label: "400 Gold", amount: 400 }, elite: { kind: "gold", label: "500 Gold", amount: 500 } },
  { level: 8, free: { kind: "bronze_pack", label: "Bronze Pack" }, elite: { kind: "dust", label: "200 Dust", amount: 200 } },
  { level: 9, free: { kind: "dust", label: "100 Dust", amount: 100 }, elite: { kind: "xp_boost", label: "2x XP (2hr)" } },
  { level: 10, free: { kind: "hero", label: "Verdant Sprout", seasonal: true, rarity: "legendary", image: heroVerdantSprout }, elite: { kind: "hero", label: "Pyralis, Bloom Knight", seasonal: true, rarity: "legendary", image: heroPyralis } },
  { level: 11, free: { kind: "gold", label: "500 Gold", amount: 500 }, elite: { kind: "gold_pack", label: "Gold Pack" } },
  { level: 12, free: { kind: "dust", label: "125 Dust", amount: 125 }, elite: { kind: "dust", label: "300 Dust", amount: 300 } },
  { level: 13, free: { kind: "xp_boost", label: "2x XP (1hr)" }, elite: { kind: "crafting_mats", label: "Crafting Mats" } },
  { level: 14, free: { kind: "gold", label: "600 Gold", amount: 600 }, elite: { kind: "gold_pack", label: "Gold Pack" } },
  { level: 15, free: { kind: "title", label: "Bloomwalker", seasonal: true, rarity: "legendary" }, elite: { kind: "board_skin", label: "Runed Garden", seasonal: true, rarity: "legendary", image: boardRunedGarden } },
  { level: 16, free: { kind: "silver_pack", label: "Silver Pack" }, elite: { kind: "gold", label: "800 Gold", amount: 800 } },
  { level: 17, free: { kind: "gold", label: "700 Gold", amount: 700 }, elite: { kind: "gold_pack", label: "Gold Pack" } },
  { level: 18, free: { kind: "dust", label: "150 Dust", amount: 150 }, elite: { kind: "dust", label: "400 Dust", amount: 400 } },
  { level: 19, free: { kind: "gold", label: "800 Gold", amount: 800 }, elite: { kind: "gold", label: "1200 Gold", amount: 1200 } },
  { level: 20, free: { kind: "hero", label: "Thornweaver", seasonal: true, rarity: "legendary", image: heroThornweaver }, elite: { kind: "hero", label: "Solara, Bloom Empress", seasonal: true, rarity: "legendary", image: heroSolara } },
  { level: 21, free: { kind: "gold", label: "900 Gold", amount: 900 }, elite: { kind: "gold_pack", label: "Gold Pack" } },
  { level: 22, free: { kind: "dust", label: "175 Dust", amount: 175 }, elite: { kind: "dust", label: "500 Dust", amount: 500 } },
  { level: 23, free: { kind: "bronze_pack", label: "Bronze Pack" }, elite: { kind: "gold_pack", label: "Gold Pack" } },
  { level: 24, free: { kind: "gold", label: "1000 Gold", amount: 1000 }, elite: { kind: "gold", label: "1500 Gold", amount: 1500 } },
  { level: 25, free: { kind: "emote", label: "Petal Storm", seasonal: true, rarity: "legendary" }, elite: { kind: "border", label: "Eternal Bloom", seasonal: true, rarity: "legendary", image: borderEternalBloom } },
  { level: 26, free: { kind: "silver_pack", label: "Silver Pack" }, elite: { kind: "gold_pack", label: "Gold Pack" } },
  { level: 27, free: { kind: "gold", label: "1100 Gold", amount: 1100 }, elite: { kind: "gold", label: "1800 Gold", amount: 1800 } },
  { level: 28, free: { kind: "dust", label: "200 Dust", amount: 200 }, elite: { kind: "dust", label: "600 Dust", amount: 600 } },
  { level: 29, free: { kind: "silver_pack", label: "Silver Pack" }, elite: { kind: "gold_pack", label: "Gold Pack" } },
  { level: 30, free: { kind: "card_frame", label: "Bloom Aura", seasonal: true, rarity: "legendary", image: frameBloomAura }, elite: { kind: "hero_variant", label: "Celestial Solara", seasonal: true, rarity: "legendary", image: heroCelestialSolara } },
];

const MILESTONES = new Set([5, 10, 15, 20, 25, 30]);

export default function BattlePass() {
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
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-heading text-2xl font-bold text-foreground flex items-center gap-2">
            <Shield className="w-6 h-6 text-[hsl(var(--legendary))]" />
            Season of the Bloom
          </h2>
          <p className="text-sm text-muted-foreground mt-1">30 days remaining · Complete quests & battles to earn XP</p>
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
      <div className="flex items-center gap-6 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-secondary border border-border inline-block" /> FREE</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-gradient-to-r from-[hsl(var(--legendary))]/30 to-[hsl(280,60%,55%)]/30 border border-[hsl(var(--legendary))]/40 inline-block" /> ELITE</span>
        <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm border-2 border-[hsl(var(--legendary))] inline-block animate-pulse" /> Milestone</span>
        <span className="flex items-center gap-1.5"><Check className="w-3 h-3 text-emerald-400" /> Claimed</span>
      </div>

      {/* Scrollable Grid */}
      <ScrollArea className="w-full">
        <div className="pb-4" style={{ minWidth: `${PASS_DATA.length * 110 + 20}px` }}>
          {/* Level numbers */}
          <div className="flex gap-1.5 mb-1.5 pl-[72px]">
            {PASS_DATA.map((r) => (
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
            {PASS_DATA.map((r) => (
              <RewardCell
                key={`free-${r.level}`}
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
            {PASS_DATA.map((r) => (
              <RewardCell
                key={`elite-${r.level}`}
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
            {/* Close */}
            <button onClick={() => setPreviewReward(null)} className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors">
              <X className="w-5 h-5" />
            </button>

            {/* Track & Level badge */}
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

            {/* Image */}
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

            {/* Info */}
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
              <p className="text-xs text-muted-foreground mt-3 italic">⚠ This reward is season exclusive and won't return after the season ends.</p>
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
        // Base styles
        elite
          ? "bg-gradient-to-b from-[hsl(var(--legendary))]/5 to-[hsl(280,60%,55%)]/5 border-[hsl(var(--legendary))]/20"
          : "bg-card border-border",
        // Milestone glow
        milestone && "border-[hsl(var(--legendary))]/60 shadow-[0_0_12px_hsl(var(--legendary)/0.25)]",
        milestone && elite && "border-[hsl(280,60%,55%)]/60 shadow-[0_0_12px_hsl(280,60%,55%,0.2)]",
        // Current level pulse
        isCurrent && "ring-2 ring-[hsl(var(--legendary))]/60 animate-pulse",
        // Locked/dimmed
        isLocked && "opacity-40",
        // Claimed
        claimed && !isLocked && "opacity-70",
      )}
    >
      {/* Seasonal badge */}
      {reward.seasonal && (
        <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-[hsl(var(--legendary))] text-background text-[8px] font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap font-heading">
          SEASONAL
        </div>
      )}

      {/* Lock overlay for elite */}
      {locked && !claimed && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/40 rounded-xl z-10">
          <Lock className="w-4 h-4 text-muted-foreground" />
        </div>
      )}

      {/* Claimed checkmark */}
      {claimed && !isLocked && (
        <div className="absolute top-1 right-1 bg-emerald-500 rounded-full p-0.5 z-10">
          <Check className="w-3 h-3 text-background" />
        </div>
      )}

      {/* Icon or Image */}
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

      {/* Label */}
      <span className={cn(
        "text-[10px] leading-tight text-center font-medium px-1",
        milestone ? "text-[hsl(var(--legendary))] font-heading font-bold" : "text-muted-foreground"
      )}>
        {reward.label}
      </span>

      {/* Tooltip on hover */}
      {reward.seasonal && (
        <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 hidden group-hover:block bg-card border border-border text-[9px] text-muted-foreground px-2 py-1 rounded-lg whitespace-nowrap z-20 shadow-lg">
          Season exclusive — limited time
        </div>
      )}
    </div>
  );
}
