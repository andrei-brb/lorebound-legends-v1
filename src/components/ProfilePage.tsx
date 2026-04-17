import { useMemo, useState } from "react";
import { Trophy, Edit3, Lock, Coins, Sparkles, Swords, BookOpen, Shield } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { PlayerState } from "@/lib/playerState";
import { AVATARS, getAvatar, type AvatarDefinition } from "@/data/avatars";
import { TITLES, getTitle, type TitleDefinition } from "@/data/titles";
import { loadAchievementState, type AchievementState } from "@/lib/achievementEngine";
import { allCards } from "@/data/cards";
import { getBattlePassLevelFromXp } from "@/lib/battlePassEngine";

interface ProfilePageProps {
  playerState: PlayerState;
  onStateChange: (state: PlayerState) => void;
}

export default function ProfilePage({ playerState, onStateChange }: ProfilePageProps) {
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [titleOpen, setTitleOpen] = useState(false);

  const ach: AchievementState = useMemo(() => loadAchievementState(), []);
  const profile = playerState.profile ?? { avatarId: "default", titleId: null, bannerId: null };
  const avatar = getAvatar(profile.avatarId);
  const title = getTitle(profile.titleId);

  const autoUnlocked = useMemo(() => {
    const unlockedAv = new Set(playerState.unlockedAvatars ?? ["default"]);
    const unlockedTi = new Set(playerState.unlockedTitles ?? []);
    let changed = false;
    for (const a of AVATARS) {
      if (!unlockedAv.has(a.id) && a.unlock(playerState, ach)) {
        unlockedAv.add(a.id);
        changed = true;
      }
    }
    for (const t of TITLES) {
      if (!unlockedTi.has(t.id) && t.unlock(playerState, ach)) {
        unlockedTi.add(t.id);
        changed = true;
      }
    }
    if (changed) {
      onStateChange({
        ...playerState,
        unlockedAvatars: Array.from(unlockedAv),
        unlockedTitles: Array.from(unlockedTi),
      });
    }
    return { avatars: unlockedAv, titles: unlockedTi };
  }, [playerState, ach, onStateChange]);

  const totalCards = allCards.length;
  const owned = playerState.ownedCardIds.length;
  const collectionPct = Math.round((owned / Math.max(1, totalCards)) * 100);
  const totalLevels = Object.values(playerState.cardProgress).reduce((s, p) => s + (p.level || 1), 0);
  const bp = playerState.battlePass;
  const activeSeason = bp?.seasons?.[bp.activeSeasonId];
  const bpXp = activeSeason?.xp ?? 0;
  const bpLevel = getBattlePassLevelFromXp(bpXp);
  const wins = ach.stats.totalWins;
  const battles = ach.stats.totalBattles;
  const winRate = battles > 0 ? Math.round((wins / battles) * 100) : 0;

  const selectAvatar = (a: AvatarDefinition) => {
    if (!autoUnlocked.avatars.has(a.id)) return;
    onStateChange({ ...playerState, profile: { ...profile, avatarId: a.id } });
    setAvatarOpen(false);
  };
  const selectTitle = (t: TitleDefinition | null) => {
    if (t && !autoUnlocked.titles.has(t.id)) return;
    onStateChange({ ...playerState, profile: { ...profile, titleId: t?.id ?? null } });
    setTitleOpen(false);
  };

  return (
    <div className="space-y-6">
      <Card className="relative overflow-hidden p-6 bg-gradient-to-br from-card via-card to-secondary/30 border-border">
        <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-start">
          <Dialog open={avatarOpen} onOpenChange={setAvatarOpen}>
            <DialogTrigger asChild>
              <button className="group relative w-28 h-28 rounded-2xl bg-secondary/60 border-2 border-primary/40 flex items-center justify-center text-7xl hover:border-primary transition-colors shadow-lg">
                {avatar.emoji}
                <span className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground rounded-full p-1.5 opacity-90 group-hover:opacity-100">
                  <Edit3 className="w-3.5 h-3.5" />
                </span>
              </button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader><DialogTitle>Choose Avatar</DialogTitle></DialogHeader>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 max-h-[60vh] overflow-y-auto pr-1">
                {AVATARS.map((a) => {
                  const unlocked = autoUnlocked.avatars.has(a.id);
                  return (
                    <button
                      key={a.id}
                      disabled={!unlocked}
                      onClick={() => selectAvatar(a)}
                      className={cn(
                        "relative aspect-square rounded-xl border-2 flex flex-col items-center justify-center gap-1 p-2 transition-all",
                        unlocked
                          ? profile.avatarId === a.id
                            ? "border-primary bg-primary/10 ring-2 ring-primary/40"
                            : "border-border hover:border-primary/60 bg-secondary/40"
                          : "border-border/50 bg-secondary/20 opacity-50 cursor-not-allowed",
                      )}
                    >
                      <span className="text-4xl">{a.emoji}</span>
                      <span className="text-[10px] font-medium text-foreground text-center leading-tight">{a.name}</span>
                      {!unlocked && (
                        <span className="absolute top-1 right-1 text-muted-foreground"><Lock className="w-3 h-3" /></span>
                      )}
                      {!unlocked && (
                        <span className="text-[9px] text-muted-foreground text-center px-1 leading-tight">{a.unlockHint}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </DialogContent>
          </Dialog>

          <div className="flex-1 text-center sm:text-left">
            <h2 className="font-heading text-2xl font-bold text-foreground">{avatar.name}</h2>
            <Dialog open={titleOpen} onOpenChange={setTitleOpen}>
              <DialogTrigger asChild>
                <button className={cn("text-sm mt-1 inline-flex items-center gap-1.5 hover:underline", title?.color ?? "text-muted-foreground")}>
                  {title ? title.label : "No title"}
                  <Edit3 className="w-3 h-3 opacity-60" />
                </button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader><DialogTitle>Choose Title</DialogTitle></DialogHeader>
                <div className="space-y-1 max-h-[60vh] overflow-y-auto pr-1">
                  <button
                    onClick={() => selectTitle(null)}
                    className={cn(
                      "w-full text-left px-3 py-2 rounded-md transition-colors",
                      profile.titleId === null ? "bg-primary/15 border border-primary/40" : "hover:bg-secondary/60 border border-transparent",
                    )}
                  >
                    <span className="text-sm text-muted-foreground italic">No title</span>
                  </button>
                  {TITLES.map((t) => {
                    const unlocked = autoUnlocked.titles.has(t.id);
                    return (
                      <button
                        key={t.id}
                        disabled={!unlocked}
                        onClick={() => selectTitle(t)}
                        className={cn(
                          "w-full text-left px-3 py-2 rounded-md transition-colors flex items-center justify-between",
                          unlocked
                            ? profile.titleId === t.id
                              ? "bg-primary/15 border border-primary/40"
                              : "hover:bg-secondary/60 border border-transparent"
                            : "opacity-50 cursor-not-allowed border border-transparent",
                        )}
                      >
                        <span className={cn("text-sm font-medium", t.color)}>{t.label}</span>
                        {!unlocked && (
                          <span className="text-[10px] text-muted-foreground inline-flex items-center gap-1">
                            <Lock className="w-3 h-3" /> {t.unlockHint}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </DialogContent>
            </Dialog>
            <div className="mt-3 flex flex-wrap gap-2 justify-center sm:justify-start">
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-secondary/60 text-xs">
                <Coins className="w-3 h-3 text-[hsl(var(--legendary))]" /> {playerState.gold}
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-secondary/60 text-xs">
                💎 {playerState.stardust}
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-secondary/60 text-xs">
                <Shield className="w-3 h-3 text-primary" /> BP Lv {bpLevel}
              </span>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatTile icon={<Swords className="w-4 h-4" />} label="Wins" value={wins} />
        <StatTile icon={<Trophy className="w-4 h-4" />} label="Win rate" value={`${winRate}%`} />
        <StatTile icon={<BookOpen className="w-4 h-4" />} label="Cards" value={`${owned}/${totalCards}`} hint={`${collectionPct}%`} />
        <StatTile icon={<Sparkles className="w-4 h-4" />} label="Total levels" value={totalLevels} />
      </div>

      <Card className="p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-heading font-bold text-foreground flex items-center gap-2">
            <Trophy className="w-4 h-4 text-[hsl(var(--legendary))]" /> Achievements
          </h3>
          <span className="text-sm text-muted-foreground">{Object.keys(ach.unlocked).length} unlocked</span>
        </div>
        <div className="text-xs text-muted-foreground">
          New titles and avatars unlock automatically as you earn achievements.
        </div>
      </Card>
    </div>
  );
}

function StatTile({ icon, label, value, hint }: { icon: React.ReactNode; label: string; value: string | number; hint?: string }) {
  return (
    <Card className="p-4">
      <div className="text-xs text-muted-foreground inline-flex items-center gap-1.5">{icon}{label}</div>
      <div className="font-heading text-2xl font-bold text-foreground mt-1">{value}</div>
      {hint && <div className="text-[10px] text-muted-foreground">{hint}</div>}
    </Card>
  );
}
