import { useMemo, useState } from "react";
import { ScrollText, CheckCircle2, Clock, Coins, Sparkles } from "lucide-react";
import type { PlayerState } from "@/lib/playerState";
import HallLayout, { HallSection, HallStat } from "@/components/scene/HallLayout";
import GlassPanel from "@/components/scene/GlassPanel";
import { texCodex, texParchment, texVelvet } from "@/components/scene/panelTextures";
import { cn } from "@/lib/utils";
import { claimQuestReward, getQuestTimeUntilReset, loadDailyQuests, type DailyQuestState } from "@/lib/questEngine";

interface Quest {
  id: string;
  title: string;
  description: string;
  progress: number;
  goal: number;
  reward: { gold?: number; stardust?: number };
  category: "daily" | "weekly";
  done?: boolean;
  claimed?: boolean;
}

interface Props { playerState: PlayerState; onStateChange: (s: PlayerState) => void }

function fmtCountdown(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${h}h ${m}m`;
}

export default function QuestsHall({ playerState, onStateChange }: Props) {
  const [filter, setFilter] = useState<"all" | "daily" | "weekly">("all");
  const [questState, setQuestState] = useState<DailyQuestState>(() => loadDailyQuests());

  const questsAll = useMemo((): Quest[] => {
    const qs = loadDailyQuests();
    // Keep UI in sync if day rolled over while the app stayed open.
    if (qs.lastResetDate !== questState.lastResetDate) setQuestState(qs);

    const byId = new Map(qs.quests.map((q) => [q.questId, q]));
    return qs.questDefinitions
      .map((d) => {
        const p = byId.get(d.id);
        if (!p) return null;
        return {
          id: d.id,
          title: d.title,
          description: d.description,
          progress: p.current,
          goal: d.target,
          reward: { gold: d.goldReward, stardust: d.stardustReward },
          category: "daily",
          done: p.completed,
          claimed: p.claimed,
        } satisfies Quest;
      })
      .filter(Boolean) as Quest[];
  }, [questState.lastResetDate]);

  const quests = useMemo(() => {
    if (filter === "all") return questsAll;
    return questsAll.filter((q) => q.category === filter);
  }, [filter, questsAll]);

  const completed = questsAll.filter((q) => q.done).length;

  return (
    <HallLayout
      sidebar={
        <>
          <HallSection title="Quest Log" hue="var(--primary)" glow={0.5} bg={texCodex}>
            <div className="flex items-center gap-2 mb-3">
              <ScrollText className="w-4 h-4 text-primary" />
              <span className="text-xs text-foreground/80 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">Daily & weekly tasks</span>
            </div>
            <HallStat label="Completed" value={`${completed}/${questsAll.length}`} />
            <HallStat label="Resets in" value={fmtCountdown(getQuestTimeUntilReset())} hue="var(--rare)" />
            <HallStat label="Gold today" value={`${playerState.gold.toLocaleString()}`} hue="var(--legendary)" />
          </HallSection>

          <HallSection title="Filter" hue="var(--primary)" glow={0.3} bg={texParchment}>
            <div className="grid grid-cols-3 gap-1.5">
              {(["all", "daily", "weekly"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={cn(
                    "px-2 py-1.5 rounded-lg text-[11px] uppercase tracking-wider transition-colors",
                    filter === f ? "bg-primary/20 text-foreground ring-1 ring-primary/40" : "text-foreground/80 hover:text-foreground hover:bg-foreground/10 bg-background/30"
                  )}
                >
                  {f}
                </button>
              ))}
            </div>
          </HallSection>
        </>
      }
      header={
        <GlassPanel hue="var(--primary)" glow={0.4} padding="md" bg={texVelvet}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-foreground/80 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">Today's Quests</p>
              <h1 className="font-heading text-lg text-foreground drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">Earn rewards, climb ranks</h1>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-widest text-foreground/80 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">Streak</p>
              <p className="font-heading text-lg text-[hsl(var(--legendary))] drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">{playerState.dailyLogin?.streak ?? 0}d</p>
            </div>
          </div>
        </GlassPanel>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {quests.map((q) => (
          <QuestCard
            key={q.id}
            quest={q}
            onClaim={() => {
              const res = claimQuestReward(questState, q.id, playerState);
              if (!res) return;
              setQuestState(res.questState);
              onStateChange(res.playerState);
            }}
          />
        ))}
      </div>
    </HallLayout>
  );
}

function QuestCard({ quest, onClaim }: { quest: Quest; onClaim: () => void }) {
  const pct = Math.min(100, (quest.progress / quest.goal) * 100);
  const hue = quest.claimed ? "var(--legendary)" : quest.done ? "var(--legendary)" : quest.category === "weekly" ? "var(--rare)" : "var(--primary)";
  return (
    <GlassPanel hue={hue} glow={quest.done ? 0.6 : 0.35} padding="md">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {quest.done ? (
              <CheckCircle2 className="w-4 h-4 text-[hsl(var(--legendary))] shrink-0" />
            ) : (
              <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
            )}
            <h3 className="font-heading text-sm text-foreground truncate">{quest.title}</h3>
          </div>
          <p className="text-xs text-muted-foreground mt-1">{quest.description}</p>
        </div>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground shrink-0">{quest.category}</span>
      </div>
      <div className="mt-3">
        <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
          <span>{quest.progress}/{quest.goal}</span>
          <span>{Math.round(pct)}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-foreground/10 overflow-hidden">
          <div className="h-full transition-all" style={{ width: `${pct}%`, background: `linear-gradient(90deg, hsl(${hue}/0.6), hsl(${hue}))` }} />
        </div>
      </div>
      <div className="flex items-center justify-between gap-3 mt-3 pt-3 border-t border-border/30">
        <div className="flex items-center gap-3">
        {quest.reward.gold && (
          <span className="flex items-center gap-1 text-xs text-[hsl(var(--legendary))]"><Coins className="w-3 h-3" /> {quest.reward.gold}</span>
        )}
        {quest.reward.stardust && (
          <span className="flex items-center gap-1 text-xs text-[hsl(var(--rare))]"><Sparkles className="w-3 h-3" /> {quest.reward.stardust}</span>
        )}
        </div>
        {quest.done && !quest.claimed && (
          <button
            type="button"
            className="px-3 py-1.5 rounded-lg bg-primary/20 text-foreground ring-1 ring-primary/40 text-[11px] uppercase tracking-wider hover:bg-primary/25 transition-colors"
            onClick={onClaim}
            data-testid={`quest-claim-${quest.id}`}
          >
            Claim
          </button>
        )}
        {quest.claimed && (
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Claimed</span>
        )}
      </div>
    </GlassPanel>
  );
}
