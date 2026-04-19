import { useEffect, useState } from "react";
import { Flag, Users, Trophy, Loader2, Send } from "lucide-react";
import { api } from "@/lib/apiClient";
import type { PlayerState } from "@/lib/playerState";
import HallLayout, { HallSection, HallStat } from "@/components/scene/HallLayout";
import GlassPanel from "@/components/scene/GlassPanel";
import HexAvatar from "@/components/scene/HexAvatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import bgGuild from "@/assets/bg-guild-hall.jpg";
import boxParchment from "@/assets/box-tex-parchment.jpg";
import boxStone from "@/assets/box-tex-stone.jpg";
import boxLeather from "@/assets/box-tex-leather.jpg";

interface Member { id: number; username: string; role: "leader" | "officer" | "member"; online?: boolean; avatar?: string | null; discordId?: string }
interface Guild { id: number; name: string; tag: string; level: number; xp: number; xpNext: number; memberCount: number; description?: string }
interface GuildMsg { id: number; userId: number; username: string; avatar?: string | null; discordId?: string; content: string; createdAt: number }

interface Props { isOnline: boolean; playerState: PlayerState }

const MOCK_GUILD: Guild = { id: 1, name: "The Lorebound", tag: "LORE", level: 7, xp: 4200, xpNext: 6000, memberCount: 12, description: "Gathered beneath the moon to seek lost legends." };
const MOCK_MEMBERS: Member[] = [
  { id: 1, username: "Pyrothos", role: "leader", online: true },
  { id: 2, username: "MoonGoddess", role: "officer", online: true },
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
        const g: any = await api.getMyGuild().catch(() => null);
        if (g?.guild) {
          setGuild({
            id: g.guild.id,
            name: g.guild.name,
            tag: g.guild.tag,
            level: g.guild.level ?? 1,
            xp: g.guild.xp ?? 0,
            xpNext: g.guild.xpNext ?? 1000,
            memberCount: g.guild.memberCount ?? MOCK_GUILD.memberCount,
            description: g.guild.description ?? undefined,
          });
          if (g.members) setMembers(g.members);
          if (g.guild.id) {
            const m: any = await api.getChat(`guild:${g.guild.id}` as any).catch(() => null);
            if (alive && m?.messages) setMsgs(m.messages.map((x: any) => ({ id: x.id, userId: x.playerId, username: x.username, content: x.body, createdAt: x.createdAt })));
          }
        }
      } catch {}
      finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, []);

  const send = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      await api.postChat(`guild:${guild.id}`, text.trim());
      const m: any = await api.getChat(`guild:${guild.id}` as any);
      setMsgs((m?.messages || []).map((x: any) => ({ id: x.id, userId: x.playerId, username: x.username, content: x.body, createdAt: x.createdAt })));
      setText("");
    } catch {}
    finally { setSending(false); }
  };

  const xpPct = guild.xpNext ? (guild.xp / guild.xpNext) * 100 : 0;
  const online = members.filter((m) => m.online).length;

  return (
    <div className="relative -mt-8 -mx-4 sm:-mx-6">
      {/* Hero illustration — fades into background */}
      <div className="absolute inset-x-0 top-0 h-[480px] pointer-events-none overflow-hidden" aria-hidden>
        <img
          src={bgGuild}
          alt=""
          width={1920}
          height={1080}
          className="w-full h-full object-cover object-top opacity-70"
        />
        {/* Vignette + bottom fade to background */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/30 to-background" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/60 via-transparent to-background/60" />
      </div>

      <div className="relative z-10 pt-8">
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
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">[{guild.tag}] · Lvl {guild.level}</p>
              </div>
            </div>
            {guild.description && <p className="text-xs text-muted-foreground italic mb-3">"{guild.description}"</p>}
            <HallStat label="Members" value={`${members.length}/${guild.memberCount * 2}`} />
            <HallStat label="Online" value={online} hue="var(--synergy)" />
            <div className="mt-3">
              <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                <span>XP</span>
                <span>{guild.xp}/{guild.xpNext}</span>
              </div>
              <div className="h-1.5 rounded-full bg-foreground/10 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-[hsl(var(--primary))] to-[hsl(var(--legendary))]" style={{ width: `${xpPct}%` }} />
              </div>
            </div>
          </HallSection>

          <HallSection title={`Roster (${members.length})`} hue="var(--legendary)" glow={0.3}>
            <ul className="space-y-1.5 max-h-[40vh] overflow-y-auto pr-1">
              {members.map((m) => {
                const hue = m.role === "leader" ? "var(--legendary)" : m.role === "officer" ? "var(--rare)" : "var(--primary)";
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
              <span className="flex items-center gap-1 text-xs text-[hsl(var(--legendary))]"><Trophy className="w-3.5 h-3.5" /> Lvl {guild.level}</span>
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
      </div>
    </div>
  );
}
