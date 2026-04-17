import { useEffect, useMemo, useState } from "react";
import { Shield, Plus, LogOut, Loader2, Users, Trophy, Circle, UserPlus } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { api, type GuildPublic } from "@/lib/apiClient";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface GuildPanelProps { isOnline: boolean }

interface GuildMember { id: number; username: string; avatar?: string | null; online: boolean; lastSeenAt: number | null; }

export default function GuildPanel({ isOnline }: GuildPanelProps) {
  const [myGuild, setMyGuild] = useState<GuildPublic | null>(null);
  const [members, setMembers] = useState<GuildMember[]>([]);
  const [browseList, setBrowseList] = useState<GuildPublic[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteUsername, setInviteUsername] = useState("");
  const [inviteSuggestions, setInviteSuggestions] = useState<Array<{ id: number; username: string; avatar?: string | null }>>([]);
  const [inviteSuggestLoading, setInviteSuggestLoading] = useState(false);
  const [name, setName] = useState("");
  const [tag, setTag] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);

  const inviteQuery = useMemo(() => inviteUsername.trim(), [inviteUsername]);

  const refresh = async () => {
    if (!isOnline) { setLoading(false); return; }
    try {
      const mine = await api.getMyGuild();
      setMyGuild(mine.guild);
      setMembers(mine.members);
      if (!mine.guild) {
        const list = await api.listGuilds();
        setBrowseList(list.guilds);
      }
    } catch (e: any) {
      toast({ title: "Failed to load guilds", description: e?.message || "", variant: "destructive" });
    } finally { setLoading(false); }
  };

  useEffect(() => { refresh(); }, [isOnline]); // eslint-disable-line react-hooks/exhaustive-deps

  const create = async () => {
    setBusy(true);
    try {
      await api.createGuild({ name, tag: tag.toUpperCase(), description: description || undefined });
      toast({ title: "Guild founded! 🛡️" });
      setCreateOpen(false); setName(""); setTag(""); setDescription("");
      refresh();
    } catch (e: any) {
      toast({ title: "Could not create", description: e?.message || "", variant: "destructive" });
    } finally { setBusy(false); }
  };

  const join = async (id: number) => {
    setBusy(true);
    try {
      await api.joinGuild(id);
      toast({ title: "Joined guild" });
      refresh();
    } catch (e: any) {
      toast({ title: "Could not join", description: e?.message || "", variant: "destructive" });
    } finally { setBusy(false); }
  };

  const leave = async () => {
    if (!confirm("Leave this guild? If you are the owner, the guild will be disbanded.")) return;
    setBusy(true);
    try {
      const r = await api.leaveGuild();
      toast({ title: r.disbanded ? "Guild disbanded" : "Left the guild" });
      refresh();
    } catch (e: any) {
      toast({ title: "Failed", description: e?.message || "", variant: "destructive" });
    } finally { setBusy(false); }
  };

  const invite = async () => {
    const u = inviteUsername.trim();
    if (!u) return;
    setBusy(true);
    try {
      await api.inviteToGuild(u);
      toast({ title: "Invite sent", description: `Sent an invite to ${u}.` });
      setInviteOpen(false);
      setInviteUsername("");
      setInviteSuggestions([]);
    } catch (e: any) {
      toast({ title: "Could not invite", description: e?.message || "", variant: "destructive" });
    } finally { setBusy(false); }
  };

  useEffect(() => {
    if (!inviteOpen || !isOnline) return;
    const q = inviteQuery;
    if (q.length < 2) { setInviteSuggestions([]); return; }

    let cancelled = false;
    setInviteSuggestLoading(true);

    const t = window.setTimeout(async () => {
      try {
        const r = await api.searchUsers(q);
        if (cancelled) return;
        const users = (r.users || []).filter((u) => u.username.toLowerCase() !== q.toLowerCase());
        setInviteSuggestions(users.slice(0, 8).map((u) => ({ id: u.id, username: u.username, avatar: u.avatar })));
      } catch {
        if (!cancelled) setInviteSuggestions([]);
      } finally {
        if (!cancelled) setInviteSuggestLoading(false);
      }
    }, 250);

    return () => { cancelled = true; window.clearTimeout(t); };
  }, [inviteOpen, inviteQuery, isOnline]);

  if (!isOnline) {
    return (
      <Card className="p-6 text-center">
        <Shield className="w-10 h-10 text-muted-foreground/40 mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">Guilds require an online connection.</p>
      </Card>
    );
  }

  if (loading) {
    return <div className="text-center py-10"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground mx-auto" /></div>;
  }

  if (myGuild) {
    const goalPct = Math.min(100, Math.round((myGuild.weeklyGoal.progress / Math.max(1, myGuild.weeklyGoal.target)) * 100));
    return (
      <div className="space-y-4">
        <div>
          <h2 className="font-heading text-2xl font-bold text-foreground flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary" /> {myGuild.name}
            <span className="text-xs px-2 py-0.5 rounded-md bg-secondary/80 text-muted-foreground font-mono">[{myGuild.tag}]</span>
          </h2>
          {myGuild.description && <p className="text-sm text-muted-foreground mt-1">{myGuild.description}</p>}
        </div>

        <Card className="p-5">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-heading font-bold text-foreground flex items-center gap-2">
              <Trophy className="w-4 h-4 text-[hsl(var(--legendary))]" /> Weekly goal
            </h3>
            <span className="text-xs text-muted-foreground">{myGuild.weeklyGoal.progress} / {myGuild.weeklyGoal.target} {myGuild.weeklyGoal.key}</span>
          </div>
          <div className="h-2.5 rounded-full bg-secondary/50 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-primary to-[hsl(var(--legendary))]" style={{ width: `${goalPct}%` }} />
          </div>
          <p className="text-[11px] text-muted-foreground mt-2">Resets weekly. Hit the target as a guild for shared bonus rewards.</p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-heading font-bold text-sm text-foreground flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-primary" /> Invite a player
            </h3>
            <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
              <DialogTrigger asChild>
                <Button size="sm" variant="secondary" disabled={busy}>
                  <UserPlus className="w-3.5 h-3.5" /> Invite
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Invite to {myGuild.name}</DialogTitle></DialogHeader>
                <div className="space-y-3 pt-2">
                  <div>
                    <label className="text-xs text-muted-foreground">Username</label>
                    <Input
                      value={inviteUsername}
                      onChange={(e) => setInviteUsername(e.target.value)}
                      placeholder="playername"
                      maxLength={32}
                      onKeyDown={(e) => { if (e.key === "Enter") invite(); }}
                    />
                    {inviteSuggestLoading && (
                      <div className="mt-2 text-xs text-muted-foreground flex items-center gap-2">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> searching…
                      </div>
                    )}
                    {inviteSuggestions.length > 0 && (
                      <div className="mt-2 rounded-md border border-border bg-background overflow-hidden">
                        {inviteSuggestions.map((u) => (
                          <button
                            key={u.id}
                            type="button"
                            className="w-full text-left px-3 py-2 text-sm hover:bg-secondary/50 flex items-center justify-between"
                            onClick={() => { setInviteUsername(u.username); setInviteSuggestions([]); }}
                          >
                            <span className="text-foreground">{u.username}</span>
                            <span className="text-[10px] text-muted-foreground">select</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <Button onClick={invite} disabled={busy || !inviteUsername.trim()} className="w-full">
                    {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send invite"}
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    They’ll get a popup with Accept / Decline while online.
                  </p>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <p className="text-xs text-muted-foreground">
            Invite by username. Once they accept, they’ll join instantly.
          </p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-heading font-bold text-sm text-foreground flex items-center gap-2"><Users className="w-4 h-4 text-primary" /> Members ({myGuild.memberCount})</h3>
            <Button size="sm" variant="ghost" onClick={leave} disabled={busy}>
              <LogOut className="w-3.5 h-3.5" /> Leave
            </Button>
          </div>
          <div className="space-y-1.5">
            {members.map((m) => (
              <div key={m.id} className="flex items-center justify-between px-2 py-1.5 rounded-md hover:bg-secondary/40">
                <div className="flex items-center gap-2">
                  <Circle className={cn("w-2.5 h-2.5", m.online ? "fill-green-500 text-green-500" : "fill-muted text-muted")} />
                  <span className="text-sm text-foreground">{m.username}</span>
                  {m.id === myGuild.ownerPlayerId && <span className="text-[10px] px-1.5 py-0.5 rounded bg-[hsl(var(--legendary))]/20 text-[hsl(var(--legendary))] font-medium">Owner</span>}
                </div>
                <span className="text-[10px] text-muted-foreground">{m.online ? "online" : "offline"}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading text-2xl font-bold text-foreground flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary" /> Guilds
          </h2>
          <p className="text-sm text-muted-foreground mt-1">Found a guild or join one. Up to 30 members.</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4" /> Create</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Found a Guild</DialogTitle></DialogHeader>
            <div className="space-y-3 pt-2">
              <div>
                <label className="text-xs text-muted-foreground">Name (3-24 chars)</label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="The Mythic Order" maxLength={24} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Tag (2-5 uppercase)</label>
                <Input value={tag} onChange={(e) => setTag(e.target.value.toUpperCase())} placeholder="MYTH" maxLength={5} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Description (optional)</label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={200} rows={3} />
              </div>
              <Button onClick={create} disabled={busy} className="w-full">
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Found Guild"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="p-4">
        <h3 className="font-heading font-bold text-sm text-foreground mb-3">Browse</h3>
        {browseList.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">No guilds yet — be the first to found one!</p>
        ) : (
          <div className="space-y-2">
            {browseList.map((g) => (
              <div key={g.id} className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-md bg-secondary/30">
                <div className="min-w-0">
                  <div className="text-sm font-medium text-foreground truncate">
                    <span className="font-mono text-xs text-muted-foreground mr-2">[{g.tag}]</span>{g.name}
                  </div>
                  {g.description && <div className="text-xs text-muted-foreground truncate">{g.description}</div>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-muted-foreground">{g.memberCount}/30</span>
                  <Button size="sm" onClick={() => join(g.id)} disabled={busy || g.memberCount >= 30}>Join</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
