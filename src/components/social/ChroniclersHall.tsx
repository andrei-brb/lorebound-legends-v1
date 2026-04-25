import { useEffect, useMemo, useState } from "react";
import { Crown, Swords, UserPlus } from "lucide-react";
import { api } from "@/lib/apiClient";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

type Friend = { id: number; discordId: string; username: string; avatar?: string | null };
type LeaderRow = { rank: number; name: string; value: number; avatar?: string | null; playerId: number };

export default function ChroniclersHall(props: {
  isOnline: boolean;
  onDuel?: (friendId: number) => void;
}) {
  const { isOnline, onDuel } = props;
  const [friends, setFriends] = useState<Friend[]>([]);
  const [rows, setRows] = useState<LeaderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [addQuery, setAddQuery] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const r = await api.getFriends();
      setFriends((r.accepted || []).map((x) => x.friend));
    } catch {
      setFriends([]);
    }
    try {
      const r = await api.getLeaderboard("wins");
      setRows((r.entries || []).slice(0, 12));
    } catch {
      setRows([]);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const youId = useMemo(() => {
    // Best-effort: API doesn’t mark "you" in this endpoint; we highlight rank 4 if present (like the design screenshot).
    return null as number | null;
  }, []);

  const sendFriendRequest = async () => {
    if (!addQuery.trim()) return;
    try {
      await api.friendRequest(addQuery.trim());
      toast({ title: "Request sent" });
      setAddQuery("");
      setAddOpen(false);
      load();
    } catch (e: unknown) {
      toast({ title: "Failed", description: e instanceof Error ? e.message : String(e), variant: "destructive" });
    }
  };

  return (
    <div className="relative min-h-[calc(100vh-72px)] px-5 md:px-10 py-8" data-testid="social-screen">
      <div className="section-heading mb-10">The Chronicler&apos;s Hall</div>

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Allied Duelists */}
        <div className="panel-gold p-5 relative">
          <div className="corner-deco absolute inset-0" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="font-heading text-[#f5c842] tracking-[0.2em] flex items-center gap-2">
                <UserPlus size={16} /> Allied Duelists
              </div>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => setAddOpen((o) => !o)}
                data-testid="add-friend-btn"
              >
                + Add
              </button>
            </div>

            {addOpen && (
              <div className="mb-4 flex gap-2">
                <input
                  value={addQuery}
                  onChange={(e) => setAddQuery(e.target.value)}
                  placeholder="Discord username"
                  className="flex-1 px-3 py-2 rounded-full font-body text-xs text-[#f8e4a1] outline-none"
                  style={{ background: "rgba(10,6,3,0.8)", border: "1px solid rgba(212,175,55,0.4)" }}
                />
                <button type="button" className="btn-gold" onClick={sendFriendRequest}>
                  Send
                </button>
              </div>
            )}

            <div className="space-y-3">
              {loading ? (
                <div className="font-lore text-center text-[#c9a74a] py-6">Loading…</div>
              ) : friends.length === 0 ? (
                <div className="font-lore text-center text-[#c9a74a] py-6">
                  {isOnline ? "No allies yet — add a friend to begin." : "Offline — friends list unavailable."}
                </div>
              ) : (
                friends.map((f) => (
                  <div
                    key={f.id}
                    data-testid={`friend-${f.id}`}
                    className="flex items-center gap-3 p-3 rounded"
                    style={{
                      background: "linear-gradient(90deg, rgba(22,15,8,0.9), rgba(10,6,3,0.7))",
                      border: "1px solid rgba(212,175,55,0.2)",
                    }}
                  >
                    <div
                      className="w-10 h-10 flex items-center justify-center font-heading font-black text-sm text-[#0A0A0A]"
                      style={{
                        background: "linear-gradient(135deg, #f5c842, #d4af37)",
                        clipPath: "polygon(50% 0,100% 25%,100% 75%,50% 100%,0 75%,0 25%)",
                      }}
                    >
                      {f.username.slice(0, 1).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-heading text-[#f8e4a1] text-sm truncate">{f.username}</div>
                      <div className="font-stat text-[11px] tracking-[0.15em] text-[#c9a74a]">
                        Online
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn-ghost flex items-center gap-1"
                      onClick={() => onDuel?.(f.id)}
                      data-testid={`duel-${f.id}`}
                    >
                      <Swords size={12} /> Duel
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Kingdom Standings */}
        <div className="panel-gold p-5 relative">
          <div className="corner-deco absolute inset-0" />
          <div className="relative z-10">
            <div className="font-heading text-[#f5c842] tracking-[0.2em] mb-4 flex items-center gap-2">
              <Crown size={16} /> Kingdom Standings
            </div>
            <div className="space-y-2">
              {loading ? (
                <div className="font-lore text-center text-[#c9a74a] py-6">Loading…</div>
              ) : rows.length === 0 ? (
                <div className="font-lore text-center text-[#c9a74a] py-6">
                  {isOnline ? "No standings available." : "Offline — standings unavailable."}
                </div>
              ) : (
                rows.map((p) => {
                  const you = youId != null && p.playerId === youId;
                  return (
                    <div
                      key={p.rank}
                      data-testid={`leaderboard-${p.rank}`}
                      className={cn("flex items-center gap-4 px-3 py-2.5 rounded")}
                      style={{
                        background: you
                          ? "linear-gradient(90deg, rgba(245,200,66,0.18), rgba(212,175,55,0.05))"
                          : "linear-gradient(90deg, rgba(22,15,8,0.6), rgba(10,6,3,0.4))",
                        border: you
                          ? "1px solid rgba(245,200,66,0.6)"
                          : "1px solid rgba(212,175,55,0.15)",
                        boxShadow: you ? "0 0 18px rgba(245,200,66,0.25)" : "none",
                      }}
                    >
                      <div className="font-heading text-xl text-[#f5c842] w-8 text-center">
                        {p.rank <= 3 ? ["👑", "⚜", "❖"][p.rank - 1] : p.rank}
                      </div>
                      <div className="flex-1 font-heading text-[#f8e4a1] text-sm">{p.name}</div>
                      <div className="font-stat text-[#c9a74a] text-sm">{p.value.toLocaleString()}</div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

