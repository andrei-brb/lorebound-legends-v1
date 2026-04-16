import { useEffect, useMemo, useState } from "react";
import { Mail, RefreshCw, Check, ArrowLeftRight, Swords, Bell, MailOpen } from "lucide-react";
import { api } from "@/lib/apiClient";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

type NotificationRow = {
  id: number; type: string; title: string; body?: string | null;
  data?: any; createdAt: number; readAt?: number | null;
};

type Props = { onNavigate?: (tab: "trade" | "pvp") => void };

function formatWhen(ts: number) {
  try { return new Date(ts).toLocaleString(); } catch { return ""; }
}

function targetTab(type: string): "trade" | "pvp" | null {
  if (type.startsWith("trade_") || type.startsWith("market_")) return "trade";
  if (type.startsWith("pvp_")) return "pvp";
  return null;
}

function typeIcon(type: string) {
  if (type.startsWith("trade_") || type.startsWith("market_")) return <ArrowLeftRight className="w-4 h-4" />;
  if (type.startsWith("pvp_")) return <Swords className="w-4 h-4" />;
  return <Bell className="w-4 h-4" />;
}

function typeAccent(type: string): string {
  if (type.startsWith("trade_") || type.startsWith("market_")) return "border-l-[hsl(var(--rare))]";
  if (type.startsWith("pvp_")) return "border-l-destructive";
  return "border-l-muted-foreground/30";
}

function groupByDate(rows: NotificationRow[]): { label: string; items: NotificationRow[] }[] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterday = today - 86400000;

  const groups: Record<string, NotificationRow[]> = { Today: [], Yesterday: [], Earlier: [] };
  for (const r of rows) {
    if (r.createdAt >= today) groups.Today.push(r);
    else if (r.createdAt >= yesterday) groups.Yesterday.push(r);
    else groups.Earlier.push(r);
  }
  return Object.entries(groups).filter(([, items]) => items.length > 0).map(([label, items]) => ({ label, items }));
}

