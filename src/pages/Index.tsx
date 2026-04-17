import { useState, useEffect, useMemo, useRef } from "react";
import { BookOpen, Layers, Swords, Coins, Sparkles as SparklesIcon, Grid3X3, Loader2, ScrollText, Hammer, Trophy, ArrowLeftRight, BarChart3, Calendar, Zap, Crown, Shield, Mail, User, Gift, Users, MessageCircle, Eye, Flag } from "lucide-react";
import TabTransition from "@/components/TabTransition";
import TutorialOverlay from "@/components/TutorialOverlay";
import CollectionView from "@/components/CollectionView";
import DeckBuilder from "@/components/DeckBuilder";
import BattleArena from "@/components/BattleArena";
import PackShop from "@/components/PackShop";
import CardCatalog from "@/components/CardCatalog";
import Tournament from "@/components/Tournament";
import Onboarding from "@/components/Onboarding";
import PvPPanel from "@/components/PvPPanel";
import SettingsPanel from "@/components/SettingsPanel";
// New glass+hex hall tabs
import TradeHall from "@/components/TradeHall";
import QuestsHall from "@/components/halls/QuestsHall";
import WorkshopHall from "@/components/halls/WorkshopHall";
import BadgesHall from "@/components/halls/BadgesHall";
import PassHall from "@/components/halls/PassHall";
import BoostHall from "@/components/halls/BoostHall";
import EventsHall from "@/components/halls/EventsHall";
import MailHall from "@/components/halls/MailHall";
import RanksHall from "@/components/halls/RanksHall";
import FriendsHall from "@/components/halls/FriendsHall";
import ChatHall from "@/components/halls/ChatHall";
import GuildHall from "@/components/halls/GuildHall";
import SpectateHall from "@/components/halls/SpectateHall";
import ProfileHall from "@/components/halls/ProfileHall";
import DailyHall from "@/components/halls/DailyHall";
import CardsHall from "@/components/halls/CardsHall";
import CombatHall from "@/components/halls/CombatHall";
import { cn } from "@/lib/utils";
import { usePlayerApi } from "@/lib/usePlayerApi";
import { loadAchievementState, checkNewAchievements, saveAchievementState } from "@/lib/achievementEngine";
import { toast } from "@/hooks/use-toast";
import { api } from "@/lib/apiClient";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { setSfxVolume } from "@/lib/sfx";

type Tab = "collection" | "catalog" | "deck" | "battle" | "pvp" | "summon" | "quests" | "workshop" | "achievements" | "leaderboard" | "trade" | "mail" | "events" | "tournament" | "boost" | "pass" | "profile" | "daily" | "friends" | "chat" | "guild" | "spectate" | "cards-hall" | "combat-hall";
type Category = "cards" | "combat" | "progress" | "social" | "community" | "you";

