import { useEffect, useMemo, useState } from "react";
import { Trophy, Swords, BookOpen, Star, Crown, Medal, Award } from "lucide-react";
import { cn } from "@/lib/utils";
import { allCards } from "@/data/cards";
import type { PlayerState } from "@/lib/playerState";
import { api } from "@/lib/apiClient";

interface LeaderboardEntry {
  rank: number;
  name: string;
  avatar?: string;
  value: number;
  label: string;
  /** Internal player id (server); omit in mock data */
  playerId?: number;
}

type LeaderboardTab = "wins" | "collection" | "rarest";

// Since this is a Discord Activity, we simulate leaderboard data
// In production this would come from /api/leaderboard
function generateMockLeaderboard(playerState: PlayerState, tab: LeaderboardTab): LeaderboardEntry[] {
  const bots = [
    { name: "DragonSlayer99", avatar: "🐉" },
    { name: "MythicQueen", avatar: "👑" },
    { name: "ShadowLord", avatar: "🌑" },
    { name: "FireStarter", avatar: "🔥" },
    { name: "NatureSage", avatar: "🌿" },
    { name: "StormBringer", avatar: "⚡" },
    { name: "IceMaven", avatar: "❄️" },
    { name: "VoidWalker", avatar: "🌀" },
    { name: "LightKeeper", avatar: "☀️" },
    { name: "BoneKnight", avatar: "💀" },
    { name: "CrystalMage", avatar: "💎" },
    { name: "ThunderGod", avatar: "⛈️" },
    { name: "BloodHunter", avatar: "🩸" },
    { name: "MoonPriestess", avatar: "🌙" },
    { name: "IronForge", avatar: "⚒️" },
    { name: "SerpentKing", avatar: "🐍" },
    { name: "PhoenixRise", avatar: "🦅" },
    { name: "FrostWitch", avatar: "🧊" },
    { name: "DarkOracle", avatar: "🔮" },
  ];

  if (tab === "wins") {
    const playerWins = Math.floor(Math.random() * 20) + 5; // Simulate
    const entries: LeaderboardEntry[] = bots.map((b) => ({
      rank: 0,
      name: b.name,
      avatar: b.avatar,
      value: Math.floor(Math.random() * 50) + 10,
      label: "wins",
    }));
    entries.push({ rank: 0, name: "You", avatar: "⭐", value: playerWins, label: "wins" });
    entries.sort((a, b) => b.value - a.value);
    return entries.slice(0, 15).map((e, i) => ({ ...e, rank: i + 1 }));
  }

  if (tab === "collection") {
    const totalCards = allCards.filter(c => c.type === "hero" || c.type === "god").length;
    const playerPct = Math.round((playerState.ownedCardIds.length / totalCards) * 100);
    const entries: LeaderboardEntry[] = bots.map((b) => ({
      rank: 0,
      name: b.name,
      avatar: b.avatar,
      value: Math.floor(Math.random() * 80) + 10,
      label: "%",
    }));
    entries.push({ rank: 0, name: "You", avatar: "⭐", value: playerPct, label: "%" });
    entries.sort((a, b) => b.value - a.value);
    return entries.slice(0, 15).map((e, i) => ({ ...e, rank: i + 1 }));
  }

  // Rarest cards owned
  const rarityScore: Record<string, number> = { legendary: 10, rare: 3, common: 1 };
  const playerScore = playerState.ownedCardIds.reduce((sum, id) => {
    const card = allCards.find(c => c.id === id);
    return sum + (rarityScore[card?.rarity || "common"] || 1);
  }, 0);
  const entries: LeaderboardEntry[] = bots.map((b) => ({
    rank: 0,
    name: b.name,
    avatar: b.avatar,
    value: Math.floor(Math.random() * 200) + 30,
    label: "pts",
  }));
  entries.push({ rank: 0, name: "You", avatar: "⭐", value: playerScore, label: "pts" });
  entries.sort((a, b) => b.value - a.value);
  return entries.slice(0, 15).map((e, i) => ({ ...e, rank: i + 1 }));
}

const tabConfig: { id: LeaderboardTab; label: string; icon: React.ReactNode; desc: string }[] = [
  { id: "wins", label: "Wins", icon: <Swords className="w-4 h-4" />, desc: "Most battle victories" },
  { id: "collection", label: "Collection", icon: <BookOpen className="w-4 h-4" />, desc: "Collection completion %" },
  { id: "rarest", label: "Rarest", icon: <Star className="w-4 h-4" />, desc: "Rarity score (Legendary=10, Rare=3)" },
];

