import { useMemo, useState } from "react";
import { ScrollText, CheckCircle2, Clock, Coins, Sparkles } from "lucide-react";
import type { PlayerState } from "@/lib/playerState";
import HallLayout, { HallSection, HallStat } from "@/components/scene/HallLayout";
import GlassPanel from "@/components/scene/GlassPanel";
import { cn } from "@/lib/utils";

interface Quest {
  id: string;
  title: string;
  description: string;
  progress: number;
  goal: number;
  reward: { gold?: number; stardust?: number };
  category: "daily" | "weekly";
  done?: boolean;
}

// Visual shell with mock quests until wired to questEngine
const MOCK_QUESTS: Quest[] = [
  { id: "q1", title: "First Blood", description: "Win a battle today", progress: 1, goal: 1, reward: { gold: 50 }, category: "daily", done: true },
  { id: "q2", title: "Card Hunter", description: "Open 3 packs", progress: 2, goal: 3, reward: { gold: 100, stardust: 5 }, category: "daily" },
  { id: "q3", title: "Battle Hardened", description: "Win 5 battles", progress: 3, goal: 5, reward: { gold: 200 }, category: "daily" },
  { id: "q4", title: "Master Strategist", description: "Win 20 battles this week", progress: 12, goal: 20, reward: { gold: 500, stardust: 25 }, category: "weekly" },
  { id: "q5", title: "Collector's Pride", description: "Own 30 unique cards", progress: 18, goal: 30, reward: { stardust: 50 }, category: "weekly" },
];

interface Props { playerState: PlayerState; onStateChange: (s: PlayerState) => void }

export default function QuestsHall({ playerState }: Props) {
  const [filter, setFilter] = useState<"all" | "daily" | "weekly">("all");
  const quests = useMemo(() => filter === "all" ? MOCK_QUESTS : MOCK_QUESTS.filter((q) => q.category === filter), [filter]);
  const completed = MOCK_QUESTS.filter((q) => q.done).length;

  return (
    <HallLayout
      sidebar={
        <>
          <HallSection title="Quest Log" hue="var(--primary)" glow={0.5}>
            <div className="flex items-center gap-2 mb-3">
              <ScrollText className="w-4 h-4 text-primary" />
              <span className="text-xs text-muted-foreground">Daily & weekly tasks</span>
            </div>
            <HallStat label="Completed" value={`${completed}/${MOCK_QUESTS.length}`} />
            <HallStat label="Resets in" value="6h 12m" hue="var(--rare))" />
            <HallStat label="Gold today" value={`${playerState.gold.toLocaleString()}`} hue="var(--legendary)" />
          </HallSection>

          <HallSection title="Filter" hue="var(--primary)" glow={0.3}>
            <div className="grid grid-cols-3 gap-1.5">
              {(["all", "daily", "weekly"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={cn(
                    "px-2 py-1.5 rounded-lg text-[11px] uppercase tracking-wider transition-colors",
                    filter === f ? "bg-primary/20 text-foreground ring-1 ring-primary/40" : "text-muted-foreground hover:text-foreground hover:bg-foreground/5"
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
        <GlassPanel hue="var(--primary)" glow={0.4} padding="md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Today's Quests</p>
              <h1 className="font-heading text-lg text-foreground">Earn rewards, climb ranks</h1>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Streak</p>
              <p className="font-heading text-lg text-[hsl(var(--legendary))]">{playerState.dailyLogin?.streak ?? 0}d</p>
            </div>
          </div>
        </GlassPanel>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {quests.map((q) => (
          <QuestCard key={q.id} quest={q} />
        ))}
      </div>
    </HallLayout>
  );
}

function QuestCard({ quest }: { quest: Quest }) {
  const pct = Math.min(100, (quest.progress / quest.goal) * 100);
  const hue = quest.done ? "var(--legendary)" : quest.category === "weekly" ? "var(--rare)" : "var(--primary)";
  return (
    <GlassPanel hue={hue} glow={quest.done ? 0.6 : 0.35} padding="md">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {quest.done ? <CheckCircle2 className="w-4 h-4 text-[hsl(var(--legendary))] shrink-0" /> : <Clock className="w-4 h-4 text-muted-foreground shrink-0" />}
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
      <div className="flex items-center gap-3 mt-3 pt-3 border-t border-border/30">
        {quest.reward.gold && (
          <span className="flex items-center gap-1 text-xs text-[hsl(var(--legendary))]"><Coins className="w-3 h-3" /> {quest.reward.gold}</span>
        )}
        {quest.reward.stardust && (
          <span className="flex items-center gap-1 text-xs text-[hsl(var(--rare))]"><Sparkles className="w-3 h-3" /> {quest.reward.stardust}</span>
        )}
      </div>
    </GlassPanel>
  );
}
