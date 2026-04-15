import { useState } from "react";
import { BookOpen, Layers, Swords, Coins, Sparkles as SparklesIcon, Grid3X3, Loader2 } from "lucide-react";
import CollectionView from "@/components/CollectionView";
import DeckBuilder from "@/components/DeckBuilder";
import BattleArena from "@/components/BattleArena";
import PackShop from "@/components/PackShop";
import CardCatalog from "@/components/CardCatalog";
import Onboarding from "@/components/Onboarding";
import { cn } from "@/lib/utils";
import { usePlayerApi } from "@/lib/usePlayerApi";

type Tab = "collection" | "catalog" | "deck" | "battle" | "summon";

const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "collection", label: "Collection", icon: <BookOpen className="w-4 h-4" /> },
  { id: "catalog", label: "Catalog", icon: <Grid3X3 className="w-4 h-4" /> },
  { id: "summon", label: "Summon", icon: <SparklesIcon className="w-4 h-4" /> },
  { id: "deck", label: "Deck Builder", icon: <Layers className="w-4 h-4" /> },
  { id: "battle", label: "Battle", icon: <Swords className="w-4 h-4" /> },
];

export default function Index() {
  const [activeTab, setActiveTab] = useState<Tab>("collection");
  const [battleDeckIds, setBattleDeckIds] = useState<string[]>([]);
  const { playerState, setPlayerState, status, isOnline, pullCards, submitBattleResult, completeOnboarding } = usePlayerApi();

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

  const startBattle = (deckIds: string[]) => {
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
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container flex items-center justify-between h-14">
          <div className="flex items-center gap-2">
            <Swords className="w-6 h-6 text-primary" />
            <h1 className="font-heading text-lg font-bold text-foreground tracking-wide">Mythic Arcana</h1>
          </div>
          <div className="flex items-center gap-4">
            {/* Gold Display */}
            <div className="flex items-center gap-1.5 bg-secondary/80 rounded-lg px-3 py-1.5">
              <Coins className="w-4 h-4 text-legendary" />
              <span className="font-heading font-bold text-sm text-foreground">{playerState.gold}</span>
            </div>
            {/* Stardust Display */}
            <div className="flex items-center gap-1.5 bg-secondary/80 rounded-lg px-3 py-1.5">
              <span className="text-sm">💎</span>
              <span className="font-heading font-bold text-sm text-foreground">{playerState.stardust || 0}</span>
            </div>
            <nav className="flex gap-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                    activeTab === tab.id
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-secondary hover:text-secondary-foreground"
                  )}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
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
        {activeTab === "deck" && <DeckBuilder onStartBattle={startBattle} playerState={playerState} />}
        {activeTab === "battle" && battleDeckIds.length > 0 && (
          <BattleArena playerDeckIds={battleDeckIds} onExit={() => setActiveTab("deck")} playerState={playerState} onStateChange={setPlayerState} isOnline={isOnline} submitBattleResultApi={submitBattleResult} />
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
