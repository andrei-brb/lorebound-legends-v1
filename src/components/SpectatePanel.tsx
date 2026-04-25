import { useEffect, useState } from "react";
import { Eye, Loader2, Swords } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/apiClient";
import { toast } from "@/hooks/use-toast";

interface SpectatePanelProps { isOnline: boolean }

interface Match { id: number; playerA: { username: string }; playerB: { username: string }; turnPlayerId: number | null; lastActionAt: number | null; createdAt: number; }

export default function SpectatePanel({ isOnline }: SpectatePanelProps) {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    if (!isOnline) { setLoading(false); return; }
    try {
      const r = await api.getSpectateActive();
      setMatches(((r as unknown as { matches?: Match[] }).matches || []) as Match[]);
    } catch (e: unknown) {
      if (loading) toast({ title: "Failed to load matches", description: e instanceof Error ? e.message : "", variant: "destructive" });
    } finally { setLoading(false); }
  };

  useEffect(() => {
    refresh();
    const id = window.setInterval(refresh, 8000);
    return () => window.clearInterval(id);
  }, [isOnline]); // eslint-disable-line react-hooks/exhaustive-deps

  const watch = async (matchId: number) => {
    try {
      const m = await api.pvpLiveGet(matchId);
      console.info("Spectate match snapshot", m);
      toast({ title: "Spectate snapshot loaded", description: "Live spectate viewer coming soon — match state in console for now." });
    } catch (e: unknown) {
      toast({ title: "Failed", description: e instanceof Error ? e.message : "", variant: "destructive" });
    }
  };

  if (!isOnline) {
    return (
      <Card className="p-6 text-center">
        <Eye className="w-10 h-10 text-muted-foreground/40 mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">Spectate requires an online connection.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-heading text-2xl font-bold text-foreground flex items-center gap-2">
          <Eye className="w-6 h-6 text-primary" /> Spectate
        </h2>
        <p className="text-sm text-muted-foreground mt-1">Watch active live PvP matches in progress.</p>
      </div>

      {loading ? (
        <div className="text-center py-10"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground mx-auto" /></div>
      ) : matches.length === 0 ? (
        <Card className="p-8 text-center">
          <Swords className="w-10 h-10 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No live matches in progress right now.</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {matches.map((m) => (
            <Card key={m.id} className="p-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0 text-sm text-foreground">
                <span className="truncate">{m.playerA.username}</span>
                <Swords className="w-3.5 h-3.5 text-primary shrink-0" />
                <span className="truncate">{m.playerB.username}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[10px] text-muted-foreground">
                  {m.lastActionAt ? `${Math.round((Date.now() - m.lastActionAt) / 1000)}s ago` : "Just started"}
                </span>
                <Button size="sm" variant="ghost" onClick={() => watch(m.id)}>Watch</Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
