import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles, Flame, Plus, X, ChevronDown, Filter, ArrowRight } from "lucide-react";
import type { PlayerState } from "@/lib/playerState";
import GlassPanel from "@/components/scene/GlassPanel";
import GameCard from "@/components/GameCard";
import { allGameCards } from "@/data/cardIndex";
import { allCards } from "@/data/cards";
import type { Rarity } from "@/data/cards";
import {
  FUSION_RECIPES,
  canFuse,
  performFusion,
  performSacrifice,
  SACRIFICE_STARDUST,
} from "@/lib/craftingEngine";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/hooks/use-toast";
import { loadDailyQuests, progressQuest, saveDailyQuests } from "@/lib/questEngine";
import SacrificeAnimation from "@/components/SacrificeAnimation";
import PackOpening from "@/components/PackOpening";
import { GoldCurrencyIcon } from "@/components/CurrencyIcons";

interface Props {
  playerState: PlayerState;
  onStateChange: (s: PlayerState) => void;
  isOnline?: boolean;
  craftFuseApi?: (inputRarity: string, selectedCardIds: string[]) => Promise<{ resultCardId: string } | null>;
  craftSacrificeApi?: (cardIds: string[]) => Promise<{ totalStardust: number } | null>;
}

type Mode = "fuse" | "sacrifice";
type RarityFilter = "all" | Rarity;

const RARITY_HUE: Record<Rarity, string> = {
  common: "var(--muted-foreground)",
  rare: "var(--rare)",
  legendary: "var(--legendary)",
};

const RARITIES: RarityFilter[] = ["all", "common", "rare", "legendary"];

const NEXT_RARITY: Record<Rarity, Rarity> = {
  common: "rare",
  rare: "legendary",
  legendary: "legendary",
};

const FORGE_ACCENT = "var(--primary)";

