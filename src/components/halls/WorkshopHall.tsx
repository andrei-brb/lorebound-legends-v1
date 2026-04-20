import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Flame, Plus, X, ChevronDown, Filter, ArrowRight } from "lucide-react";
import type { PlayerState } from "@/lib/playerState";
import GlassPanel from "@/components/scene/GlassPanel";
import GameCard from "@/components/GameCard";
import PackOpening from "@/components/PackOpening";
import SacrificeAnimation from "@/components/SacrificeAnimation";
import { allGameCards } from "@/data/cardIndex";
import type { Rarity } from "@/data/cards";
import { cn } from "@/lib/utils";
import { texForge } from "@/components/scene/panelTextures";
import {
  FUSION_RECIPES,
  SACRIFICE_STARDUST,
  canFuse,
  performFusion,
  performSacrifice,
  type FusionRecipe,
} from "@/lib/craftingEngine";
import { loadDailyQuests, progressQuest, saveDailyQuests } from "@/lib/questEngine";
import { toast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Props {
  playerState: PlayerState;
  onStateChange: (s: PlayerState) => void;
  isOnline: boolean;
  craftFuse: (inputRarity: string, selectedCardIds: string[]) => Promise<{ resultCardId: string } | null>;
  craftSacrifice: (cardIds: string[]) => Promise<{ totalStardust: number } | null>;
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

export default function WorkshopHall({
  playerState,
  onStateChange,
  isOnline,
  craftFuse,
  craftSacrifice,
}: Props) {
  const [mode, setMode] = useState<Mode>("fuse");
  const [rarityFilter, setRarityFilter] = useState<RarityFilter>("all");
  const [slots, setSlots] = useState<(string | null)[]>([null, null, null]);
  const [working, setWorking] = useState(false);
  const [fuseReveal, setFuseReveal] = useState<{ cardIds: string[]; cardIsNew: boolean[] } | null>(null);
  const [sacrificeAnim, setSacrificeAnim] = useState<{ cardIds: string[]; stardust: number } | null>(null);

  const owned = useMemo(
    () =>
      playerState.ownedCardIds
        .map((id) => allGameCards.find((c) => c.id === id))
        .filter(Boolean) as typeof allGameCards,
    [playerState.ownedCardIds]
  );

  const filtered = useMemo(
    () =>
      owned.filter(
        (c) =>
          (rarityFilter === "all" || c.rarity === rarityFilter) && !slots.includes(c.id)
      ),
    [owned, rarityFilter, slots]
  );

  const filledSlots = slots.filter((s): s is string => s !== null);
  const ready = filledSlots.length === 3;

  const activeFuseRecipe = useMemo((): FusionRecipe | null => {
    if (mode !== "fuse" || filledSlots.length !== 3) return null;
    const cards = filledSlots
      .map((id) => allGameCards.find((c) => c.id === id))
      .filter(Boolean) as typeof allGameCards;
    if (cards.length !== 3) return null;
    const r = cards[0].rarity;
    if (!cards.every((c) => c.rarity === r)) return null;
    return FUSION_RECIPES.find((rec) => rec.inputRarity === r) ?? null;
  }, [mode, filledSlots]);

  const fuseAllowed =
    !!activeFuseRecipe && canFuse(playerState, activeFuseRecipe, filledSlots);

  const sacrificePreview = useMemo(() => {
    if (mode !== "sacrifice") return 0;
    return filledSlots.reduce((sum, id) => {
      const c = allGameCards.find((x) => x.id === id);
      return sum + (c ? SACRIFICE_STARDUST[c.rarity] : 0);
    }, 0);
  }, [mode, filledSlots]);

  // Result preview: in fuse mode, show predicted next-rarity hint
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

  const handleFuse = async () => {
    if (!activeFuseRecipe || !fuseAllowed || working) return;
    const ids = [...filledSlots];
    setWorking(true);
    try {
      if (isOnline) {
        const preOwned = new Set(playerState.ownedCardIds);
        const result = await craftFuse(activeFuseRecipe.inputRarity, ids);
        if (result) {
          clearAll();
          setFuseReveal({
            cardIds: [result.resultCardId],
            cardIsNew: [!preOwned.has(result.resultCardId)],
          });
          const qs = progressQuest(loadDailyQuests(), "craft_card");
          saveDailyQuests(qs);
        } else {
          toast({
            title: "Fusion failed",
            description: "Could not complete fusion. Check gold and card eligibility, then try again.",
            variant: "destructive",
          });
        }
      } else {
        const result = performFusion(playerState, activeFuseRecipe, ids);
        if (result) {
          const wasNew = !playerState.ownedCardIds.includes(result.resultCardId);
          onStateChange(result.playerState);
          clearAll();
          setFuseReveal({ cardIds: [result.resultCardId], cardIsNew: [wasNew] });
          const qs = progressQuest(loadDailyQuests(), "craft_card");
          saveDailyQuests(qs);
        } else {
          toast({
            title: "Cannot fuse",
            description: "Need three same-rarity cards (common or rare) and enough gold.",
            variant: "destructive",
          });
        }
      }
    } finally {
      setWorking(false);
    }
  };

  const handleSacrifice = async () => {
    if (filledSlots.length === 0 || working) return;
    const ids = [...filledSlots];
    setWorking(true);
    try {
      if (isOnline) {
        const result = await craftSacrifice(ids);
        if (result) {
          setSacrificeAnim({ cardIds: ids, stardust: result.totalStardust });
          clearAll();
          const qs = progressQuest(loadDailyQuests(), "craft_card");
          saveDailyQuests(qs);
        } else {
          toast({
            title: "Sacrifice failed",
            description: "Could not complete sacrifice. Try again.",
            variant: "destructive",
          });
        }
      } else {
        const result = performSacrifice(playerState, ids);
        if (result) {
          onStateChange(result.playerState);
          setSacrificeAnim({ cardIds: ids, stardust: result.totalStardust });
          clearAll();
          const qs = progressQuest(loadDailyQuests(), "craft_card");
          saveDailyQuests(qs);
        } else {
          toast({
            title: "Cannot sacrifice",
            description: "Those cards could not be sacrificed (unsupported or not owned).",
            variant: "destructive",
          });
        }
      }
    } finally {
      setWorking(false);
    }
  };

  const outputHue = resultRarity ? RARITY_HUE[resultRarity] : "var(--epic)";

  return (
    <div className="px-4 sm:px-6 py-6 max-w-4xl mx-auto">
      <GlassPanel hue="var(--epic)" glow={0.4} padding="lg" bg={texForge} bgTint={0.7}>
        {/* Mode toggle — top center */}
        <div className="flex justify-center mb-6">
          <div className="inline-flex p-1 rounded-full bg-background/40 ring-1 ring-foreground/10">
            {(["fuse", "sacrifice"] as const).map((m) => {
              const active = mode === m;
              const Icon = m === "fuse" ? Sparkles : Flame;
              const hue = m === "fuse" ? "var(--epic)" : "var(--destructive)";
              return (
                <button
                  key={m}
                  onClick={() => { setMode(m); clearAll(); }}
                  className={cn(
                    "relative px-5 py-2 rounded-full flex items-center gap-2 text-xs font-heading uppercase tracking-wider transition-all",
                    active ? "text-background" : "text-muted-foreground hover:text-foreground"
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

        {/* Slots + result row */}
        <div className="flex items-center justify-center gap-3 sm:gap-5 mb-6">
          {slots.map((cardId, i) => {
            const card = cardId ? allGameCards.find((c) => c.id === cardId) : null;
            const hue = card ? RARITY_HUE[card.rarity] : "var(--muted-foreground)";
            return (
              <motion.button
                key={i}
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
            style={{ color: `hsl(${outputHue})`, opacity: ready ? 1 : 0.3 }}
          />

          {/* Result */}
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
                animate={ready ? { scale: [1, 1.1, 1], rotate: [0, 4, 0] } : {}}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              >
                <Sparkles
                  className="w-6 h-6"
                  style={{ color: `hsl(${outputHue})`, opacity: ready ? 1 : 0.4 }}
                />
              </motion.div>
            ) : (
              <Flame
                className="w-6 h-6"
                style={{ color: `hsl(var(--rare))`, opacity: filledSlots.length > 0 ? 1 : 0.4 }}
              />
            )}
            {ready && resultRarity && (
              <span
                className="absolute bottom-1 inset-x-0 text-center text-[9px] font-heading uppercase tracking-wider"
                style={{ color: `hsl(${outputHue})` }}
              >
                {resultRarity}
              </span>
            )}
            {mode === "sacrifice" && filledSlots.length > 0 && (
              <span className="absolute bottom-1 inset-x-0 text-center text-[9px] font-heading uppercase tracking-wider text-[hsl(var(--rare))]">
                +{sacrificePreview} stardust
              </span>
            )}
          </div>
        </div>

        {/* Action button */}
        <div className="flex flex-col items-center gap-2 mb-6">
          {mode === "fuse" && filledSlots.length === 3 && !activeFuseRecipe && (
            <p className="text-[10px] text-center text-muted-foreground max-w-sm px-2">
              Fusion needs three cards of the same rarity: three commons or three rares (three legendaries cannot be fused here).
            </p>
          )}
          {mode === "fuse" && activeFuseRecipe && !fuseAllowed && (
            <p className="text-[10px] text-center text-destructive/90 max-w-sm px-2">
              Need {activeFuseRecipe.goldCost} gold to fuse (you have {playerState.gold}).
            </p>
          )}
          <button
            type="button"
            onClick={mode === "fuse" ? handleFuse : handleSacrifice}
            disabled={
              working ||
              (mode === "fuse" ? !fuseAllowed : filledSlots.length === 0)
            }
            className="px-8 py-2.5 rounded-full font-heading text-xs uppercase tracking-widest text-background disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            style={{
              background: `linear-gradient(135deg, hsl(${outputHue}), hsl(var(--legendary)))`,
              boxShadow: ready || filledSlots.length > 0 ? `0 0 20px hsl(${outputHue} / 0.4)` : undefined,
            }}
          >
            {working
              ? mode === "fuse"
                ? "Fusing…"
                : "Sacrificing…"
              : mode === "fuse"
                ? activeFuseRecipe
                  ? `Fuse (${activeFuseRecipe.goldCost} gold)`
                  : "Fuse"
                : "Sacrifice"}
          </button>
        </div>

        {/* Filter — small, dropdown reveals */}
        <div className="flex items-center justify-between mb-3 px-1">
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
            {filtered.length} cards
          </span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] uppercase tracking-wider text-muted-foreground hover:text-foreground hover:bg-foreground/5 transition-all">
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

        {/* Card grid — original card shape, smaller */}
        {filtered.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-12">no cards available</p>
        ) : (
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-y-1 justify-items-center">
            {filtered.slice(0, 60).map((c) => {
              const slotsFull = filledSlots.length >= 3;
              return (
                <motion.button
                  key={c.id}
                  onClick={() => !slotsFull && placeInSlot(c.id)}
                  disabled={slotsFull}
                  whileHover={!slotsFull ? { y: -4, scale: 1.05 } : undefined}
                  whileTap={!slotsFull ? { scale: 0.95 } : undefined}
                  className={cn(
                    "relative transition-opacity",
                    slotsFull && "opacity-40 cursor-not-allowed"
                  )}
                  style={{ width: 80, height: 112 }}
                >
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="origin-center scale-[0.35]">
                      <GameCard card={c} size="md" />
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>
        )}
      </GlassPanel>

      <AnimatePresence>
        {fuseReveal && (
          <PackOpening
            cardIds={fuseReveal.cardIds}
            cardIsNew={fuseReveal.cardIsNew}
            playerState={playerState}
            onComplete={() => setFuseReveal(null)}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {sacrificeAnim && (
          <SacrificeAnimation
            cardIds={sacrificeAnim.cardIds}
            totalStardust={sacrificeAnim.stardust}
            onComplete={() => setSacrificeAnim(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
