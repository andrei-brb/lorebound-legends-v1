import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Send, Users, Trophy, Zap } from "lucide-react";
import { api, type GuildPublic } from "@/lib/apiClient";
import { toast } from "@/hooks/use-toast";
import SceneBackdrop from "./scene/SceneBackdrop";
import GlassPanel from "./scene/GlassPanel";
import HexAvatar from "./scene/HexAvatar";
import { cn } from "@/lib/utils";
import type { PlayerState } from "@/lib/playerState";

interface GuildSceneProps {
  isOnline: boolean;
  playerState: PlayerState;
}

interface GuildMember { id: number; username: string; avatar?: string | null; online: boolean; lastSeenAt: number | null; level?: number; role?: string; }
interface ChatMsg { id: number; channel: string; playerId: number; username: string; avatar: string | null; body: string; createdAt: number; role?: string; }

const MOCK_GUILD: GuildPublic & { level?: number; xp?: number; xpMax?: number; totalPower?: number } = {
  id: 0,
  name: "The Lorebound Circle",
  tag: "LBC",
  description: "Founded by the seekers of forgotten lore.",
  ownerPlayerId: 1,
  memberCount: 88,
  weeklyGoal: { key: "wins", target: 10000, progress: 6420, resetAt: Date.now() + 86400000 },
  createdAt: Date.now(),
  level: 14,
  xp: 20000,
  xpMax: 30000,
  totalPower: 3450000,
};

const MOCK_MEMBERS: GuildMember[] = [
  { id: 1, username: "Elara, Shadowseer", avatar: null, online: true, lastSeenAt: Date.now(), level: 14, role: "Initiate" },
  { id: 2, username: "Kaelen, Fireweaver", avatar: null, online: true, lastSeenAt: Date.now(), level: 10, role: "Acolyte" },
  { id: 3, username: "Alaric, Guildmaster", avatar: null, online: false, lastSeenAt: Date.now(), level: 12, role: "Founder" },
  { id: 4, username: "Haran, Mankar", avatar: null, online: false, lastSeenAt: Date.now(), level: 16, role: "Sage" },
  { id: 5, username: "Lyra, Eiseaster", avatar: null, online: true, lastSeenAt: Date.now(), level: 9, role: "Initiate" },
  { id: 6, username: "Doran, Stormcaller", avatar: null, online: false, lastSeenAt: Date.now(), level: 11, role: "Acolyte" },
];

const MOCK_MSGS: ChatMsg[] = [
  { id: 1, channel: "guild:0", playerId: 1, username: "Elara, Shadowseer", avatar: null, body: "Anyone seen the spawn times for the Void Dragon? Raid planner down.", createdAt: Date.now() - 1000 * 60 * 14, role: "Initiate" },
  { id: 2, channel: "guild:0", playerId: 2, username: "Kaelen, Fireweaver", avatar: null, body: "It's 20:15 UTC. Check the new post.", createdAt: Date.now() - 1000 * 60 * 12, role: "Acolyte" },
  { id: 3, channel: "guild:0", playerId: 3, username: "Alaric, Guildmaster", avatar: null, body: "Raid planner is back. Spawn is indeed 20:15. Check your gear, everyone!", createdAt: Date.now() - 1000 * 60 * 10, role: "Founder" },
];

const ROLE_HUE: Record<string, string> = {
  Founder: "var(--legendary)",
  Sage: "var(--epic)",
  Guildmaster: "var(--legendary)",
  Acolyte: "var(--rare)",
  Initiate: "var(--primary)",
};

