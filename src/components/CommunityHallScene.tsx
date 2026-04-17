import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Send, UserPlus, Check, X, Search } from "lucide-react";
import { api } from "@/lib/apiClient";
import { toast } from "@/hooks/use-toast";
import SceneBackdrop from "./scene/SceneBackdrop";
import FloatingLabel from "./scene/FloatingLabel";
import GlowOrb from "./scene/GlowOrb";
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

/**
 * "The Common Hall" — friends, presence, and chat woven together as a tavern scene.
 */
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

  // Pull real data when online
  useEffect(() => {
    if (!isOnline) return;
    let alive = true;
    setLoading(true);
    Promise.all([api.getFriends(), api.getChat("global", 30)])
      .then(([f, c]) => {
        if (!alive) return;
        const acc = (f.accepted || []).map((x: any) => ({
          id: x.friend.id,
          username: x.friend.username,
          avatar: x.friend.avatar,
          online: x.friend.online ?? false,
          lastSeenAt: x.friend.lastSeenAt,
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
    try {
      await api.friendRequest(u);
      toast({ title: "Request sent" });
      setAddQuery("");
    } catch (e: any) {
      toast({ title: "Couldn't send", description: e?.message || "" });
    }
  };

  const respond = async (id: number, accept: boolean) => {
    if (!isOnline) {
      setPending((p) => p.filter((x) => x.id !== id));
      return;
    }
    try {
      await api.friendRespond(id, accept);
      setPending((p) => p.filter((x) => x.id !== id));
    } catch (e: any) {
      toast({ title: "Failed", description: e?.message || "" });
    }
  };

  const filteredFriends = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return friends;
    return friends.filter((f) => f.username.toLowerCase().includes(q));
  }, [friends, search]);

  const onlineCount = friends.filter((f) => f.online).length;

  return (
    <SceneBackdrop mood="hearth" reduceMotion={reduceMotion}>
      <div className="relative px-4 sm:px-6 pt-6 pb-10 min-h-[calc(100vh-12rem)]">
        {/* Title */}
        <div className="text-center mb-6">
          <FloatingLabel variant="ember" className="text-[10px] sm:text-xs">— Welcome, traveller —</FloatingLabel>
          <h1 className="font-heading text-2xl sm:text-3xl text-foreground mt-1 drop-shadow-[0_0_20px_hsl(var(--legendary)/0.5)]">
            The Common Hall
          </h1>
          <FloatingLabel variant="inked" className="text-muted-foreground text-xs block mt-1">
            {onlineCount} of {friends.length} kindled by the fire
          </FloatingLabel>
        </div>

        {loading && (
          <div className="flex justify-center mb-2"><Loader2 className="w-4 h-4 animate-spin text-primary" /></div>
        )}

        {/* Two-column: portraits ring on left, chat on right */}
        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6 lg:gap-10 max-w-6xl mx-auto">
          {/* Left — Portrait gallery (companions) */}
          <div className="flex flex-col gap-4">
            {/* Add friend — quill on parchment */}
            <div
              className="relative flex items-center gap-2 px-4 py-2 rounded-full"
              style={{
                background:
                  "radial-gradient(ellipse at center, hsl(var(--card) / 0.7) 0%, hsl(var(--card) / 0.35) 70%, transparent 100%)",
                WebkitMaskImage: "radial-gradient(ellipse at center, black 65%, transparent 100%)",
                maskImage: "radial-gradient(ellipse at center, black 65%, transparent 100%)",
              }}
            >
              <UserPlus className="w-4 h-4 text-muted-foreground shrink-0" />
              <input
                value={addQuery}
                onChange={(e) => setAddQuery(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addFriend(); } }}
                placeholder="invite by name…"
                className="flex-1 min-w-0 bg-transparent border-0 outline-none text-sm font-heading italic text-foreground placeholder:text-foreground/50"
              />
              <button onClick={addFriend} className="shrink-0">
                <GlowOrb size={28} hue="var(--legendary)" intensity={addQuery.trim() ? 0.8 : 0.3}>
                  <span className="text-background text-xs">→</span>
                </GlowOrb>
              </button>
            </div>

            {/* Pending requests — knocking at the door */}
            {pending.length > 0 && (
              <div className="space-y-2">
                <FloatingLabel variant="ember" className="text-[10px]">— Knocking at the door —</FloatingLabel>
                {pending.map((p) => (
                  <div key={p.id} className="flex items-center gap-3 py-1">
                    <GlowOrb size={36} hue="var(--legendary)" intensity={0.7} pulse={!reduceMotion}>
                      <span className="text-background text-xs font-heading">{p.from.username.slice(0, 1).toUpperCase()}</span>
                    </GlowOrb>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-heading text-foreground truncate">{p.from.username}</div>
                      <FloatingLabel className="text-[9px]">wishes to join you</FloatingLabel>
                    </div>
                    <button onClick={() => respond(p.id, true)} className="text-[hsl(var(--synergy))] hover:scale-110 transition-transform">
                      <Check className="w-4 h-4" />
                    </button>
                    <button onClick={() => respond(p.id, false)} className="text-destructive hover:scale-110 transition-transform">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Friends gallery */}
            <div className="flex items-center gap-2 mt-2">
              <Search className="w-3 h-3 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="search the hall…"
                className="flex-1 bg-transparent border-0 outline-none border-b border-foreground/10 focus:border-foreground/30 transition-colors text-xs italic font-heading text-foreground placeholder:text-foreground/40 pb-1"
              />
            </div>

            <div
              className="grid grid-cols-3 gap-3 overflow-y-auto scrollbar-none max-h-[55vh] py-2"
              style={{
                WebkitMaskImage: "linear-gradient(180deg, transparent 0%, black 8%, black 92%, transparent 100%)",
                maskImage: "linear-gradient(180deg, transparent 0%, black 8%, black 92%, transparent 100%)",
              }}
            >
              {filteredFriends.length === 0 ? (
                <div className="col-span-3 text-center py-6">
                  <FloatingLabel variant="inked" className="text-muted-foreground text-sm">
                    no companions match
                  </FloatingLabel>
                </div>
              ) : filteredFriends.map((f) => <Portrait key={f.id} friend={f} reduceMotion={reduceMotion} />)}
            </div>
          </div>

          {/* Right — Hearth chat */}
          <div className="flex flex-col min-h-[55vh]">
            <FloatingLabel variant="ember" className="text-[10px] mb-2 text-center">— Voices by the fire —</FloatingLabel>
            <div
              ref={scrollerRef}
              className="flex-1 overflow-y-auto scrollbar-none pr-2"
              style={{
                WebkitMaskImage: "linear-gradient(180deg, transparent 0%, black 10%, black 92%, transparent 100%)",
                maskImage: "linear-gradient(180deg, transparent 0%, black 10%, black 92%, transparent 100%)",
              }}
            >
              <div className="flex flex-col gap-5 py-4">
                {messages.map((m, i) => <PortraitMessage key={m.id} msg={m} latest={i === messages.length - 1} reduceMotion={reduceMotion} />)}
              </div>
            </div>

            {/* Composer */}
            <div className="relative mt-4">
              <div
                className="pointer-events-none absolute inset-x-0 -top-6 h-20 mx-auto w-[80%]"
                style={{
                  background: "radial-gradient(ellipse at center bottom, hsl(var(--legendary)/0.5), transparent 70%)",
                  filter: "blur(20px)",
                }}
              />
              <div
                className="relative flex items-center gap-3 px-4 sm:px-5 py-2 rounded-full"
                style={{
                  background:
                    "radial-gradient(ellipse at center, hsl(var(--card) / 0.85) 0%, hsl(var(--card) / 0.55) 70%, hsl(var(--card) / 0.2) 100%)",
                  boxShadow: "0 0 30px hsl(var(--legendary) / 0.25), inset 0 0 20px hsl(var(--legendary) / 0.08)",
                  WebkitMaskImage: "radial-gradient(ellipse at center, black 65%, transparent 100%)",
                  maskImage: "radial-gradient(ellipse at center, black 65%, transparent 100%)",
                }}
              >
                <input
                  type="text"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                  placeholder="speak into the fire…"
                  disabled={sending}
                  className="flex-1 bg-transparent border-0 outline-none px-3 py-2 text-foreground italic font-heading placeholder:text-foreground/50"
                  style={{ caretColor: "hsl(var(--legendary))" }}
                />
                <GlowOrb size={36} hue="var(--legendary)" intensity={text.trim() ? 0.9 : 0.4} pulse={!!text.trim() && !reduceMotion} onClick={send} title="send">
                  {sending ? <Loader2 className="w-4 h-4 text-background animate-spin" /> : <Send className="w-4 h-4 text-background" />}
                </GlowOrb>
              </div>
            </div>
          </div>
        </div>
      </div>
    </SceneBackdrop>
  );
}

/* ---------- Portrait (friend in the gallery) ---------- */
function Portrait({ friend, reduceMotion }: { friend: FriendRow; reduceMotion?: boolean }) {
  return (
    <div className={cn("flex flex-col items-center gap-1.5", !reduceMotion && "hover:-translate-y-0.5 transition-transform")}>
      <div className="relative">
        <GlowOrb
          size={56}
          hue={friend.online ? "var(--legendary)" : "var(--muted-foreground)"}
          intensity={friend.online ? 0.7 : 0.15}
          pulse={friend.online && !reduceMotion}
        >
          <span className="text-background font-heading text-base">{friend.username.slice(0, 1).toUpperCase()}</span>
        </GlowOrb>
        {friend.online && (
          <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-[hsl(var(--synergy))] shadow-[0_0_8px_hsl(var(--synergy))]" />
        )}
      </div>
      <FloatingLabel variant="inked" className={cn("text-[10px] truncate max-w-[64px]", friend.online ? "text-foreground" : "text-muted-foreground/70")}>
        {friend.username}
      </FloatingLabel>
    </div>
  );
}

/* ---------- Portrait message ---------- */
function PortraitMessage({ msg, latest, reduceMotion }: { msg: ChatMsg; latest: boolean; reduceMotion?: boolean }) {
  const time = useMemo(() => {
    const d = new Date(msg.createdAt);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }, [msg.createdAt]);

  return (
    <div className={cn("flex items-start gap-3", !reduceMotion && latest && "animate-drift-up")}>
      <GlowOrb size={44} hue="var(--primary)" intensity={0.55}>
        <span className="text-background font-heading text-sm">{msg.username.slice(0, 1).toUpperCase()}</span>
      </GlowOrb>
      <div
        className="flex-1 min-w-0 px-4 py-2"
        style={{
          background:
            "radial-gradient(ellipse at left center, hsl(var(--card) / 0.65) 0%, hsl(var(--card) / 0.3) 65%, transparent 100%)",
          WebkitMaskImage: "radial-gradient(ellipse at left center, black 60%, transparent 100%)",
          maskImage: "radial-gradient(ellipse at left center, black 60%, transparent 100%)",
        }}
      >
        <div className="flex items-baseline gap-2 mb-0.5">
          <span className="font-heading text-sm text-foreground">{msg.username}</span>
          <FloatingLabel className="text-[9px] opacity-50">{time}</FloatingLabel>
        </div>
        <p className="text-foreground/90 text-sm leading-relaxed font-body">{msg.body}</p>
      </div>
    </div>
  );
}
