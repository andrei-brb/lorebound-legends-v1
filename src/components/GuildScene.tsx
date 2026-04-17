import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Send } from "lucide-react";
import { api, type GuildPublic } from "@/lib/apiClient";
import { toast } from "@/hooks/use-toast";
import SceneBackdrop from "./scene/SceneBackdrop";
import FloatingLabel from "./scene/FloatingLabel";
import GlowOrb from "./scene/GlowOrb";
import { cn } from "@/lib/utils";
import type { PlayerState } from "@/lib/playerState";

interface GuildSceneProps {
  isOnline: boolean;
  playerState: PlayerState;
}

interface GuildMember { id: number; username: string; avatar?: string | null; online: boolean; lastSeenAt: number | null; level?: number; role?: string; }
interface ChatMsg { id: number; channel: string; playerId: number; username: string; avatar: string | null; body: string; createdAt: number; role?: string; }

const MOCK_GUILD: GuildPublic & { level?: number; xp?: number; totalPower?: number } = {
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

/**
 * "The Guild Hall" — heraldic shield + chat hearth + member roster, all woven into one scene.
 */
export default function GuildScene({ isOnline, playerState }: GuildSceneProps) {
  const reduceMotion = !!playerState.settings?.reduceMotion;
  const [guild, setGuild] = useState<GuildPublic | null>(MOCK_GUILD);
  const [members, setMembers] = useState<GuildMember[]>(MOCK_MEMBERS);
  const [messages, setMessages] = useState<ChatMsg[]>(MOCK_MSGS);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const scrollerRef = useRef<HTMLDivElement>(null);

  // Try to load real data when online; fall back to mock
  useEffect(() => {
    if (!isOnline) return;
    let alive = true;
    setLoading(true);
    api.getMyGuild()
      .then(async (r) => {
        if (!alive || !r.guild) return;
        setGuild(r.guild);
        setMembers((r.members as any) || MOCK_MEMBERS);
        try {
          const c = await api.getChat(`guild:${r.guild.id}` as any, 40);
          if (alive && c.messages?.length) setMessages(c.messages as any);
        } catch {/* fall back to mock */}
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
          id: Date.now(),
          channel: `guild:${guild?.id || 0}`,
          playerId: 0,
          username: "You",
          avatar: null,
          body,
          createdAt: Date.now(),
          role: "Acolyte",
        }]);
      }
      setText("");
    } catch (e: any) {
      toast({ title: "Could not send", description: e?.message || "", variant: "destructive" });
    } finally { setSending(false); }
  };

  const xpPct = guild ? Math.min(100, ((guild as any).xp || 0) / 1000 * 5) : 0;
  const onlineCount = members.filter((m) => m.online).length;

  return (
    <SceneBackdrop mood="moonlit" reduceMotion={reduceMotion}>
      <div className="relative px-4 sm:px-6 pt-6 pb-10 min-h-[calc(100vh-12rem)]">
        {/* Title band */}
        <div className="text-center mb-6">
          <FloatingLabel variant="ember" className="text-[10px] sm:text-xs">— The Guild Hall —</FloatingLabel>
          <h1 className="font-heading text-2xl sm:text-3xl text-foreground mt-1 drop-shadow-[0_0_20px_hsl(var(--primary)/0.5)]">
            {guild?.name || "No Guild Yet"}
          </h1>
          {guild?.tag && (
            <FloatingLabel variant="inked" className="text-muted-foreground text-xs block mt-1">
              ⟪ {guild.tag} ⟫ · {onlineCount} of {members.length} kindled
            </FloatingLabel>
          )}
        </div>

        {loading && (
          <div className="flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
        )}

        {/* Three-column layout — shield · chat · roster */}
        <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr_220px] gap-6 lg:gap-8 max-w-6xl mx-auto">
          {/* Heraldic shield */}
          <HeraldicShield guild={guild} reduceMotion={reduceMotion} xpPct={xpPct} />

          {/* Chat stream + composer */}
          <div className="flex flex-col min-h-[55vh]">
            <div
              ref={scrollerRef}
              className="flex-1 overflow-y-auto scrollbar-none pr-2"
              style={{
                WebkitMaskImage: "linear-gradient(180deg, transparent 0%, black 10%, black 92%, transparent 100%)",
                maskImage: "linear-gradient(180deg, transparent 0%, black 10%, black 92%, transparent 100%)",
              }}
            >
              <div className="flex flex-col gap-6 py-4">
                {messages.map((m, i) => (
                  <PortraitMessage key={m.id} msg={m} latest={i === messages.length - 1} reduceMotion={reduceMotion} />
                ))}
              </div>
            </div>

            {/* Composer */}
            <div className="relative mt-4">
              <div
                className="pointer-events-none absolute inset-x-0 -top-6 h-20 mx-auto w-[80%]"
                style={{
                  background:
                    "radial-gradient(ellipse at center bottom, hsl(var(--primary)/0.4), transparent 70%)",
                  filter: "blur(20px)",
                }}
              />
              <div
                className="relative flex items-center gap-3 px-4 sm:px-5 py-2 rounded-full"
                style={{
                  background:
                    "radial-gradient(ellipse at center, hsl(var(--card) / 0.85) 0%, hsl(var(--card) / 0.55) 70%, hsl(var(--card) / 0.2) 100%)",
                  boxShadow: "0 0 30px hsl(var(--primary) / 0.25), inset 0 0 20px hsl(var(--primary) / 0.08)",
                  WebkitMaskImage: "radial-gradient(ellipse at center, black 65%, transparent 100%)",
                  maskImage: "radial-gradient(ellipse at center, black 65%, transparent 100%)",
                }}
              >
                <input
                  type="text"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                  placeholder="Send Message"
                  disabled={sending}
                  className="flex-1 bg-transparent border-0 outline-none px-3 py-2 text-foreground italic font-heading placeholder:text-foreground/50"
                  style={{ caretColor: "hsl(var(--primary))" }}
                />
                <GlowOrb
                  size={36}
                  hue="var(--primary)"
                  intensity={text.trim() ? 0.9 : 0.4}
                  pulse={!!text.trim() && !reduceMotion}
                  onClick={send}
                  title="send"
                >
                  {sending ? <Loader2 className="w-4 h-4 text-background animate-spin" /> : <Send className="w-4 h-4 text-background" />}
                </GlowOrb>
              </div>
            </div>
          </div>

          {/* Member roster */}
          <MemberRoster members={members} reduceMotion={reduceMotion} />
        </div>
      </div>
    </SceneBackdrop>
  );
}