const rankIcons = [
  <Crown className="w-5 h-5 text-legendary" />,
  <Medal className="w-5 h-5 text-rare" />,
  <Award className="w-5 h-5 text-primary" />,
];

interface LeaderboardProps {
  playerState: PlayerState;
  isOnline?: boolean;
}

export default function Leaderboard({ playerState, isOnline }: LeaderboardProps) {
  const [tab, setTab] = useState<LeaderboardTab>("wins");
  const [serverEntries, setServerEntries] = useState<LeaderboardEntry[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [myPlayerId, setMyPlayerId] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadMe() {
      if (!isOnline) {
        setMyPlayerId(null);
        return;
      }
      try {
        const { me } = await api.getMe();
        if (!cancelled) setMyPlayerId(me.id);
      } catch {
        if (!cancelled) setMyPlayerId(null);
      }
    }
    loadMe();
    return () => { cancelled = true; };
  }, [isOnline]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!isOnline) { setServerEntries(null); return; }
      setLoading(true);
      try {
        const res = await api.getLeaderboard(tab);
        const mapped: LeaderboardEntry[] = res.entries.map((e) => ({
          rank: e.rank,
          name: e.name,
          avatar: e.avatar ?? "👤",
          value: e.value,
          playerId: e.playerId,
          label: tab === "collection" ? "%" : tab === "rarest" ? "pts" : "wins",
        }));
        if (!cancelled) setServerEntries(mapped);
      } catch (err) {
        console.error("[Leaderboard] Failed to load server leaderboard:", err);
        if (!cancelled) setServerEntries(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [tab, isOnline]);

  // Memoize per tab so it doesn't re-randomize on every render (offline fallback)
  const mockEntries = useMemo(() => generateMockLeaderboard(playerState, tab), [tab, playerState.ownedCardIds.length]);
  const entries = serverEntries ?? mockEntries;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading text-2xl font-bold text-foreground flex items-center gap-2">
          <Trophy className="w-6 h-6 text-legendary" /> Leaderboards
        </h2>
        <p className="text-sm text-muted-foreground mt-1">Server rankings — climb the ladder!</p>
      </div>

      {/* Tab selector */}
      <div className="flex gap-2">
        {tabConfig.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
              tab === t.id
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            )}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      <p className="text-xs text-muted-foreground">{tabConfig.find(t => t.id === tab)?.desc}</p>
      {loading && (
        <p className="text-xs text-muted-foreground">Loading leaderboard…</p>
      )}

      {/* Table */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="grid grid-cols-[60px_1fr_100px] text-[10px] uppercase tracking-wider text-muted-foreground font-bold px-4 py-2 border-b border-border bg-secondary/40">
          <span>Rank</span>
          <span>Player</span>
          <span className="text-right">{tab === "collection" ? "%" : tab === "rarest" ? "Score" : "Wins"}</span>
        </div>

        {entries.map((entry) => {
          const isPlayer =
            entry.name === "You" ||
            (myPlayerId != null && entry.playerId != null && entry.playerId === myPlayerId);
          return (
            <div
              key={entry.playerId != null ? `p-${entry.playerId}-${tab}` : `${entry.rank}-${entry.name}`}
              className={cn(
                "grid grid-cols-[60px_1fr_100px] items-center px-4 py-3 border-b border-border/50 transition-colors",
                isPlayer && "bg-primary/10 border-primary/20",
                entry.rank <= 3 && "bg-secondary/30"
              )}
            >
              <div className="flex items-center gap-1">
                {entry.rank <= 3 ? rankIcons[entry.rank - 1] : (
                  <span className="text-sm font-heading font-bold text-muted-foreground w-5 text-center">{entry.rank}</span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-lg">{entry.avatar}</span>
                <span className={cn("font-heading text-sm font-bold", isPlayer ? "text-primary" : "text-foreground")}>
                  {entry.name}
                </span>
                {isPlayer && (
                  <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-primary/20 text-primary font-bold uppercase">You</span>
                )}
              </div>

              <div className="text-right">
                <span className={cn("font-heading font-bold text-sm", entry.rank === 1 ? "text-legendary" : entry.rank <= 3 ? "text-rare" : "text-foreground")}>
                  {entry.value}{entry.label === "%" ? "%" : ""}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <p className="text-[10px] text-muted-foreground text-center">
        Rankings update after each battle. Play more to climb!
      </p>
    </div>
  );
}
