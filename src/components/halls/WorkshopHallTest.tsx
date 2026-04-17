import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Hammer, Flame, Sparkles, ChevronRight, Plus, X, Coins } from "lucide-react";
import type { PlayerState } from "@/lib/playerState";
import HallLayout, { HallSection, HallStat } from "@/components/scene/HallLayout";
import GlassPanel from "@/components/scene/GlassPanel";
import HexAvatar from "@/components/scene/HexAvatar";
import { allCards, type Rarity } from "@/data/cards";
import { cn } from "@/lib/utils";

interface Props { playerState: PlayerState; onStateChange: (s: PlayerState) => void }

const RARITY_HUE: Record<Rarity, string> = {
  common: "var(--muted-foreground)",
  uncommon: "var(--primary)",
  rare: "var(--rare)",
  epic: "var(--epic)",
  legendary: "var(--legendary)",
  mythic: "var(--legendary)",
};

const RARITY_ORDER: Rarity[] = ["common", "uncommon", "rare", "epic", "legendary", "mythic"];

type Mode = "fuse" | "sacrifice";

export default function WorkshopHallTest({ playerState }: Props) {
  const [mode, setMode] = useState<Mode>("fuse");
  const [rarityFilter, setRarityFilter] = useState<Rarity>("common");
  const [slots, setSlots] = useState<(string | null)[]>([null, null, null]);

  const slotCount = mode === "fuse" ? 3 : 5;

  // ensure slots length matches mode
  useMemo(() => {
    setSlots((s) => {
      if (s.length === slotCount) return s;
      return Array.from({ length: slotCount }, (_, i) => s[i] ?? null);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slotCount]);

  const owned = useMemo(
    () =>
      playerState.ownedCardIds
        .map((id) => allCards.find((c) => c.id === id))
        .filter(Boolean) as typeof allCards,
    [playerState.ownedCardIds]
  );

  const filtered = useMemo(
    () => owned.filter((c) => c.rarity === rarityFilter && !slots.includes(c.id)),
    [owned, rarityFilter, slots]
  );

  const counts = useMemo(() => {
    const m: Record<Rarity, number> = { common: 0, uncommon: 0, rare: 0, epic: 0, legendary: 0, mythic: 0 };
    for (const c of owned) m[c.rarity]++;
    return m;
  }, [owned]);

  const filledSlots = slots.filter((s): s is string => s !== null);
  const ready = mode === "fuse" ? filledSlots.length === 3 : filledSlots.length > 0;
  const outputHue =
    mode === "fuse"
      ? rarityFilter === "common"
        ? RARITY_HUE.uncommon
        : rarityFilter === "uncommon"
        ? RARITY_HUE.rare
        : rarityFilter === "rare"
        ? RARITY_HUE.epic
        : RARITY_HUE.legendary
      : "var(--legendary)";

  const placeInSlot = (cardId: string) => {
    const idx = slots.findIndex((s) => s === null);
    if (idx === -1) return;
    setSlots((s) => s.map((v, i) => (i === idx ? cardId : v)));
  };

  const removeFromSlot = (idx: number) => {
    setSlots((s) => s.map((v, i) => (i === idx ? null : v)));
  };

  return (
    <HallLayout
      sidebarWidth="md"
      sidebar={
        <>
          <HallSection title="Forge" hue="var(--epic)" glow={0.5}>
            <div className="flex items-center gap-2 mb-3">
              <Hammer className="w-4 h-4 text-[hsl(var(--epic))]" />
              <span className="text-xs text-muted-foreground">Transmute the worthy</span>
            </div>
            <HallStat label="Stardust" value={playerState.stardust.toLocaleString()} hue="var(--rare)" />
            <HallStat label="Gold" value={playerState.gold.toLocaleString()} hue="var(--legendary)" />
            <HallStat label="Cards" value={playerState.ownedCardIds.length} />
          </HallSection>

          <HallSection title="Operation" hue="var(--epic)" glow={0.4}>
            <div className="space-y-2">
              {(["fuse", "sacrifice"] as const).map((m) => {
                const active = mode === m;
                const Icon = m === "fuse" ? Sparkles : Flame;
                const hue = m === "fuse" ? "var(--epic)" : "var(--destructive)";
                return (
                  <button
                    key={m}
                    onClick={() => {
                      setMode(m);
                      setSlots(Array.from({ length: m === "fuse" ? 3 : 5 }, () => null));
                    }}
                    className={cn(
                      "w-full px-3 py-2.5 rounded-lg text-left flex items-center gap-3 transition-all",
                      active
                        ? "bg-foreground/5 ring-1"
                        : "hover:bg-foreground/5 text-muted-foreground"
                    )}
                    style={active ? { borderColor: `hsl(${hue})`, boxShadow: `inset 0 0 0 1px hsl(${hue} / 0.5)` } : undefined}
                  >
                    <Icon className="w-4 h-4" style={{ color: `hsl(${hue})` }} />
                    <div className="flex-1">
                      <div className="text-xs font-heading uppercase tracking-wider text-foreground">{m}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {m === "fuse" ? "3 → 1 higher rarity" : "burn for stardust"}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </HallSection>

          <HallSection title="Filter rarity" hue="var(--primary)" glow={0.3}>
            <div className="space-y-1.5">
              {RARITY_ORDER.slice(0, 5).map((r) => {
                const active = rarityFilter === r;
                return (
                  <button
                    key={r}
                    onClick={() => setRarityFilter(r)}
                    className={cn(
                      "w-full flex items-center justify-between px-2.5 py-1.5 rounded-md transition-all",
                      active ? "bg-foreground/5" : "hover:bg-foreground/5"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="w-1.5 h-1.5 rounded-full"
                        style={{ backgroundColor: `hsl(${RARITY_HUE[r]})`, boxShadow: active ? `0 0 8px hsl(${RARITY_HUE[r]})` : undefined }}
                      />
                      <span className="text-xs capitalize text-foreground/90">{r}</span>
                    </div>
                    <span className="text-[10px] text-muted-foreground">{counts[r]}</span>
                  </button>
                );
              })}
            </div>
          </HallSection>
        </>
      }
      header={
        <GlassPanel hue="var(--epic)" glow={0.45} padding="md">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                {mode === "fuse" ? "Forge altar" : "Sacrificial pyre"}
              </p>
              <h1 className="font-heading text-xl text-foreground">
                {filledSlots.length}/{slotCount} channeled
              </h1>
            </div>
            <button
              disabled={!ready}
              className="px-5 py-2.5 rounded-xl font-heading text-xs uppercase tracking-wider text-background disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              style={{
                background: ready
                  ? `linear-gradient(135deg, hsl(${outputHue}), hsl(var(--legendary)))`
                  : "hsl(var(--muted))",
                boxShadow: ready ? `0 0 24px hsl(${outputHue} / 0.5)` : undefined,
              }}
            >
              {mode === "fuse" ? "Forge" : "Sacrifice"}
            </button>
          </div>
        </GlassPanel>
      }
    >
      {/* Forge Altar — central ring with slots */}
      <GlassPanel hue="var(--epic)" glow={0.4} padding="lg">
        <div className="relative h-[280px] flex items-center justify-center">
          {/* ambient core glow */}
          <motion.div
            className="absolute rounded-full pointer-events-none"
            animate={{ scale: ready ? [1, 1.15, 1] : [1, 1.05, 1], opacity: ready ? [0.5, 0.9, 0.5] : [0.25, 0.4, 0.25] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
            style={{
              width: 220,
              height: 220,
              background: `radial-gradient(circle, hsl(${outputHue} / 0.45) 0%, hsl(${outputHue} / 0.1) 45%, transparent 75%)`,
              filter: "blur(20px)",
            }}
          />

          {/* slots arranged around the altar */}
          <div className={cn("relative grid gap-3", mode === "fuse" ? "grid-cols-3" : "grid-cols-5")}>
            {slots.map((cardId, i) => {
              const card = cardId ? allCards.find((c) => c.id === cardId) : null;
              const hue = card ? RARITY_HUE[card.rarity] : "var(--muted-foreground)";
              return (
                <motion.button
                  key={i}
                  onClick={() => card && removeFromSlot(i)}
                  whileHover={{ y: -2 }}
                  className="relative flex flex-col items-center gap-2 group"
                >
                  <div
                    className="relative w-[72px] h-[72px] flex items-center justify-center rounded-2xl"
                    style={{
                      background: card
                        ? `radial-gradient(circle, hsl(${hue} / 0.2) 0%, transparent 70%)`
                        : "transparent",
                      border: card ? `1px solid hsl(${hue} / 0.5)` : "1px dashed hsl(var(--muted-foreground) / 0.3)",
                      boxShadow: card ? `0 0 18px hsl(${hue} / 0.4), inset 0 0 12px hsl(${hue} / 0.15)` : undefined,
                    }}
                  >
                    <AnimatePresence mode="wait">
                      {card ? (
                        <motion.div
                          key={card.id}
                          initial={{ scale: 0.6, opacity: 0, rotate: -20 }}
                          animate={{ scale: 1, opacity: 1, rotate: 0 }}
                          exit={{ scale: 0.6, opacity: 0, rotate: 20 }}
                          transition={{ type: "spring", stiffness: 240, damping: 18 }}
                        >
                          <HexAvatar size={56} hue={hue} src={card.image} />
                        </motion.div>
                      ) : (
                        <motion.div key="empty" className="text-muted-foreground/40">
                          <Plus className="w-5 h-5" />
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {card && (
                      <div className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-background/90 ring-1 ring-foreground/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <X className="w-3 h-3 text-foreground/70" />
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] font-heading uppercase tracking-wider text-muted-foreground/70">
                    {card ? card.name.slice(0, 10) : `slot ${i + 1}`}
                  </span>
                </motion.button>
              );
            })}
          </div>

          {/* output preview (fuse only) */}
          {mode === "fuse" && (
            <div className="absolute right-6 top-1/2 -translate-y-1/2 hidden md:flex items-center gap-2">
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
              <div
                className="relative w-[64px] h-[64px] rounded-2xl flex items-center justify-center"
                style={{
                  background: ready
                    ? `radial-gradient(circle, hsl(${outputHue} / 0.35), transparent 70%)`
                    : "transparent",
                  border: `1px solid hsl(${outputHue} / ${ready ? 0.6 : 0.25})`,
                  boxShadow: ready ? `0 0 24px hsl(${outputHue} / 0.6)` : undefined,
                }}
              >
                <Sparkles className="w-5 h-5" style={{ color: `hsl(${outputHue})`, opacity: ready ? 1 : 0.4 }} />
              </div>
            </div>
          )}

          {/* sacrifice yield */}
          {mode === "sacrifice" && filledSlots.length > 0 && (
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-background/60 ring-1 ring-[hsl(var(--rare)/0.4)]">
              <Coins className="w-3 h-3 text-[hsl(var(--rare))]" />
              <span className="text-xs font-heading text-[hsl(var(--rare))]">
                ≈ {filledSlots.length * 25} stardust
              </span>
            </div>
          )}
        </div>
      </GlassPanel>

      {/* Reagent inventory */}
      <GlassPanel hue="var(--primary)" glow={0.3} padding="md" className="mt-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="font-heading text-xs uppercase tracking-wider text-foreground/90">Reagents</h3>
            <p className="text-[10px] text-muted-foreground capitalize">
              {rarityFilter} · {filtered.length} available
            </p>
          </div>
          <span className="text-[10px] text-muted-foreground">tap to channel</span>
        </div>

        {filtered.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground py-10">
            no {rarityFilter} cards available
          </p>
        ) : (
          <div className="grid grid-cols-5 sm:grid-cols-7 md:grid-cols-9 gap-2.5">
            {filtered.slice(0, 36).map((c) => {
              const hue = RARITY_HUE[c.rarity];
              const slotsFull = filledSlots.length >= slotCount;
              return (
                <motion.button
                  key={c.id}
                  onClick={() => !slotsFull && placeInSlot(c.id)}
                  disabled={slotsFull}
                  whileHover={{ y: slotsFull ? 0 : -3, scale: slotsFull ? 1 : 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={cn(
                    "flex flex-col items-center gap-1.5 p-1.5 rounded-lg transition-all",
                    slotsFull ? "opacity-40 cursor-not-allowed" : "hover:bg-foreground/5"
                  )}
                >
                  <HexAvatar size={42} hue={hue} src={c.image} />
                  <span className="text-[9px] text-foreground/70 truncate max-w-full">{c.name}</span>
                </motion.button>
              );
            })}
          </div>
        )}
      </GlassPanel>
    </HallLayout>
  );
}
