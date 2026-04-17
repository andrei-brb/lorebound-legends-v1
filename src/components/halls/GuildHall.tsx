import { useEffect, useState } from "react";
import { Flag, Users, Trophy, Loader2, Send } from "lucide-react";
import { api } from "@/lib/apiClient";
import type { PlayerState } from "@/lib/playerState";
import type { GuildPublic } from "@/lib/apiClient";
import HallLayout, { HallSection, HallStat } from "@/components/scene/HallLayout";
import GlassPanel from "@/components/scene/GlassPanel";
import HexAvatar from "@/components/scene/HexAvatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Member { id: number; username: string; role: "leader" | "member"; online?: boolean; avatar?: string | null; discordId?: string }
interface Guild {
  id: number;
  name: string;
  tag: string;
  memberCount: number;
  ownerPlayerId?: number;
  description?: string;
  weeklyGoal?: { key: string; target: number; progress: number; resetAt: number };
}
interface GuildMsg { id: number; userId: number; username: string; avatar?: string | null; discordId?: string; content: string; createdAt: number }

interface Props { isOnline: boolean; playerState: PlayerState }

const MOCK_GUILD: Guild = {
  id: 1,
  name: "The Lorebound",
  tag: "LORE",
  memberCount: 12,
  description: "Gathered beneath the moon to seek lost legends.",
  weeklyGoal: { key: "wins", target: 50, progress: 18, resetAt: Date.now() + 3 * 24 * 60 * 60 * 1000 },
};
const MOCK_MEMBERS: Member[] = [
  { id: 1, username: "Pyrothos", role: "leader", online: true },
  { id: 2, username: "MoonGoddess", role: "member", online: true },
  { id: 3, username: "Sylvana", role: "member", online: false },
  { id: 4, username: "Tempestia", role: "member", online: true },
  { id: 5, username: "Verdantia", role: "member", online: false },
];

export default function GuildHall({ isOnline }: Props) {
  const [guild, setGuild] = useState<Guild>(MOCK_GUILD);
  const [members, setMembers] = useState<Member[]>(MOCK_MEMBERS);
  const [msgs, setMsgs] = useState<GuildMsg[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    (async () => {
      try {
        const g = await api.getMyGuild().catch(() => null);
        if (!g?.guild) return;

        const guildPublic = g.guild as GuildPublic;
        setGuild({
          id: guildPublic.id,
          name: guildPublic.name,
          tag: guildPublic.tag,
          memberCount: guildPublic.memberCount ?? MOCK_GUILD.memberCount,
          ownerPlayerId: guildPublic.ownerPlayerId,
          description: guildPublic.description ?? undefined,
          weeklyGoal: guildPublic.weeklyGoal,
        });

        setMembers(
          g.members.map((m) => ({
            id: m.id,
            username: m.username,
            role: m.id === guildPublic.ownerPlayerId ? "leader" : "member",
            online: m.online,
            avatar: m.avatar ?? null,
            discordId: m.discordId,
          }))
        );

        const chat = await api.getChat(`guild:${guildPublic.id}`).catch(() => null);
        if (alive && chat?.messages) {
          setMsgs(chat.messages.map((x) => ({ id: x.id, userId: x.playerId, username: x.username, content: x.body, createdAt: x.createdAt })));
        }
      } catch { /* offline ok */ }
      finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, []);

  const send = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      await api.postChat(`guild:${guild.id}`, text.trim());
      const m = await api.getChat(`guild:${guild.id}`);
      setMsgs(m.messages.map((x) => ({ id: x.id, userId: x.playerId, username: x.username, content: x.body, createdAt: x.createdAt })));
      setText("");
    } catch { /* offline ok */ }
    finally { setSending(false); }
  };

  const online = members.filter((m) => m.online).length;
  const goal = guild.weeklyGoal ?? MOCK_GUILD.weeklyGoal!;
  const goalPct = goal.target ? Math.min(100, Math.round((goal.progress / Math.max(1, goal.target)) * 100)) : 0;

  return (
    <HallLayout
      sidebarWidth="md"
      sidebar={
        <>
          <HallSection title="Hall of Banners" hue="var(--legendary)" glow={0.6}>
            <div className="flex items-center gap-3 mb-4">
              <HexAvatar size={56} hue="var(--legendary)">
                <Flag className="w-6 h-6 text-[hsl(var(--legendary))]" />
              </HexAvatar>
              <div className="min-w-0">
                <h3 className="font-heading text-base text-foreground truncate">{guild.name}</h3>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">[{guild.tag}]</p>
              </div>
            </div>
            {guild.description && <p className="text-xs text-muted-foreground italic mb-3">"{guild.description}"</p>}
            <HallStat label="Members" value={`${members.length}/${guild.memberCount}`} />
            <HallStat label="Online" value={online} hue="var(--synergy)" />
            <div className="mt-3">
              <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                <span>Weekly goal</span>
                <span>{goal.progress}/{goal.target} {goal.key}</span>
              </div>
              <div className="h-1.5 rounded-full bg-foreground/10 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--legendary))]" style={{ width: `${goalPct}%` }} />
              </div>
            </div>
          </HallSection>

          <HallSection title={`Roster (${members.length})`} hue="var(--legendary)" glow={0.3}>
            <ul className="space-y-1.5 max-h-[40vh] overflow-y-auto pr-1">
              {members.map((m) => {
                const hue = m.role === "leader" ? "var(--legendary)" : "var(--primary)";
                return (
                  <li key={m.id} className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-foreground/5">
                    <HexAvatar size={32} hue={hue} online={m.online} src={m.avatar && m.discordId ? `https://cdn.discordapp.com/avatars/${m.discordId}/${m.avatar}.png?size=64` : null}>
                      {m.username.slice(0, 1).toUpperCase()}
                    </HexAvatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-foreground truncate">{m.username}</p>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{m.role}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </HallSection>
        </>
      }
      header={
        <GlassPanel hue="var(--legendary)" glow={0.4} padding="md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Guild Chat</p>
              <h1 className="font-heading text-lg text-foreground">Banner Hall</h1>
            </div>
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 text-xs text-muted-foreground"><Users className="w-3.5 h-3.5" /> {members.length}</span>
              <span className="flex items-center gap-1 text-xs text-[hsl(var(--legendary))]"><Trophy className="w-3.5 h-3.5" /> {goal.key}</span>
            </div>
          </div>
        </GlassPanel>
      }
    >
      <GlassPanel hue="var(--legendary)" glow={0.35} padding="none" className="flex flex-col h-[55vh] min-h-[380px] overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
          ) : msgs.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-12">the banners hang in silence</p>
          ) : (
            msgs.map((m) => (
              <div key={m.id} className="flex items-start gap-2.5">
                <HexAvatar size={32} hue="var(--legendary)">
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
          <Input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="Address the banners…" className="bg-background/40 border-border/40" disabled={sending} />
          <Button onClick={send} disabled={!text.trim() || sending} size="icon" className="bg-[hsl(var(--legendary))] hover:bg-[hsl(var(--legendary))]/90">
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>
      </GlassPanel>
    </HallLayout>
  );
}
