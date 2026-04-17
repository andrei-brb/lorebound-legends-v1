import { useMemo } from "react";
import type { PlayerState } from "@/lib/playerState";
import { GoldCurrencyIcon, StardustCurrencyIcon } from "@/components/CurrencyIcons";
import HallLayout, { HallSection, HallStat } from "@/components/scene/HallLayout";
import GlassPanel from "@/components/scene/GlassPanel";
import HexAvatar from "@/components/scene/HexAvatar";
import { AVATARS } from "@/data/avatars";
import { COSMETICS } from "@/data/cosmetics";
import { TITLES } from "@/data/titles";
import { loadAchievementState } from "@/lib/achievementEngine";
import { clearCosmeticSlot, setCosmeticEquipped } from "@/lib/battlePassEngine";
import { getDisplayedProfileTitle, isCosmeticTitleActive } from "@/lib/profileTitleDisplay";
import { cn } from "@/lib/utils";

interface Props { playerState: PlayerState; onStateChange: (s: PlayerState) => void }

export default function ProfileHall({ playerState, onStateChange }: Props) {
  const ach = useMemo(() => loadAchievementState(), []);
  const currentAvatar = AVATARS.find((a) => a.id === (playerState.profile?.avatarId ?? "default")) ?? AVATARS[0];
  const displayedTitle = getDisplayedProfileTitle(playerState);
  const cosmeticTitleActive = isCosmeticTitleActive(playerState);
  const currentAchievementTitle = TITLES.find((t) => t.id === playerState.profile?.titleId);
  const unlockedAvatars = AVATARS.filter((a) => a.unlock(playerState, ach));
  const unlockedTitles = TITLES.filter((t) => t.unlock(playerState, ach));
  const ownedTitleCosmetics = COSMETICS.filter((c) => c.type === "title" && (playerState.cosmeticsOwned || []).includes(c.id));
  const pathHue = playerState.selectedPath === "fire" ? "var(--destructive)" : playerState.selectedPath === "nature" ? "var(--synergy)" : playerState.selectedPath === "shadow" ? "var(--secondary)" : "var(--primary)";

  const defaultProfile = { avatarId: "default" as const, titleId: null as string | null, bannerId: null as string | null };

  const setAvatar = (id: string) => onStateChange({ ...playerState, profile: { ...(playerState.profile ?? defaultProfile), avatarId: id } });

  /** Pick an achievement title; clears equipped season title so it shows. */
  const setAchievementTitle = (id: string | null) => {
    let next = clearCosmeticSlot(playerState, "title");
    next = { ...next, profile: { ...(next.profile ?? defaultProfile), titleId: id } };
    onStateChange(next);
  };

  const setCosmeticTitle = (cosmeticId: string) => {
    onStateChange(setCosmeticEquipped(playerState, cosmeticId));
  };

  const clearAllTitles = () => {
    let next = clearCosmeticSlot(playerState, "title");
    next = { ...next, profile: { ...(next.profile ?? defaultProfile), titleId: null } };
    onStateChange(next);
  };

  return (
    <HallLayout
      sidebar={
        <>
          <HallSection title="Identity" hue={pathHue} glow={0.55}>
            <div className="flex flex-col items-center text-center gap-2">
              <HexAvatar size={88} hue={pathHue}>
                <span className="text-4xl">{currentAvatar.emoji}</span>
              </HexAvatar>
              <h3 className="font-heading text-base text-foreground mt-2">{currentAvatar.name}</h3>
              {displayedTitle.kind !== "none" && (
                <p
                  className={cn(
                    "text-xs italic max-w-[220px]",
                    displayedTitle.kind === "cosmetic"
                      ? "text-[hsl(var(--legendary))]"
                      : displayedTitle.colorClass ?? "text-[hsl(var(--legendary))]",
                  )}
                >
                  &ldquo;{displayedTitle.label}&rdquo;
                </p>
              )}
              {playerState.selectedPath && (
                <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full" style={{ background: `hsl(${pathHue}/0.15)`, color: `hsl(${pathHue})` }}>
                  Path of {playerState.selectedPath}
                </span>
              )}
            </div>
          </HallSection>

          <HallSection title="Stats" hue="var(--primary)" glow={0.35}>
            <HallStat
              label={
                <>
                  <GoldCurrencyIcon className="h-3.5 w-3.5 shrink-0" /> Gold
                </>
              }
              value={playerState.gold.toLocaleString()}
              hue="var(--legendary)"
            />
            <HallStat
              label={
                <>
                  <StardustCurrencyIcon className="h-3.5 w-3.5 shrink-0" /> Stardust
                </>
              }
              value={playerState.stardust.toLocaleString()}
              hue="var(--rare)"
            />
            <HallStat label="Cards owned" value={playerState.ownedCardIds.length} />
            <HallStat label="Total pulls" value={playerState.totalPulls} />
            <HallStat label="Streak" value={`${playerState.dailyLogin?.streak ?? 0}d`} />
          </HallSection>
        </>
      }
    >
      <GlassPanel hue="var(--primary)" glow={0.35} padding="md">
        <h3 className="font-heading text-xs uppercase tracking-wider text-foreground/90 mb-3">Avatars · {unlockedAvatars.length}/{AVATARS.length}</h3>
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

      <GlassPanel hue="var(--legendary)" glow={0.3} padding="md">
        <h3 className="font-heading text-xs uppercase tracking-wider text-foreground/90 mb-3">Titles · {unlockedTitles.length}/{TITLES.length}</h3>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => clearAllTitles()}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs transition-colors",
              displayedTitle.kind === "none"
                ? "bg-[hsl(var(--legendary)/0.2)] text-foreground ring-1 ring-[hsl(var(--legendary)/0.4)]"
                : "bg-foreground/5 text-muted-foreground hover:bg-foreground/10",
            )}
          >
            None
          </button>
          {TITLES.map((t) => {
            const unlocked = unlockedTitles.includes(t);
            const sel = !cosmeticTitleActive && currentAchievementTitle?.id === t.id;
            return (
              <button
                key={t.id}
                onClick={() => unlocked && setAchievementTitle(t.id)}
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

      {ownedTitleCosmetics.length > 0 && (
        <GlassPanel hue="var(--primary)" glow={0.25} padding="md">
          <h3 className="font-heading text-xs uppercase tracking-wider text-foreground/90 mb-3">Season titles · {ownedTitleCosmetics.length}</h3>
          <p className="text-[10px] text-muted-foreground mb-2">From Battle Pass — overrides achievement title while equipped.</p>
          <div className="flex flex-wrap gap-2">
            {ownedTitleCosmetics.map((c) => {
              const sel = playerState.cosmeticsEquipped?.titleId === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => setCosmeticTitle(c.id)}
                  title={c.name}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-xs transition-colors border border-transparent",
                    sel
                      ? "bg-[hsl(var(--legendary)/0.25)] text-foreground ring-1 ring-[hsl(var(--legendary)/0.45)]"
                      : "bg-foreground/5 text-muted-foreground hover:bg-foreground/10",
                  )}
                >
                  {c.name}
                </button>
              );
            })}
          </div>
        </GlassPanel>
      )}
    </HallLayout>
  );
}
