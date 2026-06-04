import type React from "react";
import { useState } from "react";
import { Award, ChevronRight, Crown, Flame, Gift, Layers, Package, ScrollText, Sparkles, Swords } from "lucide-react";
import EmberLayer from "@/components/EmberLayer";
import { loadDailyQuests } from "@/lib/questEngine";
import { toast } from "@/hooks/use-toast";
import RewardPopup, { type RewardItem } from "@/components/battle3d/RewardPopup";
import { claimDailyLogin as claimDailyLoginOffline, DAILY_LOGIN_REWARDS, openMysteryBox } from "@/lib/dailyEngine";
import { mapDailyPreviewToRewards, type DailyClaimPreview } from "@/lib/dailyClaimPreview";
import { savePlayerState, type PlayerState } from "@/lib/playerState";

type Tab = "summon" | "deck" | "combat-hall" | "quests" | "pass";

const QUICK_START: Array<{
  tab: Tab;
  label: string;
  desc: string;
  step: string;
  Icon: React.ElementType;
  tint: string;
  img?: string;
}> = [
  {
    tab: "summon",
    label: "Summon",
    desc: "Open packs for new cards",
    step: "1",
    Icon: Sparkles,
    tint: "#ba68c8",
    img: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?crop=entropy&cs=srgb&fm=jpg&ixlib=rb-4.1.0&q=85",
  },
  {
    tab: "deck",
    label: "Deck Builder",
    desc: "Save a 10-card loadout",
    step: "2",
    Icon: Layers,
    tint: "#42a5f5",
  },
  {
    tab: "combat-hall",
    label: "Battle Arena",
    desc: "Fight your first skirmish",
    step: "3",
    Icon: Swords,
    tint: "#f5c842",
    img: "https://images.unsplash.com/photo-1547928578-3a5f40a2b3bd?crop=entropy&cs=srgb&fm=jpg&ixlib=rb-4.1.0&q=85",
  },
];

const DAILY_HOOKS: Array<{
  tab: Tab;
  label: string;
  desc: string;
  Icon: React.ElementType;
  tint: string;
}> = [
  { tab: "quests", label: "Quests", desc: "Daily & weekly trials", Icon: ScrollText, tint: "#d4af37" },
  { tab: "pass", label: "Battle Pass", desc: "Season rewards", Icon: Award, tint: "#f5c842" },
];

