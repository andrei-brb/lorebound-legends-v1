import { useCallback, useEffect, useState } from "react";
import { Eye, Loader2, Swords, Play, RefreshCw } from "lucide-react";
import { api } from "@/lib/apiClient";
import HallLayout, { HallSection, HallStat } from "@/components/scene/HallLayout";
import GlassPanel from "@/components/scene/GlassPanel";
import HexAvatar from "@/components/scene/HexAvatar";
import { texArena } from "@/components/scene/panelTextures";
import { toast } from "@/hooks/use-toast";

interface LiveMatch { id: string; player1: string; player2: string; turn: number; viewers: number }

interface Props {
  isOnline: boolean;
  onWatch?: (matchId: number) => void;
}

export default function SpectateHall({ isOnline, onWatch }: Props) {
  const [matches, setMatches] = useState<LiveMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!isOnline) {
      setLoading(false);
      setMatches([]);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const r = await api.getSpectateActive() as { matches?: Array<{
        id: number;
        playerA?: { username?: string };
        playerB?: { username?: string };
      }> };
      setMatches(
        (r?.matches ?? []).map((m) => ({
          id: String(m.id),
          player1: m.playerA?.username || "?",
          player2: m.playerB?.username || "?",
          turn: 0,
          viewers: 0,
        })),
      );
    } catch (e) {
      setMatches([]);
      setError(e instanceof Error ? e.message : "Could not load live matches");
    } finally {
      setLoading(false);
    }
  }, [isOnline]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const watch = (matchId: string) => {
    const id = Number(matchId);
    if (!Number.isFinite(id) || id <= 0) return;
    if (onWatch) {
      onWatch(id);
      return;
    }
    sessionStorage.setItem("spectate.matchId", String(id));
    toast({ title: "Spectate", description: "Open the Battle tab to watch this match." });
  };

  return (
    <HallLayout
      sidebar={
        <HallSection title="Spectator's Gallery" hue="var(--rare)" glow={0.5} bg={texArena}>
          <div className="flex items-center gap-2 mb-3">
            <Eye className="w-4 h-4 text-[hsl(var(--rare))]" />
            <span className="text-xs text-foreground/85 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">Watch live battles</span>
          </div>
          <HallStat label="Live matches" value={matches.length} hue="var(--legendary)" />
          <HallStat label="Status" value={isOnline ? "online" : "offline"} hue={isOnline ? "var(--synergy)" : "var(--muted-foreground)"} />
          {isOnline && (
            <button
              type="button"
              onClick={() => void refresh()}
              className="mt-2 w-full py-1.5 rounded-lg text-[10px] uppercase tracking-wider bg-foreground/10 hover:bg-foreground/15 flex items-center justify-center gap-1"
            >
              <RefreshCw className="w-3 h-3" /> Refresh
            </button>
          )}
        </HallSection>
      }
    >
      {!isOnline ? (
        <GlassPanel hue="var(--rare)" glow={0.2} padding="lg">
          <p className="text-sm text-muted-foreground text-center py-6">
            Sign in via Discord Activity to spectate live matches.
          </p>
        </GlassPanel>
      ) : loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
      ) : error ? (
        <GlassPanel hue="var(--destructive)" glow={0.2} padding="lg">
          <div className="flex flex-col items-center text-center gap-3 py-6">
            <p className="text-sm text-muted-foreground">{error}</p>
            <button
              type="button"
              onClick={() => void refresh()}
              className="px-4 py-2 rounded-lg bg-primary/20 text-primary text-xs uppercase tracking-wider"
            >
              Retry
            </button>
          </div>
        </GlassPanel>
      ) : matches.length === 0 ? (
        <GlassPanel hue="var(--rare)" glow={0.2} padding="lg">
          <div className="flex flex-col items-center text-center gap-2 py-6">
            <Eye className="w-8 h-8 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">No battles to watch right now</p>
          </div>
        </GlassPanel>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {matches.map((m) => (
            <GlassPanel key={m.id} hue="var(--rare)" glow={0.4} padding="md" bg={texArena} bgTint={0.7}>
              <div className="flex items-center justify-between mb-3">
                <span className="flex items-center gap-1.5 text-xs text-[hsl(var(--legendary))] font-heading uppercase tracking-wider">
                  <span className="w-2 h-2 rounded-full bg-[hsl(var(--legendary))] animate-pulse" /> Live
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <div className="flex flex-col items-center gap-1.5 flex-1">
                  <HexAvatar size={48} hue="var(--primary)">{m.player1.slice(0, 1).toUpperCase()}</HexAvatar>
                  <p className="text-xs text-foreground/90 truncate max-w-full">{m.player1}</p>
                </div>
                <div className="flex flex-col items-center gap-1">
                  <Swords className="w-5 h-5 text-muted-foreground" />
                </div>
                <div className="flex flex-col items-center gap-1.5 flex-1">
                  <HexAvatar size={48} hue="var(--destructive)">{m.player2.slice(0, 1).toUpperCase()}</HexAvatar>
                  <p className="text-xs text-foreground/90 truncate max-w-full">{m.player2}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => watch(m.id)}
                className="mt-3 w-full py-2 rounded-lg bg-[hsl(var(--rare)/0.15)] hover:bg-[hsl(var(--rare)/0.25)] text-[hsl(var(--rare))] font-heading text-xs uppercase tracking-wider flex items-center justify-center gap-1.5"
              >
                <Play className="w-3 h-3" /> Watch
              </button>
            </GlassPanel>
          ))}
        </div>
      )}
    </HallLayout>
  );
}
