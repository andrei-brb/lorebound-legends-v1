import { useEffect, useState } from "react";
import { Users, UserPlus, Loader2, Circle, Trash2, Check, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/apiClient";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface FriendsPanelProps { isOnline: boolean }

interface FriendRow { id: number; discordId: string; username: string; avatar?: string | null; online: boolean; lastSeenAt: number | null; friendshipId: number; }
interface RequestRow { id: number; from?: { id: number; username: string; avatar?: string | null }; to?: { id: number; username: string; avatar?: string | null }; createdAt: number; }

export default function FriendsPanel({ isOnline }: FriendsPanelProps) {
  const [friends, setFriends] = useState<FriendRow[]>([]);
  const [incoming, setIncoming] = useState<RequestRow[]>([]);
  const [outgoing, setOutgoing] = useState<RequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    if (!isOnline) { setLoading(false); return; }
    try {
      const [withPresence, all] = await Promise.all([api.getFriendsOnline(), api.getFriends()]);
      setFriends(withPresence.friends);
      setIncoming(all.incoming as RequestRow[]);
      setOutgoing(all.outgoing as RequestRow[]);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Try again later";
      toast({ title: "Failed to load friends", description: message, variant: "destructive" });
    } finally { setLoading(false); }
  };

  useEffect(() => { refresh(); /* poll every 20s for presence changes */
    const id = window.setInterval(refresh, 20_000);
    return () => window.clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline]);

  const send = async () => {
    if (!query.trim()) return;
    setBusy(true);
    try {
      await api.friendRequest(query.trim());
      toast({ title: "Friend request sent" });
      setQuery("");
      refresh();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Try again";
      toast({ title: "Could not send", description: message, variant: "destructive" });
    } finally { setBusy(false); }
  };

  const respond = async (requestId: number, accept: boolean) => {
    try {
      await api.friendRespond(requestId, accept);
      toast({ title: accept ? "Friend added" : "Request declined" });
      refresh();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "";
      toast({ title: "Failed", description: message, variant: "destructive" });
    }
  };

  const remove = async (friendId: number) => {
    try {
      await api.friendRemove(friendId);
      toast({ title: "Friend removed" });
      refresh();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "";
      toast({ title: "Failed", description: message, variant: "destructive" });
    }
  };

  if (!isOnline) {
    return (
      <Card className="p-6 text-center">
        <Users className="w-10 h-10 text-muted-foreground/40 mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">Friends require an online connection.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-heading text-2xl font-bold text-foreground flex items-center gap-2">
          <Users className="w-6 h-6 text-primary" /> Friends
        </h2>
        <p className="text-sm text-muted-foreground mt-1">Add players by username and see who's online right now.</p>
      </div>

      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-2">
          <Input
            placeholder="Add by username or Discord ID"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") send(); }}
          />
          <Button onClick={send} disabled={busy || !query.trim()}>
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
            Send Request
          </Button>
        </div>
      </Card>

      {incoming.length > 0 && (
        <Card className="p-4">
          <h3 className="font-heading font-bold text-sm text-foreground mb-3">Incoming requests</h3>
          <div className="space-y-2">
            {incoming.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-md bg-secondary/30">
                <span className="text-sm text-foreground">{r.from?.username ?? "Unknown"}</span>
                <div className="flex gap-1">
                  <Button size="sm" variant="default" onClick={() => respond(r.id, true)}><Check className="w-3.5 h-3.5" /> Accept</Button>
                  <Button size="sm" variant="ghost" onClick={() => respond(r.id, false)}><X className="w-3.5 h-3.5" /></Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card className="p-4">
        <h3 className="font-heading font-bold text-sm text-foreground mb-3">Friends ({friends.length})</h3>
        {loading ? (
          <div className="text-center py-6"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground mx-auto" /></div>
        ) : friends.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No friends yet — send a request above to get started.</p>
        ) : (
          <div className="space-y-1.5">
            {friends.map((f) => (
              <div key={f.id} className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-md hover:bg-secondary/40">
                <div className="flex items-center gap-2 min-w-0">
                  <Circle className={cn("w-2.5 h-2.5 shrink-0", f.online ? "fill-green-500 text-green-500" : "fill-muted text-muted")} />
                  <span className="text-sm text-foreground truncate">{f.username}</span>
                  <span className="text-[10px] text-muted-foreground">{f.online ? "online" : "offline"}</span>
                </div>
                <Button size="sm" variant="ghost" onClick={() => remove(f.id)} aria-label="Remove friend">
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>

      {outgoing.length > 0 && (
        <Card className="p-4">
          <h3 className="font-heading font-bold text-sm text-foreground mb-3">Pending sent ({outgoing.length})</h3>
          <div className="space-y-1.5">
            {outgoing.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-md bg-secondary/20">
                <span className="text-sm text-muted-foreground">{r.to?.username ?? "Unknown"}</span>
                <span className="text-[10px] text-muted-foreground">waiting…</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
