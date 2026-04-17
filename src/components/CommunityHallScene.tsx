import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Send, UserPlus, Check, X, Search, Users } from "lucide-react";
import { api } from "@/lib/apiClient";
import { toast } from "@/hooks/use-toast";
import SceneBackdrop from "./scene/SceneBackdrop";
import GlassPanel from "./scene/GlassPanel";
import HexAvatar from "./scene/HexAvatar";
import { cn } from "@/lib/utils";
import type { PlayerState } from "@/lib/playerState";

interface CommunityHallSceneProps {
  isOnline: boolean;
  playerState: PlayerState;
}

interface FriendRow { id: number; username: string; avatar?: string | null; online: boolean; lastSeenAt?: number | null; }
interface PendingRow { id: number; from: { id: number; username: string; avatar?: string | null }; createdAt: number; }
interface ChatMsg { id: number; username: string; avatar: string | null; body: string; createdAt: number; }

const MOCK_FRIENDS: FriendRow[] = [
  { id: 1, username: "Elara", online: true },
  { id: 2, username: "Kaelen", online: true },
  { id: 3, username: "Alaric", online: false },
  { id: 4, username: "Haran", online: true },
  { id: 5, username: "Lyra", online: false },
  { id: 6, username: "Doran", online: true },
];

const MOCK_PENDING: PendingRow[] = [
  { id: 99, from: { id: 88, username: "Mira" }, createdAt: Date.now() },
];

const MOCK_MSGS: ChatMsg[] = [
  { id: 1, username: "Elara", avatar: null, body: "Anyone up for a quick PvP run?", createdAt: Date.now() - 1000 * 60 * 8 },
  { id: 2, username: "Kaelen", avatar: null, body: "Just finished my dailies — count me in.", createdAt: Date.now() - 1000 * 60 * 5 },
  { id: 3, username: "Haran", avatar: null, body: "Meet at the gates in 5.", createdAt: Date.now() - 1000 * 60 * 2 },
];

