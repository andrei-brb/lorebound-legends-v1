import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { api } from "@/lib/apiClient";
import { toast } from "@/hooks/use-toast";
import SceneBackdrop from "./scene/SceneBackdrop";
import FloatingLabel from "./scene/FloatingLabel";
import GlowOrb from "./scene/GlowOrb";
import { cn } from "@/lib/utils";
import type { PlayerState } from "@/lib/playerState";

interface ChatSceneProps {
  isOnline: boolean;
  playerState: PlayerState;
}

interface ChatMessage {
  id: number;
  channel: string;
  playerId: number;
  username: string;
  avatar: string | null;
  body: string;
  createdAt: number;
}

type Channel = "global" | `guild:${number}`;

/**
 * "The Hearth" — chat reimagined as parchment notes drifting up from a fire.
 * No card containers. Pure scene.
 */
export default function ChatScene({ isOnline, playerState }: ChatSceneProps) {
  const reduceMotion = !!playerState.settings?.reduceMotion;
  const [activeChannel, setActiveChannel] = useState<Channel>("global");
  const [guildId, setGuildId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const scrollerRef = useRef<HTMLDivElement>(null);

  // Discover guild
  useEffect(() => {
    if (!isOnline) return;
    api.getMyGuild().then((r) => setGuildId(r.guild?.id ?? null)).catch(() => {});
  }, [isOnline]);

  const refresh = async () => {
    if (!isOnline) { setLoading(false); return; }
    try {
      const data = await api.getChat(activeChannel, 60);
      setMessages(data.messages);
    } catch (e: any) {
      if (loading) toast({ title: "The hearth is silent", description: e?.message || "", variant: "destructive" });
    } finally { setLoading(false); }
  };

  useEffect(() => {
    setLoading(true);
    refresh();
    const id = window.setInterval(refresh, 4000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeChannel, isOnline]);

  useEffect(() => {
    if (scrollerRef.current) scrollerRef.current.scrollTop = scrollerRef.current.scrollHeight;
  }, [messages.length]);

  const send = async () => {
    const body = text.trim();
    if (!body) return;
    setSending(true);
    try {
      const r = await api.postChat(activeChannel, body);
      setText("");
      setMessages((prev) => [...prev, r.message]);
    } catch (e: any) {
      toast({ title: "Could not send", description: e?.message || "", variant: "destructive" });
    } finally { setSending(false); }
  };

  const switchChannel = (c: Channel) => {
    if (c.startsWith("guild") && !guildId) {
      toast({ title: "No guild yet", description: "Join or found a guild to use this lantern." });
      return;
    }
    setActiveChannel(c);
  };

  return (
    <SceneBackdrop mood="hearth" reduceMotion={reduceMotion}>
      <div className="relative px-4 sm:px-8 pt-8 pb-32 min-h-[calc(100vh-12rem)]">
        {/* Two hanging lanterns — channel switch */}
        <div className="absolute left-6 top-2 flex flex-col gap-10 sm:gap-14">
          <Lantern
            label="Common Room"
            lit={activeChannel === "global"}
            onClick={() => switchChannel("global")}
            reduceMotion={reduceMotion}
          />
          <Lantern
            label="Guild Hearth"
            lit={activeChannel.startsWith("guild")}
            dimmed={!guildId}
            onClick={() => guildId && switchChannel(`guild:${guildId}`)}
            reduceMotion={reduceMotion}
          />
        </div>

        {/* Title etched in the air */}
        <div className="text-center mb-10">
          <FloatingLabel variant="ember" className="text-[10px] sm:text-xs">
            {activeChannel === "global" ? "— The Common Room —" : "— Guild Hearth —"}
          </FloatingLabel>
          <h1 className="font-heading text-3xl sm:text-4xl text-foreground mt-3 drop-shadow-[0_0_20px_hsl(var(--legendary)/0.4)]">
            The Hearth
          </h1>
        </div>

        {/* Message stream */}
        <div
          ref={scrollerRef}
          className="relative max-w-2xl mx-auto h-[55vh] overflow-y-auto scrollbar-none"
          style={{
            WebkitMaskImage: "linear-gradient(180deg, transparent 0%, black 18%, black 88%, transparent 100%)",
            maskImage: "linear-gradient(180deg, transparent 0%, black 18%, black 88%, transparent 100%)",
          }}
        >
          {loading ? (
            <div className="flex justify-center pt-20">
              <Loader2 className="w-6 h-6 text-primary animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center pt-20 gap-2">
              <FloatingLabel variant="inked" className="text-muted-foreground">
                The hearth is quiet…
              </FloatingLabel>
              <FloatingLabel className="text-[10px]">be the first to speak</FloatingLabel>
            </div>
          ) : (
            <div className="flex flex-col gap-5 px-4 py-8">
              {messages.map((m, i) => (
                <ParchmentNote
                  key={m.id}
                  message={m}
                  isLatest={i === messages.length - 1}
                  reduceMotion={reduceMotion}
                />
              ))}
            </div>
          )}
        </div>

        {/* Hearth glow at the bottom */}
        <div
          className="pointer-events-none absolute bottom-0 left-1/2 -translate-x-1/2 w-[60vw] h-32"
          style={{
            background: "radial-gradient(ellipse at center bottom, hsl(var(--legendary)/0.6), transparent 70%)",
            filter: "blur(20px)",
          }}
        />

        {/* Composer — quill on parchment */}
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[min(640px,calc(100vw-2rem))] z-20">
          <div className="flex items-end gap-3 px-6 py-3">
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder={isOnline ? "speak into the fire…" : "the hearth is offline"}
              disabled={!isOnline || sending}
              className={cn(
                "flex-1 bg-transparent border-0 outline-none px-2 py-2 text-foreground italic font-heading",
                "placeholder:text-muted-foreground/60 placeholder:italic",
                "border-b-2 border-[hsl(var(--legendary)/0.4)] focus:border-[hsl(var(--legendary)/0.9)] transition-colors",
                "shadow-[0_8px_30px_hsl(var(--legendary)/0.15)]"
              )}
              style={{ caretColor: "hsl(var(--legendary))" }}
            />
            <GlowOrb
              size={42}
              hue="var(--legendary)"
              intensity={text.trim() ? 0.9 : 0.3}
              pulse={!!text.trim() && !reduceMotion}
              onClick={send}
              title="send"
            >
              {sending ? (
                <Loader2 className="w-4 h-4 text-background animate-spin" />
              ) : (
                <span className="text-background text-lg leading-none">✦</span>
              )}
            </GlowOrb>
          </div>
        </div>
      </div>
    </SceneBackdrop>
  );
}

/* ---------- Sub-elements ---------- */

function Lantern({
  label,
  lit,
  dimmed,
  onClick,
  reduceMotion,
}: {
  label: string;
  lit: boolean;
  dimmed?: boolean;
  onClick: () => void;
  reduceMotion?: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="w-px h-6 bg-foreground/30" />
      <button
        type="button"
        onClick={onClick}
        disabled={dimmed}
        className={cn(
          "relative transition-all",
          dimmed && "opacity-30 cursor-not-allowed",
          !dimmed && "hover:scale-110",
          !reduceMotion && lit && "animate-float-slow"
        )}
      >
        <GlowOrb
          size={36}
          hue={lit ? "var(--legendary)" : "var(--muted-foreground)"}
          intensity={lit ? 0.9 : 0.15}
          pulse={lit && !reduceMotion}
        >
          <span className="text-background">{lit ? "✦" : "·"}</span>
        </GlowOrb>
      </button>
      <FloatingLabel className={cn("text-[9px]", lit ? "text-[hsl(var(--legendary))]" : "text-muted-foreground/60")}>
        {label}
      </FloatingLabel>
    </div>
  );
}

function ParchmentNote({
  message,
  isLatest,
  reduceMotion,
}: {
  message: ChatMessage;
  isLatest: boolean;
  reduceMotion?: boolean;
}) {
  const time = useMemo(() => {
    const d = new Date(message.createdAt);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }, [message.createdAt]);

  // Subtle random horizontal nudge so the stream doesn't look like a column
  const offset = useMemo(() => (message.id % 7) - 3, [message.id]);

  return (
    <div
      className={cn(
        "flex items-start gap-3 group",
        !reduceMotion && isLatest && "animate-drift-up"
      )}
      style={{ marginLeft: `${offset * 6}px` }}
    >
      <GlowOrb size={32} hue="var(--primary)" intensity={0.4}>
        <span className="text-background text-xs font-bold">
          {message.username.slice(0, 1).toUpperCase()}
        </span>
      </GlowOrb>
      <div className="flex-1 min-w-0 relative">
        <div className="flex items-baseline gap-2 mb-1">
          <FloatingLabel variant="inked" className="text-sm text-foreground">
            {message.username}
          </FloatingLabel>
          <FloatingLabel className="text-[9px] opacity-50">{time}</FloatingLabel>
        </div>
        <p
          className="text-foreground/90 leading-relaxed font-body text-sm relative px-4 py-2"
          style={{
            background:
              "radial-gradient(ellipse at center, hsl(var(--card) / 0.55) 0%, hsl(var(--card) / 0.3) 60%, transparent 100%)",
            WebkitMaskImage:
              "radial-gradient(ellipse at center, black 60%, transparent 100%)",
            maskImage:
              "radial-gradient(ellipse at center, black 60%, transparent 100%)",
          }}
        >
          {message.body}
        </p>
      </div>
    </div>
  );
}
