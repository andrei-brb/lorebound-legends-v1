import { useEffect, useMemo, useState } from "react";
import { ArrowLeftRight, Bell, Check, ChevronRight, Loader2, Mail, MailOpen, RefreshCw, Swords } from "lucide-react";
import { api } from "@/lib/apiClient";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

type Notif = { id: number; type: string; title: string; body?: string | null; data?: unknown; createdAt: number; readAt?: number | null };

interface Props { onNavigate?: (tab: "trade" | "pvp") => void }

function typeIcon(t: string) {
  if (t.startsWith("trade_") || t.startsWith("market_")) return <ArrowLeftRight className="w-4 h-4" />;
  if (t.startsWith("pvp_")) return <Swords className="w-4 h-4" />;
  return <Bell className="w-4 h-4" />;
}

function iconEmoji(t: string) {
  if (t === "pvp_live_invite" || t.startsWith("pvp_")) return "⚔️";
  if (t.startsWith("trade_") || t.startsWith("market_")) return "📜";
  if (t.startsWith("guild_")) return "🛡";
  return "🎁";
}

function fromLabel(t: string) {
  if (t.startsWith("trade_") || t.startsWith("market_")) return "Trade Hall";
  if (t === "pvp_live_invite" || t.startsWith("pvp_")) return "Duelist";
  if (t.startsWith("guild_")) return "Obsidian Covenant";
  return "The Altar";
}

