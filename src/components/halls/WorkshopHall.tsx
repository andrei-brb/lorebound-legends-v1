import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Flame, Plus, X, ChevronDown, Filter, ArrowRight, ArrowUp } from "lucide-react";
import type { PlayerState } from "@/lib/playerState";
import GlassPanel from "@/components/scene/GlassPanel";
import GameCard from "@/components/GameCard";
import PackOpening from "@/components/PackOpening";
import SacrificeAnimation from "@/components/SacrificeAnimation";
import { allGameCards } from "@/data/cardIndex";
import { allCards } from "@/data/cards";
import type { Rarity } from "@/data/cards";
import { cn } from "@/lib/utils";
import { texForge } from "@/components/scene/panelTextures";
import {
  FUSION_RECIPES,
  SACRIFICE_STARDUST,
  canFuse,
  performFusion,
  performSacrifice,
  applyDubUpgrade,
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
  applyDub: (cardId: string) => Promise<{ stardustEarned: number; newGoldStar: boolean; newRedStar: boolean } | null>;
}

type Mode = "fuse" | "sacrifice" | "levelUp";
type RarityFilter = "all" | Rarity;

const RARITY_HUE: Record<Rarity, string> = {
  common: "var(--muted-foreground)",
  rare: "var(--rare)",
  legendary: "var(--legendary)",
  mythic: "var(--mythic)",
};

const RARITIES: RarityFilter[] = ["all", "common", "rare", "legendary", "mythic"];

const NEXT_RARITY: Record<Rarity, Rarity> = {
  common: "rare",
  rare: "legendary",
  legendary: "legendary",
  mythic: "mythic",
};