export default function GuildScene({ isOnline, playerState }: GuildSceneProps) {
  const reduceMotion = !!playerState.settings?.reduceMotion;
  const [guild, setGuild] = useState<typeof MOCK_GUILD | null>(MOCK_GUILD);
  const [members, setMembers] = useState<GuildMember[]>(MOCK_MEMBERS);
  const [messages, setMessages] = useState<ChatMsg[]>(MOCK_MSGS);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOnline) return;
    let alive = true;
    setLoading(true);
    api.getMyGuild()
      .then(async (r) => {
        if (!alive || !r.guild) return;
        setGuild(r.guild as any);
        setMembers((r.members as any) || MOCK_MEMBERS);
        try {
          const c = await api.getChat(`guild:${r.guild.id}` as any, 40);
          if (alive && c.messages?.length) setMessages(c.messages as any);
        } catch {}
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
      if (isOnline && guild?.id) {
        const r = await api.postChat(`guild:${guild.id}` as any, body);
        setMessages((prev) => [...prev, r.message as any]);
      } else {
        setMessages((prev) => [...prev, {
          id: Date.now(), channel: `guild:${guild?.id || 0}`, playerId: 0,
          username: "You", avatar: null, body, createdAt: Date.now(), role: "Acolyte",
        }]);
      }
      setText("");
    } catch (e: any) {
      toast({ title: "Could not send", description: e?.message || "", variant: "destructive" });
    } finally { setSending(false); }
  };

  const xpPct = guild ? Math.min(100, ((guild.xp || 0) / (guild.xpMax || 30000)) * 100) : 0;
  const onlineCount = members.filter((m) => m.online).length;

  return (
    <SceneBackdrop mood="moonlit" reduceMotion={reduceMotion ? true : undefined}>
      <div className="relative px-3 sm:px-6 py-4 min-h-[calc(100vh-12rem)]">
        {/* Two-column: sticky sidebar + main */}
        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-5 max-w-7xl mx-auto">
          {/* Sticky sidebar — shield + stats + roster */}
          <aside className="lg:sticky lg:top-28 self-start space-y-4">
            {/* Shield panel */}
            <GlassPanel hue="var(--legendary)" glow={0.5} padding="md">
              <div className="text-center">
                <p className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground">Guild Info</p>
                <h2 className="font-heading text-base text-foreground mt-1 leading-tight">{guild?.name}</h2>
              </div>
              <div className="flex justify-center my-4">
                <ShieldCrest level={guild?.level ?? 1} />
              </div>
              <div className="space-y-2.5">
                <XpBar value={guild?.xp || 0} max={guild?.xpMax || 30000} pct={xpPct} />
                <StatRow icon={<Users className="w-3.5 h-3.5" />} label="Members" value={`${guild?.memberCount ?? 0}/100`} />
                <StatRow icon={<Trophy className="w-3.5 h-3.5" />} label="Power" value={(guild?.totalPower || 0).toLocaleString()} />
                <StatRow icon={<Zap className="w-3.5 h-3.5" />} label="Online" value={`${onlineCount}/${members.length}`} />
              </div>
            </GlassPanel>

            {/* Members panel */}
            <GlassPanel hue="var(--primary)" glow={0.3} padding="sm">
              <div className="flex items-center justify-between mb-2 px-1">
                <p className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground">Members</p>
                <span className="text-[10px] text-muted-foreground">{members.length}</span>
              </div>
              <div className="space-y-1 max-h-[44vh] overflow-y-auto scrollbar-none pr-1">
                {members.map((m) => <MemberRow key={m.id} member={m} />)}
              </div>
            </GlassPanel>
          </aside>

          {/* Main — chat */}
          <main className="space-y-4 min-w-0">
            <GlassPanel hue="var(--primary)" glow={0.3} padding="none" className="overflow-hidden">
              {/* Header */}
              <div className="px-5 py-3 border-b border-border/40 flex items-center justify-between">
                <div>
                  <h1 className="font-heading text-lg text-foreground"># {guild?.tag?.toLowerCase() || "general"}</h1>
                  <p className="text-xs text-muted-foreground">{onlineCount} kindled · {members.length} members</p>
                </div>
                {loading && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
              </div>

              {/* Stream */}
              <div ref={scrollerRef} className="px-3 sm:px-5 py-4 space-y-4 max-h-[58vh] overflow-y-auto">
                {messages.map((m) => <PortraitMessage key={m.id} msg={m} />)}
              </div>

              {/* Composer */}
              <div className="px-3 sm:px-5 pb-4 pt-2 border-t border-border/40">
                <div
                  className="flex items-center gap-2 rounded-full px-4 py-2"
                  style={{
                    background: "hsl(var(--background) / 0.6)",
                    border: "1px solid hsl(var(--primary) / 0.3)",
                    boxShadow: "inset 0 0 12px hsl(var(--primary) / 0.08)",
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
                    style={{ caretColor: "hsl(var(--primary))" }}
                  />
                  <button
                    onClick={send}
                    disabled={!text.trim() || sending}
                    className={cn(
                      "shrink-0 rounded-full w-8 h-8 flex items-center justify-center transition-colors",
                      text.trim() ? "bg-primary text-primary-foreground hover:bg-primary/90" : "bg-muted text-muted-foreground"
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

/* ---------- Sub-components ---------- */

function ShieldCrest({ level }: { level: number }) {
  return (
    <div className="relative w-32 h-36">
      <svg viewBox="0 0 200 240" className="w-full h-full drop-shadow-[0_0_18px_hsl(var(--legendary)/0.5)]">
        <defs>
          <linearGradient id="crestGold" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--legendary))" stopOpacity="0.95" />
            <stop offset="100%" stopColor="hsl(var(--legendary-glow))" stopOpacity="0.7" />
          </linearGradient>
          <radialGradient id="crestGlow" cx="0.5" cy="0.4" r="0.6">
            <stop offset="0%" stopColor="hsl(var(--legendary) / 0.4)" />
            <stop offset="100%" stopColor="hsl(var(--legendary) / 0)" />
          </radialGradient>
        </defs>
        <path
          d="M100 8 L184 36 V128 C184 180 148 218 100 232 C52 218 16 180 16 128 V36 Z"
          fill="hsl(var(--background) / 0.5)"
          stroke="url(#crestGold)"
          strokeWidth="3"
        />
        <path
          d="M100 8 L184 36 V128 C184 180 148 218 100 232 C52 218 16 180 16 128 V36 Z"
          fill="url(#crestGlow)"
        />
        <path
          d="M100 22 L172 46 V126 C172 170 142 204 100 218 C58 204 28 170 28 126 V46 Z"
          fill="none"
          stroke="hsl(var(--legendary) / 0.5)"
          strokeWidth="1"
        />
        <g transform="translate(100 110)" fill="hsl(var(--legendary))">
          <path d="M0 -42 Q-18 -24 -24 -4 Q-28 14 -16 28 Q-6 38 0 28 Q6 38 16 28 Q28 14 24 -4 Q18 -24 0 -42 Z" />
          <circle r="2.5" cy="-16" fill="hsl(var(--background))" />
        </g>
      </svg>
      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-background/90 border border-[hsl(var(--legendary)/0.5)]">
        <span className="font-heading text-xs text-[hsl(var(--legendary))]">Lv {level}</span>
      </div>
    </div>
  );
}

function XpBar({ value, max, pct }: { value: number; max: number; pct: number }) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <span className="text-[10px] tracking-widest uppercase text-muted-foreground">XP</span>
        <span className="text-[10px] text-muted-foreground tabular-nums">{value.toLocaleString()} / {max.toLocaleString()}</span>
      </div>
      <div className="relative h-1.5 rounded-full overflow-hidden bg-background/60">
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all"
          style={{
            width: `${pct}%`,
            background: "linear-gradient(90deg, hsl(var(--primary)), hsl(var(--legendary)))",
            boxShadow: "0 0 8px hsl(var(--primary)/0.5)",
          }}
        />
      </div>
    </div>
  );
}

function StatRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="flex items-center gap-1.5 text-muted-foreground">{icon}{label}</span>
      <span className="font-heading text-foreground tabular-nums">{value}</span>
    </div>
  );
}

