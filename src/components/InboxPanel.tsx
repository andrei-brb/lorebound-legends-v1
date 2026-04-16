import { useEffect, useMemo, useState } from "react";
import { Mail, RefreshCw, Check } from "lucide-react";
import { api } from "@/lib/apiClient";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type NotificationRow = {
  id: number;
  type: string;
  title: string;
  body?: string | null;
  data?: any;
  createdAt: number;
  readAt?: number | null;
};

type Props = {
  onNavigate?: (tab: "trade" | "pvp") => void;
};

function formatWhen(ts: number) {
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return "";
  }
}

function targetTab(type: string): "trade" | "pvp" | null {
  if (type.startsWith("trade_") || type.startsWith("market_")) return "trade";
  if (type.startsWith("pvp_")) return "pvp";
  return null;
}

export default function InboxPanel({ onNavigate }: Props) {
  const [rows, setRows] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(false);

  const unreadIds = useMemo(() => rows.filter((r) => !r.readAt).map((r) => r.id), [rows]);

  async function refresh() {
    try {
      setLoading(true);
      const data = await api.getNotifications(50);
      setRows(data.notifications || []);
    } catch (e: any) {
      toast({ title: "Inbox failed", description: e?.message || "Could not load notifications" });
    } finally {
      setLoading(false);
    }
  }

  async function markAllRead() {
    try {
      await api.markNotificationsRead([]);
      setRows((prev) => prev.map((r) => (r.readAt ? r : { ...r, readAt: Date.now() })));
    } catch (e: any) {
      toast({ title: "Mark read failed", description: e?.message || "Could not update notifications" });
    }
  }

  async function markOneRead(id: number) {
    try {
      await api.markNotificationsRead([id]);
      setRows((prev) => prev.map((r) => (r.id === id ? { ...r, readAt: Date.now() } : r)));
    } catch (e: any) {
      toast({ title: "Mark read failed", description: e?.message || "Could not update notifications" });
    }
  }

  async function acceptLiveInvite(n: NotificationRow) {
    const matchId = Number(n.data?.matchId);
    if (!Number.isFinite(matchId)) return toast({ title: "Invalid invite", description: "Missing match id" });
    try {
      await api.pvpLiveJoin(matchId);
      await api.markNotificationsRead([n.id]);
      setRows((prev) => prev.map((r) => (r.id === n.id ? { ...r, readAt: Date.now() } : r)));
      sessionStorage.setItem("pvp.live.matchId", String(matchId));
      onNavigate?.("pvp");
      toast({ title: "Invite accepted", description: `Joining match #${matchId}` });
    } catch (e: any) {
      toast({ title: "Accept failed", description: e?.message || "Could not accept invite" });
    }
  }

  async function declineLiveInvite(n: NotificationRow) {
    const matchId = Number(n.data?.matchId);
    if (!Number.isFinite(matchId)) return toast({ title: "Invalid invite", description: "Missing match id" });
    try {
      await api.pvpLiveDecline(matchId);
      await api.markNotificationsRead([n.id]);
      setRows((prev) => prev.map((r) => (r.id === n.id ? { ...r, readAt: Date.now() } : r)));
      toast({ title: "Invite declined" });
    } catch (e: any) {
      toast({ title: "Decline failed", description: e?.message || "Could not decline invite" });
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-primary" />
            <h2 className="font-heading text-2xl font-bold text-foreground">Inbox</h2>
          </div>
          <p className="text-sm text-muted-foreground mt-1">You’ll get notified even if you’re not on the Trade tab.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={refresh}
            className={cn("inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm bg-secondary hover:bg-secondary/80", loading && "opacity-70")}
            disabled={loading}
          >
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
            Refresh
          </button>
          <button
            onClick={markAllRead}
            className={cn("inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm bg-primary text-primary-foreground hover:bg-primary/90", unreadIds.length === 0 && "opacity-60")}
            disabled={unreadIds.length === 0}
          >
            <Check className="w-4 h-4" />
            Mark all read
          </button>
        </div>
      </div>

      <div className="grid gap-2">
        {rows.length === 0 ? (
          <div className="text-sm text-muted-foreground bg-card/50 border border-border rounded-lg p-4">
            No messages yet.
          </div>
        ) : (
          rows.map((n) => {
            const unread = !n.readAt;
            const goTab = targetTab(n.type);
            const isLiveInvite = n.type === "pvp_live_invite";
            return (
              <div
                key={n.id}
                className={cn(
                  "flex items-start justify-between gap-3 rounded-lg border border-border bg-card/60 p-4",
                  unread && "ring-1 ring-primary/40"
                )}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    {unread && <span className="inline-block w-2 h-2 rounded-full bg-primary" />}
                    <div className="font-heading font-bold text-foreground truncate">{n.title}</div>
                  </div>
                  {n.body ? <div className="text-sm text-muted-foreground mt-1">{n.body}</div> : null}
                  <div className="text-xs text-muted-foreground mt-2">{formatWhen(n.createdAt)}</div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {isLiveInvite ? (
                    <>
                      <button
                        onClick={() => acceptLiveInvite(n)}
                        className="px-3 py-2 rounded-md text-sm bg-primary text-primary-foreground hover:bg-primary/90"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => declineLiveInvite(n)}
                        className="px-3 py-2 rounded-md text-sm bg-secondary hover:bg-secondary/80"
                      >
                        Decline
                      </button>
                    </>
                  ) : null}
                  {goTab && onNavigate ? (
                    <button
                      onClick={() => onNavigate(goTab)}
                      className="px-3 py-2 rounded-md text-sm bg-secondary hover:bg-secondary/80"
                    >
                      Open
                    </button>
                  ) : null}
                  {unread ? (
                    <button
                      onClick={() => markOneRead(n.id)}
                      className="px-3 py-2 rounded-md text-sm bg-secondary hover:bg-secondary/80"
                    >
                      Read
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

