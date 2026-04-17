import { useMemo, useState } from "react";
import { BookOpen, Sparkles, Layers, Grid3X3, Search } from "lucide-react";
import type { PlayerState } from "@/lib/playerState";
import HallLayout, { HallSection, HallStat } from "@/components/scene/HallLayout";
import GlassPanel from "@/components/scene/GlassPanel";
import HexAvatar from "@/components/scene/HexAvatar";
import { allGameCards, type GameCard, type Rarity } from "@/data/cardIndex";
import { cn } from "@/lib/utils";

interface Props { playerState: PlayerState }

const RARITY_HUE: Record<Rarity, string> = {
  common: "var(--muted-foreground)",
  rare: "var(--rare)",
  legendary: "var(--legendary)",
};

const RARITY_ORDER: Rarity[] = ["legendary", "rare", "common"];

export default function CardsHall({ playerState }: Props) {
  const [filter, setFilter] = useState<"all" | "owned" | "missing">("all");
  const [rarityFilter, setRarityFilter] = useState<Rarity | "all">("all");
  const [query, setQuery] = useState("");

  const owned = new Set(playerState.ownedCardIds);
  const stats = useMemo(() => {
    const byR: Record<string, { owned: number; total: number }> = {};
    for (const c of allGameCards) {
      const r = c.rarity;
      if (!byR[r]) byR[r] = { owned: 0, total: 0 };
      byR[r].total += 1;
      if (owned.has(c.id)) byR[r].owned += 1;
    }
    return byR;
  }, [playerState.ownedCardIds]);

  const cards = useMemo(() => {
    return allGameCards.filter((c) => {
      if (filter === "owned" && !owned.has(c.id)) return false;
      if (filter === "missing" && owned.has(c.id)) return false;
      if (rarityFilter !== "all" && c.rarity !== rarityFilter) return false;
      if (query && !c.name.toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    });
  }, [filter, rarityFilter, query, playerState.ownedCardIds]);

  const totalOwned = playerState.ownedCardIds.length;
  const totalCards = allGameCards.length;
  const completion = Math.round((totalOwned / totalCards) * 100);

  return (
    <HallLayout
      sidebar={
        <>
          <HallSection title="Archive" hue="var(--primary)" glow={0.55}>
            <div className="flex items-center gap-2 mb-3">
              <BookOpen className="w-4 h-4 text-primary" />
              <span className="text-xs text-muted-foreground">Mythic codex of cards</span>
            </div>
            <HallStat label="Owned" value={`${totalOwned}/${totalCards}`} hue="var(--legendary)" />
            <HallStat label="Completion" value={`${completion}%`} hue="var(--rare)" />
            <HallStat label="Total pulls" value={playerState.totalPulls} />
          </HallSection>

          <HallSection title="By Rarity" hue="var(--epic)" glow={0.4}>
            {RARITY_ORDER.map((r) => {
              const s = stats[r] ?? { owned: 0, total: 0 };
              const pct = s.total ? Math.round((s.owned / s.total) * 100) : 0;
              return (
                <div key={r} className="mb-2 last:mb-0">
                  <div className="flex justify-between text-[10px] uppercase tracking-wider mb-1">
                    <span style={{ color: `hsl(${RARITY_HUE[r]})` }}>{r}</span>
                    <span className="text-muted-foreground">{s.owned}/{s.total}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-foreground/10 overflow-hidden">
                    <div className="h-full transition-all" style={{ width: `${pct}%`, background: `linear-gradient(90deg, hsl(${RARITY_HUE[r]}/0.5), hsl(${RARITY_HUE[r]}))` }} />
                  </div>
                </div>
              );
            })}
          </HallSection>

          <HallSection title="Filter" hue="var(--primary)" glow={0.3}>
            <div className="grid grid-cols-3 gap-1.5 mb-2">
              {(["all", "owned", "missing"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={cn(
                    "px-2 py-1.5 rounded-lg text-[10px] uppercase tracking-wider transition-colors",
                    filter === f ? "bg-primary/20 text-foreground ring-1 ring-primary/40" : "text-muted-foreground hover:text-foreground hover:bg-foreground/5"
                  )}
                >
                  {f}
                </button>
              ))}
            </div>
            <select
              value={rarityFilter}
              onChange={(e) => setRarityFilter(e.target.value as Rarity | "all")}
              className="w-full px-2 py-1.5 rounded-lg text-xs bg-foreground/5 text-foreground border border-border/30 focus:outline-none focus:ring-1 focus:ring-primary/40"
            >
              <option value="all">All rarities</option>
              {RARITY_ORDER.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </HallSection>
        </>
      }
      header={
        <GlassPanel hue="var(--primary)" glow={0.4} padding="md">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Card Archive</p>
              <h1 className="font-heading text-lg text-foreground truncate">Codex of the Mythic Realms</h1>
            </div>
            <div className="relative shrink-0 w-44">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search cards…"
                className="w-full pl-8 pr-2 py-1.5 rounded-lg text-xs bg-foreground/5 text-foreground border border-border/30 focus:outline-none focus:ring-1 focus:ring-primary/40"
              />
            </div>
          </div>
        </GlassPanel>
      }
    >
      <GlassPanel hue="var(--primary)" glow={0.3} padding="md">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-heading text-xs uppercase tracking-wider text-foreground/90">Showing · {cards.length}</h3>
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            <Grid3X3 className="w-3.5 h-3.5" /> hex grid
          </div>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
          {cards.slice(0, 64).map((c) => {
            const isOwned = owned.has(c.id);
            const hue = RARITY_HUE[c.rarity];
            return (
              <div
                key={c.id}
                className={cn("flex flex-col items-center gap-1 transition-transform hover:scale-105", !isOwned && "opacity-40")}
                title={`${c.name} · ${c.rarity}`}
              >
                <HexAvatar size={56} hue={hue}>
                  <span className="text-2xl">{(c as GameCard & { emoji?: string }).emoji ?? "✦"}</span>
                </HexAvatar>
                <span className="text-[10px] text-foreground/80 truncate max-w-full text-center">{c.name.split(" ")[0]}</span>
                <span className="text-[9px] uppercase tracking-wider" style={{ color: `hsl(${hue})` }}>{c.rarity}</span>
              </div>
            );
          })}
        </div>
        {cards.length > 64 && (
          <p className="text-[10px] text-muted-foreground text-center mt-3">+{cards.length - 64} more · refine filters</p>
        )}
      </GlassPanel>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <GlassPanel hue="var(--rare)" glow={0.35} padding="md">
          <div className="flex items-center gap-2 mb-1"><Sparkles className="w-4 h-4 text-[hsl(var(--rare))]" /><h3 className="font-heading text-xs uppercase tracking-wider">Summon</h3></div>
          <p className="text-xs text-muted-foreground">Open packs and channel new cards from the void.</p>
        </GlassPanel>
        <GlassPanel hue="var(--epic)" glow={0.35} padding="md">
          <div className="flex items-center gap-2 mb-1"><Layers className="w-4 h-4 text-[hsl(var(--epic))]" /><h3 className="font-heading text-xs uppercase tracking-wider">Decks</h3></div>
          <p className="text-xs text-muted-foreground">Forge a deck of 8 to wage your battles.</p>
        </GlassPanel>
        <GlassPanel hue="var(--legendary)" glow={0.35} padding="md">
          <div className="flex items-center gap-2 mb-1"><BookOpen className="w-4 h-4 text-[hsl(var(--legendary))]" /><h3 className="font-heading text-xs uppercase tracking-wider">Lore</h3></div>
          <p className="text-xs text-muted-foreground">Each card carries a fragment of the realm's myth.</p>
        </GlassPanel>
      </div>
    </HallLayout>
  );
}