export default function GrowHub(props: {
  playerState: PlayerState;
  onStateChange: (s: PlayerState) => void;
  isOnline: boolean;
  claimDailyLogin: () => Promise<{ preview: DailyClaimPreview; state: PlayerState } | null>;
  onNavigate: (tab: Tab) => void;
}) {
  const { playerState, onStateChange, isOnline, claimDailyLogin, onNavigate } = props;
  const [rewardOpen, setRewardOpen] = useState(false);
  const [rewardItems, setRewardItems] = useState<RewardItem[]>([]);
  const [rewardTitle, setRewardTitle] = useState("Daily Bonus Claimed");
  const [rewardSubtitle, setRewardSubtitle] = useState("The altar grants its favor.");
  const [claiming, setClaiming] = useState(false);
  const [openingBox, setOpeningBox] = useState(false);
  const today = new Date().toISOString().slice(0, 10);
  const daily = playerState.dailyLogin ?? { streak: 0, lastClaimDate: null, claimedDays: [] };
  const claimedToday = daily.lastClaimDate === today;
  const claimedThisCycle = daily.claimedDays?.length ?? 0;

  const questState = loadDailyQuests();
  const quests = questState.quests
    .map((q) => {
      const def = questState.questDefinitions.find((d) => d.id === q.questId);
      return def ? { id: def.id, name: def.title, progress: q.current, total: def.target, reward: `${def.goldReward}g + ${def.stardustReward}sd`, claimed: q.claimed } : null;
    })
    .filter(Boolean) as Array<{ id: string; name: string; progress: number; total: number; reward: string; claimed: boolean }>;

  const dayOfWeek = ((new Date().getDay() + 6) % 7) + 1; // Mon=1 ... Sun=7
  const rewardPath: Array<{ day: number; icon: string; name: string; unlocked: boolean; current: boolean }> = [
    { day: 1, icon: "🎁", name: "Bronze Pack", unlocked: daily.streak >= 1, current: dayOfWeek === 1 },
    { day: 2, icon: "💰", name: "Gold Cache", unlocked: daily.streak >= 2, current: dayOfWeek === 2 },
    { day: 3, icon: "✨", name: "Stardust", unlocked: daily.streak >= 3, current: dayOfWeek === 3 },
    { day: 4, icon: "🃏", name: "Card Tome", unlocked: daily.streak >= 4, current: dayOfWeek === 4 },
    { day: 5, icon: "🎁", name: "Silver Pack", unlocked: daily.streak >= 5, current: dayOfWeek === 5 },
    { day: 6, icon: "🔥", name: "Ember Relic", unlocked: daily.streak >= 6, current: dayOfWeek === 6 },
    { day: 7, icon: "🏆", name: "Legend Token", unlocked: daily.streak >= 7, current: dayOfWeek === 7 },
  ];

  const pathLabel = playerState.selectedPath ? playerState.selectedPath[0].toUpperCase() + playerState.selectedPath.slice(1) : "Fire";

  const handleDailyClaim = async () => {
    if (claimedToday || claiming) return;
    setClaiming(true);
    try {
      if (isOnline) {
        const res = await claimDailyLogin();
        if (!res) {
          toast({
            title: "Claim failed",
            description: "Could not claim your daily bonus. Try again when signed in online.",
            variant: "destructive",
          });
          return;
        }
        onStateChange(res.state);
        setRewardTitle("Daily Bonus Claimed");
        setRewardSubtitle(res.preview.label);
        setRewardItems(mapDailyPreviewToRewards(res.preview));
        setRewardOpen(true);
        return;
      }

      const result = claimDailyLoginOffline(playerState);
      if (!result) {
        toast({
          title: "Already claimed",
          description: "Your daily bonus is ready again tomorrow.",
        });
        return;
      }
      onStateChange(result.state);
      savePlayerState(result.state);
      const reward = DAILY_LOGIN_REWARDS[result.day - 1];
      setRewardTitle("Daily Bonus Claimed");
      setRewardSubtitle(reward?.label ?? "The altar grants its favor.");
      const previewKind = (reward?.gold ?? 0) > 0 ? "gold" : "stardust";
      setRewardItems(
        mapDailyPreviewToRewards({
          kind: previewKind,
          label: reward?.label ?? "Daily Bonus",
          amount: previewKind === "gold" ? reward?.gold : result.stardust,
        }),
      );
      setRewardOpen(true);
    } catch (e: unknown) {
      toast({
        title: "Could not claim",
        description: e instanceof Error ? e.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setClaiming(false);
    }
  };

  return (
    <div
      className="relative min-h-[calc(100vh-72px)] px-5 md:px-10 py-8"
      data-testid="hub-screen"
      style={{
        backgroundImage:
          "linear-gradient(180deg, rgba(7,5,10,0.85), rgba(7,5,10,0.96)), url('https://images.unsplash.com/photo-1508925831690-f33f79533e7c?crop=entropy&cs=srgb&fm=jpg&ixlib=rb-4.1.0&q=85')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
      }}
    >
      <RewardPopup
        open={rewardOpen}
        onClose={() => setRewardOpen(false)}
        title={rewardTitle}
        subtitle={rewardSubtitle}
        rewards={rewardItems}
        ctaLabel="Claim"
      />
      <EmberLayer count={18} />

      {/* Hero */}
      <section className="max-w-6xl mx-auto mb-8 panel-gold p-6 flex items-center justify-between gap-6 overflow-hidden relative">
        <div className="corner-deco absolute inset-0" />
        <div className="relative z-10">
          <div className="font-stat text-[11px] tracking-[0.35em] text-[#c9a74a]">DAILY HUB</div>
          <h1 className="font-heading text-[32px] md:text-[42px] gold-text leading-none mt-1">
            Forge Your Legend
          </h1>
          <p className="font-lore text-[#d6c293] mt-2 text-lg max-w-xl">
            Claim daily rewards, then follow the quick start path below. Everything else lives in the menu on the left.
          </p>
          <div className="flex flex-wrap gap-3 mt-5">
            <button
              className="btn-gold flex items-center gap-2"
              onClick={() => onNavigate("summon")}
              data-testid="open-summon-btn"
              type="button"
            >
              <Sparkles size={16} /> Summon
            </button>
            <button
              className="btn-ghost flex items-center gap-2"
              onClick={() => onNavigate("deck")}
              data-testid="open-deck-btn"
              type="button"
            >
              <Layers size={14} /> Build Deck
            </button>
            <button
              className="btn-ghost flex items-center gap-2"
              onClick={() => onNavigate("combat-hall")}
              data-testid="enter-battle-btn"
              type="button"
            >
              <Swords size={14} /> Battle
            </button>
          </div>
        </div>

        <div
          className="hidden md:block shrink-0 w-[280px] h-[200px] rounded-lg animate-float relative"
          style={{
            backgroundImage:
              "url(https://images.unsplash.com/photo-1519682577862-22b62b24e493?crop=entropy&cs=srgb&fm=jpg&ixlib=rb-4.1.0&q=85)",
            backgroundSize: "cover",
            backgroundPosition: "top center",
            border: "2px solid rgba(212,175,55,0.5)",
            boxShadow: "0 0 40px rgba(212,175,55,0.4), inset 0 0 40px rgba(0,0,0,0.5)",
          }}
        />
      </section>

      {/* Quick start */}
      <section className="max-w-6xl mx-auto mb-8">
        <div className="section-heading mb-2">Quick start</div>
        <p className="font-lore text-[#9a7b3c] text-sm mb-4 max-w-2xl">
          New here? Summon cards, build a deck, then enter the Battle Arena. Use the sidebar for ranked PvP, raids, guilds, and more.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {QUICK_START.map((h) => (
            <button
              key={h.tab}
              onClick={() => onNavigate(h.tab)}
              data-testid={`quick-start-${h.tab}`}
              className="group relative panel-gold p-4 text-left flex flex-col justify-end overflow-hidden min-h-[140px] transition"
              style={{
                backgroundImage: h.img
                  ? `linear-gradient(180deg, rgba(7,5,10,0.45), rgba(7,5,10,0.95)), url(${h.img})`
                  : "linear-gradient(180deg, rgba(22,15,8,0.95), rgba(10,6,3,0.95))",
                backgroundSize: "cover",
                backgroundPosition: "center",
                borderColor: `${h.tint}55`,
              }}
              type="button"
            >
              <div className="corner-deco absolute inset-0 pointer-events-none" />
              <span
                className="absolute top-3 left-3 font-stat text-[10px] tracking-[0.25em] px-2 py-0.5 rounded"
                style={{ background: `${h.tint}33`, color: h.tint, border: `1px solid ${h.tint}88` }}
              >
                STEP {h.step}
              </span>
              <div
                className="absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center transition group-hover:scale-110"
                style={{
                  background: `${h.tint}22`,
                  border: `1px solid ${h.tint}aa`,
                  boxShadow: `0 0 14px ${h.tint}44`,
                }}
              >
                <h.Icon size={16} style={{ color: h.tint }} />
              </div>
              <div className="relative z-10">
                <div className="font-heading text-[15px] tracking-[0.15em]" style={{ color: h.tint }}>
                  {h.label.toUpperCase()}
                </div>
                <div className="font-lore text-[#d6c293] text-sm">{h.desc}</div>
                <div className="mt-2 flex items-center gap-1 text-[#c9a74a] text-xs font-stat tracking-[0.2em] opacity-0 group-hover:opacity-100 transition">
                  GO <ChevronRight size={11} />
                </div>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Daily hooks */}
      <section className="max-w-6xl mx-auto mb-10">
        <div className="section-heading mb-4">Today&apos;s goals</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {DAILY_HOOKS.map((h) => (
            <button
              key={h.tab}
              onClick={() => onNavigate(h.tab)}
              data-testid={`daily-hook-${h.tab}`}
              className="group panel-gold p-4 text-left flex items-center gap-4 transition hover:border-[rgba(245,200,66,0.45)]"
              type="button"
            >
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center shrink-0"
                style={{ background: `${h.tint}22`, border: `1px solid ${h.tint}66` }}
              >
                <h.Icon size={22} style={{ color: h.tint }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-heading text-sm tracking-wide" style={{ color: h.tint }}>
                  {h.label}
                </div>
                <div className="font-lore text-[#d6c293] text-sm">{h.desc}</div>
              </div>
              <ChevronRight size={16} className="text-[#c9a74a] shrink-0 opacity-60 group-hover:opacity-100" />
            </button>
          ))}
        </div>
      </section>

      {/* Weekly Cycle */}
      <section className="max-w-6xl mx-auto mb-8">
        <div className="section-heading mb-5">Weekly Cycle · Day {dayOfWeek}</div>
        <div className="panel-gold p-5 relative">
          <div className="corner-deco absolute inset-0" />
          <div className="grid grid-cols-7 gap-3 relative z-10">
            {rewardPath.map((r) => (
              <div
                key={r.day}
                data-testid={`reward-day-${r.day}`}
                className="relative flex flex-col items-center gap-2 p-3 rounded-lg transition"
                style={{
                  background: r.current
                    ? "linear-gradient(180deg, rgba(245,200,66,0.12), rgba(212,175,55,0.04))"
                    : r.unlocked
                      ? "linear-gradient(180deg, rgba(22,15,8,0.9), rgba(10,6,3,0.9))"
                      : "linear-gradient(180deg, rgba(15,10,6,0.6), rgba(8,5,3,0.6))",
                  border: r.current
                    ? "1.5px solid #f5c842"
                    : r.unlocked
                      ? "1px solid rgba(212,175,55,0.35)"
                      : "1px dashed rgba(212,175,55,0.15)",
                  boxShadow: r.current ? "0 0 22px rgba(245,200,66,0.5)" : "none",
                  opacity: r.unlocked ? 1 : 0.5,
                }}
              >
                <div className="font-stat text-[10px] tracking-[0.25em] text-[#c9a74a]">DAY {r.day}</div>
                <div className="text-3xl">{r.icon}</div>
                <div className="font-heading text-xs text-[#f8e4a1] text-center leading-tight">{r.name}</div>
                {r.unlocked ? (
                  <div className="font-stat text-[9px] tracking-[0.2em] text-[#4CAF50]">UNLOCKED</div>
                ) : (
                  <div className="font-stat text-[9px] tracking-[0.2em] text-[#7e6a2e]">LOCKED</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom row */}
      <section className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="panel-gold p-5 relative">
          <div className="corner-deco absolute inset-0" />
          <div className="flex items-center gap-2 mb-4">
            <Gift size={16} className="text-[#f5c842]" />
            <div className="font-heading text-[#f5c842] tracking-[0.2em]">DAILY BONUS</div>
          </div>
          <StatRow label="Current Streak" value={`${daily.streak} days`} />
          <StatRow label="Claimed this Cycle" value={`${claimedThisCycle} / 7`} />
          <StatRow label="Claimed Today" value={claimedToday ? "Yes" : "No"} highlight={claimedToday} />
          <StatRow label="Path" value={<span className="flex items-center gap-1"><Flame size={12} /> {pathLabel}</span>} />
          <button
            className="btn-gold w-full mt-4 disabled:opacity-60"
            data-testid="claim-daily-btn"
            type="button"
            disabled={claimedToday || claiming}
            onClick={() => void handleDailyClaim()}
          >
            {claiming ? "Claiming…" : claimedToday ? "Already Claimed" : "Claim Daily Bonus"}
          </button>
        </div>

        <div className="panel-gold p-5 relative">
          <div className="corner-deco absolute inset-0" />
          <div className="flex items-center gap-2 mb-4">
            <Crown size={16} className="text-[#f5c842]" />
            <div className="font-heading text-[#f5c842] tracking-[0.2em]">DAILY QUESTS</div>
          </div>
          <div className="space-y-3">
            {quests.map((q) => {
              const pct = Math.min(100, (q.progress / q.total) * 100);
              return (
                <div key={q.id} data-testid={`quest-${q.id}`}>
                  <div className="flex justify-between items-baseline mb-1">
                    <div className="font-heading text-[13px] text-[#f8e4a1]">{q.name}</div>
                    <div className="font-stat text-[11px] text-[#c9a74a]">
                      {q.progress}/{q.total}
                    </div>
                  </div>
                  <div
                    className="h-2 rounded-full overflow-hidden"
                    style={{ background: "rgba(10,6,3,0.9)", border: "1px solid rgba(212,175,55,0.3)" }}
                  >
                    <div
                      className="h-full"
                      style={{
                        width: `${pct}%`,
                        background: q.claimed
                          ? "linear-gradient(90deg, #4CAF50, #2E7D32)"
                          : "linear-gradient(90deg, #ffb300, #d4af37)",
                        boxShadow: q.claimed ? "0 0 10px rgba(76,175,80,0.5)" : "0 0 10px rgba(245,200,66,0.5)",
                      }}
                    />
                  </div>
                  <div className="font-stat text-[10px] tracking-[0.2em] text-[#7e6a2e] mt-1">
                    Reward: {q.reward} {q.claimed && "· CLAIMED"}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div
          className="panel-gold p-5 relative overflow-hidden flex flex-col"
          style={{
            backgroundImage: "linear-gradient(180deg, rgba(30,10,50,0.9), rgba(10,6,20,0.95))",
            borderColor: "rgba(186,104,200,0.5)",
          }}
        >
          <div className="flex items-center gap-2 mb-3">
            <Package size={16} className="text-[#ba68c8]" />
            <div className="font-heading text-[#e1bee7] tracking-[0.2em]">MYSTERY BOXES</div>
          </div>
          <p className="font-lore text-[#d6c293]">One sealed tome awaits your touch.</p>
          <div className="flex-1 flex items-center justify-center my-5 animate-float" style={{ minHeight: 120 }}>
            <div className="text-7xl" style={{ filter: "drop-shadow(0 0 20px rgba(186,104,200,0.7))" }}>
              🎁
            </div>
          </div>
          <button
            className="btn-gold w-full flex items-center justify-center gap-2"
            data-testid="open-mystery-btn"
            type="button"
            disabled={(playerState.mysteryBoxesPending ?? 0) === 0 || openingBox}
            onClick={() => {
              if (openingBox || (playerState.mysteryBoxesPending ?? 0) <= 0) return;
              setOpeningBox(true);
              try {
                const result = openMysteryBox(playerState);
                if (!result) {
                  toast({ title: "No boxes", description: "Win battles to earn mystery boxes.", variant: "destructive" });
                  return;
                }
                onStateChange(result.state);
                toast({ title: "Mystery box opened", description: `+${result.gold} gold${result.stardust > 0 ? `, +${result.stardust} stardust` : ""}` });
              } finally {
                setOpeningBox(false);
              }
            }}
          >
            Open <ChevronRight size={14} />
          </button>
        </div>
      </section>
    </div>
  );
}

function StatRow(props: { label: string; value: React.ReactNode; highlight?: boolean }) {
  const { label, value, highlight } = props;
  return (
    <div className="flex items-baseline justify-between py-2 border-b border-[rgba(212,175,55,0.15)] last:border-0">
      <div className="font-stat text-[11px] tracking-[0.2em] uppercase text-[#c9a74a]">{label}</div>
      <div className={`font-heading text-sm ${highlight ? "text-[#4CAF50]" : "text-[#f8e4a1]"}`}>{value}</div>
    </div>
  );
}