export default function InboxPanel({ onNavigate }: Props) {
  const [rows, setRows] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(false);
  const unreadIds = useMemo(() => rows.filter((r) => !r.readAt).map((r) => r.id), [rows]);

  async function refresh() {
    try { setLoading(true); const data = await api.getNotifications(50); setRows(data.notifications || []); }
    catch (e: any) { toast({ title: "Inbox failed", description: e?.message || "Could not load notifications" }); }
    finally { setLoading(false); }
  }

  async function markAllRead() {
    try { await api.markNotificationsRead([]); setRows((prev) => prev.map((r) => (r.readAt ? r : { ...r, readAt: Date.now() }))); }
    catch (e: any) { toast({ title: "Mark read failed", description: e?.message || "Could not update notifications" }); }
  }

  async function markOneRead(id: number) {
    try { await api.markNotificationsRead([id]); setRows((prev) => prev.map((r) => (r.id === id ? { ...r, readAt: Date.now() } : r))); }
    catch (e: any) { toast({ title: "Mark read failed", description: e?.message || "Could not update notifications" }); }
  }

  async function acceptLiveInvite(n: NotificationRow) {
    const matchId = Number(n.data?.matchId);
    if (!Number.isFinite(matchId)) return toast({ title: "Invalid invite", description: "Missing match id" });
    try {
      await api.pvpLiveJoin(matchId); await api.markNotificationsRead([n.id]);
      setRows((prev) => prev.map((r) => (r.id === n.id ? { ...r, readAt: Date.now() } : r)));
      sessionStorage.setItem("pvp.live.matchId", String(matchId));
      onNavigate?.("pvp");
      toast({ title: "Invite accepted", description: `Joining match #${matchId}` });
    } catch (e: any) { toast({ title: "Accept failed", description: e?.message || "Could not accept invite" }); }
  }

  async function declineLiveInvite(n: NotificationRow) {
    const matchId = Number(n.data?.matchId);
    if (!Number.isFinite(matchId)) return toast({ title: "Invalid invite", description: "Missing match id" });
    try {
      await api.pvpLiveDecline(matchId); await api.markNotificationsRead([n.id]);
      setRows((prev) => prev.map((r) => (r.id === n.id ? { ...r, readAt: Date.now() } : r)));
      toast({ title: "Invite declined" });
    } catch (e: any) { toast({ title: "Decline failed", description: e?.message || "Could not decline invite" }); }
  }

  useEffect(() => { refresh(); }, []);

  const dateGroups = useMemo(() => groupByDate(rows), [rows]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-primary" />
            <h2 className="font-heading text-2xl font-bold text-foreground">Inbox</h2>
            {unreadIds.length > 0 && <Badge className="text-[10px]">{unreadIds.length} unread</Badge>}
          </div>
          <p className="text-sm text-muted-foreground mt-1">You'll get notified even if you're not on the Trade tab.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={refresh}
            className={cn("inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm bg-secondary hover:bg-secondary/80 transition-colors", loading && "opacity-70")}
            disabled={loading}
          >
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} /> Refresh
          </button>
          <button
            onClick={markAllRead}
            className={cn("inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm bg-primary text-primary-foreground hover:bg-primary/90 transition-colors", unreadIds.length === 0 && "opacity-60")}
            disabled={unreadIds.length === 0}
          >
            <Check className="w-4 h-4" /> Mark all read
          </button>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center animate-fade-in">
          <MailOpen className="w-14 h-14 text-muted-foreground/20 mb-3" />
          <p className="font-heading font-bold text-foreground text-lg">All caught up!</p>
          <p className="text-sm text-muted-foreground mt-1">No messages yet. You're all clear.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {dateGroups.map((group) => (
            <div key={group.label}>
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">{group.label}</h3>
              <div className="grid gap-2">
                {group.items.map((n, idx) => {
                  const unread = !n.readAt;
                  const goTab = targetTab(n.type);
                  const isLiveInvite = n.type === "pvp_live_invite";
                  return (
                    <div
                      key={n.id}
                      style={{ animationDelay: `${idx * 50}ms` }}
                      className={cn(
                        "flex items-start justify-between gap-3 rounded-lg border border-border border-l-4 bg-card/60 p-4 animate-slide-in-up",
                        typeAccent(n.type),
                        unread && "ring-1 ring-primary/40"
                      )}
                    >
                      <div className="min-w-0 flex gap-3">
                        <div className={cn("mt-0.5 shrink-0 rounded-full p-1.5 bg-secondary", unread && "text-primary")}>{typeIcon(n.type)}</div>
                        <div>
                          <div className="flex items-center gap-2">
                            {unread && <span className="inline-block w-2 h-2 rounded-full bg-primary shrink-0" />}
                            <div className="font-heading font-bold text-foreground truncate">{n.title}</div>
                          </div>
                          {n.body && <div className="text-sm text-muted-foreground mt-1">{n.body}</div>}
                          <div className="text-xs text-muted-foreground mt-2">{formatWhen(n.createdAt)}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {isLiveInvite && (
                          <>
                            <button onClick={() => acceptLiveInvite(n)} className="px-3 py-2 rounded-md text-sm bg-emerald-600 text-white hover:bg-emerald-700 font-bold transition-colors">Accept</button>
                            <button onClick={() => declineLiveInvite(n)} className="px-3 py-2 rounded-md text-sm bg-destructive/20 text-destructive hover:bg-destructive/30 font-bold transition-colors">Decline</button>
                          </>
                        )}
                        {goTab && onNavigate && (
                          <button onClick={() => onNavigate(goTab)} className="px-3 py-2 rounded-md text-sm bg-secondary hover:bg-secondary/80 transition-colors">Open</button>
                        )}
                        {unread && (
                          <button onClick={() => markOneRead(n.id)} className="px-3 py-2 rounded-md text-sm bg-secondary hover:bg-secondary/80 transition-colors">Read</button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
