import { useEffect, useState } from "react";
import { Eye, Loader2, Swords, Play } from "lucide-react";
import { api } from "@/lib/apiClient";
import HallLayout, { HallSection, HallStat } from "@/components/scene/HallLayout";
import GlassPanel from "@/components/scene/GlassPanel";
import HexAvatar from "@/components/scene/HexAvatar";

interface LiveMatch { id: string; player1: string; player2: string; turn: number; viewers: number }

const MOCK: LiveMatch[] = [
  { id: "m1", player1: "Pyrothos", player2: "MoonGoddess", turn: 8, viewers: 24 },
  { id: "m2", player1: "ShadowKing", player2: "Sylvana", turn: 4, viewers: 11 },
  { id: "m3", player1: "Tempestia", player2: "Fenris", turn: 12, viewers: 38 },
];

interface Props { isOnline: boolean }

export default function SpectateHall({ isOnline }: Props) {
  const [matches, setMatches] = useState<LiveMatch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    api.getSpectateActive()
      .then((r: Awaited<ReturnType<typeof api.getSpectateActive>>) => {
        if (!alive) return;
        const mapped = r.matches.map((m) => ({
          id: String(m.id),
          player1: m.playerA?.username || "?",
          player2: m.playerB?.username || "?",
          turn: 0,
          viewers: 0,
        }));
        setMatches(mapped.length ? mapped : MOCK);
      })
      .catch(() => { if (alive) setMatches(MOCK); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  return (
    <HallLayout
      sidebar={
        <HallSection title="Spectator's Gallery" hue="var(--rare)" glow={0.5}>
          <div className="flex items-center gap-2 mb-3">
            <Eye className="w-4 h-4 text-[hsl(var(--rare))]" />
            <span className="text-xs text-muted-foreground">Watch live battles</span>
          </div>
          <HallStat label="Live matches" value={matches.length} hue="var(--legendary)" />
          <HallStat label="Total viewers" value={matches.reduce((s, m) => s + m.viewers, 0)} hue="var(--rare)" />
          <HallStat label="Status" value={isOnline ? "online" : "offline"} hue={isOnline ? "var(--synergy)" : "var(--muted-foreground)"} />
        </HallSection>
      }
    >
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
      ) : matches.length === 0 ? (
        <GlassPanel hue="var(--rare)" glow={0.2} padding="lg">
          <div className="flex flex-col items-center text-center gap-2 py-6">
            <Eye className="w-8 h-8 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">no battles to watch right now</p>
          </div>
        </GlassPanel>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {matches.map((m) => (
            <GlassPanel key={m.id} hue="var(--rare)" glow={0.4} padding="md">
              <div className="flex items-center justify-between mb-3">
                <span className="flex items-center gap-1.5 text-xs text-[hsl(var(--legendary))] font-heading uppercase tracking-wider">
                  <span className="w-2 h-2 rounded-full bg-[hsl(var(--legendary))] animate-pulse" /> Live
                </span>
                <span className="flex items-center gap-1 text-xs text-muted-foreground"><Eye className="w-3 h-3" /> {m.viewers}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <div className="flex flex-col items-center gap-1.5 flex-1">
                  <HexAvatar size={48} hue="var(--primary)">{m.player1.slice(0, 1).toUpperCase()}</HexAvatar>
                  <p className="text-xs text-foreground/90 truncate max-w-full">{m.player1}</p>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <Swords className="w-5 h-5 text-muted-foreground" />
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">turn {m.turn}</span>
                </div>
                <div className="flex flex-col items-center gap-1.5 flex-1">
                  <HexAvatar size={48} hue="var(--destructive)">{m.player2.slice(0, 1).toUpperCase()}</HexAvatar>
                  <p className="text-xs text-foreground/90 truncate max-w-full">{m.player2}</p>
                </div>
              </div>
              <button className="mt-3 w-full py-2 rounded-lg bg-[hsl(var(--rare)/0.15)] hover:bg-[hsl(var(--rare)/0.25)] text-[hsl(var(--rare))] font-heading text-xs uppercase tracking-wider flex items-center justify-center gap-1.5">
                <Play className="w-3 h-3" /> Watch
              </button>
            </GlassPanel>
          ))}
        </div>
      )}
    </HallLayout>
  );
}