export default function WorkshopHall({
  playerState,
  onStateChange,
  isOnline,
  craftFuseApi,
  craftSacrificeApi,
}: Props) {
  const [mode, setMode] = useState<Mode>("fuse");
  const [rarityFilter, setRarityFilter] = useState<RarityFilter>("all");
  const [slots, setSlots] = useState<(string | null)[]>([null, null, null]);
  const [isAnimating, setIsAnimating] = useState(false);
  const [sacrificeAnim, setSacrificeAnim] = useState<{ cardIds: string[]; stardust: number } | null>(null);
  const [fuseReveal, setFuseReveal] = useState<{ cardIds: string[]; cardIsNew: boolean[] } | null>(null);

  const owned = useMemo(
    () =>
      playerState.ownedCardIds
        .map((id) => allGameCards.find((c) => c.id === id))
        .filter(Boolean) as typeof allGameCards,
    [playerState.ownedCardIds],
  );

  const filledSlots = slots.filter((s): s is string => s !== null);

  const fuseRecipe = useMemo(() => {
    if (mode !== "fuse" || filledSlots.length !== 3) return null;
    const cards = filledSlots.map((id) => allCards.find((c) => c.id === id)).filter(Boolean);
    if (cards.length !== 3) return null;
    const r = cards[0]!.rarity;
    if (!cards.every((c) => c.rarity === r)) return null;
    return FUSION_RECIPES.find((rec) => rec.inputRarity === r) ?? null;
  }, [mode, filledSlots]);

  const fuseCanSubmit = fuseRecipe != null && canFuse(playerState, fuseRecipe, filledSlots);

  const stardustPreview = useMemo(() => {
    if (mode !== "sacrifice" || filledSlots.length === 0) return 0;
    return filledSlots.reduce((sum, id) => {
      const c = allCards.find((x) => x.id === id);
      if (!c || (c.type !== "hero" && c.type !== "god")) return sum;
      return sum + SACRIFICE_STARDUST[c.rarity];
    }, 0);
  }, [mode, filledSlots]);

  const sacrificeCanSubmit =
    mode === "sacrifice" &&
    filledSlots.length > 0 &&
    filledSlots.every((id) => {
      const c = allCards.find((x) => x.id === id);
      return c && (c.type === "hero" || c.type === "god");
    });

  const filtered = useMemo(() => {
    const base = owned.filter(
      (c) => (rarityFilter === "all" || c.rarity === rarityFilter) && !slots.includes(c.id),
    );
    if (mode === "fuse") {
      return base.filter((c) => FUSION_RECIPES.some((r) => r.inputRarity === c.rarity));
    }
    return base.filter((c) => c.type === "hero" || c.type === "god");
  }, [owned, rarityFilter, slots, mode]);

  const resultRarity: Rarity | null = useMemo(() => {
    if (mode === "sacrifice") return null;
    if (filledSlots.length === 0) return null;
    const cards = filledSlots.map((id) => allGameCards.find((c) => c.id === id)!).filter(Boolean);
    const r = cards[0]?.rarity;
    const sameRarity = cards.every((c) => c.rarity === r);
    return sameRarity && r ? NEXT_RARITY[r] : null;
  }, [filledSlots, mode]);

  const placeInSlot = (cardId: string) => {
    const idx = slots.findIndex((s) => s === null);
    if (idx === -1) return;
    setSlots((s) => s.map((v, i) => (i === idx ? cardId : v)));
  };

  const removeFromSlot = (idx: number) => {
    setSlots((s) => s.map((v, i) => (i === idx ? null : v)));
  };

  const clearAll = () => setSlots([null, null, null]);

  const outputHue = resultRarity ? RARITY_HUE[resultRarity] : FORGE_ACCENT;

  const handleForge = async () => {
    if (!fuseRecipe || !fuseCanSubmit) {
      toast({
        title: "Cannot forge",
        description: "Need 3 same-rarity cards (common or rare), enough gold, and a valid recipe.",
        variant: "destructive",
      });
      return;
    }
    const selected = [...filledSlots] as [string, string, string];
    setIsAnimating(true);
    await new Promise((r) => setTimeout(r, 800));

    if (isOnline && craftFuseApi) {
      const preOwned = new Set(playerState.ownedCardIds);
      const result = await craftFuseApi(fuseRecipe.inputRarity, selected);
      if (result) {
        setFuseReveal({
          cardIds: [result.resultCardId],
          cardIsNew: [!preOwned.has(result.resultCardId)],
        });
        const qs = progressQuest(loadDailyQuests(), "craft_card");
        saveDailyQuests(qs);
      } else {
        toast({ title: "Fusion failed", description: "Could not complete fusion. Try again.", variant: "destructive" });
      }
    } else {
      const result = performFusion(playerState, fuseRecipe, selected);
      if (result) {
        const wasNew = !playerState.ownedCardIds.includes(result.resultCardId);
        onStateChange(result.playerState);
        setFuseReveal({ cardIds: [result.resultCardId], cardIsNew: [wasNew] });
        const qs = progressQuest(loadDailyQuests(), "craft_card");
        saveDailyQuests(qs);
      } else {
        toast({ title: "Fusion failed", description: "Check your gold and card selection.", variant: "destructive" });
      }
    }
    setIsAnimating(false);
    clearAll();
  };

  const handleSacrifice = async () => {
    if (!sacrificeCanSubmit) {
      toast({
        title: "Cannot sacrifice",
        description: "Select at least one hero or god card.",
        variant: "destructive",
      });
      return;
    }
    const sacrificedIds = filledSlots.filter(Boolean) as string[];
    setIsAnimating(true);

    if (isOnline && craftSacrificeApi) {
      const result = await craftSacrificeApi(sacrificedIds);
      if (result) {
        setSacrificeAnim({ cardIds: sacrificedIds, stardust: result.totalStardust });
        const qs = progressQuest(loadDailyQuests(), "craft_card");
        saveDailyQuests(qs);
      } else {
        toast({ title: "Sacrifice failed", description: "Could not complete sacrifice. Try again.", variant: "destructive" });
      }
    } else {
      const result = performSacrifice(playerState, sacrificedIds);
      if (result) {
        onStateChange(result.playerState);
        setSacrificeAnim({ cardIds: sacrificedIds, stardust: result.totalStardust });
        const qs = progressQuest(loadDailyQuests(), "craft_card");
        saveDailyQuests(qs);
      } else {
        toast({ title: "Sacrifice failed", description: "Invalid selection.", variant: "destructive" });
      }
    }
    setIsAnimating(false);
    clearAll();
  };

  const ready = mode === "fuse" ? fuseCanSubmit : sacrificeCanSubmit;
  const slotsFull = filledSlots.length >= 3;

  return (
    <div className="px-4 sm:px-6 py-6 max-w-4xl mx-auto">
      <GlassPanel hue={FORGE_ACCENT} glow={0.4} padding="lg">
        <div className="flex justify-center mb-6">
          <div className="inline-flex p-1 rounded-full bg-background/40 ring-1 ring-foreground/10">
            {(["fuse", "sacrifice"] as const).map((m) => {
              const active = mode === m;
              const Icon = m === "fuse" ? Sparkles : Flame;
              const hue = m === "fuse" ? FORGE_ACCENT : "var(--destructive)";
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    setMode(m);
                    clearAll();
                  }}
                  className={cn(
                    "relative px-5 py-2 rounded-full flex items-center gap-2 text-xs font-heading uppercase tracking-wider transition-all",
                    active ? "text-background" : "text-muted-foreground hover:text-foreground",
                  )}
                  style={
                    active
                      ? {
                          background: `linear-gradient(135deg, hsl(${hue}), hsl(${hue} / 0.7))`,
                          boxShadow: `0 0 16px hsl(${hue} / 0.5)`,
                        }
                      : undefined
                  }
                >
                  <Icon className="w-3.5 h-3.5" />
                  {m}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-center gap-3 sm:gap-5 mb-6 flex-wrap">
          {slots.map((cardId, i) => {
            const card = cardId ? allGameCards.find((c) => c.id === cardId) : null;
            return (
              <motion.button
                key={i}
                type="button"
                onClick={() => card && removeFromSlot(i)}
                whileHover={card ? { y: -2 } : undefined}
                className="relative group"
                style={{ width: 96, height: 134 }}
              >
                <AnimatePresence mode="wait">
                  {card ? (
                    <motion.div
                      key={card.id}
                      initial={{ scale: 0.7, opacity: 0, rotate: -8 }}
                      animate={{ scale: 1, opacity: 1, rotate: 0 }}
                      exit={{ scale: 0.7, opacity: 0, rotate: 8 }}
                      transition={{ type: "spring", stiffness: 240, damping: 20 }}
                      className="absolute inset-0 flex items-center justify-center"
                    >
                      <div className="origin-center scale-[0.42]">
                        <GameCard card={card} size="md" />
                      </div>
                      <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-background ring-1 ring-foreground/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10">
                        <X className="w-3 h-3 text-foreground/80" />
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="empty"
                      className="absolute inset-0 rounded-xl flex items-center justify-center"
                      style={{
                        border: "1px dashed hsl(var(--muted-foreground) / 0.3)",
                        background: "hsl(var(--card) / 0.2)",
                      }}
                    >
                      <Plus className="w-4 h-4 text-muted-foreground/50" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.button>
            );
          })}

          <ArrowRight
            className="w-5 h-5 shrink-0 transition-opacity"
            style={{ color: `hsl(${outputHue})`, opacity: mode === "fuse" ? (fuseCanSubmit ? 1 : 0.3) : filledSlots.length > 0 ? 1 : 0.3 }}
          />

          <div
            className="relative rounded-xl flex items-center justify-center overflow-hidden"
            style={{
              width: 96,
              height: 134,
              border: `1px solid hsl(${outputHue} / ${ready ? 0.6 : 0.25})`,
              background: ready
                ? `radial-gradient(circle at 50% 40%, hsl(${outputHue} / 0.25), transparent 70%)`
                : "hsl(var(--card) / 0.2)",
              boxShadow: ready ? `0 0 24px hsl(${outputHue} / 0.5)` : undefined,
            }}
          >
            {mode === "fuse" ? (
              <motion.div
                animate={fuseCanSubmit ? { scale: [1, 1.1, 1], rotate: [0, 4, 0] } : {}}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              >
                <Sparkles
                  className="w-6 h-6"
                  style={{ color: `hsl(${outputHue})`, opacity: fuseCanSubmit ? 1 : 0.4 }}
                />
              </motion.div>
            ) : (
              <Flame
                className="w-6 h-6"
                style={{ color: `hsl(var(--rare))`, opacity: filledSlots.length > 0 ? 1 : 0.4 }}
              />
            )}
            {mode === "fuse" && fuseCanSubmit && resultRarity && (
              <span
                className="absolute bottom-1 inset-x-0 text-center text-[9px] font-heading uppercase tracking-wider"
                style={{ color: `hsl(${outputHue})` }}
              >
                {resultRarity}
              </span>
            )}
            {mode === "fuse" && fuseRecipe && (
              <span className="absolute top-1 inset-x-0 text-center text-[9px] font-heading text-muted-foreground flex items-center justify-center gap-0.5">
                <GoldCurrencyIcon className="w-3 h-3" />
                {fuseRecipe.goldCost}
              </span>
            )}
            {mode === "sacrifice" && filledSlots.length > 0 && (
              <span className="absolute bottom-1 inset-x-0 text-center text-[9px] font-heading uppercase tracking-wider text-[hsl(var(--rare))]">
                +{stardustPreview}
              </span>
            )}
          </div>
        </div>

        <div className="flex justify-center mb-6">
          <button
            type="button"
            disabled={mode === "fuse" ? !fuseCanSubmit || isAnimating : !sacrificeCanSubmit || isAnimating}
            onClick={mode === "fuse" ? () => void handleForge() : () => void handleSacrifice()}
            className="px-8 py-2.5 rounded-full font-heading text-xs uppercase tracking-widest text-background disabled:opacity-30 disabled:cursor-not-allowed transition-all inline-flex items-center justify-center gap-2"
            style={{
              background: `linear-gradient(135deg, hsl(${outputHue}), hsl(var(--legendary)))`,
              boxShadow: ready || filledSlots.length > 0 ? `0 0 20px hsl(${outputHue} / 0.4)` : undefined,
            }}
          >
            {isAnimating ? (mode === "fuse" ? "Forging…" : "Sacrificing…") : mode === "fuse" ? (
              <>
                Forge
                {fuseRecipe && (
                  <span className="inline-flex items-center gap-1 opacity-90">
                    (<GoldCurrencyIcon className="w-3.5 h-3.5" />
                    {fuseRecipe.goldCost})
                  </span>
                )}
              </>
            ) : (
              "Sacrifice"
            )}
          </button>
        </div>

        <div className="flex items-center justify-between mb-3 px-1">
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
            {filtered.length} cards
          </span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-all"
              >
                <Filter className="w-3 h-3" />
                {rarityFilter}
                <ChevronDown className="w-3 h-3" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[140px]">
              {RARITIES.map((r) => (
                <DropdownMenuItem
                  key={r}
                  onClick={() => setRarityFilter(r)}
                  className="text-xs capitalize flex items-center gap-2"
                >
                  {r !== "all" && (
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: `hsl(${RARITY_HUE[r as Rarity]})` }}
                    />
                  )}
                  {r}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {filtered.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-12">no cards available</p>
        ) : (
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-y-1 justify-items-center">
            {filtered.slice(0, 60).map((c) => (
              <motion.button
                key={c.id}
                type="button"
                onClick={() => !slotsFull && placeInSlot(c.id)}
                disabled={slotsFull}
                whileHover={!slotsFull ? { y: -4, scale: 1.05 } : undefined}
                whileTap={!slotsFull ? { scale: 0.95 } : undefined}
                className={cn(
                  "relative transition-opacity",
                  slotsFull && "opacity-40 cursor-not-allowed",
                )}
                style={{ width: 80, height: 112 }}
              >
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="origin-center scale-[0.35]">
                    <GameCard card={c} size="md" />
                  </div>
                </div>
              </motion.button>
            ))}
          </div>
        )}
      </GlassPanel>

      <AnimatePresence>
        {sacrificeAnim && (
          <SacrificeAnimation
            cardIds={sacrificeAnim.cardIds}
            totalStardust={sacrificeAnim.stardust}
            onComplete={() => setSacrificeAnim(null)}
          />
        )}
      </AnimatePresence>

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
