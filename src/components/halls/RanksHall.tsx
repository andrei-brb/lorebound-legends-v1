import { useEffect, useMemo, useState } from "react";
import { BarChart3, Crown, Trophy, Loader2 } from "lucide-react";
import { api } from "@/lib/apiClient";
import type { PlayerState } from "@/lib/playerState";
import HallLayout, { HallSection, HallStat } from "@/components/scene/HallLayout";
import GlassPanel from "@/components/scene/GlassPanel";
import HexAvatar from "@/components/scene/HexAvatar";
import { cn } from "@/lib/utils";

type Row = { rank: number; username: string; score: number; discordId?: string; avatar?: string | null; isMe?: boolean };

interface Props { playerState: PlayerState; isOnline: boolean }

const MOCK: Row[] = [
  { rank: 1, username: "Pyrothos", score: 28450 },
  { rank: 2, username: "MoonGoddess", score: 26120 },
  { rank: 3, username: "ShadowKing", score: 24890 },
  { rank: 4, username: "Sylvana", score: 22310 },
  { rank: 5, username: "Tempestia", score: 20450 },
  { rank: 6, username: "Verdantia", score: 18200 },
  { rank: 7, username: "Fenris", score: 17980 },
  { rank: 8, username: "Corvus", score: 16400 },
];

export default function RanksHall({ playerState, isOnline }: Props) {
  const [board, setBoard] = useState<"wins" | "collection" | "rarest">("wins");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    api.getLeaderboard(board)
      .then((r: any) => { if (alive) setRows(r?.entries || r || MOCK); })
      .catch(() => { if (alive) setRows(MOCK); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [board]);

  const top3 = rows.slice(0, 3);
  const rest = rows.slice(3, 30);

  return (
    <HallLayout
      sidebar={
        <>
          <HallSection title="Hall of Ranks" hue="var(--legendary)" glow={0.5}>
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 className="w-4 h-4 text-[hsl(var(--legendary))]" />
              <span className="text-xs text-muted-foreground">Global standings</span>
            </div>
            <HallStat label="Your gold" value={playerState.gold.toLocaleString()} hue="var(--legendary)" />
            <HallStat label="Cards owned" value={playerState.ownedCardIds.length} />
          </HallSection>

          <HallSection title="Board" hue="var(--legendary)" glow={0.3}>
            <div className="space-y-1">
              {(["wins", "collection", "rarest"] as const).map((b) => (
                <button
                  key={b}
                  onClick={() => setBoard(b)}
                  className={cn(
                    "w-full text-left px-2.5 py-1.5 rounded-lg text-xs capitalize transition-colors",
                    board === b ? "bg-[hsl(var(--legendary)/0.15)] text-foreground ring-1 ring-[hsl(var(--legendary)/0.4)]" : "text-muted-foreground hover:bg-foreground/5"
                  )}
                >
                  {b}
                </button>
              ))}
            </div>
          </HallSection>
        </>
      }
    >
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
      ) : (
        <>
          {/* Podium */}
          {top3.length === 3 && (
            <GlassPanel hue="var(--legendary)" glow={0.5} padding="lg">
              <div className="grid grid-cols-3 gap-3 items-end">
                <Podium row={top3[1]} place={2} />
                <Podium row={top3[0]} place={1} />
                <Podium row={top3[2]} place={3} />
              </div>
            </GlassPanel>
          )}

          {/* Rest of leaderboard */}
          <GlassPanel hue="var(--primary)" glow={0.3} padding="md">
            <h3 className="font-heading text-xs uppercase tracking-wider text-foreground/90 mb-3">Top Contenders</h3>
            <ul className="space-y-1">
              {rest.map((r) => (
                <li key={r.rank} className={cn(
                  "flex items-center gap-3 px-2 py-2 rounded-lg",
                  r.isMe ? "bg-primary/10 ring-1 ring-primary/30" : "hover:bg-foreground/5"
                )}>
                  <span className="font-heading text-sm text-muted-foreground w-6 text-center">{r.rank}</span>
                  <HexAvatar
                    size={32}
                    hue="var(--primary)"
                    src={r.avatar && r.discordId ? `https://cdn.discordapp.com/avatars/${r.discordId}/${r.avatar}.png?size=64` : null}
                  >
                    {r.username.slice(0, 1).toUpperCase()}
                  </HexAvatar>
                  <span className="text-sm text-foreground/90 truncate flex-1">{r.username}</span>
                  <span className="font-heading text-sm text-[hsl(var(--legendary))]">{r.score.toLocaleString()}</span>
                </li>
              ))}
            </ul>
          </GlassPanel>
        </>
      )}
    </HallLayout>
  );
}

function Podium({ row, place }: { row: Row; place: 1 | 2 | 3 }) {
  const hue = place === 1 ? "var(--legendary)" : place === 2 ? "var(--primary)" : "var(--rare)";
  const sizes = { 1: 80, 2: 64, 3: 56 } as const;
  return (
    <div className="flex flex-col items-center gap-2">
      {place === 1 && <Crown className="w-5 h-5 text-[hsl(var(--legendary))]" />}
      <HexAvatar size={sizes[place]} hue={hue} src={row.avatar && row.discordId ? `https://cdn.discordapp.com/avatars/${row.discordId}/${row.avatar}.png?size=128` : null}>
        {row.username.slice(0, 1).toUpperCase()}
      </HexAvatar>
      <p className="font-heading text-sm text-foreground truncate max-w-full">{row.username}</p>
      <p className="text-xs text-[hsl(var(--legendary))]">{row.score.toLocaleString()}</p>
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">#{place}</span>
    </div>
  );
}
