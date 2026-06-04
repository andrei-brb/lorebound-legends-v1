import { useEffect, useMemo, useState } from "react";
import { Trophy, Lock, CheckCircle2 } from "lucide-react";
import type { PlayerState } from "@/lib/playerState";
import {
  ACHIEVEMENTS,
  loadAchievementState,
  type AchievementDefinition,
  type AchievementState,
} from "@/lib/achievementEngine";
import HallLayout, { HallSection, HallStat } from "@/components/scene/HallLayout";
import GlassPanel from "@/components/scene/GlassPanel";
import HexAvatar from "@/components/scene/HexAvatar";
import { texGilded, texThrone } from "@/components/scene/panelTextures";
import { cn } from "@/lib/utils";

type Category = "all" | AchievementDefinition["category"];

const CATEGORY_LABELS: Record<Category, string> = {
  all: "All",
  collection: "Collection",
  battle: "Battle",
  progression: "Progression",
  economy: "Economy",
};

interface Props { playerState: PlayerState }

export default function BadgesHall({ playerState }: Props) {
  const [achieveState, setAchieveState] = useState<AchievementState>(loadAchievementState);
  const [cat, setCat] = useState<Category>("all");

  useEffect(() => {
    setAchieveState(loadAchievementState());
  }, [playerState]);

  const list = useMemo(
    () => ACHIEVEMENTS.filter((a) => cat === "all" || a.category === cat),
    [cat],
  );
  const unlocked = ACHIEVEMENTS.filter((a) => achieveState.unlocked[a.id]).length;

  return (
    <HallLayout
      sidebar={
        <>
          <HallSection title="Hall of Honor" hue="var(--legendary)" glow={0.5} bg={texGilded}>
            <div className="flex items-center gap-2 mb-3">
              <Trophy className="w-4 h-4 text-[hsl(var(--legendary))]" />
              <span className="text-xs text-foreground/80 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">Earned achievements</span>
            </div>
            <HallStat label="Unlocked" value={`${unlocked}/${ACHIEVEMENTS.length}`} hue="var(--legendary)" />
            <HallStat label="Completion" value={`${ACHIEVEMENTS.length ? Math.round((unlocked / ACHIEVEMENTS.length) * 100) : 0}%`} />
          </HallSection>

          <HallSection title="Categories" hue="var(--legendary)" glow={0.3} bg={texThrone} bgTint={0.7}>
            <div className="space-y-1">
              {(Object.keys(CATEGORY_LABELS) as Category[]).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCat(c)}
                  className={cn(
                    "w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition-colors",
                    cat === c ? "bg-[hsl(var(--legendary)/0.25)] text-foreground ring-1 ring-[hsl(var(--legendary)/0.5)]" : "text-foreground/85 hover:bg-foreground/10 bg-background/30",
                  )}
                >
                  {CATEGORY_LABELS[c]}
                </button>
              ))}
            </div>
          </HallSection>
        </>
      }
    >
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {list.map((ach) => (
          <BadgeCard key={ach.id} achievement={ach} unlocked={!!achieveState.unlocked[ach.id]} />
        ))}
      </div>
    </HallLayout>
  );
}

function BadgeCard({ achievement, unlocked }: { achievement: AchievementDefinition; unlocked: boolean }) {
  const hue = unlocked ? "var(--legendary)" : "var(--muted-foreground)";
  return (
    <GlassPanel hue={hue} glow={unlocked ? 0.55 : 0.2} padding="md">
      <div className="flex flex-col items-center text-center gap-2">
        <div className="relative">
          <HexAvatar size={64} hue={hue}>
            <span className={cn("text-2xl", !unlocked && "grayscale opacity-40")}>{achievement.icon}</span>
          </HexAvatar>
          {!unlocked ? (
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-background flex items-center justify-center">
              <Lock className="w-3 h-3 text-muted-foreground" />
            </div>
          ) : (
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-background flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4 text-[hsl(var(--legendary))]" />
            </div>
          )}
        </div>
        <h4 className={cn("font-heading text-sm mt-1", unlocked ? "text-foreground" : "text-muted-foreground")}>{achievement.title}</h4>
        <p className="text-[10px] text-muted-foreground leading-tight">{achievement.description}</p>
        <span className="text-[9px] uppercase tracking-wider text-muted-foreground">{achievement.category}</span>
      </div>
    </GlassPanel>
  );
}
