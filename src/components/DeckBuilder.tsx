import { useMemo, useState } from "react";
import { allGameCards } from "@/data/cardIndex";
import CollectionView from "./CollectionView";
import { X, Swords, Layers, ChevronDown, Shield, Zap, Flame } from "lucide-react";
import type { PlayerState } from "@/lib/playerState";
import { getCardProgress } from "@/lib/playerState";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import type { DeckPreset } from "@/lib/playerState";

const MAX_DECK_SIZE = 10;

interface DeckBuilderProps {
  onStartBattle?: (deckIds: string[]) => void;
  playerState: PlayerState;
  onStateChange: (state: PlayerState) => void;
}

type SortBy =
  | "rarity_desc"
  | "rarity_asc"
  | "name_asc"
  | "name_desc"
  | "attack_desc"
  | "defense_desc"
  | "hp_desc"
  | "level_desc";

export default function DeckBuilder({ onStartBattle, playerState, onStateChange }: DeckBuilderProps) {
  const [deckIds, setDeckIds] = useState<string[]>([]);
  const [deckOpen, setDeckOpen] = useState(false);
  const [newPresetName, setNewPresetName] = useState("");
  const [renamePresetId, setRenamePresetId] = useState<string | null>(null);
  const [renamePresetName, setRenamePresetName] = useState("");

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "hero" | "god" | "weapon" | "spell" | "trap">("all");
  const [rarityFilter, setRarityFilter] = useState<"all" | "legendary" | "rare" | "common">("all");
  const [elementFilter, setElementFilter] = useState<"all" | "fire" | "water" | "earth" | "air" | "shadow" | "light" | "neutral">("all");
  const [inDeckOnly, setInDeckOnly] = useState(false);
  const [sortBy, setSortBy] = useState<SortBy>("rarity_desc");

  const toggleCard = (cardId: string) => {
    if (!playerState.ownedCardIds.includes(cardId)) return;
    setDeckIds((prev) =>
      prev.includes(cardId)
        ? prev.filter((id) => id !== cardId)
        : prev.length < MAX_DECK_SIZE
        ? [...prev, cardId]
        : prev
    );
  };

  const buildPresetDeck = (preset: Pick<DeckPreset, "cardIds">): { deckIds: string[]; missingIds: string[] } => {
    const owned = new Set(playerState.ownedCardIds);
    const chosen: string[] = [];
    const missing: string[] = [];

    for (const id of preset.cardIds) {
      if (chosen.length >= MAX_DECK_SIZE) break;
      if (!owned.has(id)) { missing.push(id); continue; }
      if (!chosen.includes(id)) chosen.push(id);
    }

    if (chosen.length < MAX_DECK_SIZE) {
      const pool = allGameCards
        .filter((c) => owned.has(c.id))
        .filter((c) => !chosen.includes(c.id))
        .sort((a, b) => {
          const aUnit = a.type === "hero" || a.type === "god";
          const bUnit = b.type === "hero" || b.type === "god";
          if (aUnit !== bUnit) return aUnit ? -1 : 1;
          const rarityRank = { common: 1, rare: 2, legendary: 3 } as const;
          const r = (rarityRank[b.rarity] - rarityRank[a.rarity]);
          if (r !== 0) return r;
          const aLvl = getCardProgress(playerState, a.id).level;
          const bLvl = getCardProgress(playerState, b.id).level;
          return bLvl - aLvl;
        })
        .map((c) => c.id);

      for (const id of pool) {
        if (chosen.length >= MAX_DECK_SIZE) break;
        chosen.push(id);
      }
    }

    return { deckIds: chosen.slice(0, MAX_DECK_SIZE), missingIds: missing };
  };

  const applyPreset = (preset: Pick<DeckPreset, "name" | "cardIds">) => {
    const { deckIds: nextIds, missingIds } = buildPresetDeck(preset);
    setDeckIds(nextIds);
    if (missingIds.length > 0) {
      toast({ title: "Preset loaded (with substitutions)", description: `You were missing ${missingIds.length} cards, so we filled the remaining slots with cards you own.` });
    } else {
      toast({ title: "Preset loaded", description: `${preset.name} applied.` });
    }
  };

  const savePreset = () => {
    const name = newPresetName.trim();
    if (!name) { toast({ title: "Name required", description: "Give your preset a name.", variant: "destructive" }); return; }
    if (deckIds.length === 0) { toast({ title: "Empty deck", description: "Add some cards first.", variant: "destructive" }); return; }
    const existing = playerState.deckPresets || [];
    if (existing.length >= 5) { toast({ title: "Preset limit reached", description: "You can have up to 5 presets.", variant: "destructive" }); return; }
    const preset: DeckPreset = { id: `preset_${Date.now()}`, name, cardIds: [...deckIds], updatedAt: Date.now() };
    onStateChange({ ...playerState, deckPresets: [...existing, preset] });
    toast({ title: "Saved preset", description: `${name} saved.` });
    setNewPresetName("");
  };

  const deletePreset = (presetId: string) => {
    const existing = playerState.deckPresets || [];
    onStateChange({ ...playerState, deckPresets: existing.filter((p) => p.id !== presetId) });
    toast({ title: "Preset deleted" });
  };

  const startRenamePreset = (preset: DeckPreset) => {
    setRenamePresetId(preset.id);
    setRenamePresetName(preset.name);
  };

  const confirmRenamePreset = () => {
    const id = renamePresetId;
    if (!id) return;
    const name = renamePresetName.trim();
    if (!name) { toast({ title: "Name required", description: "Preset name cannot be empty.", variant: "destructive" }); return; }
    const existing = playerState.deckPresets || [];
    onStateChange({ ...playerState, deckPresets: existing.map((p) => p.id === id ? { ...p, name, updatedAt: Date.now() } : p) });
    setRenamePresetId(null);
    setRenamePresetName("");
    toast({ title: "Preset renamed" });
  };

  const deckCards = deckIds.map((id) => allGameCards.find((c) => c.id === id)!).filter(Boolean);

  const activeSynergies: { name: string; description: string; cards: string[] }[] = [];
  for (const card of deckCards) {
    for (const syn of card.synergies) {
      if (deckIds.includes(syn.partnerId) && !activeSynergies.find((s) => s.name === syn.name)) {
        const partner = allGameCards.find((c) => c.id === syn.partnerId);
        activeSynergies.push({ name: syn.name, description: syn.description, cards: [card.name, partner?.name || ""] });
      }
    }
  }

  const heroGodCount = deckCards.filter(c => c.type === "hero" || c.type === "god").length;
  const weaponCount = deckCards.filter(c => c.type === "weapon").length;
  const spellCount = deckCards.filter(c => c.type === "spell").length;
  const trapCount = deckCards.filter(c => c.type === "trap").length;

  // Deck strength indicator
  const avgStats = useMemo(() => {
    if (deckCards.length === 0) return { attack: 0, defense: 0, hp: 0 };
    const totals = deckCards.reduce((acc, c) => ({ attack: acc.attack + c.attack, defense: acc.defense + c.defense, hp: acc.hp + c.hp }), { attack: 0, defense: 0, hp: 0 });
    return { attack: Math.round(totals.attack / deckCards.length), defense: Math.round(totals.defense / deckCards.length), hp: Math.round(totals.hp / deckCards.length) };
  }, [deckCards]);

  const maxStat = 100; // rough upper bound for progress bars

  const presetCount = (playerState.deckPresets || []).length;

  const deckPanel = (
    <div className="bg-card border border-border rounded-xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-heading text-lg font-bold text-foreground">Your Deck</h3>
        <Badge variant="secondary" className="font-heading">{deckIds.length}/{MAX_DECK_SIZE}</Badge>
      </div>

      {deckCards.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <Layers className="w-12 h-12 text-muted-foreground/30 mb-3" />
          <p className="text-sm font-heading font-bold text-foreground mb-1">No cards yet</p>
          <p className="text-xs text-muted-foreground">Tap cards below to build your deck</p>
        </div>
      ) : (
        <>
          {/* Deck strength indicator */}
          <div className="space-y-2 bg-secondary/50 rounded-lg p-3">
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Avg Stats</p>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Flame className="w-3 h-3 text-destructive" />
                <Progress value={(avgStats.attack / maxStat) * 100} className="h-1.5 flex-1 bg-secondary" />
                <span className="text-[10px] font-bold text-foreground w-6 text-right">{avgStats.attack}</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield className="w-3 h-3 text-primary" />
                <Progress value={(avgStats.defense / maxStat) * 100} className="h-1.5 flex-1 bg-secondary" />
                <span className="text-[10px] font-bold text-foreground w-6 text-right">{avgStats.defense}</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="w-3 h-3 text-emerald-400" />
                <Progress value={(avgStats.hp / maxStat) * 100} className="h-1.5 flex-1 bg-secondary" />
                <span className="text-[10px] font-bold text-foreground w-6 text-right">{avgStats.hp}</span>
              </div>
            </div>
          </div>

          {/* Deck composition */}
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="outline" className="text-primary border-primary/30 bg-primary/10">Heroes/Gods: {heroGodCount}</Badge>
            <Badge variant="outline" className="text-[hsl(var(--legendary))] border-[hsl(var(--legendary))]/30 bg-[hsl(var(--legendary))]/10">Weapons: {weaponCount}</Badge>
            <Badge variant="outline" className="text-synergy border-synergy/30 bg-synergy/10">Spells: {spellCount}</Badge>
            <Badge variant="outline" className="text-destructive border-destructive/30 bg-destructive/10">Traps: {trapCount}</Badge>
          </div>

          {onStartBattle && deckIds.length >= 4 && (
            <button
              onClick={() => onStartBattle(deckIds)}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-destructive text-destructive-foreground font-heading font-bold text-sm hover:brightness-110 transition-all hover:scale-[1.02] active:scale-95"
            >
              <Swords className="w-5 h-5" /> Battle! ({deckIds.length} cards)
            </button>
          )}

          <div className="space-y-2">
            {deckCards.map((card) => {
              const progress = getCardProgress(playerState, card.id);
              return (
                <div key={card.id} className="flex items-center gap-3 p-2 rounded-lg bg-secondary group">
                  <img src={card.image} alt={card.name} className="w-8 h-10 rounded object-cover" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold truncate text-foreground">{card.name}</p>
                    <p className="text-[10px] text-muted-foreground capitalize">{card.rarity} {card.type} · Lv.{progress.level}</p>
                  </div>
                  <button
                    onClick={() => toggleCard(card.id)}
                    className="text-muted-foreground hover:text-destructive transition-colors"
                    aria-label={`Remove ${card.name} from deck`}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </>
      )}

      {activeSynergies.length > 0 && (
        <div className="border-t border-border pt-4">
          <div className="flex items-center gap-1 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-synergy">Active Synergies</span>
          </div>
          <div className="space-y-2">
            {activeSynergies.map((syn) => (
              <div key={syn.name} className="synergy-highlight rounded-lg p-3">
                <p className="text-xs font-bold text-synergy">{syn.name}</p>
                <p className="text-[10px] text-muted-foreground">{syn.cards.join(" + ")}</p>
                <p className="text-[10px] text-synergy-glow mt-1">{syn.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const showFilterResults = search.trim().length > 0 || typeFilter !== "all" || rarityFilter !== "all" || elementFilter !== "all" || inDeckOnly;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-8">
      <div>
        <div className="flex items-end justify-between gap-3 mb-3">
          <h2 className="font-heading text-lg font-bold text-foreground">
            Choose Cards <span className="text-muted-foreground font-body text-sm">({deckIds.length}/{MAX_DECK_SIZE})</span>
          </h2>
          <div className="hidden xl:block text-xs text-muted-foreground">Tip: click cards to add/remove</div>
        </div>

        {/* My Presets - Accordion */}
        <Accordion type="single" collapsible className="mb-4">
          <AccordionItem value="presets" className="border-border">
            <AccordionTrigger className="py-3 hover:no-underline">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">My Presets</span>
                <Badge variant="secondary" className="text-[10px]">{presetCount}/5</Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-3 pt-1">
                <div className="flex flex-wrap items-center gap-2">
                  {(playerState.deckPresets || []).map((p) => (
                    <div key={p.id} className="flex items-center rounded-md border border-input overflow-hidden">
                      <button
                        type="button"
                        onClick={() => applyPreset(p)}
                        className="h-9 px-3 bg-card text-sm font-heading font-bold text-foreground hover:bg-secondary transition-colors"
                        title="Load preset"
                      >
                        {p.name}
                      </button>
                      <button
                        type="button"
                        onClick={() => startRenamePreset(p)}
                        className="h-9 px-2 bg-background text-xs text-muted-foreground hover:text-foreground border-l border-input"
                        title="Rename"
                      >
                        ✎
                      </button>
                      <button
                        type="button"
                        onClick={() => deletePreset(p.id)}
                        className="h-9 px-2 bg-background text-xs text-muted-foreground hover:text-destructive border-l border-input"
                        title="Delete"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  {deckIds.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setDeckIds([])}
                      className="h-9 px-3 rounded-md border border-input bg-background text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      Clear deck
                    </button>
                  )}
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Input value={newPresetName} onChange={(e) => setNewPresetName(e.target.value)} placeholder="Preset name (max 5)" />
                  <button
                    type="button"
                    onClick={savePreset}
                    className="h-10 px-4 rounded-md bg-primary text-primary-foreground font-heading font-bold text-sm hover:brightness-110 transition-colors"
                  >
                    Save preset
                  </button>
                </div>
                {renamePresetId && (
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Input value={renamePresetName} onChange={(e) => setRenamePresetName(e.target.value)} placeholder="New preset name" />
                    <button type="button" onClick={confirmRenamePreset} className="h-10 px-4 rounded-md bg-secondary text-secondary-foreground font-heading font-bold text-sm">
                      Rename
                    </button>
                    <button type="button" onClick={() => { setRenamePresetId(null); setRenamePresetName(""); }} className="h-10 px-4 rounded-md border border-input text-sm text-muted-foreground hover:text-foreground">
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        {/* Discovery controls */}
        <div className="mb-5 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_200px] gap-2">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search cards…"
            />
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortBy)}>
              <SelectTrigger>
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="rarity_desc">Rarity (high → low)</SelectItem>
                <SelectItem value="rarity_asc">Rarity (low → high)</SelectItem>
                <SelectItem value="name_asc">Name (A → Z)</SelectItem>
                <SelectItem value="name_desc">Name (Z → A)</SelectItem>
                <SelectItem value="level_desc">Level (high → low)</SelectItem>
                <SelectItem value="attack_desc">Attack (high → low)</SelectItem>
                <SelectItem value="defense_desc">Defense (high → low)</SelectItem>
                <SelectItem value="hp_desc">HP (high → low)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Filter badges row */}
          <div className="flex flex-wrap items-center gap-2">
            <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as typeof typeFilter)}>
              <SelectTrigger className="h-9 w-[130px]">
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="hero">Hero</SelectItem>
                <SelectItem value="god">God</SelectItem>
                <SelectItem value="weapon">Weapon</SelectItem>
                <SelectItem value="spell">Spell</SelectItem>
                <SelectItem value="trap">Trap</SelectItem>
              </SelectContent>
            </Select>

            <Select value={rarityFilter} onValueChange={(v) => setRarityFilter(v as typeof rarityFilter)}>
              <SelectTrigger className="h-9 w-[140px]">
                <SelectValue placeholder="All rarities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All rarities</SelectItem>
                <SelectItem value="legendary">Legendary</SelectItem>
                <SelectItem value="rare">Rare</SelectItem>
                <SelectItem value="common">Common</SelectItem>
              </SelectContent>
            </Select>

            <Select value={elementFilter} onValueChange={(v) => setElementFilter(v as typeof elementFilter)}>
              <SelectTrigger className="h-9 w-[140px]">
                <SelectValue placeholder="All elements" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All elements</SelectItem>
                <SelectItem value="fire">Fire</SelectItem>
                <SelectItem value="water">Water</SelectItem>
                <SelectItem value="earth">Earth</SelectItem>
                <SelectItem value="air">Air</SelectItem>
                <SelectItem value="shadow">Shadow</SelectItem>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="neutral">Neutral</SelectItem>
              </SelectContent>
            </Select>

            <button
              onClick={() => setInDeckOnly(v => !v)}
              className={cn(
                "h-9 px-3 rounded-md border text-sm transition-colors",
                inDeckOnly ? "border-primary bg-primary/10 text-primary font-semibold" : "border-input bg-background text-muted-foreground hover:text-foreground"
              )}
            >
              In deck
            </button>

            {showFilterResults && (
              <button
                onClick={() => { setSearch(""); setTypeFilter("all"); setRarityFilter("all"); setElementFilter("all"); setInDeckOnly(false); setSortBy("rarity_desc"); }}
                className="h-9 px-3 rounded-md border border-input text-sm text-muted-foreground hover:text-foreground"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        <CollectionView
          onAddToDeck={toggleCard}
          deckCardIds={deckIds}
          playerState={playerState}
          searchQuery={search}
          typeFilter={typeFilter}
          rarityFilter={rarityFilter}
          elementFilter={elementFilter}
          inDeckOnly={inDeckOnly}
          sortBy={sortBy}
        />
      </div>

      {/* Desktop sticky deck panel */}
      <div className="hidden xl:block xl:sticky xl:top-20 xl:self-start space-y-4">
        {deckPanel}
      </div>

      {/* Mobile deck bottom-sheet */}
      <div className="xl:hidden">
        <Sheet open={deckOpen} onOpenChange={setDeckOpen}>
          <SheetTrigger asChild>
            <button
              className={cn(
                "fixed bottom-4 right-4 z-40 rounded-full bg-primary text-primary-foreground px-4 py-3 shadow-lg border border-primary/30 hover:brightness-110 active:scale-95 transition-all",
                deckIds.length >= 4 && "animate-glow-pulse"
              )}
              aria-label="Open deck"
            >
              <span className="flex items-center gap-2">
                <Layers className="w-4 h-4" />
                Deck ({deckIds.length}/{MAX_DECK_SIZE})
                {deckIds.length >= 4 && <span className="w-2 h-2 rounded-full bg-destructive animate-pulse" />}
              </span>
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="p-4 max-h-[85vh] overflow-auto rounded-t-2xl">
            <SheetHeader className="mb-3">
              <SheetTitle>Deck ({deckIds.length}/{MAX_DECK_SIZE})</SheetTitle>
            </SheetHeader>
            {deckPanel}
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}
