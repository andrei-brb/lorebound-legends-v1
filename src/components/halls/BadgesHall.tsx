import { useMemo, useState } from "react";
import { Trophy, Lock, CheckCircle2 } from "lucide-react";
import type { PlayerState } from "@/lib/playerState";
import HallLayout, { HallSection, HallStat } from "@/components/scene/HallLayout";
import GlassPanel from "@/components/scene/GlassPanel";
import HexAvatar from "@/components/scene/HexAvatar";
import { cn } from "@/lib/utils";

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlocked: boolean;
  category: "combat" | "collection" | "social" | "milestone";
}

const MOCK_BADGES: Badge[] = [
  { id: "b1", name: "First Victory", description: "Win your first battle", icon: "⚔", unlocked: true, category: "combat" },
  { id: "b2", name: "Veteran", description: "Win 50 battles", icon: "🏅", unlocked: true, category: "combat" },
  { id: "b3", name: "Conqueror", description: "Win 100 battles", icon: "👑", unlocked: false, category: "combat" },
  { id: "b4", name: "Collector", description: "Own 25 unique cards", icon: "📚", unlocked: true, category: "collection" },
  { id: "b5", name: "Legendary Hunter", description: "Own 5 legendaries", icon: "✨", unlocked: false, category: "collection" },
  { id: "b6", name: "Friend Indeed", description: "Add 5 friends", icon: "🤝", unlocked: false, category: "social" },
  { id: "b7", name: "Trader", description: "Complete 10 trades", icon: "🔁", unlocked: false, category: "social" },
  { id: "b8", name: "Week One", description: "Login 7 days in a row", icon: "📅", unlocked: true, category: "milestone" },
  { id: "b9", name: "Card Master", description: "Reach card level 10", icon: "🌟", unlocked: false, category: "milestone" },
];

interface Props { playerState: PlayerState }

export default function BadgesHall({ playerState }: Props) {
  const [cat, setCat] = useState<"all" | Badge["category"]>("all");
  const list = useMemo(() => cat === "all" ? MOCK_BADGES : MOCK_BADGES.filter((b) => b.category === cat), [cat]);
  const unlocked = MOCK_BADGES.filter((b) => b.unlocked).length;

  return (
    <HallLayout
      sidebar={
        <>
          <HallSection title="Hall of Honor" hue="var(--legendary)" glow={0.5}>
            <div className="flex items-center gap-2 mb-3">
              <Trophy className="w-4 h-4 text-[hsl(var(--legendary))]" />
              <span className="text-xs text-muted-foreground">Earned achievements</span>
            </div>
            <HallStat label="Unlocked" value={`${unlocked}/${MOCK_BADGES.length}`} hue="var(--legendary)" />
            <HallStat label="Completion" value={`${Math.round((unlocked / MOCK_BADGES.length) * 100)}%`} />
          </HallSection>

          <HallSection title="Categories" hue="var(--legendary)" glow={0.3}>
            <div className="space-y-1">
              {(["all", "combat", "collection", "social", "milestone"] as const).map((c) => (
                <button
                  key={c}
                  onClick={() => setCat(c)}
                  className={cn(
                    "w-full text-left px-2.5 py-1.5 rounded-lg text-xs capitalize transition-colors",
                    cat === c ? "bg-[hsl(var(--legendary)/0.15)] text-foreground ring-1 ring-[hsl(var(--legendary)/0.4)]" : "text-muted-foreground hover:bg-foreground/5"
                  )}
                >
                  {c}
                </button>
              ))}
            </div>
          </HallSection>
        </>
      }
    >
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {list.map((b) => (
          <BadgeCard key={b.id} badge={b} />
        ))}
      </div>
    </HallLayout>
  );
}

function BadgeCard({ badge }: { badge: Badge }) {
  const hue = badge.unlocked ? "var(--legendary)" : "var(--muted-foreground)";
  return (
    <GlassPanel hue={hue} glow={badge.unlocked ? 0.55 : 0.2} padding="md">
      <div className="flex flex-col items-center text-center gap-2">
        <div className="relative">
          <HexAvatar size={64} hue={hue}>
            <span className={cn("text-2xl", !badge.unlocked && "grayscale opacity-40")}>{badge.icon}</span>
          </HexAvatar>
          {!badge.unlocked && (
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-background flex items-center justify-center">
              <Lock className="w-3 h-3 text-muted-foreground" />
            </div>
          )}
          {badge.unlocked && (
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-background flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4 text-[hsl(var(--legendary))]" />
            </div>
          )}
        </div>
        <h4 className={cn("font-heading text-sm mt-1", badge.unlocked ? "text-foreground" : "text-muted-foreground")}>{badge.name}</h4>
        <p className="text-[10px] text-muted-foreground leading-tight">{badge.description}</p>
      </div>
    </GlassPanel>
  );
}
