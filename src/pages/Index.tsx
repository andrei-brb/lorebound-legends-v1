import { useState, useEffect, useMemo, useRef } from "react";
import { BookOpen, Layers, Swords, Coins, Sparkles as SparklesIcon, Grid3X3, Loader2, ScrollText, Hammer, Trophy, ArrowLeftRight, BarChart3, Calendar, Zap, Crown, Shield, Mail } from "lucide-react";
import CollectionView from "@/components/CollectionView";
import DeckBuilder from "@/components/DeckBuilder";
import BattleArena from "@/components/BattleArena";
import PackShop from "@/components/PackShop";
import CardCatalog from "@/components/CardCatalog";
import DailyQuests from "@/components/DailyQuests";
import CraftingWorkshop from "@/components/CraftingWorkshop";
import AchievementPanel from "@/components/AchievementPanel";
import Leaderboard from "@/components/Leaderboard";
import TradeUI from "@/components/TradeUI";
import SeasonalEvents from "@/components/SeasonalEvents";
import Tournament from "@/components/Tournament";
import BoostRewards from "@/components/BoostRewards";
import BattlePass from "@/components/BattlePass";
import Onboarding from "@/components/Onboarding";
import PvPPanel from "@/components/PvPPanel";
import InboxPanel from "@/components/InboxPanel";
import LivePvPBattleground from "@/components/LivePvPBattleground";
import { cn } from "@/lib/utils";
import { usePlayerApi } from "@/lib/usePlayerApi";
import { loadAchievementState, checkNewAchievements, saveAchievementState } from "@/lib/achievementEngine";
import { toast } from "@/hooks/use-toast";
import { api } from "@/lib/apiClient";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";

type Tab = "collection" | "catalog" | "deck" | "battle" | "pvp" | "summon" | "quests" | "workshop" | "achievements" | "leaderboard" | "trade" | "mail" | "events" | "tournament" | "boost" | "pass";
type Category = "cards" | "combat" | "progress" | "social";

const categories: { id: Category; label: string; icon: React.ReactNode; tabs: { id: Tab; label: string; icon: React.ReactNode }[] }[] = [
  {
    id: "cards", label: "Cards", icon: <BookOpen className="w-4 h-4" />,
    tabs: [
      { id: "collection", label: "Collection", icon: <BookOpen className="w-4 h-4" /> },
      { id: "catalog", label: "Catalog", icon: <Grid3X3 className="w-4 h-4" /> },
      { id: "summon", label: "Summon", icon: <SparklesIcon className="w-4 h-4" /> },
      { id: "deck", label: "Deck", icon: <Layers className="w-4 h-4" /> },
    ],
  },
  {
    id: "combat", label: "Combat", icon: <Swords className="w-4 h-4" />,
    tabs: [
      { id: "battle", label: "Battle", icon: <Swords className="w-4 h-4" /> },
      { id: "pvp", label: "PvP", icon: <Crown className="w-4 h-4" /> },
      { id: "tournament", label: "Tourney", icon: <Crown className="w-4 h-4" /> },
    ],
  },
  {
    id: "progress", label: "Progress", icon: <Trophy className="w-4 h-4" />,
    tabs: [
      { id: "quests", label: "Quests", icon: <ScrollText className="w-4 h-4" /> },
      { id: "workshop", label: "Workshop", icon: <Hammer className="w-4 h-4" /> },
      { id: "achievements", label: "Badges", icon: <Trophy className="w-4 h-4" /> },
      { id: "pass", label: "Pass", icon: <Shield className="w-4 h-4" /> },
      { id: "boost", label: "Boost", icon: <Zap className="w-4 h-4" /> },
      { id: "events", label: "Events", icon: <Calendar className="w-4 h-4" /> },
    ],
  },
  {
    id: "social", label: "Social", icon: <ArrowLeftRight className="w-4 h-4" />,
    tabs: [
      { id: "trade", label: "Trade", icon: <ArrowLeftRight className="w-4 h-4" /> },
      { id: "mail", label: "Mail", icon: <Mail className="w-4 h-4" /> },
      { id: "leaderboard", label: "Ranks", icon: <BarChart3 className="w-4 h-4" /> },
    ],
  },
];