/* ---------- Heraldic Shield ---------- */
function HeraldicShield({ guild, reduceMotion, xpPct }: { guild: GuildPublic | null; reduceMotion?: boolean; xpPct: number }) {
  const level = (guild as any)?.level ?? 1;
  const memberCount = guild?.memberCount ?? 0;
  const power = (guild as any)?.totalPower ?? 0;

  return (
    <div className="flex flex-col items-center gap-4 py-4">
      <FloatingLabel variant="ember" className="text-[10px]">Guild Info</FloatingLabel>
      <h2 className="font-heading text-lg text-foreground text-center -mt-2">
        {guild?.name || "—"}
      </h2>

      {/* The shield itself — pure SVG, no rectangle */}
      <div className={cn("relative", !reduceMotion && "animate-float-slow")}>
        <svg viewBox="0 0 200 240" className="w-44 h-52 drop-shadow-[0_0_30px_hsl(var(--legendary)/0.5)]">
          <defs>
            <linearGradient id="shieldGold" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--legendary))" stopOpacity="0.95" />
              <stop offset="50%" stopColor="hsl(var(--legendary))" stopOpacity="0.7" />
              <stop offset="100%" stopColor="hsl(var(--legendary-glow))" stopOpacity="0.6" />
            </linearGradient>
            <radialGradient id="shieldGlow" cx="0.5" cy="0.4" r="0.6">
              <stop offset="0%" stopColor="hsl(var(--legendary) / 0.5)" />
              <stop offset="100%" stopColor="hsl(var(--legendary) / 0)" />
            </radialGradient>
            <filter id="shieldShadow"><feGaussianBlur stdDeviation="3" /></filter>
          </defs>
          {/* shield silhouette */}
          <path
            d="M100 8 L184 36 V128 C184 180 148 218 100 232 C52 218 16 180 16 128 V36 Z"
            fill="hsl(var(--background) / 0.4)"
            stroke="url(#shieldGold)"
            strokeWidth="3"
          />
          <path
            d="M100 8 L184 36 V128 C184 180 148 218 100 232 C52 218 16 180 16 128 V36 Z"
            fill="url(#shieldGlow)"
          />
          {/* inner border */}
          <path
            d="M100 22 L172 46 V126 C172 170 142 204 100 218 C58 204 28 170 28 126 V46 Z"
            fill="none"
            stroke="hsl(var(--legendary) / 0.55)"
            strokeWidth="1.2"
          />
          {/* dragon emblem (stylized rune) */}
          <g transform="translate(100 110)" fill="hsl(var(--legendary))" opacity="0.95">
            <path d="M0 -50 Q-20 -30 -28 -8 Q-32 14 -20 30 Q-8 42 0 32 Q8 42 20 30 Q32 14 28 -8 Q20 -30 0 -50 Z M0 -28 Q-12 -10 0 14 Q12 -10 0 -28 Z" />
            <circle r="3" cy="-20" fill="hsl(var(--background))" />
          </g>
        </svg>

        {/* level badge */}
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex flex-col items-center">
          <FloatingLabel className="text-[9px]">LEVEL</FloatingLabel>
          <span className="font-heading text-2xl text-[hsl(var(--legendary))] -mt-1 drop-shadow-[0_0_10px_hsl(var(--legendary)/0.7)]">
            {level}
          </span>
        </div>
      </div>

      {/* XP track — feathered line, no rectangle */}
      <div className="w-full max-w-[180px] mt-6">
        <div className="relative h-1.5 rounded-full overflow-hidden" style={{
          background: "linear-gradient(90deg, transparent, hsl(var(--primary)/0.15), transparent)",
        }}>
          <div
            className="absolute inset-y-0 left-0 rounded-full"
            style={{
              width: `${xpPct}%`,
              background: "linear-gradient(90deg, hsl(var(--primary)), hsl(var(--legendary)))",
              boxShadow: "0 0 12px hsl(var(--primary)/0.7)",
            }}
          />
        </div>
        <div className="text-center mt-1">
          <FloatingLabel className="text-[9px]">{(guild as any)?.xp || 0} / 30,000 XP</FloatingLabel>
        </div>
      </div>

      {/* Stats */}
      <div className="w-full max-w-[180px] space-y-2 mt-2">
        <StatRow label="MEMBERS" value={`${memberCount}/100`} />
        <StatRow label="TOTAL POWER" value={power.toLocaleString()} />
      </div>
    </div>
  );
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <FloatingLabel className="text-[9px]">{label}</FloatingLabel>
      <span className="font-heading text-sm text-foreground">{value}</span>
    </div>
  );
}

