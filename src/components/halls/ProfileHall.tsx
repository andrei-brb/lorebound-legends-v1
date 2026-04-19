import { useMemo } from "react";
import { User, Coins, Sparkles, Trophy, BookOpen } from "lucide-react";
import type { PlayerState } from "@/lib/playerState";
import HallLayout, { HallSection, HallStat } from "@/components/scene/HallLayout";
import GlassPanel from "@/components/scene/GlassPanel";
import HexAvatar from "@/components/scene/HexAvatar";
import { AVATARS } from "@/data/avatars";
import { TITLES } from "@/data/titles";
import { loadAchievementState } from "@/lib/achievementEngine";
import { texGilded, texParchment, texThrone, texCodex } from "@/components/scene/panelTextures";
import { cn } from "@/lib/utils";

interface Props { playerState: PlayerState; onStateChange: (s: PlayerState) => void }

export default function ProfileHall({ playerState, onStateChange }: Props) {
  const ach = useMemo(() => loadAchievementState(), []);
  const currentAvatar = AVATARS.find((a) => a.id === (playerState.profile?.avatarId ?? "default")) ?? AVATARS[0];
  const currentTitle = TITLES.find((t) => t.id === playerState.profile?.titleId);
  const unlockedAvatars = AVATARS.filter((a) => a.unlock(playerState, ach));
  const unlockedTitles = TITLES.filter((t) => t.unlock(playerState, ach));
  const pathHue = playerState.selectedPath === "fire" ? "var(--destructive)" : playerState.selectedPath === "nature" ? "var(--synergy)" : playerState.selectedPath === "shadow" ? "var(--secondary)" : "var(--primary)";

  const setAvatar = (id: string) => onStateChange({ ...playerState, profile: { ...(playerState.profile ?? { avatarId: "default", titleId: null, bannerId: null }), avatarId: id } });
  const setTitle = (id: string | null) => onStateChange({ ...playerState, profile: { ...(playerState.profile ?? { avatarId: "default", titleId: null, bannerId: null }), titleId: id } });

  return (
    <HallLayout
      sidebar={
        <>
          <HallSection title="Identity" hue={pathHue} glow={0.55} bg={texGilded}>
            <div className="flex flex-col items-center text-center gap-2">
              <HexAvatar size={88} hue={pathHue}>
                <span className="text-4xl">{currentAvatar.emoji}</span>
              </HexAvatar>
              <h3 className="font-heading text-base text-foreground mt-2 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">{currentAvatar.name}</h3>
              {currentTitle && <p className="text-xs text-[hsl(var(--legendary))] italic drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">"{currentTitle.label}"</p>}
              {playerState.selectedPath && (
                <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full" style={{ background: `hsl(${pathHue}/0.25)`, color: `hsl(${pathHue})` }}>
                  Path of {playerState.selectedPath}
                </span>
              )}
            </div>
          </HallSection>

          <HallSection title="Stats" hue="var(--primary)" glow={0.35} bg={texParchment}>
            <HallStat label="Gold" value={playerState.gold.toLocaleString()} hue="var(--legendary)" />
            <HallStat label="Stardust" value={playerState.stardust.toLocaleString()} hue="var(--rare)" />
            <HallStat label="Cards owned" value={playerState.ownedCardIds.length} />
            <HallStat label="Total pulls" value={playerState.totalPulls} />
            <HallStat label="Streak" value={`${playerState.dailyLogin?.streak ?? 0}d`} />
          </HallSection>
        </>
      }
    >
      <GlassPanel hue="var(--primary)" glow={0.35} padding="md" bg={texThrone} bgTint={0.72}>
        <h3 className="font-heading text-xs uppercase tracking-wider text-foreground drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] mb-3">Avatars · {unlockedAvatars.length}/{AVATARS.length}</h3>
        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3">
          {AVATARS.map((a) => {
            const unlocked = unlockedAvatars.includes(a);
            const sel = currentAvatar.id === a.id;
            return (
              <button
                key={a.id}
                onClick={() => unlocked && setAvatar(a.id)}
                disabled={!unlocked}
                title={unlocked ? a.name : a.unlockHint}
                className={cn("flex flex-col items-center gap-1 transition-transform", unlocked && "hover:scale-105", !unlocked && "opacity-40 cursor-not-allowed")}
              >
                <HexAvatar size={48} hue={sel ? "var(--legendary)" : "var(--primary)"}>
                  <span className="text-xl">{a.emoji}</span>
                </HexAvatar>
                <span className="text-[10px] text-muted-foreground truncate max-w-full">{a.name.split(" ")[0]}</span>
              </button>
            );
          })}
        </div>
      </GlassPanel>

      <GlassPanel hue="var(--legendary)" glow={0.3} padding="md" bg={texCodex} bgTint={0.7}>
        <h3 className="font-heading text-xs uppercase tracking-wider text-foreground drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] mb-3">Titles · {unlockedTitles.length}/{TITLES.length}</h3>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setTitle(null)}
            className={cn("px-3 py-1.5 rounded-lg text-xs transition-colors", !currentTitle ? "bg-[hsl(var(--legendary)/0.2)] text-foreground ring-1 ring-[hsl(var(--legendary)/0.4)]" : "bg-foreground/5 text-muted-foreground hover:bg-foreground/10")}
          >
            None
          </button>
          {TITLES.map((t) => {
            const unlocked = unlockedTitles.includes(t);
            const sel = currentTitle?.id === t.id;
            return (
              <button
                key={t.id}
                onClick={() => unlocked && setTitle(t.id)}
                disabled={!unlocked}
                title={unlocked ? t.label : t.unlockHint}
                className={cn("px-3 py-1.5 rounded-lg text-xs transition-colors",
                  sel ? "bg-[hsl(var(--legendary)/0.2)] text-foreground ring-1 ring-[hsl(var(--legendary)/0.4)]" : "bg-foreground/5 text-muted-foreground hover:bg-foreground/10",
                  !unlocked && "opacity-40 cursor-not-allowed"
                )}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </GlassPanel>
    </HallLayout>
  );
}
