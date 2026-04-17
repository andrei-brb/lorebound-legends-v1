import { useState } from "react";
import { Swords, Crown, Shield, Trophy, Flame, Zap } from "lucide-react";
import type { PlayerState } from "@/lib/playerState";
import HallLayout, { HallSection, HallStat } from "@/components/scene/HallLayout";
import GlassPanel from "@/components/scene/GlassPanel";
import HexAvatar from "@/components/scene/HexAvatar";
import { cn } from "@/lib/utils";

interface Props { playerState: PlayerState }

const MODES = [
  { id: "skirmish", label: "Skirmish", desc: "Quick PvE battle vs the realm", icon: <Swords className="w-4 h-4" />, hue: "var(--primary)" },
  { id: "ranked", label: "Ranked PvP", desc: "Climb the leaderboard ladder", icon: <Crown className="w-4 h-4" />, hue: "var(--legendary)" },
  { id: "tourney", label: "Tournament", desc: "Bracketed bouts for great rewards", icon: <Trophy className="w-4 h-4" />, hue: "var(--rare)" },
  { id: "raid", label: "Raid", desc: "Co-op vs an elite boss", icon: <Flame className="w-4 h-4" />, hue: "var(--destructive)" },
];

export default function CombatHall({ playerState }: Props) {
  const [selected, setSelected] = useState<string>("skirmish");
  const wins = playerState.battlesWon ?? 0;
  const losses = (playerState.battlesPlayed ?? 0) - wins;
  const winrate = playerState.battlesPlayed ? Math.round((wins / playerState.battlesPlayed) * 100) : 0;
  const pathHue = playerState.selectedPath === "fire" ? "var(--destructive)" : playerState.selectedPath === "nature" ? "var(--synergy)" : playerState.selectedPath === "shadow" ? "var(--secondary)" : "var(--primary)";

  return (
    <HallLayout
      sidebar={
        <>
          <HallSection title="Champion" hue={pathHue} glow={0.55}>
            <div className="flex flex-col items-center text-center gap-2">
              <HexAvatar size={88} hue={pathHue}>
                <span className="text-4xl">⚔️</span>
              </HexAvatar>
              <h3 className="font-heading text-base text-foreground mt-1">{playerState.profile?.avatarId ? "You" : "Warrior"}</h3>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Ready for battle</span>
            </div>
          </HallSection>

          <HallSection title="Combat Record" hue="var(--legendary)" glow={0.4}>
            <HallStat label="Wins" value={wins} hue="var(--legendary)" />
            <HallStat label="Losses" value={losses} />
            <HallStat label="Winrate" value={`${winrate}%`} hue="var(--rare)" />
            <HallStat label="Streak" value={`${playerState.dailyLogin?.streak ?? 0}d`} />
          </HallSection>

          <HallSection title="Loadout" hue="var(--primary)" glow={0.3}>
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
              <Shield className="w-3.5 h-3.5" /> 8 / 8 cards equipped
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="aspect-[3/4] rounded-md border border-border/40 bg-foreground/5 flex items-center justify-center">
                  <span className="text-xs text-muted-foreground">{i + 1}</span>
                </div>
              ))}
            </div>
          </HallSection>
        </>
      }
      header={
        <GlassPanel hue="var(--destructive)" glow={0.45} padding="md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">War Council</p>
              <h1 className="font-heading text-lg text-foreground">Choose your battlefield</h1>
            </div>
            <div className="text-right">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Energy</p>
              <p className="font-heading text-lg text-[hsl(var(--legendary))] flex items-center gap-1 justify-end"><Zap className="w-4 h-4" /> ∞</p>
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

      <GlassPanel hue="var(--primary)" glow={0.4} padding="md">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h3 className="font-heading text-sm text-foreground">Ready to march?</h3>
            <p className="text-xs text-muted-foreground">Selected mode: <span className="text-foreground capitalize">{selected}</span></p>
          </div>
          <button
            className="px-5 py-2.5 rounded-xl font-heading text-sm text-primary-foreground transition-transform hover:scale-[1.02]"
            style={{ background: `linear-gradient(135deg, hsl(var(--destructive)), hsl(var(--primary)))`, boxShadow: `0 0 20px hsl(var(--destructive)/0.4)` }}
          >
            Begin Battle
          </button>
        </div>
      </GlassPanel>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <GlassPanel hue="var(--legendary)" glow={0.3} padding="md">
          <div className="flex items-center gap-2 mb-1"><Crown className="w-4 h-4 text-[hsl(var(--legendary))]" /><h3 className="font-heading text-xs uppercase tracking-wider">Top Rank</h3></div>
          <p className="text-xs text-muted-foreground">Diamond III · 1,240 MMR</p>
        </GlassPanel>
        <GlassPanel hue="var(--rare)" glow={0.3} padding="md">
          <div className="flex items-center gap-2 mb-1"><Trophy className="w-4 h-4 text-[hsl(var(--rare))]" /><h3 className="font-heading text-xs uppercase tracking-wider">Last Trophy</h3></div>
          <p className="text-xs text-muted-foreground">Winter Tournament — 3rd place</p>
        </GlassPanel>
        <GlassPanel hue="var(--destructive)" glow={0.3} padding="md">
          <div className="flex items-center gap-2 mb-1"><Flame className="w-4 h-4 text-[hsl(var(--destructive))]" /><h3 className="font-heading text-xs uppercase tracking-wider">Active Boost</h3></div>
          <p className="text-xs text-muted-foreground">+25% gold for next 3 wins</p>
        </GlassPanel>
      </div>
    </HallLayout>
  );
}