export default function WorkshopHall({
  playerState,
  onStateChange,
  isOnline,
  craftFuse,
  craftSacrifice,
  applyDub,
}: Props) {
  const [mode, setMode] = useState<Mode>("fuse");
  const [rarityFilter, setRarityFilter] = useState<RarityFilter>("all");
  const [slots, setSlots] = useState<(string | null)[]>([null, null, null]);
  const [working, setWorking] = useState(false);
  const [fuseReveal, setFuseReveal] = useState<{ cardIds: string[]; cardIsNew: boolean[] } | null>(null);
  const [sacrificeAnim, setSacrificeAnim] = useState<{ cardIds: string[]; stardust: number } | null>(null);

  const countSelected = useMemo(() => {
    const out: Record<string, number> = {};
    for (const id of slots) {
      if (!id) continue;
      out[id] = (out[id] || 0) + 1;
    }
    return out;
  }, [slots]);

  const filtered = useMemo(
    () => {
      if (mode === "sacrifice") {
        // Exclude seasonal/event cards here so they don't show up in sacrifice selection.
        const owned = playerState.ownedCardIds
          .map((id) => allCards.find((c) => c.id === id))
          .filter(Boolean) as typeof allCards;
        return owned.filter(
          (c) => (rarityFilter === "all" || c.rarity === rarityFilter) && !slots.includes(c.id)
        );
      }

      if (mode === "fuse") {
        // Fuse uses dubs, not owned cards. Show only cards with remaining dubs after current slot selection.
        const dubs = playerState.cardDubs || {};
        return allCards.filter((c) => {
          if (rarityFilter !== "all" && c.rarity !== rarityFilter) return false;
          const have = Math.max(0, Math.floor(Number(dubs[c.id] || 0)));
          const used = countSelected[c.id] || 0;
          return have - used > 0;
        });
      }

      // levelUp: selection grid is replaced with a dedicated list below.
      return [];
    },
    [countSelected, mode, playerState.cardDubs, playerState.ownedCardIds, rarityFilter, slots]
  );

  const filledSlots = slots.filter((s): s is string => s !== null);
  const ready = filledSlots.length === 3;

  const activeFuseRecipe = useMemo((): FusionRecipe | null => {
    if (mode !== "fuse" || filledSlots.length !== 3) return null;
    const cards = filledSlots
      .map((id) => allCards.find((c) => c.id === id))
      .filter(Boolean) as typeof allCards;
    if (cards.length !== 3) return null;
    const r = cards[0].rarity;
    if (!cards.every((c) => c.rarity === r)) return null;
    return FUSION_RECIPES.find((rec) => rec.inputRarity === r) ?? null;
  }, [mode, filledSlots]);

  const fuseAllowed =
    !!activeFuseRecipe && canFuse(playerState, activeFuseRecipe, filledSlots);

  const fuseBlockedReason = useMemo((): string | null => {
    if (mode !== "fuse") return null;
    if (filledSlots.length !== 3) return null;
    if (!activeFuseRecipe) {
      return "Fusion needs three dubs of the same rarity: three commons, three rares, or three legendaries.";
    }

    if (playerState.gold < activeFuseRecipe.goldCost) {
      return `Need ${activeFuseRecipe.goldCost} gold to fuse (you have ${playerState.gold}).`;
    }

    // This can happen if the client lists cards the crafting engine/server doesn't know about yet
    // (e.g. seasonal/event cards not included in the base crafting pool).
    const missingFromBaseSet = filledSlots.filter((id) => !allCards.some((c) => c.id === id));
    if (missingFromBaseSet.length > 0) {
      return "Some selected cards can’t be fused yet (event/seasonal cards are not supported for fusion).";
    }

    if (!fuseAllowed) {
      return "Selected cards aren’t eligible to fuse (need enough dubs and a matching recipe).";
    }

    return null;
  }, [activeFuseRecipe, filledSlots, fuseAllowed, mode, playerState.gold]);

  const sacrificePreview = useMemo(() => {
    if (mode !== "sacrifice") return 0;
    return filledSlots.reduce((sum, id) => {
      const c = allGameCards.find((x) => x.id === id);
      return sum + (c ? SACRIFICE_STARDUST[c.rarity] : 0);
    }, 0);
  }, [mode, filledSlots]);

  // Result preview: in fuse mode, show predicted next-rarity hint
  const resultRarity: Rarity | null = useMemo(() => {
    if (mode !== "fuse") return null;
    if (filledSlots.length === 0) return null;
    const cards = filledSlots.map((id) => allGameCards.find((c) => c.id === id)!).filter(Boolean);
    const r = cards[0]?.rarity;
    const sameRarity = cards.every((c) => c.rarity === r);
    return sameRarity && r ? NEXT_RARITY[r] : null;
  }, [filledSlots, mode]);

  const placeInSlot = (cardId: string) => {
    if (!allCards.some((c) => c.id === cardId)) return;
    const idx = slots.findIndex((s) => s === null);
    if (idx === -1) return;
    if (mode === "sacrifice") {
      if (!playerState.ownedCardIds.includes(cardId)) return;
      if (slots.includes(cardId)) return;
      setSlots((s) => s.map((v, i) => (i === idx ? cardId : v)));
      return;
    }
    if (mode === "fuse") {
      const have = Math.max(0, Math.floor(Number(playerState.cardDubs?.[cardId] || 0)));
      const used = countSelected[cardId] || 0;
      if (have - used <= 0) return;
      setSlots((s) => s.map((v, i) => (i === idx ? cardId : v)));
    }
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
        }
        // Online failure: usePlayerApi toast already shows the server message
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
            description: "Need three same-rarity dubs (common/rare/legendary) and enough gold.",
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
          <div className="max-w-full overflow-x-auto">
            <div className="inline-flex flex-wrap sm:flex-nowrap p-1 rounded-full bg-background/40 ring-1 ring-foreground/10">
            {(["fuse", "sacrifice", "levelUp"] as const).map((m) => {
              const active = mode === m;
              const Icon = m === "fuse" ? Sparkles : m === "sacrifice" ? Flame : ArrowUp;
              const hue = m === "fuse" ? "var(--epic)" : m === "sacrifice" ? "var(--destructive)" : "var(--legendary)";
              return (
                <button
                  key={m}
                  onClick={() => { setMode(m); clearAll(); }}
                  className={cn(
                    "relative px-3 sm:px-5 py-2 rounded-full flex items-center gap-2 text-xs font-heading uppercase tracking-wider transition-all whitespace-nowrap",
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
                  {m === "levelUp" ? "level up" : m}
                </button>
              );
            })}
            </div>
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

        {/* Action button (fuse/sacrifice only) */}
        <div className="flex flex-col items-center gap-2 mb-6">
          {mode === "fuse" && fuseBlockedReason && (
            <p
              className={cn(
                "text-[10px] text-center max-w-sm px-2",
                fuseAllowed ? "text-muted-foreground" : "text-destructive/90",
              )}
            >
              {fuseBlockedReason}
            </p>
          )}
          {mode !== "levelUp" && (
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
          )}
        </div>

        {/* Filter — small, dropdown reveals */}
        <div className="flex items-center justify-between mb-3 px-1">
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
            {mode === "levelUp" ? "dub inventory" : `${filtered.length} cards`}
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

        {mode === "levelUp" ? (
          (() => {
            const dubs = playerState.cardDubs || {};
            const entries = Object.entries(dubs)
              .map(([id, n]) => ({ id, n: Math.max(0, Math.floor(Number(n || 0))) }))
              .filter((x) => x.n > 0)
              .map((x) => ({ ...x, card: allGameCards.find((c) => c.id === x.id) || null }))
              .filter((x) => !!x.card) as Array<{ id: string; n: number; card: (typeof allGameCards)[number] }>;

            const shown = entries.filter((x) => (rarityFilter === "all" ? true : x.card.rarity === rarityFilter));

            if (shown.length === 0) {
              return <p className="text-center text-sm text-muted-foreground py-12">no dubbed cards available</p>;
            }

            return (
              <div className="space-y-2">
                {shown.slice(0, 80).map(({ id, n, card }) => (
                  <div key={id} className="flex items-center gap-3 rounded-xl bg-background/30 ring-1 ring-foreground/10 p-2">
                    <div className="shrink-0" style={{ width: 64, height: 90 }}>
                      <div className="origin-top-left scale-[0.28]">
                        <GameCard card={card} size="md" />
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-heading font-bold truncate">{card.name}</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                        Dubbed x{n}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={working}
                      onClick={async () => {
                        if (working) return;
                        setWorking(true);
                        try {
                          if (isOnline) {
                            const r = await applyDub(id);
                            if (r) {
                              const qs = progressQuest(loadDailyQuests(), "craft_card");
                              saveDailyQuests(qs);
                              toast({
                                title: "Level up applied",
                                description: r.stardustEarned > 0 ? `+${r.stardustEarned} stardust` : "Dub consumed",
                              });
                            }
                          } else {
                            const r = applyDubUpgrade(playerState, id);
                            if (r) {
                              onStateChange(r.playerState);
                              const qs = progressQuest(loadDailyQuests(), "craft_card");
                              saveDailyQuests(qs);
                              toast({
                                title: "Level up applied",
                                description: r.stardustEarned > 0 ? `+${r.stardustEarned} stardust` : "Dub consumed",
                              });
                            }
                          }
                        } finally {
                          setWorking(false);
                        }
                      }}
                      className="px-3 py-2 rounded-full font-heading text-[10px] uppercase tracking-wider text-background disabled:opacity-40"
                      style={{ background: "linear-gradient(135deg, hsl(var(--legendary)), hsl(var(--rare)))" }}
                    >
                      Level up
                    </button>
                  </div>
                ))}
              </div>
            );
          })()
        ) : (
          /* Card grid — original card shape, smaller */
          filtered.length === 0 ? (
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
          )
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