export default function CommunityHallScene({ isOnline, playerState }: CommunityHallSceneProps) {
  const reduceMotion = !!playerState.settings?.reduceMotion;
  const [friends, setFriends] = useState<FriendRow[]>(MOCK_FRIENDS);
  const [pending, setPending] = useState<PendingRow[]>(MOCK_PENDING);
  const [messages, setMessages] = useState<ChatMsg[]>(MOCK_MSGS);
  const [text, setText] = useState("");
  const [search, setSearch] = useState("");
  const [addQuery, setAddQuery] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOnline) return;
    let alive = true;
    setLoading(true);
    Promise.all([api.getFriends(), api.getChat("global", 30)])
      .then(([f, c]) => {
        if (!alive) return;
        const acc = (f.accepted || []).map((x: any) => ({
          id: x.friend.id, username: x.friend.username, avatar: x.friend.avatar,
          online: x.friend.online ?? false, lastSeenAt: x.friend.lastSeenAt,
        }));
        if (acc.length) setFriends(acc);
        const pen = (f.incoming || []).map((x: any) => ({ id: x.id, from: x.from, createdAt: x.createdAt }));
        if (pen.length) setPending(pen);
        if (c.messages?.length) setMessages(c.messages.slice(-30) as any);
      })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [isOnline]);

  useEffect(() => {
    if (scrollerRef.current) scrollerRef.current.scrollTop = scrollerRef.current.scrollHeight;
  }, [messages.length]);

  const send = async () => {
    const body = text.trim();
    if (!body) return;
    setSending(true);
    try {
      if (isOnline) {
        const r = await api.postChat("global", body);
        setMessages((prev) => [...prev, r.message as any]);
      } else {
        setMessages((prev) => [...prev, { id: Date.now(), username: "You", avatar: null, body, createdAt: Date.now() }]);
      }
      setText("");
    } catch (e: any) {
      toast({ title: "Could not send", description: e?.message || "" });
    } finally { setSending(false); }
  };

  const addFriend = async () => {
    const u = addQuery.trim();
    if (!u) return;
    if (!isOnline) {
      toast({ title: "Sent (preview)", description: `Friend request to ${u}` });
      setAddQuery("");
      return;
    }
    try { await api.friendRequest(u); toast({ title: "Request sent" }); setAddQuery(""); }
    catch (e: any) { toast({ title: "Couldn't send", description: e?.message || "" }); }
  };

  const respond = async (id: number, accept: boolean) => {
    if (!isOnline) { setPending((p) => p.filter((x) => x.id !== id)); return; }
    try { await api.friendRespond(id, accept); setPending((p) => p.filter((x) => x.id !== id)); }
    catch (e: any) { toast({ title: "Failed", description: e?.message || "" }); }
  };

  const filteredFriends = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return friends;
    return friends.filter((f) => f.username.toLowerCase().includes(q));
  }, [friends, search]);

  const onlineCount = friends.filter((f) => f.online).length;

  return (
    <SceneBackdrop mood="hearth" reduceMotion={reduceMotion ? true : undefined}>
      <div className="relative px-3 sm:px-6 py-4 min-h-[calc(100vh-12rem)]">
        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-5 max-w-7xl mx-auto">
          {/* Sticky sidebar — friends */}
          <aside className="lg:sticky lg:top-28 self-start space-y-4">
            {/* Add friend */}
            <GlassPanel hue="var(--legendary)" glow={0.4} padding="sm">
              <div
                className="flex items-center gap-2 rounded-full px-3 py-1.5"
                style={{
                  background: "hsl(var(--background) / 0.55)",
                  border: "1px solid hsl(var(--legendary) / 0.3)",
                }}
              >
                <UserPlus className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                <input
                  value={addQuery}
                  onChange={(e) => setAddQuery(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addFriend(); } }}
                  placeholder="invite by name…"
                  className="flex-1 min-w-0 bg-transparent border-0 outline-none text-sm text-foreground placeholder:text-muted-foreground py-0.5"
                />
                <button
                  onClick={addFriend}
                  disabled={!addQuery.trim()}
                  className={cn(
                    "shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-colors",
                    addQuery.trim()
                      ? "bg-[hsl(var(--legendary))] text-background hover:opacity-90"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  →
                </button>
              </div>
            </GlassPanel>

            {/* Pending */}
            {pending.length > 0 && (
              <GlassPanel hue="var(--legendary)" glow={0.5} padding="sm">
                <p className="text-[10px] tracking-[0.3em] uppercase text-[hsl(var(--legendary))] mb-2 px-1">
                  Knocking · {pending.length}
                </p>
                <div className="space-y-2">
                  {pending.map((p) => (
                    <div key={p.id} className="flex items-center gap-2.5 px-1">
                      <HexAvatar size={32} hue="var(--legendary)">
                        {p.from.username.slice(0, 1).toUpperCase()}
                      </HexAvatar>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-foreground truncate">{p.from.username}</div>
                        <div className="text-[10px] text-muted-foreground">wants to join</div>
                      </div>
                      <button
                        onClick={() => respond(p.id, true)}
                        className="w-6 h-6 rounded-full bg-[hsl(var(--synergy)/0.15)] text-[hsl(var(--synergy))] hover:bg-[hsl(var(--synergy)/0.25)] flex items-center justify-center transition-colors"
                      >
                        <Check className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => respond(p.id, false)}
                        className="w-6 h-6 rounded-full bg-destructive/15 text-destructive hover:bg-destructive/25 flex items-center justify-center transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </GlassPanel>
            )}

            {/* Friends */}
            <GlassPanel hue="var(--primary)" glow={0.3} padding="sm">
              <div className="flex items-center justify-between mb-2 px-1">
                <p className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground flex items-center gap-1.5">
                  <Users className="w-3 h-3" /> Friends
                </p>
                <span className="text-[10px] text-muted-foreground">{onlineCount} / {friends.length}</span>
              </div>
              <div
                className="flex items-center gap-2 mb-2 px-2 py-1 rounded-full"
                style={{ background: "hsl(var(--background) / 0.5)", border: "1px solid hsl(var(--border))" }}
              >
                <Search className="w-3 h-3 text-muted-foreground" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="search…"
                  className="flex-1 bg-transparent border-0 outline-none text-xs text-foreground placeholder:text-muted-foreground py-0.5"
                />
              </div>
              <div className="space-y-1 max-h-[40vh] overflow-y-auto scrollbar-none">
                {filteredFriends.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">no companions match</p>
                ) : filteredFriends.map((f) => <FriendRowItem key={f.id} friend={f} />)}
              </div>
            </GlassPanel>
          </aside>

          {/* Main — global chat */}
          <main className="min-w-0">
            <GlassPanel hue="var(--legendary)" glow={0.35} padding="none" className="overflow-hidden">
              <div className="px-5 py-3 border-b border-border/40 flex items-center justify-between">
                <div>
                  <h1 className="font-heading text-lg text-foreground"># common-hall</h1>
                  <p className="text-xs text-muted-foreground">{onlineCount} kindled by the fire</p>
                </div>
                {loading && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
              </div>

              <div ref={scrollerRef} className="px-3 sm:px-5 py-4 space-y-4 max-h-[60vh] overflow-y-auto">
                {messages.map((m) => <Message key={m.id} msg={m} />)}
              </div>

              <div className="px-3 sm:px-5 pb-4 pt-2 border-t border-border/40">
                <div
                  className="flex items-center gap-2 rounded-full px-4 py-2"
                  style={{
                    background: "hsl(var(--background) / 0.6)",
                    border: "1px solid hsl(var(--legendary) / 0.3)",
                    boxShadow: "inset 0 0 12px hsl(var(--legendary) / 0.06)",
                  }}
                >
                  <input
                    type="text"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                    placeholder="Send Message"
                    disabled={sending}
                    className="flex-1 bg-transparent border-0 outline-none text-sm text-foreground placeholder:text-muted-foreground py-1"
                    style={{ caretColor: "hsl(var(--legendary))" }}
                  />
                  <button
                    onClick={send}
                    disabled={!text.trim() || sending}
                    className={cn(
                      "shrink-0 rounded-full w-8 h-8 flex items-center justify-center transition-colors",
                      text.trim()
                        ? "bg-[hsl(var(--legendary))] text-background hover:opacity-90"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </GlassPanel>
          </main>
        </div>
      </div>
    </SceneBackdrop>
  );
}

function FriendRowItem({ friend }: { friend: FriendRow }) {
  return (
    <div className="flex items-center gap-2.5 py-1.5 px-1 rounded-lg hover:bg-foreground/5 transition-colors">
      <HexAvatar
        size={30}
        hue={friend.online ? "var(--legendary)" : "var(--muted-foreground)"}
        online={friend.online}
      >
        {friend.username.slice(0, 1).toUpperCase()}
      </HexAvatar>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium text-foreground truncate">{friend.username}</div>
        <div className="text-[10px] text-muted-foreground">{friend.online ? "Online" : "Offline"}</div>
      </div>
    </div>
  );
}

function Message({ msg }: { msg: ChatMsg }) {
  const time = useMemo(() => new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), [msg.createdAt]);
  return (
    <div className="flex items-start gap-3">
      <HexAvatar size={40} hue="var(--primary)">
        {msg.username.slice(0, 1).toUpperCase()}
      </HexAvatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="font-heading text-sm text-foreground">{msg.username}</span>
          <span className="text-[10px] text-muted-foreground">{time}</span>
        </div>
        <p className="text-foreground/90 text-sm leading-relaxed mt-0.5">{msg.body}</p>
      </div>
    </div>
  );
}
