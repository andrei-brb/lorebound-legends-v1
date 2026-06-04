import { useMemo, useState } from "react";
import { Swords, Crown, Shield, Trophy, Flame, Zap } from "lucide-react";
import type { PlayerState } from "@/lib/playerState";
import { loadAchievementState } from "@/lib/achievementEngine";
import HallLayout, { HallSection, HallStat } from "@/components/scene/HallLayout";
import GlassPanel from "@/components/scene/GlassPanel";
import HexAvatar from "@/components/scene/HexAvatar";
import { texArena, texThrone, texLeather, texVelvet, texGilded, texForge } from "@/components/scene/panelTextures";
import { cn } from "@/lib/utils";

const MAX_DECK_SIZE = 10;

interface Props {
  playerState: PlayerState;
  isOnline?: boolean;
  onLaunchMode?: (mode: "skirmish" | "ranked" | "tourney" | "raid") => void;
  defaultMode?: "skirmish" | "ranked" | "tourney" | "raid";
}

const MODES = [
  { id: "skirmish", label: "Skirmish", desc: "Quick PvE battle vs the realm", icon: <Swords className="w-4 h-4" />, hue: "var(--primary)" },
  { id: "ranked", label: "Ranked PvP", desc: "Climb the leaderboard ladder", icon: <Crown className="w-4 h-4" />, hue: "var(--legendary)" },
  { id: "tourney", label: "Tournament", desc: "Bracketed bouts for great rewards", icon: <Trophy className="w-4 h-4" />, hue: "var(--rare)" },
  { id: "raid", label: "Raid", desc: "Co-op vs an elite boss", icon: <Flame className="w-4 h-4" />, hue: "var(--destructive)" },
] as const;

export default function CombatHall({ playerState, isOnline, onLaunchMode, defaultMode = "skirmish" }: Props) {
  const [selected, setSelected] = useState<"skirmish" | "ranked" | "tourney" | "raid">(defaultMode);

  const { wins, losses, winrate } = useMemo(() => {
    const bs = playerState.battleStats;
    if (bs && (bs.wins + bs.losses + bs.draws > 0 || isOnline)) {
      const total = bs.wins + bs.losses + bs.draws;
      const wr = total > 0 ? Math.round((bs.wins / total) * 100) : 0;
      return { wins: bs.wins, losses: bs.losses, winrate: wr };
    }
    const stats = loadAchievementState().stats;
    const w = stats.totalWins;
    const l = Math.max(0, stats.totalBattles - stats.totalWins);
    const total = w + l;
    return { wins: w, losses: l, winrate: total > 0 ? Math.round((w / total) * 100) : 0 };
  }, [playerState.battleStats, isOnline]);

  const activeDeck = playerState.deckPresets?.[0];
  const deckCount = activeDeck?.cardIds?.length ?? 0;
  const deckLabel = activeDeck
    ? `${deckCount} / ${MAX_DECK_SIZE} cards · ${activeDeck.name}`
    : "No deck saved";

  const pathHue = playerState.selectedPath === "fire" ? "var(--destructive)" : playerState.selectedPath === "nature" ? "var(--synergy)" : playerState.selectedPath === "shadow" ? "var(--secondary)" : "var(--primary)";

  return (
    <HallLayout
      sidebar={
        <>
          <HallSection title="Champion" hue={pathHue} glow={0.55} bg={texArena}>
            <div className="flex flex-col items-center text-center gap-2">
              <HexAvatar size={88} hue={pathHue}>
                <span className="text-4xl">⚔️</span>
              </HexAvatar>
              <h3 className="font-heading text-base text-foreground mt-1 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">{playerState.profile?.avatarId ? "You" : "Warrior"}</h3>
              <span className="text-[10px] uppercase tracking-wider text-foreground/80 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">Ready for battle</span>
            </div>
          </HallSection>

          <HallSection title="Combat Record" hue="var(--legendary)" glow={0.4} bg={texThrone} bgTint={0.7}>
            <HallStat label="Wins" value={wins} hue="var(--legendary)" />
            <HallStat label="Losses" value={losses} />
            <HallStat label="Winrate" value={`${winrate}%`} hue="var(--rare)" />
            <HallStat label="Login streak" value={`${playerState.dailyLogin?.streak ?? 0}d`} />
          </HallSection>

          <HallSection title="Loadout" hue="var(--primary)" glow={0.3} bg={texLeather}>
            <div className="flex items-center gap-2 text-xs text-foreground/80 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] mb-2">
              <Shield className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{deckLabel}</span>
            </div>
            {activeDeck?.cardIds?.length ? (
              <div className="grid grid-cols-4 gap-1.5">
                {activeDeck.cardIds.slice(0, MAX_DECK_SIZE).map((_, i) => (
                  <div key={i} className="aspect-[3/4] rounded-md border border-border/40 bg-background/50 flex items-center justify-center">
                    <span className="text-xs text-foreground/70">{i + 1}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[10px] text-muted-foreground">Save a deck in Deck Builder first.</p>
            )}
          </HallSection>
        </>
      }
      header={
        <GlassPanel hue="var(--destructive)" glow={0.45} padding="md" bg={texArena} bgTint={0.65}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-foreground/80 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">War Council</p>
              <h1 className="font-heading text-lg text-foreground drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">Choose your battlefield</h1>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-widest text-foreground/80 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">Energy</p>
              <p className="font-heading text-lg text-[hsl(var(--legendary))] flex items-center gap-1 justify-end drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]"><Zap className="w-4 h-4" /> ∞</p>
            </div>
          </div>
        </GlassPanel>
      }
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {MODES.map((m) => {
          const active = selected === m.id;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => setSelected(m.id)}
              className="text-left"
            >
              <GlassPanel hue={m.hue} glow={active ? 0.7 : 0.35} padding="md" className={cn("transition-transform", active && "scale-[1.01]")}>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg" style={{ background: `hsl(${m.hue}/0.15)`, color: `hsl(${m.hue})` }}>{m.icon}</div>
                    <div>
                      <h3 className="font-heading text-sm text-foreground">{m.label}</h3>
                      <p className="text-xs text-muted-foreground">{m.desc}</p>
                    </div>
                  </div>
                  {active && <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full" style={{ background: `hsl(${m.hue}/0.2)`, color: `hsl(${m.hue})` }}>Selected</span>}
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-border/30">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Avg. duration · 4 min</span>
                  <span className="text-[10px] uppercase tracking-wider" style={{ color: `hsl(${m.hue})` }}>Enter →</span>
                </div>
              </GlassPanel>
            </button>
          );
        })}
      </div>

      <GlassPanel hue="var(--primary)" glow={0.4} padding="md" bg={texVelvet}>
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h3 className="font-heading text-sm text-foreground drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">Ready to march?</h3>
            <p className="text-xs text-foreground/80 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">Selected mode: <span className="text-foreground capitalize">{selected}</span></p>
          </div>
          <button
            type="button"
            onClick={() => onLaunchMode?.(selected)}
            className="px-5 py-2.5 rounded-xl font-heading text-sm text-primary-foreground transition-transform hover:scale-[1.02]"
            style={{ background: `linear-gradient(135deg, hsl(var(--destructive)), hsl(var(--primary)))`, boxShadow: `0 0 20px hsl(var(--destructive)/0.4)` }}
          >
            Begin Battle
          </button>
        </div>
      </GlassPanel>
    </HallLayout>
  );
}