function timeAgo(ts: number) {
  const s = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export default function MailHall({ onNavigate }: Props) {
  const [rows, setRows] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const r = await api.getNotifications(50);
      setRows(r?.notifications || []);
      setSelectedId((prev) => prev ?? (r?.notifications?.[0]?.id ?? null));
    } catch { /* offline ok */ }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const unread = rows.filter((r) => !r.readAt).length;
  const selected = useMemo(() => rows.find((r) => r.id === selectedId) ?? null, [rows, selectedId]);

  const markAll = async () => {
    try {
      const ids = rows.filter((r) => !r.readAt).map((r) => r.id);
      if (ids.length === 0) return;
      await api.markNotificationsRead(ids);
      setRows((r) => r.map((x) => ({ ...x, readAt: x.readAt || Date.now() })));
      toast({ title: "All marked as read" });
    } catch (e: unknown) {
      toast({ title: "Couldn't mark all", description: e instanceof Error ? e.message : String(e), variant: "destructive" });
    }
  };

  const markOneRead = async (id: number) => {
    try {
      await api.markNotificationsRead([id]);
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, readAt: Date.now() } : r)));
    } catch (e: unknown) {
      toast({ title: "Couldn't mark read", description: e instanceof Error ? e.message : String(e), variant: "destructive" });
    }
  };

  const acceptLiveInvite = async (n: Notif) => {
    const matchId = Number(
      typeof n.data === "object" && n.data !== null && "matchId" in n.data
        ? (n.data as Record<string, unknown>).matchId
        : NaN
    );
    if (!Number.isFinite(matchId)) return toast({ title: "Invalid invite", description: "Missing match id", variant: "destructive" });
    try {
      await api.pvpLiveJoin(matchId);
      await api.markNotificationsRead([n.id]);
      setRows((prev) => prev.map((r) => (r.id === n.id ? { ...r, readAt: Date.now() } : r)));
      sessionStorage.setItem("pvp.live.matchId", String(matchId));
      onNavigate?.("pvp");
      toast({ title: "Invite accepted", description: `Joining match #${matchId}` });
    } catch (e: unknown) {
      toast({ title: "Accept failed", description: e instanceof Error ? e.message : String(e), variant: "destructive" });
    }
  };

  const declineLiveInvite = async (n: Notif) => {
    const matchId = Number(
      typeof n.data === "object" && n.data !== null && "matchId" in n.data
        ? (n.data as Record<string, unknown>).matchId
        : NaN
    );
    if (!Number.isFinite(matchId)) return toast({ title: "Invalid invite", description: "Missing match id", variant: "destructive" });
    try {
      await api.pvpLiveDecline(matchId);
      await api.markNotificationsRead([n.id]);
      setRows((prev) => prev.map((r) => (r.id === n.id ? { ...r, readAt: Date.now() } : r)));
      toast({ title: "Invite declined" });
    } catch (e: unknown) {
      toast({ title: "Decline failed", description: e instanceof Error ? e.message : String(e), variant: "destructive" });
    }
  };

  return (
    <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6">
      <aside className="panel-gold p-5 relative">
        <div className="corner-deco absolute inset-0" />
        <div className="relative z-10">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="font-heading text-[#f5c842] tracking-[0.2em] flex items-center gap-2">
              <Mail size={16} /> INBOX
            </div>
            {unread > 0 && (
              <span className="text-[10px] font-stat tracking-[0.2em] px-2 py-1 rounded bg-[rgba(245,200,66,0.14)] text-[#f5c842] border border-[rgba(245,200,66,0.35)]">
                {unread} UNREAD
              </span>
            )}
          </div>

          <div className="flex gap-2 mb-4">
            <button type="button" className="btn-ghost flex items-center gap-2" onClick={load} disabled={loading}>
              <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} /> Refresh
            </button>
            <button type="button" className="btn-gold flex items-center gap-2" onClick={markAll} disabled={unread === 0}>
              <Check className="w-4 h-4" /> Mark read
            </button>
          </div>

          <div className="space-y-1">
            {loading ? (
              <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-[#f5c842]" /></div>
            ) : rows.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <MailOpen className="w-14 h-14 text-muted-foreground/20 mb-3" />
                <p className="font-heading font-bold text-foreground text-lg">All caught up!</p>
                <p className="text-sm text-muted-foreground mt-1">No messages yet. You're all clear.</p>
              </div>
            ) : (
              rows.map((n) => {
                const isSel = n.id === selectedId;
                const unreadRow = !n.readAt;
                return (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => {
                      setSelectedId(n.id);
                      if (unreadRow) markOneRead(n.id);
                    }}
                    data-testid={`mail-${n.id}`}
                    className={`w-full text-left p-3 rounded transition mb-1 ${
                      isSel ? "bg-[rgba(245,200,66,0.15)]" : "hover:bg-[rgba(245,200,66,0.05)]"
                    }`}
                    style={{ border: isSel ? "1px solid rgba(245,200,66,0.6)" : "1px solid transparent" }}
                  >
                    <div className="flex items-start gap-3">
                      <div className="text-xl leading-none mt-0.5">{iconEmoji(n.type)}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <div className="font-heading text-[#f8e4a1] text-sm truncate">{fromLabel(n.type)}</div>
                          <div className="text-[10px] text-muted-foreground">{timeAgo(n.createdAt)}</div>
                        </div>
                        <div className="font-heading text-[13px] text-[#f5c842] truncate">{n.title}</div>
                        <div className="text-xs text-[#d6c293] line-clamp-2">{n.body || "—"}</div>
                      </div>
                      {unreadRow && <span className="w-2 h-2 rounded-full bg-[#f5c842] mt-2 shrink-0" />}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </aside>

      <section className="panel-gold p-5 relative overflow-hidden">
        <div className="corner-deco absolute inset-0" />
        <div className="relative z-10">
          {!selected ? (
            <div className="py-16 text-center text-[#c9a74a] font-lore">Select a message.</div>
          ) : (
            <>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-stat text-[11px] tracking-[0.2em] text-[#c9a74a]">FROM</div>
                  <div className="font-heading text-[#f8e4a1]">{fromLabel(selected.type)}</div>
                </div>
                <div className="text-[10px] text-muted-foreground">{new Date(selected.createdAt).toLocaleString()}</div>
              </div>

              <div className="mt-3">
                <div className="font-heading text-xl gold-text">{selected.title}</div>
                <div className="font-lore text-[#d6c293] mt-2">{selected.body || "—"}</div>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                {(selected.type.startsWith("trade_") || selected.type.startsWith("market_")) && (
                  <button type="button" className="btn-ghost flex items-center gap-2" onClick={() => onNavigate?.("trade")}>
                    {typeIcon(selected.type)} Open Trade <ChevronRight size={14} />
                  </button>
                )}
                {(selected.type.startsWith("pvp_") && selected.type !== "pvp_live_invite") && (
                  <button type="button" className="btn-ghost flex items-center gap-2" onClick={() => onNavigate?.("pvp")}>
                    {typeIcon(selected.type)} Open PvP <ChevronRight size={14} />
                  </button>
                )}
              </div>

              {selected.type === "pvp_live_invite" && (
                <div className="mt-6 rounded-xl p-4" style={{ background: "rgba(10,6,3,0.45)", border: "1px solid rgba(212,175,55,0.2)" }}>
                  <div className="font-heading text-[#f5c842] tracking-[0.2em] mb-2">DUEL INVITATION</div>
                  <div className="flex gap-2">
                    <button type="button" className="btn-gold" onClick={() => acceptLiveInvite(selected)}>
                      Accept
                    </button>
                    <button type="button" className="btn-ghost" onClick={() => declineLiveInvite(selected)}>
                      Decline
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  );
}
