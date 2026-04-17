import { useEffect, useMemo, useState } from "react";
import { Mail, MailOpen, Bell, ArrowLeftRight, Swords, RefreshCw, Check, Loader2 } from "lucide-react";
import { api } from "@/lib/apiClient";
import HallLayout, { HallSection, HallStat } from "@/components/scene/HallLayout";
import GlassPanel from "@/components/scene/GlassPanel";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

type Notif = { id: number; type: string; title: string; body?: string | null; createdAt: number; readAt?: number | null };

interface Props { onNavigate?: (tab: "trade" | "pvp") => void }

function typeIcon(t: string) {
  if (t.startsWith("trade_") || t.startsWith("market_")) return <ArrowLeftRight className="w-4 h-4" />;
  if (t.startsWith("pvp_")) return <Swords className="w-4 h-4" />;
  return <Bell className="w-4 h-4" />;
}
function typeHue(t: string) {
  if (t.startsWith("trade_") || t.startsWith("market_")) return "var(--rare)";
  if (t.startsWith("pvp_")) return "var(--destructive)";
  return "var(--primary)";
}

export default function MailHall({ onNavigate }: Props) {
  const [rows, setRows] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unread" | "trade" | "pvp">("all");

  const load = async () => {
    setLoading(true);
    try {
      const r: any = await api.getNotifications?.();
      setRows(r?.items || r || []);
    } catch { /* offline ok */ }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    if (filter === "unread") return rows.filter((r) => !r.readAt);
    if (filter === "trade") return rows.filter((r) => r.type.startsWith("trade_") || r.type.startsWith("market_"));
    if (filter === "pvp") return rows.filter((r) => r.type.startsWith("pvp_"));
    return rows;
  }, [rows, filter]);

  const unread = rows.filter((r) => !r.readAt).length;

  const markAll = async () => {
    try {
      await api.markAllNotificationsRead?.();
      setRows((r) => r.map((x) => ({ ...x, readAt: x.readAt || Date.now() })));
      toast({ title: "All marked as read" });
    } catch (e: any) {
      toast({ title: "Couldn't mark all", description: e?.message, variant: "destructive" });
    }
  };

  return (
    <HallLayout
      sidebar={
        <>
          <HallSection title="Inbox" hue="var(--primary)" glow={0.5}>
            <div className="flex items-center gap-2 mb-3">
              <Mail className="w-4 h-4 text-primary" />
              <span className="text-xs text-muted-foreground">Notifications & alerts</span>
            </div>
            <HallStat label="Unread" value={unread} hue="var(--legendary)" />
            <HallStat label="Total" value={rows.length} />
          </HallSection>

          <HallSection title="Filter" hue="var(--primary)" glow={0.3}>
            <div className="space-y-1">
              {(["all", "unread", "trade", "pvp"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={cn(
                    "w-full text-left px-2.5 py-1.5 rounded-lg text-xs capitalize transition-colors",
                    filter === f ? "bg-primary/15 text-foreground ring-1 ring-primary/40" : "text-muted-foreground hover:bg-foreground/5"
                  )}
                >
                  {f}
                </button>
              ))}
            </div>
          </HallSection>

          <button onClick={load} className="w-full text-xs text-muted-foreground hover:text-foreground flex items-center justify-center gap-1.5 py-2">
            <RefreshCw className="w-3 h-3" /> Refresh
          </button>
        </>
      }
      header={
        <GlassPanel hue="var(--primary)" glow={0.4} padding="md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Showing</p>
              <h1 className="font-heading text-lg text-foreground capitalize">{filter} · {filtered.length}</h1>
            </div>
            {unread > 0 && (
              <button onClick={markAll} className="text-xs text-primary hover:text-primary/80 flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5" /> Mark all read
              </button>
            )}
          </div>
        </GlassPanel>
      }
    >
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <GlassPanel hue="var(--primary)" glow={0.2} padding="lg">
          <div className="flex flex-col items-center text-center gap-2 py-6">
            <MailOpen className="w-8 h-8 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">no messages here</p>
          </div>
        </GlassPanel>
      ) : (
        <div className="space-y-2">
          {filtered.map((n) => {
            const hue = typeHue(n.type);
            const target = n.type.startsWith("trade_") || n.type.startsWith("market_") ? "trade" : n.type.startsWith("pvp_") ? "pvp" : null;
            return (
              <GlassPanel key={n.id} hue={hue} glow={n.readAt ? 0.2 : 0.45} padding="sm">
                <button
                  onClick={() => target && onNavigate?.(target as any)}
                  className="w-full flex items-start gap-3 text-left"
                >
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: `hsl(${hue}/0.15)`, color: `hsl(${hue})` }}>
                    {typeIcon(n.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className={cn("text-sm truncate", n.readAt ? "text-foreground/70" : "font-semibold text-foreground")}>{n.title}</h4>
                      {!n.readAt && <span className="w-2 h-2 rounded-full bg-primary shrink-0" />}
                    </div>
                    {n.body && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>}
                    <p className="text-[10px] text-muted-foreground/70 mt-1">{new Date(n.createdAt).toLocaleString()}</p>
                  </div>
                </button>
              </GlassPanel>
            );
          })}
        </div>
      )}
    </HallLayout>
  );
}
