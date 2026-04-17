import { useEffect, useMemo, useState } from "react";
import { Users, Search, UserPlus, Check, X, Loader2, MessageCircle } from "lucide-react";
import { api } from "@/lib/apiClient";
import HallLayout, { HallSection, HallStat } from "@/components/scene/HallLayout";
import GlassPanel from "@/components/scene/GlassPanel";
import HexAvatar from "@/components/scene/HexAvatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

type Friend = { id: number; discordId: string; username: string; avatar?: string | null };
type Pending = { id: number; from: Friend };

interface Props { isOnline: boolean }

export default function FriendsHall({ isOnline }: Props) {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [pending, setPending] = useState<Pending[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [addQuery, setAddQuery] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const r = await api.getFriends();
      setFriends(r.accepted.map((f) => f.friend));
      setPending(r.incoming.map((p) => ({ id: p.id, from: p.from })));
    } catch { /* offline ok */ }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? friends.filter((f) => f.username.toLowerCase().includes(q)) : friends;
  }, [friends, query]);

  const accept = async (id: number) => {
    try { await api.friendRespond(id, true); toast({ title: "Friend added" }); load(); }
    catch (e: unknown) {
      const message = e instanceof Error ? e.message : undefined;
      toast({ title: "Failed", description: message, variant: "destructive" });
    }
  };
  const decline = async (id: number) => {
    try { await api.friendRespond(id, false); load(); }
    catch (e: unknown) {
      const message = e instanceof Error ? e.message : undefined;
      toast({ title: "Failed", description: message, variant: "destructive" });
    }
  };
  const addFriend = async () => {
    if (!addQuery.trim()) return;
    try { await api.friendRequest(addQuery.trim()); toast({ title: "Request sent" }); setAddQuery(""); }
    catch (e: unknown) {
      const message = e instanceof Error ? e.message : undefined;
      toast({ title: "Failed", description: message, variant: "destructive" });
    }
  };

  return (
    <HallLayout
      sidebar={
        <>
          <HallSection title="Companions" hue="var(--primary)" glow={0.5}>
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-4 h-4 text-primary" />
              <span className="text-xs text-muted-foreground">Your circle</span>
            </div>
            <HallStat label="Friends" value={friends.length} />
            <HallStat label="Pending" value={pending.length} hue="var(--rare)" />
          </HallSection>

          <HallSection title="Add Friend" hue="var(--primary)" glow={0.35}>
            <div className="space-y-2">
              <Input value={addQuery} onChange={(e) => setAddQuery(e.target.value)} placeholder="Discord username" className="h-8 text-xs bg-background/40 border-border/40" />
              <Button onClick={addFriend} size="sm" className="w-full h-8 text-xs"><UserPlus className="w-3 h-3 mr-1" /> Send Request</Button>
            </div>
          </HallSection>

          {pending.length > 0 && (
            <HallSection title={`Pending (${pending.length})`} hue="var(--rare)" glow={0.4}>
              <ul className="space-y-2">
                {pending.map((p) => (
                  <li key={p.id} className="flex items-center gap-2">
                    <HexAvatar size={28} hue="var(--rare)" src={p.from.avatar && p.from.discordId ? `https://cdn.discordapp.com/avatars/${p.from.discordId}/${p.from.avatar}.png?size=64` : null}>
                      {p.from.username.slice(0, 1).toUpperCase()}
                    </HexAvatar>
                    <span className="text-xs flex-1 truncate">{p.from.username}</span>
                    <button onClick={() => accept(p.id)} className="w-6 h-6 rounded bg-[hsl(var(--synergy)/0.2)] text-[hsl(var(--synergy))] flex items-center justify-center hover:bg-[hsl(var(--synergy)/0.3)]"><Check className="w-3 h-3" /></button>
                    <button onClick={() => decline(p.id)} className="w-6 h-6 rounded bg-destructive/20 text-destructive flex items-center justify-center hover:bg-destructive/30"><X className="w-3 h-3" /></button>
                  </li>
                ))}
              </ul>
            </HallSection>
          )}
        </>
      }
      header={
        <GlassPanel hue="var(--primary)" glow={0.4} padding="md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search companions…" className="h-9 pl-9 bg-background/40 border-border/40" />
          </div>
        </GlassPanel>
      }
    >
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <GlassPanel hue="var(--primary)" glow={0.2} padding="lg">
          <div className="flex flex-col items-center text-center gap-2 py-6">
            <Users className="w-8 h-8 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">{query ? "no matches" : "no friends yet — send a request to begin"}</p>
          </div>
        </GlassPanel>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filtered.map((f) => (
            <GlassPanel key={f.id} hue="var(--primary)" glow={0.35} padding="md">
              <div className="flex items-center gap-3">
                <HexAvatar size={48} hue="var(--primary)" online src={f.avatar ? `https://cdn.discordapp.com/avatars/${f.discordId}/${f.avatar}.png?size=64` : null}>
                  {f.username.slice(0, 1).toUpperCase()}
                </HexAvatar>
                <div className="flex-1 min-w-0">
                  <h4 className="font-heading text-sm text-foreground truncate">{f.username}</h4>
                  <p className="text-[10px] text-muted-foreground">online</p>
                </div>
                <button className="w-8 h-8 rounded-lg bg-foreground/5 hover:bg-foreground/10 flex items-center justify-center" title="Message">
                  <MessageCircle className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
            </GlassPanel>
          ))}
        </div>
      )}
    </HallLayout>
  );
}