const categories: { id: Category; label: string; icon: React.ReactNode; tabs: { id: Tab; label: string; icon: React.ReactNode }[] }[] = [
  {
    id: "cards", label: "Cards", icon: <BookOpen className="w-4 h-4" />,
    tabs: [
      { id: "collection", label: "Collection", icon: <BookOpen className="w-4 h-4" /> },
      { id: "catalog", label: "Catalog", icon: <Grid3X3 className="w-4 h-4" /> },
      { id: "summon", label: "Summon", icon: <SparklesIcon className="w-4 h-4" /> },
      { id: "deck", label: "Deck", icon: <Layers className="w-4 h-4" /> },
      { id: "cards-hall", label: "Hall ✨", icon: <SparklesIcon className="w-4 h-4" /> },
    ],
  },
  {
    id: "combat", label: "Combat", icon: <Swords className="w-4 h-4" />,
    tabs: [
      { id: "battle", label: "Battle", icon: <Swords className="w-4 h-4" /> },
      { id: "pvp", label: "PvP", icon: <Crown className="w-4 h-4" /> },
      { id: "tournament", label: "Tourney", icon: <Crown className="w-4 h-4" /> },
      { id: "combat-hall", label: "Arena", icon: <Flame className="w-4 h-4" /> },
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
  {
    id: "community", label: "Community", icon: <Users className="w-4 h-4" />,
    tabs: [
      { id: "friends", label: "Friends", icon: <Users className="w-4 h-4" /> },
      { id: "chat", label: "Chat", icon: <MessageCircle className="w-4 h-4" /> },
      { id: "guild", label: "Guild", icon: <Flag className="w-4 h-4" /> },
      { id: "spectate", label: "Spectate", icon: <Eye className="w-4 h-4" /> },
    ],
  },
  {
    id: "you", label: "You", icon: <User className="w-4 h-4" />,
    tabs: [
      { id: "profile", label: "Profile", icon: <User className="w-4 h-4" /> },
      { id: "daily", label: "Daily", icon: <Gift className="w-4 h-4" /> },
    ],
  },
];

export default function Index() {
  const [activeCategory, setActiveCategory] = useState<Category>("cards");
  const [activeTab, setActiveTab] = useState<Tab>("collection");
  const [lastTabPerCategory, setLastTabPerCategory] = useState<Record<Category, Tab>>({
    cards: "collection", combat: "battle", progress: "quests", social: "trade", community: "friends", you: "profile",
  });
  const [battleDeckIds, setBattleDeckIds] = useState<string[]>([]);
  const [unreadMail, setUnreadMail] = useState(0);
  const lastUnreadMailRef = useRef<number | null>(null);
  const { playerState, setPlayerState, status, isOnline, pullCards, submitBattleResult, completeOnboarding, syncEconomy, craftFuse, craftSacrifice, pullSeasonalPack } = usePlayerApi();
  const isDiscordActivityHost = typeof window !== "undefined" && window.location.hostname.endsWith("discordsays.com");
  const discordOverlayInset = "calc(64px + env(safe-area-inset-top))";
  const ambientParticles = useMemo(
    () => Array.from({ length: 20 }).map(() => ({
      left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`,
      animationDelay: `${Math.random() * 8}s`, animationDuration: `${6 + Math.random() * 8}s`,
    })), []
  );

  // Sync sfx volume from settings on every change
  useEffect(() => {
    const v = playerState.settings?.sfxVol;
    if (typeof v === "number") setSfxVolume(v);
  }, [playerState.settings?.sfxVol]);

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
        if (prev !== null && next > prev) {
          try {
            const latest = await api.getNotifications(1);
            const n = latest.notifications?.[0];
            toast({ title: n?.title || "New mail", description: n?.body || `You have ${next} unread message${next === 1 ? "" : "s"}.` });
          } catch { toast({ title: "New mail", description: `You have ${next} unread message${next === 1 ? "" : "s"}.` }); }
        }
      } catch { /* ignore */ }
    };
    tick();
    const id = window.setInterval(tick, 8000);
    return () => { alive = false; window.clearInterval(id); };
  }, [isOnline]);

  // Presence heartbeat — keeps friends/guild members "online"
  useEffect(() => {
    if (!isOnline) return;
    let alive = true;
    const beat = () => { api.presenceHeartbeat().catch(() => {}); };
    beat();
    const id = window.setInterval(() => { if (alive) beat(); }, 60000);
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
    setBattleDeckIds(deckIds);
    setActiveCategory("combat");
    setActiveTab("battle");
  };

  const activeCat = categories.find((c) => c.id === activeCategory);

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background" style={{ paddingTop: isDiscordActivityHost ? discordOverlayInset : "env(safe-area-inset-top)" }}>
        {/* Ambient particles — disabled when reduceMotion or animationsOn = false */}
        {playerState.settings?.animationsOn !== false && !playerState.settings?.reduceMotion && (
          <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
            {ambientParticles.map((p, i) => (
              <div key={i} className="absolute w-1 h-1 rounded-full bg-primary/20 animate-float" style={{ left: p.left, top: p.top, animationDelay: p.animationDelay, animationDuration: p.animationDuration }} />
            ))}
          </div>
        )}

        {/* Header */}
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
              <SettingsPanel playerState={playerState} onStateChange={setPlayerState} />
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

        {/* Content */}
        <main className="container py-8 relative z-10 max-w-7xl">
          <TutorialOverlay tabId={activeTab} playerState={playerState} onStateChange={setPlayerState} />
          <TabTransition tabKey={activeTab} reduceMotion={!!playerState.settings?.reduceMotion}>
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
              <BattleArena playerDeckIds={battleDeckIds} onExit={() => setActiveTab("deck")} playerState={playerState} onStateChange={setPlayerState} isOnline={isOnline} submitBattleResultApi={submitBattleResult} />
            )}
            {activeTab === "quests" && <QuestsHall playerState={playerState} onStateChange={setPlayerState} />}
            {activeTab === "workshop" && <WorkshopHall playerState={playerState} onStateChange={setPlayerState} />}
            {activeTab === "achievements" && <BadgesHall playerState={playerState} />}
            {activeTab === "leaderboard" && <RanksHall playerState={playerState} isOnline={isOnline} />}
            {activeTab === "trade" && <TradeHall playerState={playerState} onStateChange={setPlayerState} />}
            {activeTab === "mail" && <MailHall onNavigate={(tab) => { setActiveCategory("social"); setActiveTab(tab as Tab); }} />}
            {activeTab === "pvp" && <PvPPanel playerState={playerState} />}
            {activeTab === "events" && <EventsHall playerState={playerState} onStateChange={setPlayerState} />}
            {activeTab === "tournament" && <Tournament playerState={playerState} onStateChange={setPlayerState} isOnline={isOnline} syncEconomyApi={syncEconomy} />}
            {activeTab === "boost" && <BoostHall playerState={playerState} />}
            {activeTab === "pass" && <PassHall playerState={playerState} onStateChange={setPlayerState} />}
            {activeTab === "profile" && <ProfileHall playerState={playerState} onStateChange={setPlayerState} />}
            {activeTab === "daily" && <DailyHall playerState={playerState} onStateChange={setPlayerState} />}
            {activeTab === "friends" && <FriendsHall isOnline={isOnline} />}
            {activeTab === "chat" && <ChatHall isOnline={isOnline} playerState={playerState} />}
            {activeTab === "guild" && <GuildHall isOnline={isOnline} playerState={playerState} />}
            {activeTab === "spectate" && <SpectateHall isOnline={isOnline} />}
            {activeTab === "cards-hall" && <CardsHall playerState={playerState} />}
            {activeTab === "combat-hall" && <CombatHall playerState={playerState} />}
            {activeTab === "battle" && battleDeckIds.length === 0 && (
              <div className="text-center py-20">
                <Swords className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
                <h2 className="font-heading text-xl font-bold text-foreground mb-2">No Deck Selected</h2>
                <p className="text-sm text-muted-foreground mb-4">Build a deck first, then start a battle!</p>
                <button onClick={() => setActiveTab("deck")} className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-heading font-bold text-sm">Go to Deck Builder</button>
              </div>
            )}
          </TabTransition>
        </main>
      </div>
    </TooltipProvider>
  );
}
