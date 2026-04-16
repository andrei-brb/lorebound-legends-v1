import { useState, useEffect } from "react";
import { BookOpen, Layers, Swords, Coins, Sparkles as SparklesIcon, Grid3X3, Loader2, ScrollText, Hammer, Trophy, ArrowLeftRight, BarChart3, Calendar, Zap, Crown, Shield } from "lucide-react";
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
import { cn } from "@/lib/utils";
import { usePlayerApi } from "@/lib/usePlayerApi";
import { loadAchievementState, checkNewAchievements, saveAchievementState } from "@/lib/achievementEngine";
import { toast } from "@/hooks/use-toast";

type Tab = "collection" | "catalog" | "deck" | "battle" | "summon" | "quests" | "workshop" | "achievements" | "leaderboard" | "trade" | "events" | "tournament" | "boost" | "pass";
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
      { id: "leaderboard", label: "Ranks", icon: <BarChart3 className="w-4 h-4" /> },
    ],
  },
];

export default function Index() {
  const [activeCategory, setActiveCategory] = useState<Category>("cards");
  const [activeTab, setActiveTab] = useState<Tab>("collection");
  const [lastTabPerCategory, setLastTabPerCategory] = useState<Record<Category, Tab>>({
    cards: "collection",
    combat: "battle",
    progress: "quests",
    social: "trade",
  });
  const [battleDeckIds, setBattleDeckIds] = useState<string[]>([]);
  const { playerState, setPlayerState, status, isOnline, pullCards, submitBattleResult, completeOnboarding, syncEconomy, craftFuse, craftSacrifice, pullSeasonalPack } = usePlayerApi();
  const isDiscordActivityHost = typeof window !== "undefined" && window.location.hostname.endsWith("discordsays.com");
  const discordOverlayInset = "calc(64px + env(safe-area-inset-top))";

  // Achievement checking on state changes
  useEffect(() => {
    if (!playerState.hasCompletedOnboarding) return;
    const achieveState = loadAchievementState();
    const { achieveState: newState, newlyUnlocked } = checkNewAchievements(achieveState, playerState);
    if (newlyUnlocked.length > 0) {
      saveAchievementState(newState);
      for (const ach of newlyUnlocked) {
        toast({ title: `${ach.icon} Achievement Unlocked!`, description: ach.title });
      }
    }
  }, [playerState]);

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

  // Show onboarding for new players
  if (!playerState.hasCompletedOnboarding) {
    return (
      <Onboarding
        playerState={playerState}
        onComplete={(newState) => setPlayerState(newState)}
        isOnline={isOnline}
        completeOnboardingApi={completeOnboarding}
      />
    );
  }

  const handleCategoryClick = (catId: Category) => {
    setActiveCategory(catId);
    const remembered = lastTabPerCategory[catId];
    setActiveTab(remembered);
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

  return (
    <div
      className="min-h-screen bg-background"
      style={{ paddingTop: isDiscordActivityHost ? discordOverlayInset : "env(safe-area-inset-top)" }}
    >
      {/* Ambient particles */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        {Array.from({ length: 20 }).map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 rounded-full bg-primary/20 animate-float"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 8}s`,
              animationDuration: `${6 + Math.random() * 8}s`,
            }}
          />
        ))}
      </div>

      {/* Header */}
      <header
        className="border-b border-border bg-card/50 backdrop-blur-sm sticky z-50"
        style={{ top: 0 }}
      >
        {/* Top row: logo + currency + categories */}
        <div className="container flex items-center justify-between h-14">
          <div className="flex items-center gap-2">
            <Swords className="w-6 h-6 text-primary" />
            <h1 className="font-heading text-lg font-bold text-foreground tracking-wide">Mythic Arcana</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 bg-secondary/80 rounded-lg px-3 py-1.5">
              <Coins className="w-4 h-4 text-legendary" />
              <span className="font-heading font-bold text-sm text-foreground">{playerState.gold}</span>
            </div>
            <div className="flex items-center gap-1.5 bg-secondary/80 rounded-lg px-3 py-1.5">
              <span className="text-sm">💎</span>
              <span className="font-heading font-bold text-sm text-foreground">{playerState.stardust || 0}</span>
            </div>
            <nav className="flex gap-1">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => handleCategoryClick(cat.id)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap",
                    activeCategory === cat.id
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-secondary hover:text-secondary-foreground"
                  )}
                >
                  {cat.icon}
                  <span className="hidden sm:inline">{cat.label}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>
        {/* Sub-tabs row */}
        <div className="container flex items-center gap-1 h-10 overflow-x-auto">
          {categories.find((c) => c.id === activeCategory)?.tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap",
                activeTab === tab.id
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      {/* Content */}
      <main className="container py-8 animate-fade-in relative z-10">
        {activeTab === "collection" && (
          <div>
            <div className="mb-6">
              <h2 className="font-heading text-2xl font-bold text-foreground">Your Collection</h2>
              <p className="text-sm text-muted-foreground mt-1">Click any card to flip and reveal its lore & synergies</p>
            </div>
            <CollectionView playerState={playerState} onStateChange={setPlayerState} />
          </div>
        )}
        {activeTab === "catalog" && (
          <CardCatalog playerState={playerState} />
        )}
        {activeTab === "summon" && (
          <PackShop playerState={playerState} onStateChange={setPlayerState} isOnline={isOnline} pullCardsApi={pullCards} />
        )}
        {activeTab === "deck" && <DeckBuilder onStartBattle={startBattle} playerState={playerState} onStateChange={setPlayerState} />}
        {activeTab === "battle" && battleDeckIds.length > 0 && (
          <BattleArena playerDeckIds={battleDeckIds} onExit={() => setActiveTab("deck")} playerState={playerState} onStateChange={setPlayerState} isOnline={isOnline} submitBattleResultApi={submitBattleResult} />
        )}
        {activeTab === "quests" && (
          <DailyQuests playerState={playerState} onStateChange={setPlayerState} isOnline={isOnline} syncEconomyApi={syncEconomy} />
        )}
        {activeTab === "workshop" && (
          <CraftingWorkshop playerState={playerState} onStateChange={setPlayerState} isOnline={isOnline} craftFuseApi={craftFuse} craftSacrificeApi={craftSacrifice} />
        )}
        {activeTab === "achievements" && (
          <AchievementPanel playerState={playerState} />
        )}
        {activeTab === "leaderboard" && (
          <Leaderboard playerState={playerState} isOnline={isOnline} />
        )}
        {activeTab === "trade" && (
          <TradeUI playerState={playerState} onStateChange={setPlayerState} />
        )}
        {activeTab === "events" && (
          <SeasonalEvents playerState={playerState} onStateChange={setPlayerState} isOnline={isOnline} pullSeasonalPackApi={pullSeasonalPack} />
        )}
        {activeTab === "tournament" && (
          <Tournament playerState={playerState} onStateChange={setPlayerState} isOnline={isOnline} syncEconomyApi={syncEconomy} />
        )}
        {activeTab === "boost" && (
          <BoostRewards />
        )}
        {activeTab === "pass" && (
          <BattlePass playerState={playerState} onStateChange={setPlayerState} isOnline={isOnline} />
        )}
        {activeTab === "battle" && battleDeckIds.length === 0 && (
          <div className="text-center py-20">
            <Swords className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
            <h2 className="font-heading text-xl font-bold text-foreground mb-2">No Deck Selected</h2>
            <p className="text-sm text-muted-foreground mb-4">Build a deck first, then start a battle!</p>
            <button
              onClick={() => setActiveTab("deck")}
              className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-heading font-bold text-sm"
            >
              Go to Deck Builder
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
