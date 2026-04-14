import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Gift, Clock, Coins, Sparkles } from "lucide-react";
import { PACK_DEFINITIONS, FREE_PACK_CARD_COUNT, canAffordPack, pullCards, type PackDefinition } from "@/lib/gachaEngine";
import { canClaimFreePack, freePackTimeRemaining, addCardToCollection, savePlayerState, type PlayerState } from "@/lib/playerState";
import PackOpening from "./PackOpening";
import { allCards } from "@/data/cards";
import bronzePackImg from "@/assets/packs/bronze-pack.jpg";
import silverPackImg from "@/assets/packs/silver-pack.jpg";
import goldPackImg from "@/assets/packs/gold-pack.jpg";

const packImages: Record<string, string> = {
  bronze: bronzePackImg,
  silver: silverPackImg,
  gold: goldPackImg,
};

interface PackShopProps {
  playerState: PlayerState;
  onStateChange: (state: PlayerState) => void;
}

function formatTime(ms: number): string {
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${hours}h ${minutes}m ${seconds}s`;
}

export default function PackShop({ playerState, onStateChange }: PackShopProps) {
  const [openingPack, setOpeningPack] = useState<{ cardIds: string[] } | null>(null);
  const [freeTimer, setFreeTimer] = useState(freePackTimeRemaining(playerState));

  useEffect(() => {
    const interval = setInterval(() => {
      setFreeTimer(freePackTimeRemaining(playerState));
    }, 1000);
    return () => clearInterval(interval);
  }, [playerState.lastFreePackTime]);

  const buyPack = (pack: PackDefinition) => {
    if (!canAffordPack(playerState.gold, pack)) return;
    const { cardIds, newPityCounter } = pullCards(pack, playerState);
    const newState = {
      ...playerState,
      gold: playerState.gold - pack.cost,
      pityCounter: newPityCounter,
      totalPulls: playerState.totalPulls + pack.cardCount,
    };
    onStateChange(newState);
    setOpeningPack({ cardIds });
  };

  const claimFreePack = () => {
    if (!canClaimFreePack(playerState)) return;
    const freePack: PackDefinition = { ...PACK_DEFINITIONS[0], cardCount: FREE_PACK_CARD_COUNT };
    const { cardIds, newPityCounter } = pullCards(freePack, playerState);
    const newState = {
      ...playerState,
      lastFreePackTime: Date.now(),
      pityCounter: newPityCounter,
      totalPulls: playerState.totalPulls + FREE_PACK_CARD_COUNT,
    };
    onStateChange(newState);
    setOpeningPack({ cardIds });
  };

  const handlePackOpeningComplete = (cardIds: string[]) => {
    let state = { ...playerState, cardProgress: { ...playerState.cardProgress }, ownedCardIds: [...playerState.ownedCardIds] };
    let totalStardust = 0;
    for (const id of cardIds) {
      const result = addCardToCollection(state, id);
      state = result.state;
      totalStardust += result.stardustEarned;
    }
    onStateChange(state);
    savePlayerState(state);
    setOpeningPack(null);
  };

  const isFreeAvailable = canClaimFreePack(playerState);
  const pityProgress = Math.round((playerState.pityCounter / 30) * 100);

  return (
    <div className="space-y-8">
      {openingPack && (
        <PackOpening
          cardIds={openingPack.cardIds}
          onComplete={handlePackOpeningComplete}
          playerState={playerState}
        />
      )}

      <div>
        <h2 className="font-heading text-2xl font-bold text-foreground mb-2">✦ Summon Cards</h2>
        <p className="text-sm text-muted-foreground">Open packs to expand your collection. Duplicates earn ⭐ stars & 💎 stardust!</p>
      </div>

      {/* Stats Bar */}
      <div className="flex flex-wrap gap-4">
        <div className="flex items-center gap-2 bg-card border border-border rounded-xl px-4 py-2.5">
          <Coins className="w-4 h-4 text-legendary" />
          <span className="font-heading font-bold text-foreground">{playerState.gold}</span>
          <span className="text-xs text-muted-foreground">Gold</span>
        </div>
        <div className="flex items-center gap-2 bg-card border border-border rounded-xl px-4 py-2.5">
          <span className="text-sm">💎</span>
          <span className="font-heading font-bold text-foreground">{playerState.stardust || 0}</span>
          <span className="text-xs text-muted-foreground">Stardust</span>
        </div>
        <div className="flex items-center gap-2 bg-card border border-border rounded-xl px-4 py-2.5">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-xs text-muted-foreground">Pity: {playerState.pityCounter}/30</span>
          <div className="w-16 h-1.5 bg-secondary rounded-full overflow-hidden">
            <div className="h-full bg-legendary rounded-full transition-all" style={{ width: `${pityProgress}%` }} />
          </div>
        </div>
        <div className="flex items-center gap-2 bg-card border border-border rounded-xl px-4 py-2.5">
          <span className="text-xs text-muted-foreground">Cards: {playerState.ownedCardIds.length}/{allCards.length}</span>
        </div>
      </div>

      {/* Free Daily Pack */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-primary/20 to-legendary/10 border border-primary/30 rounded-xl p-5"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
              <Gift className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-foreground">Daily Free Pack</h3>
              <p className="text-xs text-muted-foreground">One free Bronze pack every 24 hours</p>
            </div>
          </div>
          {isFreeAvailable ? (
            <button
              onClick={claimFreePack}
              className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-heading font-bold text-sm hover:brightness-110 transition-all hover:scale-105 active:scale-95 animate-pulse"
            >
              Claim!
            </button>
          ) : (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span className="text-sm font-heading">{formatTime(freeTimer)}</span>
            </div>
          )}
        </div>
      </motion.div>

      {/* Pack Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {PACK_DEFINITIONS.map((pack, i) => {
          const affordable = canAffordPack(playerState.gold, pack);
          return (
            <motion.div
              key={pack.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="relative group"
            >
              <div className="bg-card border border-border rounded-xl overflow-hidden hover:border-primary/50 transition-all">
                {/* Pack Visual */}
                <div className="h-40 relative overflow-hidden">
                  <img src={packImages[pack.id]} alt={pack.name} className="w-full h-full object-cover" loading="lazy" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <div className="absolute bottom-3 left-0 right-0 text-center">
                    <span className="font-heading font-bold text-white text-lg drop-shadow-lg">{pack.name}</span>
                  </div>
                </div>

                <div className="p-4 space-y-3">
                  <p className="text-xs text-muted-foreground">{pack.description}</p>

                  {/* Rates */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px]">
                      <span className="text-legendary">Legendary: {pack.rates.legendary}%</span>
                      <span className="text-rare">Rare: {pack.rates.rare}%</span>
                      <span className="text-common">Common: {pack.rates.common}%</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{pack.cardCount} cards</span>
                  </div>

                  <button
                    onClick={() => buyPack(pack)}
                    disabled={!affordable}
                    className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-heading font-bold text-sm transition-all ${
                      affordable
                        ? "bg-primary text-primary-foreground hover:brightness-110 hover:scale-[1.02] active:scale-95"
                        : "bg-secondary text-muted-foreground cursor-not-allowed"
                    }`}
                  >
                    <Coins className="w-4 h-4" />
                    {pack.cost} Gold
                  </button>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