export default function Index() {
  const [activeCategory, setActiveCategory] = useState<Category>("cards");
  const [activeTab, setActiveTab] = useState<Tab>("collection");
  const [lastTabPerCategory, setLastTabPerCategory] = useState<Record<Category, Tab>>({
    cards: "collection", combat: "battle", progress: "quests", social: "trade",
  });
  const [battleDeckIds, setBattleDeckIds] = useState<string[]>([]);
  const [rankedBattle, setRankedBattle] = useState<{
    matchId: number;
    opponentName: string;
    opponentDeckIds: string[];
    seed: number | null;
  } | null>(null);
  const [unreadMail, setUnreadMail] = useState(0);
  const lastUnreadMailRef = useRef<number | null>(null);
  const shownInviteIdsRef = useRef<Set<number>>(new Set());
  const [pvpInvitePopup, setPvpInvitePopup] = useState<{
    notifId: number; matchId: number; title: string; body?: string | null;
  } | null>(null);
  const { playerState, setPlayerState, status, isOnline, pullCards, submitBattleResult, completeOnboarding, syncEconomy, craftFuse, craftSacrifice, pullSeasonalPack } = usePlayerApi();
  const isDiscordActivityHost = typeof window !== "undefined" && window.location.hostname.endsWith("discordsays.com");
  const discordOverlayInset = "calc(64px + env(safe-area-inset-top))";
  const ambientParticles = useMemo(
    () => Array.from({ length: 20 }).map(() => ({
      left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`,
      animationDelay: `${Math.random() * 8}s`, animationDuration: `${6 + Math.random() * 8}s`,
    })), []
  );

  useEffect(() => {
    if (!playerState.hasCompletedOnboarding) return;
    const achieveState = loadAchievementState();
    const { achieveState: newState, newlyUnlocked } = checkNewAchievements(achieveState, playerState);
    if (newlyUnlocked.length > 0) {
      saveAchievementState(newState);
      for (const ach of newlyUnlocked) { toast({ title: `${ach.icon} Achievement Unlocked!`, description: ach.title }); }
    }
  }, [playerState]);

  useEffect(() => {
    if (!isOnline) return;
    let alive = true;
    const tick = async () => {
      try {
        const data = await api.getNotificationUnreadCount();
        const next = Number(data.unread) || 0;
        const prev = lastUnreadMailRef.current;
        lastUnreadMailRef.current = next;
        if (alive) setUnreadMail(next);
        if (next > 0 && (prev === null || next > prev)) {
          try {
            const latest = await api.getNotifications(5);
            const notifs: any[] = latest.notifications || [];
            const liveInvite = notifs.find(
              (n: any) => n.type === "pvp_live_invite" && !n.readAt && !shownInviteIdsRef.current.has(n.id)
            );
            if (liveInvite) {
              const matchId = Number(liveInvite.data?.matchId);
              if (Number.isFinite(matchId) && matchId > 0) {
                shownInviteIdsRef.current.add(liveInvite.id);
                if (alive) setPvpInvitePopup({ notifId: liveInvite.id, matchId, title: liveInvite.title, body: liveInvite.body });
                return;
              }
            }
            if (prev !== null && next > prev) {
              const n = notifs[0];
              toast({ title: n?.title || "New mail", description: n?.body || `You have ${next} unread message${next === 1 ? "" : "s"}.` });
            }
          } catch {
            if (prev !== null && next > prev) toast({ title: "New mail", description: `You have ${next} unread message${next === 1 ? "" : "s"}.` });
          }
        }
      } catch { /* ignore */ }
    };
    tick();
    const id = window.setInterval(tick, 8000);
    return () => { alive = false; window.clearInterval(id); };
  }, [isOnline]);

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
          <p className="text-muted-foreground text-sm">Loading your adventure...</p>
        </div>
      </div>
    );
  }

  if (!playerState.hasCompletedOnboarding) {
    return <Onboarding playerState={playerState} onComplete={(newState) => setPlayerState(newState)} isOnline={isOnline} completeOnboardingApi={completeOnboarding} />;
  }

  const handleCategoryClick = (catId: Category) => {
    setActiveCategory(catId);
    setActiveTab(lastTabPerCategory[catId]);
  };

  const handleTabClick = (tabId: Tab) => {
    setActiveTab(tabId);
    setLastTabPerCategory((prev) => ({ ...prev, [activeCategory]: tabId }));
  };

  const startBattle = (deckIds: string[]) => {
    setRankedBattle(null);
    setBattleDeckIds(deckIds);
    setActiveCategory("combat");
    setActiveTab("battle");
  };

  const acceptInvitePopup = async () => {
    if (!pvpInvitePopup) return;
    const { notifId, matchId } = pvpInvitePopup;
    try {
      await api.pvpLiveJoin(matchId);
      await api.markNotificationsRead([notifId]);
      sessionStorage.setItem("pvp.live.matchId", String(matchId));
      setPvpInvitePopup(null);
      setRankedBattle(null);
      setBattleDeckIds([]);
      setActiveCategory("combat");
      setActiveTab("battle");
      toast({ title: "⚔ Match accepted!", description: `Joining match #${matchId}` });
    } catch (e: any) {
      toast({ title: "Accept failed", description: e?.message || "Could not accept invite" });
    }
  };

  const declineInvitePopup = async () => {
    if (!pvpInvitePopup) return;
    const { notifId, matchId } = pvpInvitePopup;
    try {
      await api.pvpLiveDecline(matchId);
      await api.markNotificationsRead([notifId]);
      setPvpInvitePopup(null);
      toast({ title: "Invite declined" });
    } catch (e: any) {
      toast({ title: "Decline failed", description: e?.message || "Could not decline invite" });
    }
  };

  const activeCat = categories.find((c) => c.id === activeCategory);
  const liveMatchIdFromInbox = typeof window !== "undefined" ? Number(sessionStorage.getItem("pvp.live.matchId") || "") : NaN;
  const hasLiveMatchFromInbox = Number.isFinite(liveMatchIdFromInbox) && liveMatchIdFromInbox > 0;

  /** Hide top nav (logo, currency, category + sub-tabs) while an active battle UI is shown */
  const hideAppChromeDuringBattle =
    activeTab === "battle" && (battleDeckIds.length > 0 || hasLiveMatchFromInbox);

  return (
    <TooltipProvider>
      {pvpInvitePopup && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 animate-fade-in">
          <div className="bg-card border border-border rounded-2xl p-6 mx-4 max-w-sm w-full shadow-2xl space-y-5 animate-slide-in-up">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-destructive/20 p-3">
                <Swords className="w-6 h-6 text-destructive" />
              </div>
              <div>
                <h3 className="font-heading font-bold text-foreground text-lg">{pvpInvitePopup.title}</h3>
                {pvpInvitePopup.body && <p className="text-sm text-muted-foreground mt-0.5">{pvpInvitePopup.body}</p>}
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={acceptInvitePopup}
                className="flex-1 px-4 py-3 rounded-xl bg-emerald-600 text-white font-heading font-bold hover:bg-emerald-700 transition-colors text-sm"
              >
                ⚔ Accept
              </button>
              <button
                onClick={declineInvitePopup}
                className="flex-1 px-4 py-3 rounded-xl bg-secondary text-secondary-foreground font-heading font-bold hover:bg-secondary/80 transition-colors text-sm"
              >
                Decline
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="min-h-screen bg-background" style={{ paddingTop: isDiscordActivityHost ? discordOverlayInset : "env(safe-area-inset-top)" }}>
        {/* Ambient particles */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
          {ambientParticles.map((p, i) => (
            <div key={i} className="absolute w-1 h-1 rounded-full bg-primary/20 animate-float" style={{ left: p.left, top: p.top, animationDelay: p.animationDelay, animationDuration: p.animationDuration }} />
          ))}
        </div>

        {!hideAppChromeDuringBattle && (
          <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky z-50" style={{ top: 0 }}>
            <div className="container flex items-center justify-between h-14 gap-2">
              <div className="flex items-center gap-2 shrink-0">
                <Swords className="w-6 h-6 text-primary" />
                <h1 className="font-heading text-lg font-bold text-foreground tracking-wide hidden sm:block">Mythic Arcana</h1>
              </div>
              <div className="flex items-center gap-2 sm:gap-4">
                <div className="flex items-center gap-1.5 bg-secondary/80 rounded-lg px-2.5 py-1.5">
                  <Coins className="w-4 h-4 text-[hsl(var(--legendary))]" />
                  <span className="font-heading font-bold text-sm text-foreground">{Number(playerState.gold) || 0}</span>
                </div>
                <div className="flex items-center gap-1.5 bg-secondary/80 rounded-lg px-2.5 py-1.5">
                  <span className="text-sm">💎</span>
                  <span className="font-heading font-bold text-sm text-foreground">{Number(playerState.stardust) || 0}</span>
                </div>
                <nav className="flex gap-0.5">
                  {categories.map((cat) => (
                    <Tooltip key={cat.id}>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => handleCategoryClick(cat.id)}
                          className={cn(
                            "flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap",
                            activeCategory === cat.id
                              ? "bg-primary text-primary-foreground"
                              : "text-muted-foreground hover:bg-secondary hover:text-secondary-foreground"
                          )}
                        >
                          {cat.icon}
                          <span className="hidden md:inline">{cat.label}</span>
                        </button>
                      </TooltipTrigger>
                      <TooltipContent className="md:hidden"><p>{cat.label}</p></TooltipContent>
                    </Tooltip>
                  ))}
                </nav>
              </div>
            </div>
            {/* Sub-tabs row */}
            <div className="container flex items-center gap-1 h-10 overflow-x-auto scrollbar-none">
              {activeCat?.tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => handleTabClick(tab.id)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap relative",
                    activeTab === tab.id
                      ? "bg-secondary text-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {tab.icon}
                  <span className="relative">
                    {tab.label}
                    {tab.id === "mail" && unreadMail > 0 && (
                      <span className="absolute -top-2 -right-3 text-[10px] font-bold bg-primary text-primary-foreground rounded-full px-1.5 py-0.5">
                        {unreadMail > 99 ? "99+" : unreadMail}
                      </span>
                    )}
                  </span>
                  {activeTab === tab.id && <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-primary rounded-full" />}
                </button>
              ))}
            </div>
          </header>
        )}

        {/* Content */}
        <main className={cn("relative z-10", hideAppChromeDuringBattle ? "w-full max-w-none px-0 py-0" : "container py-8 max-w-7xl")}>
          <div key={activeTab} className="tab-content-enter">
            {activeTab === "collection" && (
              <div>
                <div className="mb-6">
                  <h2 className="font-heading text-2xl font-bold text-foreground">Your Collection</h2>
                  <p className="text-sm text-muted-foreground mt-1">Click any card to flip and reveal its lore & synergies</p>
                </div>
                <CollectionView playerState={playerState} onStateChange={setPlayerState} />
              </div>
            )}
            {activeTab === "catalog" && <CardCatalog playerState={playerState} />}
            {activeTab === "summon" && <PackShop playerState={playerState} onStateChange={setPlayerState} isOnline={isOnline} pullCardsApi={pullCards} />}
            {activeTab === "deck" && <DeckBuilder onStartBattle={startBattle} playerState={playerState} onStateChange={setPlayerState} />}
            {activeTab === "battle" && battleDeckIds.length > 0 && (
              <BattleArena
                playerDeckIds={battleDeckIds}
                opponentDeckIds={rankedBattle?.opponentDeckIds ?? null}
                rankedSubtitle={
                  rankedBattle
                    ? `Ranked vs ${rankedBattle.opponentName} — AI plays their deck`
                    : null
                }
                battleSeed={rankedBattle?.seed ?? null}
                onRankedSubmit={
                  rankedBattle
                    ? async (data) => {
                        await api.pvpAsyncSubmit(rankedBattle.matchId, data);
                      }
                    : undefined
                }
                onExit={() => {
                  setBattleDeckIds([]);
                  const wasRanked = rankedBattle != null;
                  setRankedBattle(null);
                  setActiveTab(wasRanked ? "pvp" : "deck");
                }}
                playerState={playerState}
                onStateChange={setPlayerState}
                isOnline={isOnline}
                submitBattleResultApi={submitBattleResult}
              />
            )}
            {activeTab === "quests" && <DailyQuests playerState={playerState} onStateChange={setPlayerState} isOnline={isOnline} syncEconomyApi={syncEconomy} />}
            {activeTab === "workshop" && <CraftingWorkshop playerState={playerState} onStateChange={setPlayerState} isOnline={isOnline} craftFuseApi={craftFuse} craftSacrificeApi={craftSacrifice} />}
            {activeTab === "achievements" && <AchievementPanel playerState={playerState} />}
            {activeTab === "leaderboard" && <Leaderboard playerState={playerState} isOnline={isOnline} />}
            {activeTab === "trade" && <TradeUI playerState={playerState} onStateChange={setPlayerState} />}
            {activeTab === "mail" && <InboxPanel onNavigate={(tab) => {
              if (tab === "trade" || tab === "pvp") { setActiveCategory("social"); setActiveTab(tab); return; }
              if (tab === "battle") { setActiveCategory("combat"); setActiveTab("battle"); return; }
            }} />}
            {activeTab === "pvp" && (
              <PvPPanel
                playerState={playerState}
                onNavigateBattle={(matchId) => {
                  sessionStorage.setItem("pvp.live.matchId", String(matchId));
                  setRankedBattle(null);
                  setBattleDeckIds([]);
                  setActiveCategory("combat");
                  setActiveTab("battle");
                }}
                onStartRankedBattle={async (matchId) => {
                  try {
                    const data = await api.pvpAsyncGetPlay(matchId);
                    setRankedBattle({
                      matchId: data.matchId,
                      opponentName: data.opponent.username,
                      opponentDeckIds: data.opponentDeckCardIds,
                      seed: data.seed ?? null,
                    });
                    setBattleDeckIds(data.myDeckCardIds);
                    setActiveCategory("combat");
                    setActiveTab("battle");
                  } catch (e) {
                    toast({
                      title: "Could not load ranked match",
                      description: e instanceof Error ? e.message : String(e),
                      variant: "destructive",
                    });
                  }
                }}
              />
            )}
            {activeTab === "events" && <SeasonalEvents playerState={playerState} onStateChange={setPlayerState} isOnline={isOnline} pullSeasonalPackApi={pullSeasonalPack} />}
            {activeTab === "tournament" && <Tournament playerState={playerState} onStateChange={setPlayerState} isOnline={isOnline} syncEconomyApi={syncEconomy} />}
            {activeTab === "boost" && <BoostRewards />}
            {activeTab === "pass" && <BattlePass playerState={playerState} onStateChange={setPlayerState} isOnline={isOnline} />}
            {activeTab === "battle" && battleDeckIds.length === 0 && hasLiveMatchFromInbox && (
              <LivePvPBattleground
                matchId={liveMatchIdFromInbox}
                playerState={playerState}
                onStateChange={setPlayerState}
                onExit={() => {
                  sessionStorage.removeItem("pvp.live.matchId");
                  setActiveCategory("social");
                  setActiveTab("pvp");
                }}
              />
            )}
            {activeTab === "battle" && battleDeckIds.length === 0 && !hasLiveMatchFromInbox && (
              <div className="text-center py-20">
                <Swords className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
                <h2 className="font-heading text-xl font-bold text-foreground mb-2">No Deck Selected</h2>
                <p className="text-sm text-muted-foreground mb-4">Build a deck first, then start a battle!</p>
                <button onClick={() => setActiveTab("deck")} className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-heading font-bold text-sm">Go to Deck Builder</button>
              </div>
            )}
          </div>
        </main>
      </div>
    </TooltipProvider>
  );
}
