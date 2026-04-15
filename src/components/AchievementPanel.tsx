import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ACHIEVEMENTS, loadAchievementState, type AchievementState, type AchievementDefinition } from "@/lib/achievementEngine";
import type { PlayerState } from "@/lib/playerState";

interface AchievementPanelProps {
  playerState: PlayerState;
}

type Category = "all" | "collection" | "battle" | "progression" | "economy";

const CATEGORY_LABELS: Record<Category, string> = {
  all: "All",
  collection: "Collection",
  battle: "Battle",
  progression: "Progression",
  economy: "Economy",
};

export default function AchievementPanel({ playerState }: AchievementPanelProps) {
  const [achieveState, setAchieveState] = useState<AchievementState>(loadAchievementState);
  const [filter, setFilter] = useState<Category>("all");

  useEffect(() => {
    setAchieveState(loadAchievementState());
  }, [playerState]);

  const filtered = ACHIEVEMENTS.filter(a => filter === "all" || a.category === filter);
  const unlockedCount = ACHIEVEMENTS.filter(a => achieveState.unlocked[a.id]).length;

  return (
    <div>
      <div className="mb-6">
        <h2 className="font-heading text-2xl font-bold text-foreground">Achievements</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {unlockedCount}/{ACHIEVEMENTS.length} unlocked
        </p>
      </div>

      {/* Category Filter */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {(Object.keys(CATEGORY_LABELS) as Category[]).map(cat => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              filter === cat
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-secondary"
            }`}
          >
            {CATEGORY_LABELS[cat]}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map((ach) => {
          const unlocked = !!achieveState.unlocked[ach.id];
          return (
            <Card
              key={ach.id}
              className={`transition-all ${unlocked ? "border-primary/30 bg-primary/5" : "opacity-60"}`}
            >
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`text-2xl ${unlocked ? "" : "grayscale"}`}>{ach.icon}</div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-heading font-bold text-sm text-foreground">{ach.title}</h3>
                  <p className="text-xs text-muted-foreground truncate">{ach.description}</p>
                </div>
                {unlocked && (
                  <span className="text-xs text-primary font-bold">✓</span>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
