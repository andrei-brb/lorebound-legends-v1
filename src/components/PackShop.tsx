import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Gift, Clock, Coins, Sparkles } from "lucide-react";
import { PACK_DEFINITIONS, FREE_PACK_CARD_COUNT, canAffordPack, pullCards, type PackDefinition } from "@/lib/gachaEngine";
import { canClaimFreePack, freePackTimeRemaining, addCardToCollection, savePlayerState, type PlayerState } from "@/lib/playerState";
import PackOpening from "./PackOpening";
import { allGameCards } from "@/data/cardIndex";
import { loadDailyQuests, progressQuest, saveDailyQuests } from "@/lib/questEngine";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
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
  isOnline?: boolean;
  pullCardsApi?: (packId: string) => Promise<{
    pullResults: Array<{
      cardId: string; isDuplicate: boolean; stardustEarned: number; newGoldStar: boolean; newRedStar: boolean; rarity: string;
    }>; state: PlayerState;
  } | null>;
}

function formatTime(ms: number): string {
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${hours}h ${minutes}m ${seconds}s`;
}

export default function PackShop({ playerState, onStateChange, isOnline, pullCardsApi }: PackShopProps) {
  const [openingPack, setOpeningPack] = useState<{ cardIds: string[] } | null>(null);
  const [freeTimer, setFreeTimer] = useState(freePackTimeRemaining(playerState));
  const [confirmPack, setConfirmPack] = useState<PackDefinition | null>(null);

  useEffect(() => {
    const interval = setInterval(() => { setFreeTimer(freePackTimeRemaining(playerState)); }, 1000);
    return () => clearInterval(interval);
  }, [playerState.lastFreePackTime]);

  const trackPackQuests = (isFree: boolean) => {
    let questState = loadDailyQuests();
    questState = progressQuest(questState, "pull_packs");
    if (isFree) questState = progressQuest(questState, "open_free_pack");
    saveDailyQuests(questState);
  };

  const buyPack = async (pack: PackDefinition) => {
    if (!canAffordPack(playerState.gold, pack)) return;
    if (isOnline && pullCardsApi) {
      const result = await pullCardsApi(pack.id);
      if (result) { onStateChange(result.state); setOpeningPack({ cardIds: result.pullResults.map((r) => r.cardId) }); trackPackQuests(false); }
      return;
    }
    const { cardIds, newPityCounter } = pullCards(pack, playerState);
    const newState = { ...playerState, gold: playerState.gold - pack.cost, pityCounter: newPityCounter, totalPulls: playerState.totalPulls + pack.cardCount };
    onStateChange(newState);
    setOpeningPack({ cardIds });
    trackPackQuests(false);
  };

  const handleBuyClick = (pack: PackDefinition) => {
    if (pack.id !== "bronze") { setConfirmPack(pack); } else { buyPack(pack); }
  };

  const claimFreePack = async () => {
    if (!canClaimFreePack(playerState)) return;
    if (isOnline && pullCardsApi) {
      const result = await pullCardsApi("free");
      if (result) { onStateChange(result.state); setOpeningPack({ cardIds: result.pullResults.map((r) => r.cardId) }); trackPackQuests(true); }
      return;
    }
    const freePack: PackDefinition = { ...PACK_DEFINITIONS[0], cardCount: FREE_PACK_CARD_COUNT };
    const { cardIds, newPityCounter } = pullCards(freePack, playerState);
    const newState = { ...playerState, lastFreePackTime: Date.now(), pityCounter: newPityCounter, totalPulls: playerState.totalPulls + FREE_PACK_CARD_COUNT };
    onStateChange(newState);
    setOpeningPack({ cardIds });
    trackPackQuests(true);
  };

  const handlePackOpeningComplete = (cardIds: string[]) => {
    if (isOnline) { setOpeningPack(null); return; }
    let state = { ...playerState, cardProgress: { ...playerState.cardProgress }, ownedCardIds: [...playerState.ownedCardIds] };
    for (const id of cardIds) { const result = addCardToCollection(state, id); state = result.state; }
    onStateChange(state);
    savePlayerState(state);
    setOpeningPack(null);
  };

  const isFreeAvailable = canClaimFreePack(playerState);
  const pityProgress = Math.round((playerState.pityCounter / 30) * 100);

  return (
    <TooltipProvider>
      <div className="space-y-8">
        {openingPack && (
          <PackOpening cardIds={openingPack.cardIds} onComplete={handlePackOpeningComplete} playerState={playerState} />
        )}

        {/* Confirm dialog for premium packs */}
        <AlertDialog open={!!confirmPack} onOpenChange={(open) => !open && setConfirmPack(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="font-heading">Purchase {confirmPack?.name}?</AlertDialogTitle>
              <AlertDialogDescription>
                This will spend <strong className="text-[hsl(var(--legendary))]">{confirmPack?.cost} Gold</strong> from your balance.
                You currently have <strong>{playerState.gold} Gold</strong>.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => { if (confirmPack) buyPack(confirmPack); setConfirmPack(null); }}>
                Buy Pack
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <div>
          <h2 className="font-heading text-2xl font-bold text-foreground mb-2">✦ Summon Cards</h2>
          <p className="text-sm text-muted-foreground">Open packs to expand your collection. Duplicates earn ⭐ stars & 💎 stardust!</p>
        </div>

        {/* Stats Bar */}
        <Card className="bg-card/50 border-border">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-6 divide-x divide-border">
              <div className="flex items-center gap-2">
                <Coins className="w-4 h-4 text-[hsl(var(--legendary))]" />
                <span className="font-heading font-bold text-foreground">{Number(playerState.gold) || 0}</span>
                <span className="text-xs text-muted-foreground">Gold</span>
              </div>
              <div className="flex items-center gap-2 pl-6">
                <span className="text-sm">💎</span>
                <span className="font-heading font-bold text-foreground">{Number(playerState.stardust) || 0}</span>
                <span className="text-xs text-muted-foreground">Stardust</span>
              </div>
              <div className="flex items-center gap-2 pl-6">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-2 cursor-help">
                      <Sparkles className="w-4 h-4 text-primary" />
                      <span className="text-xs text-muted-foreground">Pity</span>
                      <div className="w-20">
                        <Progress value={pityProgress} className="h-2 bg-secondary" />
                      </div>
                      <span className="text-xs font-bold text-foreground">{playerState.pityCounter}/30</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">After 30 pulls without a Legendary, your next pull is guaranteed Legendary!</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <div className="flex items-center gap-2 pl-6">
                <span className="text-xs text-muted-foreground">Cards: {playerState.ownedCardIds.length}/{allGameCards.length}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Free Daily Pack */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-primary/20 to-[hsl(var(--legendary))]/10 border border-primary/30 rounded-xl p-5"
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
                className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-heading font-bold text-sm hover:brightness-110 transition-all hover:scale-105 active:scale-95 animate-glow-pulse"
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
            const isGold = pack.id === "gold";
            return (
              <motion.div
                key={pack.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="relative group"
              >
                {isGold && (
                  <Badge className="absolute -top-2 -right-2 z-20 bg-[hsl(var(--legendary))] text-primary-foreground text-[10px] font-heading">
                    BEST VALUE
                  </Badge>
                )}
                <div className={`bg-card border rounded-xl overflow-hidden transition-all pack-shimmer-hover ${isGold ? "border-[hsl(var(--legendary))]/40 hover:border-[hsl(var(--legendary))]/70" : "border-border hover:border-primary/50"}`}>
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
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px]">
                        <span className="text-[hsl(var(--legendary))]">Legendary: {pack.rates.legendary}%</span>
                        <span className="text-[hsl(var(--rare))]">Rare: {pack.rates.rare}%</span>
                        <span className="text-muted-foreground">Common: {pack.rates.common}%</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{pack.cardCount} cards</span>
                    </div>
                    <button
                      onClick={() => handleBuyClick(pack)}
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
    </TooltipProvider>
  );
}
