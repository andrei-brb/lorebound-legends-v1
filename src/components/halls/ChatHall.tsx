import { useEffect, useMemo, useRef, useState } from "react";
import { Heart, Loader2, MessageCircle, Send } from "lucide-react";
import { api } from "@/lib/apiClient";
import type { PlayerState } from "@/lib/playerState";
import HexAvatar from "@/components/scene/HexAvatar";
import { toast } from "@/hooks/use-toast";

type Msg = { id: number; channel: string; playerId: number; username: string; avatar: string | null; body: string; createdAt: number };

interface Props { isOnline: boolean; playerState: PlayerState }

export default function ChatHall({ isOnline, playerState }: Props) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [active, setActive] = useState<"global" | "guild">("global");
  const [guildChannel, setGuildChannel] = useState<`guild:${number}` | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const channel: "global" | `guild:${number}` = active === "global" ? "global" : (guildChannel ?? "global");

  const channels = useMemo(() => {
    // Match the design layout (some channels may be placeholders).
    return [
      { id: "global" as const, name: "Global", unread: 0, online: 0, enabled: true },
      { id: "guild" as const, name: "Guild", unread: 0, online: 0, enabled: true },
      { id: "trade" as const, name: "Trade Hall", unread: 0, online: 0, enabled: false },
      { id: "ranked" as const, name: "Ranked Lounge", unread: 0, online: 0, enabled: false },
    ];
  }, []);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    api.getChat(channel)
      .then((r) => { if (alive) setMsgs(r?.messages || []); })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [channel]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs]);

  const send = async () => {
    if (!text.trim() || sending) return;
    if (!isOnline) {
      toast({ title: "Offline", description: "Connect online to chat.", variant: "destructive" });
      return;
    }
    setSending(true);
    try {
      await api.postChat(channel, text.trim());
      setText("");
      const r = await api.getChat(channel);
      setMsgs(r?.messages || []);
    } catch { /* swallow */ }
    finally { setSending(false); }
  };

  return (
    <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
      <aside className="panel-gold p-5 relative">
        <div className="corner-deco absolute inset-0" />
        <div className="relative z-10">
          <div className="font-heading text-[#f5c842] tracking-[0.2em] flex items-center gap-2 mb-4">
            <MessageCircle size={16} /> CHANNELS
          </div>
          <div className="space-y-1">
            {channels.map((c) => {
              const isActive = (c.id === "global" && active === "global") || (c.id === "guild" && active === "guild");
              const disabled = !c.enabled;
              return (
                <button
                  key={c.id}
                  type="button"
                  disabled={disabled}
                  onClick={async () => {
                    if (c.id === "trade" || c.id === "ranked") {
                      toast({ title: "Coming soon", description: "More channels will be added next." });
                      return;
                    }
                    if (c.id === "global") {
                      setActive("global");
                      return;
                    }
                    // guild
                    try {
                      const r = await api.getMyGuild();
                      const gid = r.guild?.id;
                      if (!gid) {
                        toast({ title: "No guild", description: "Join a guild to unlock guild chat." });
                        setActive("global");
                        return;
                      }
                      setGuildChannel(`guild:${gid}`);
                      setActive("guild");
                    } catch (e: unknown) {
                      toast({ title: "Guild chat unavailable", description: e instanceof Error ? e.message : "Please try again." });
                      setActive("global");
                    }
                  }}
                  data-testid={`channel-${c.id}`}
                  className={`w-full text-left px-3 py-2 rounded transition flex items-center justify-between ${
                    isActive ? "bg-[rgba(245,200,66,0.15)] ring-1 ring-[rgba(245,200,66,0.35)]" : "hover:bg-[rgba(245,200,66,0.05)]"
                  } ${disabled ? "opacity-40 cursor-not-allowed" : ""}`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-stat text-[11px] tracking-[0.2em] text-[#c9a74a] truncate">{c.name}</span>
                    {c.unread > 0 && (
                      <span className="text-[10px] font-stat tracking-[0.2em] px-1.5 py-0.5 rounded bg-[rgba(245,200,66,0.14)] text-[#f5c842] border border-[rgba(245,200,66,0.35)]">
                        {c.unread}
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-muted-foreground">{c.online || ""}</div>
                </button>
              );
            })}
          </div>
        </div>
      </aside>

      <section className="panel-gold p-5 relative overflow-hidden flex flex-col min-h-[60vh]">
        <div className="corner-deco absolute inset-0" />
        <div className="relative z-10 flex items-center justify-between gap-3 mb-4">
          <div>
            <div className="font-heading text-[#f5c842] tracking-[0.2em]"># {active === "global" ? "Global" : "Guild"}</div>
            <div className="font-lore text-[#d6c293] text-sm">Speak with the realm.</div>
          </div>
          <div className="text-[10px] font-stat tracking-[0.2em] text-[#c9a74a]">
            {isOnline ? "LIVE" : "OFFLINE"} · {msgs.length} MSGS
          </div>
        </div>

        <div
          ref={scrollRef}
          className="relative z-10 flex-1 overflow-y-auto space-y-3 p-3 rounded"
          style={{ background: "rgba(10,6,3,0.35)", border: "1px solid rgba(212,175,55,0.15)" }}
        >
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-[#f5c842]" /></div>
          ) : msgs.length === 0 ? (
            <p className="text-center text-sm text-[#c9a74a] py-12">no embers yet — be the first to speak</p>
          ) : (
            msgs.map((m) => {
              const pid = (playerState as unknown as { playerId?: number }).playerId;
              const you = typeof pid === "number" && m.playerId === pid;
              return (
                <div key={m.id} className={`flex items-start gap-2.5 ${you ? "opacity-95" : ""}`}>
                  <HexAvatar size={32} hue="var(--primary)">
                    {m.username.slice(0, 1).toUpperCase()}
                  </HexAvatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="font-heading text-xs text-[#f8e4a1]">{m.username}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <p className="text-sm text-foreground/90 break-words">{m.body}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="relative z-10 mt-3 flex gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="Speak into the fire…"
            className="flex-1 px-3 py-2 rounded-full font-body text-xs text-[#f8e4a1] outline-none"
            style={{ background: "rgba(10,6,3,0.8)", border: "1px solid rgba(212,175,55,0.4)" }}
            disabled={sending}
          />
          <button
            type="button"
            className="btn-gold flex items-center gap-2"
            onClick={send}
            disabled={!text.trim() || sending}
            data-testid="chat-send"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            <span className="hidden sm:inline">Send</span>
          </button>
        </div>

        <div className="relative z-10 mt-2 text-[10px] text-muted-foreground flex items-center gap-1">
          <Heart className="w-3 h-3" /> Be respectful. The hearth remembers.
        </div>
      </section>
    </div>
  );
}