/* ---------- Portrait message (Discord-style but feathered) ---------- */
function PortraitMessage({ msg, latest, reduceMotion }: { msg: ChatMsg; latest: boolean; reduceMotion?: boolean }) {
  const time = useMemo(() => {
    const d = new Date(msg.createdAt);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }, [msg.createdAt]);
  const hue = ROLE_HUE[msg.role || "Initiate"] || "var(--primary)";

  return (
    <div className={cn("flex items-start gap-4", !reduceMotion && latest && "animate-drift-up")}>
      {/* Portrait orb with role-colored ring */}
      <div className="relative shrink-0">
        <GlowOrb size={56} hue={hue} intensity={0.7}>
          <span className="text-background font-heading text-lg">
            {msg.username.slice(0, 1).toUpperCase()}
          </span>
        </GlowOrb>
      </div>

      {/* Body — feathered radial surface, no rectangle */}
      <div
        className="flex-1 min-w-0 px-5 py-3 relative"
        style={{
          background:
            "radial-gradient(ellipse at left center, hsl(var(--card) / 0.7) 0%, hsl(var(--card) / 0.35) 65%, transparent 100%)",
          WebkitMaskImage: "radial-gradient(ellipse at left center, black 60%, transparent 100%)",
          maskImage: "radial-gradient(ellipse at left center, black 60%, transparent 100%)",
        }}
      >
        <div className="flex items-baseline gap-2 mb-1">
          <span className="font-heading text-sm text-foreground">{msg.username}</span>
          <FloatingLabel className="text-[9px] opacity-50">{time}</FloatingLabel>
        </div>
        {msg.role && (
          <FloatingLabel
            className="text-[9px] block -mt-1 mb-1"
            variant="ember"
          >
            {msg.role}
          </FloatingLabel>
        )}
        <p className="text-foreground/90 text-sm leading-relaxed font-body">{msg.body}</p>
      </div>
    </div>
  );
}

/* ---------- Member Roster ---------- */
function MemberRoster({ members, reduceMotion }: { members: GuildMember[]; reduceMotion?: boolean }) {
  return (
    <div className="flex flex-col gap-3 py-4">
      <FloatingLabel variant="ember" className="text-[10px] text-center mb-1">— Members —</FloatingLabel>
      <div
        className="flex flex-col gap-2 overflow-y-auto scrollbar-none pr-1 max-h-[60vh]"
        style={{
          WebkitMaskImage: "linear-gradient(180deg, transparent 0%, black 8%, black 92%, transparent 100%)",
          maskImage: "linear-gradient(180deg, transparent 0%, black 8%, black 92%, transparent 100%)",
        }}
      >
        {members.map((m) => (
          <div key={m.id} className="flex items-center gap-3 py-1">
            <div className="relative shrink-0">
              <GlowOrb size={36} hue={m.online ? "var(--primary)" : "var(--muted-foreground)"} intensity={m.online ? 0.6 : 0.15}>
                <span className="text-background text-xs font-heading">{m.username.slice(0, 1).toUpperCase()}</span>
              </GlowOrb>
              {m.online && !reduceMotion && (
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-[hsl(var(--synergy))] shadow-[0_0_8px_hsl(var(--synergy))]" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs text-foreground truncate font-heading">{m.username}</div>
              <div className="flex items-center gap-1.5">
                <FloatingLabel className="text-[9px]">{m.online ? "Online" : "Offline"}</FloatingLabel>
                {m.level !== undefined && (
                  <FloatingLabel className="text-[9px] opacity-60">· Lv {m.level}</FloatingLabel>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
