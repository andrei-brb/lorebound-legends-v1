import { useEffect, useRef, useState } from "react";
import { MessageCircle, Send, Loader2 } from "lucide-react";
import { api } from "@/lib/apiClient";
import type { PlayerState } from "@/lib/playerState";
import HallLayout, { HallSection, HallStat } from "@/components/scene/HallLayout";
import GlassPanel from "@/components/scene/GlassPanel";
import HexAvatar from "@/components/scene/HexAvatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Msg = { id: number; userId: number; username: string; avatar?: string | null; discordId?: string; content: string; createdAt: number };

interface Props { isOnline: boolean; playerState: PlayerState }

export default function ChatHall({ isOnline, playerState }: Props) {
  const [room, setRoom] = useState<"global" | "trade" | "help">("global");
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    api.getChatMessages?.(room)
      .then((r: any) => { if (alive) setMsgs(r?.messages || r || []); })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [room]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs]);

  const send = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      await api.sendChatMessage?.(room, text.trim());
      setText("");
      const r: any = await api.getChatMessages?.(room);
      setMsgs(r?.messages || r || []);
    } catch { /* swallow */ }
    finally { setSending(false); }
  };

  return (
    <HallLayout
      sidebar={
        <>
          <HallSection title="The Hearth" hue="var(--primary)" glow={0.5}>
            <div className="flex items-center gap-2 mb-3">
              <MessageCircle className="w-4 h-4 text-primary" />
              <span className="text-xs text-muted-foreground">Speak with the realm</span>
            </div>
            <HallStat label="Active" value={msgs.length} />
            <HallStat label="Status" value={isOnline ? "live" : "offline"} hue={isOnline ? "var(--synergy)" : "var(--muted-foreground)"} />
          </HallSection>

          <HallSection title="Channels" hue="var(--primary)" glow={0.3}>
            <div className="space-y-1">
              {(["global", "trade", "help"] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setRoom(r)}
                  className={cn(
                    "w-full text-left px-2.5 py-1.5 rounded-lg text-xs capitalize transition-colors",
                    room === r ? "bg-primary/15 text-foreground ring-1 ring-primary/40" : "text-muted-foreground hover:bg-foreground/5"
                  )}
                >
                  # {r}
                </button>
              ))}
            </div>
          </HallSection>
        </>
      }
      header={
        <GlassPanel hue="var(--primary)" glow={0.4} padding="md">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground"># {room}</p>
            <h1 className="font-heading text-lg text-foreground capitalize">The {room} Hearth</h1>
          </div>
        </GlassPanel>
      }
    >
      <GlassPanel hue="var(--primary)" glow={0.35} padding="none" className="flex flex-col h-[60vh] min-h-[400px] overflow-hidden">
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
          ) : msgs.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-12">no embers yet — be the first to speak</p>
          ) : (
            msgs.map((m) => (
              <div key={m.id} className="flex items-start gap-2.5">
                <HexAvatar size={32} hue="var(--primary)" src={m.avatar && m.discordId ? `https://cdn.discordapp.com/avatars/${m.discordId}/${m.avatar}.png?size=64` : null}>
                  {m.username.slice(0, 1).toUpperCase()}
                </HexAvatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="font-heading text-xs text-foreground">{m.username}</span>
                    <span className="text-[10px] text-muted-foreground">{new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                  <p className="text-sm text-foreground/90 break-words">{m.content}</p>
                </div>
              </div>
            ))
          )}
        </div>
        <div className="border-t border-border/30 p-3 flex gap-2 bg-background/30">
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="Speak into the fire…"
            className="bg-background/40 border-border/40"
            disabled={sending}
          />
          <Button onClick={send} disabled={!text.trim() || sending} size="icon">
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      </GlassPanel>
    </HallLayout>
  );
}
