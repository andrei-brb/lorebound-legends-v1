import { useEffect, useRef, useState } from "react";
import { MessageCircle, Send, Loader2, Globe, Shield } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/apiClient";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface ChatPanelProps { isOnline: boolean }

interface ChatMessage { id: number; channel: string; playerId: number; username: string; avatar: string | null; body: string; createdAt: number; }

export default function ChatPanel({ isOnline }: ChatPanelProps) {
  const [activeChannel, setActiveChannel] = useState<"global" | `guild:${number}`>("global");
  const [guildId, setGuildId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const scrollerRef = useRef<HTMLDivElement>(null);

  // Discover guild membership for guild tab
  useEffect(() => {
    if (!isOnline) return;
    api.getMyGuild().then((r) => setGuildId(r.guild?.id ?? null)).catch(() => {});
  }, [isOnline]);

  const refresh = async () => {
    if (!isOnline) { setLoading(false); return; }
    try {
      const data = await api.getChat(activeChannel, 60);
      setMessages(data.messages);
    } catch (e: unknown) {
      // Silent on poll, but show first error
      if (loading) toast({ title: "Chat unavailable", description: e instanceof Error ? e.message : "", variant: "destructive" });
    } finally { setLoading(false); }
  };

  useEffect(() => {
    setLoading(true);
    refresh();
    const id = window.setInterval(refresh, 3000);
    return () => window.clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeChannel, isOnline]);

  // Auto-scroll on new messages
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
    } catch (e: unknown) {
      toast({ title: "Could not send", description: e instanceof Error ? e.message : "", variant: "destructive" });
    } finally { setSending(false); }
  };

  if (!isOnline) {
    return (
      <Card className="p-6 text-center">
        <MessageCircle className="w-10 h-10 text-muted-foreground/40 mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">Chat requires an online connection.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-heading text-2xl font-bold text-foreground flex items-center gap-2">
          <MessageCircle className="w-6 h-6 text-primary" /> Chat
        </h2>
        <p className="text-sm text-muted-foreground mt-1">Talk in real time. Be kind.</p>
      </div>

      <Card className="p-0 overflow-hidden">
        {/* Channel tabs */}
        <div className="flex border-b border-border">
          <button
            onClick={() => setActiveChannel("global")}
            className={cn("flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium transition-colors",
              activeChannel === "global" ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground")}
          >
            <Globe className="w-4 h-4" /> Global
          </button>
          <button
            onClick={() => guildId && setActiveChannel(`guild:${guildId}` as const)}
            disabled={!guildId}
            className={cn("flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium transition-colors",
              activeChannel.startsWith("guild:") ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground",
              !guildId && "opacity-50 cursor-not-allowed")}
          >
            <Shield className="w-4 h-4" /> Guild {guildId ? "" : "(join one first)"}
          </button>
        </div>

        {/* Messages */}
        <div ref={scrollerRef} className="h-[420px] overflow-y-auto px-4 py-3 space-y-2 bg-background/40">
          {loading ? (
            <div className="text-center py-10"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground mx-auto" /></div>
          ) : messages.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10">No messages yet — say hi 👋</p>
          ) : messages.map((m) => (
            <div key={m.id} className="flex flex-col gap-0.5">
              <div className="flex items-baseline gap-2">
                <span className="text-xs font-medium text-foreground">{m.username}</span>
                <span className="text-[10px] text-muted-foreground">{new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
              </div>
              <p className="text-sm text-foreground/90 break-words leading-snug">{m.body}</p>
            </div>
          ))}
        </div>

        {/* Composer */}
        <div className="border-t border-border p-2 flex gap-2">
          <Input
            placeholder={`Message ${activeChannel === "global" ? "global" : "guild"}…`}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            maxLength={280}
          />
          <Button onClick={send} disabled={sending || !text.trim()}>
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      </Card>
    </div>
  );
}