function MemberRow({ member }: { member: GuildMember }) {
  const hue = ROLE_HUE[member.role || "Initiate"] || "var(--primary)";
  return (
    <div className="flex items-center gap-2.5 py-1.5 px-1 rounded-lg hover:bg-foreground/5 transition-colors">
      <HexAvatar size={32} hue={hue} online={member.online}>
        {member.username.slice(0, 1).toUpperCase()}
      </HexAvatar>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium text-foreground truncate">{member.username}</div>
        <div className="text-[10px] text-muted-foreground">
          {member.online ? "Online" : "Offline"}{member.level !== undefined && ` · Lv ${member.level}`}
        </div>
      </div>
    </div>
  );
}

function PortraitMessage({ msg }: { msg: ChatMsg }) {
  const time = useMemo(() => new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), [msg.createdAt]);
  const hue = ROLE_HUE[msg.role || "Initiate"] || "var(--primary)";
  return (
    <div className="flex items-start gap-3 group">
      <HexAvatar size={44} hue={hue}>
        {msg.username.slice(0, 1).toUpperCase()}
      </HexAvatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className="font-heading text-sm text-foreground">{msg.username}</span>
          {msg.role && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium" style={{
              color: `hsl(${hue})`,
              background: `hsl(${hue} / 0.12)`,
              border: `1px solid hsl(${hue} / 0.35)`,
            }}>
              {msg.role}
            </span>
          )}
          <span className="text-[10px] text-muted-foreground ml-auto">{time}</span>
        </div>
        <p className="text-foreground/90 text-sm leading-relaxed mt-0.5">{msg.body}</p>
      </div>
    </div>
  );
}
