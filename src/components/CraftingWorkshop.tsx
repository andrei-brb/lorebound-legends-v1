import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, ArrowRight, Trash2 } from "lucide-react";
import { GoldCurrencyIcon } from "@/components/CurrencyIcons";
import { allCards, type Rarity } from "@/data/cards";
import { FUSION_RECIPES, performFusion, performSacrifice, canFuse, type FusionRecipe } from "@/lib/craftingEngine";
import type { PlayerState } from "@/lib/playerState";
import { toast } from "@/hooks/use-toast";
import { loadDailyQuests, progressQuest, saveDailyQuests } from "@/lib/questEngine";
import SacrificeAnimation from "./SacrificeAnimation";
import PackOpening from "./PackOpening";

interface CraftingWorkshopProps {
  playerState: PlayerState;
  onStateChange: (state: PlayerState) => void;
  isOnline?: boolean;
  craftFuseApi?: (inputRarity: string, selectedCardIds: string[]) => Promise<{ resultCardId: string } | null>;
  craftSacrificeApi?: (cardIds: string[]) => Promise<{ totalStardust: number } | null>;
}

type CraftMode = "fuse" | "sacrifice";

export default function CraftingWorkshop({ playerState, onStateChange, isOnline, craftFuseApi, craftSacrificeApi }: CraftingWorkshopProps) {
  const [mode, setMode] = useState<CraftMode>("fuse");
  const [selectedRecipe, setSelectedRecipe] = useState<FusionRecipe>(FUSION_RECIPES[0]);
  const [selectedCards, setSelectedCards] = useState<string[]>([]);
  const [resultCard, setResultCard] = useState<string | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [sacrificeAnim, setSacrificeAnim] = useState<{ cardIds: string[]; stardust: number } | null>(null);
  const [fuseReveal, setFuseReveal] = useState<{ cardIds: string[]; cardIsNew: boolean[] } | null>(null);

  const eligibleCards = playerState.ownedCardIds
    .filter(id => {
      const card = allCards.find(c => c.id === id);
      if (mode === "fuse") return card && card.rarity === selectedRecipe.inputRarity;
      return card && (card.type === "hero" || card.type === "god");
    })
    .filter(id => !selectedCards.includes(id));

  const toggleCard = (cardId: string) => {
    if (selectedCards.includes(cardId)) {
      setSelectedCards(selectedCards.filter(id => id !== cardId));
    } else {
      if (mode === "fuse" && selectedCards.length >= selectedRecipe.inputCount) return;
      setSelectedCards([...selectedCards, cardId]);
    }
  };

  const handleFuse = async () => {
    if (!canFuse(playerState, selectedRecipe, selectedCards)) return;
    setIsAnimating(true);
    await new Promise(r => setTimeout(r, 1500));

    if (isOnline && craftFuseApi) {
      const preOwned = new Set(playerState.ownedCardIds);
      const result = await craftFuseApi(selectedRecipe.inputRarity, selectedCards);
      if (result) {
        setResultCard(result.resultCardId);
        setFuseReveal({
          cardIds: [result.resultCardId],
          cardIsNew: [!preOwned.has(result.resultCardId)],
        });
        const qs = progressQuest(loadDailyQuests(), "craft_card"); saveDailyQuests(qs);
      } else {
        toast({ title: "Fusion failed", description: "Could not complete fusion. Try again.", variant: "destructive" });
      }
    } else {
      const result = performFusion(playerState, selectedRecipe, selectedCards);
      if (result) {
        const wasNew = !playerState.ownedCardIds.includes(result.resultCardId);
        onStateChange(result.playerState);
        setResultCard(result.resultCardId);
        setFuseReveal({ cardIds: [result.resultCardId], cardIsNew: [wasNew] });
        const qs = progressQuest(loadDailyQuests(), "craft_card"); saveDailyQuests(qs);
      }
    }
    setIsAnimating(false);
    setSelectedCards([]);
  };

  const handleSacrifice = async () => {
    if (selectedCards.length === 0) return;
    const sacrificedIds = [...selectedCards];
    setIsAnimating(true);

    if (isOnline && craftSacrificeApi) {
      const result = await craftSacrificeApi(selectedCards);
      if (result) {
        setSacrificeAnim({ cardIds: sacrificedIds, stardust: result.totalStardust });
        const qs = progressQuest(loadDailyQuests(), "craft_card"); saveDailyQuests(qs);
      } else {
        toast({ title: "Sacrifice failed", description: "Could not complete sacrifice. Try again.", variant: "destructive" });
      }
    } else {
      const result = performSacrifice(playerState, selectedCards);
      if (result) {
        onStateChange(result.playerState);
        setSacrificeAnim({ cardIds: sacrificedIds, stardust: result.totalStardust });
        const qs = progressQuest(loadDailyQuests(), "craft_card"); saveDailyQuests(qs);
      }
    }
    setIsAnimating(false);
    setSelectedCards([]);
    setResultCard(null);
  };

  const rarityLabel = (r: Rarity) => r.charAt(0).toUpperCase() + r.slice(1);

  return (
    <div>
      <div className="mb-6">
        <h2 className="font-heading text-2xl font-bold text-foreground">Crafting Workshop</h2>
        <p className="text-sm text-muted-foreground mt-1">Fuse cards into stronger ones or sacrifice for stardust</p>
      </div>

      {/* Mode Tabs */}
      <div className="flex gap-2 mb-6">
        <Button
          variant={mode === "fuse" ? "default" : "secondary"}
          onClick={() => { setMode("fuse"); setSelectedCards([]); setResultCard(null); }}
          className="font-heading"
        >
          <Sparkles className="w-4 h-4 mr-1" /> Fusion
        </Button>
        <Button
          variant={mode === "sacrifice" ? "default" : "secondary"}
          onClick={() => { setMode("sacrifice"); setSelectedCards([]); setResultCard(null); }}
          className="font-heading"
        >
          <Trash2 className="w-4 h-4 mr-1" /> Sacrifice
        </Button>
      </div>

      {mode === "fuse" && (
        <>
          {/* Recipe Selection */}
          <div className="flex gap-3 mb-6">
            {FUSION_RECIPES.map((recipe) => (
              <Card
                key={recipe.inputRarity}
                className={`cursor-pointer transition-all ${selectedRecipe === recipe ? "border-primary bg-primary/10" : "hover:border-muted-foreground/30"}`}
                onClick={() => { setSelectedRecipe(recipe); setSelectedCards([]); setResultCard(null); }}
              >
                <CardContent className="p-4 text-center">
                  <p className="font-heading font-bold text-sm text-foreground">
                    {recipe.inputCount}× {rarityLabel(recipe.inputRarity)}
                  </p>
                  <ArrowRight className="w-4 h-4 mx-auto my-1 text-muted-foreground" />
                  <p className="font-heading font-bold text-sm text-primary">
                    1× {rarityLabel(recipe.outputRarity)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2 flex items-center justify-center gap-1">
                    <GoldCurrencyIcon className="w-3.5 h-3.5" /> {recipe.goldCost}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Selected Cards Slots */}
          <div className="flex items-center gap-3 mb-6 justify-center">
            {Array.from({ length: selectedRecipe.inputCount }).map((_, i) => {
              const cardId = selectedCards[i];
              const card = cardId ? allCards.find(c => c.id === cardId) : null;
              return (
                <div
                  key={i}
                  className="w-24 h-32 rounded-lg border-2 border-dashed border-muted-foreground/30 flex items-center justify-center text-muted-foreground text-xs cursor-pointer hover:border-primary/50 transition-colors overflow-hidden"
                  onClick={() => cardId && toggleCard(cardId)}
                >
                  {card ? (
                    <div className="w-full h-full relative">
                      <img src={card.image} alt={card.name} className="w-full h-full object-cover rounded-md" />
                      <div className="absolute bottom-0 inset-x-0 bg-background/80 text-center text-[10px] font-heading py-0.5 truncate px-1">
                        {card.name}
                      </div>
                    </div>
                  ) : (
                    <span>Slot {i + 1}</span>
                  )}
                </div>
              );
            })}
            <ArrowRight className="w-6 h-6 text-primary" />
            <div className="w-24 h-32 rounded-lg border-2 border-primary/50 flex items-center justify-center text-primary text-xs bg-primary/5 overflow-hidden">
              {resultCard ? (
                <div className="w-full h-full relative">
                  <img src={allCards.find(c => c.id === resultCard)?.image} alt="" className="w-full h-full object-cover rounded-md" />
                  <div className="absolute bottom-0 inset-x-0 bg-background/80 text-center text-[10px] font-heading py-0.5 truncate px-1">
                    {allCards.find(c => c.id === resultCard)?.name}
                  </div>
                </div>
              ) : (
                <span className="font-heading">?</span>
              )}
            </div>
          </div>

          <div className="text-center mb-6">
            <Button
              onClick={handleFuse}
              disabled={selectedCards.length !== selectedRecipe.inputCount || playerState.gold < selectedRecipe.goldCost || isAnimating}
              className="font-heading px-8"
            >
              {isAnimating ? "Forging..." : `Fuse (${selectedRecipe.goldCost} Gold)`}
            </Button>
          </div>
        </>
      )}

      {mode === "sacrifice" && (
        <div className="text-center mb-6">
          <p className="text-sm text-muted-foreground mb-4">
            Select cards to sacrifice for stardust. {selectedCards.length > 0 && `${selectedCards.length} selected`}
          </p>
          <Button
            onClick={handleSacrifice}
            disabled={selectedCards.length === 0 || isAnimating}
            variant="destructive"
            className="font-heading px-8"
          >
            {isAnimating ? "Sacrificing..." : `Sacrifice ${selectedCards.length} card(s)`}
          </Button>
        </div>
      )}

      {/* Card Grid */}
      <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 gap-2">
        {eligibleCards.map((cardId) => {
          const card = allCards.find(c => c.id === cardId);
          if (!card) return null;
          const isSelected = selectedCards.includes(cardId);
          return (
            <div
              key={cardId}
              onClick={() => toggleCard(cardId)}
              className={`relative cursor-pointer rounded-lg overflow-hidden border-2 transition-all aspect-[3/4] ${
                isSelected ? "border-primary scale-95 ring-2 ring-primary/40" : "border-transparent hover:border-muted-foreground/30"
              }`}
            >
              <img src={card.image} alt={card.name} className="w-full h-full object-cover" />
              <div className="absolute bottom-0 inset-x-0 bg-background/80 text-center text-[9px] font-heading py-0.5 truncate px-1">
                {card.name}
              </div>
              {isSelected && (
                <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                  <span className="text-lg">✓</span>
                </div>
              )}
            </div>
          );
        })}
        {eligibleCards.length === 0 && (
          <div className="col-span-full text-center py-12 text-muted-foreground">
            <p>No eligible cards found</p>
          </div>
        )}
      </div>

      {/* Sacrifice Animation Overlay */}
      <AnimatePresence>
        {sacrificeAnim && (
          <SacrificeAnimation
            cardIds={sacrificeAnim.cardIds}
            totalStardust={sacrificeAnim.stardust}
            onComplete={() => setSacrificeAnim(null)}
          />
        )}
      </AnimatePresence>

      {/* Fusion Reveal Overlay */}
      <AnimatePresence>
        {fuseReveal && (
          <PackOpening
            cardIds={fuseReveal.cardIds}
            cardIsNew={fuseReveal.cardIsNew}
            onComplete={() => setFuseReveal(null)}
            playerState={playerState}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
