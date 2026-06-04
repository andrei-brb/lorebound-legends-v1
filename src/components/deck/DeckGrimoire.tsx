import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, RotateCcw, Save, SlidersHorizontal } from "lucide-react";
import type { DeckPreset, PlayerState } from "@/lib/playerState";
import { allGameCards, type CardType, type GameCard } from "@/data/cardIndex";
import { cn } from "@/lib/utils";
import CollectionView from "@/components/CollectionView";
import DeckCardInspector from "@/components/deck/DeckCardInspector";
import DeckCenterGrid from "@/components/deck/DeckCenterGrid";
import { toast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const MAX_DECK_SIZE = 10;
const MAX_PRESETS = 5;

const TYPE_FILTERS: Array<{ id: "all" | CardType; label: string }> = [
  { id: "all", label: "All" },
  { id: "hero", label: "Hero" },
  { id: "god", label: "God" },
  { id: "weapon", label: "Weapon" },
  { id: "spell", label: "Spell" },
  { id: "trap", label: "Trap" },
];

const SORT_OPTIONS = [
  { id: "rarity_desc" as const, label: "Rarity (high → low)" },
  { id: "name_asc" as const, label: "Name (A → Z)" },
  { id: "attack_desc" as const, label: "Attack (high → low)" },
  { id: "level_desc" as const, label: "Level (high → low)" },
];

const RARITY_BAR = [
  { key: "common" as const, label: "C", color: "bg-zinc-500" },
  { key: "rare" as const, label: "R", color: "bg-blue-600" },
  { key: "legendary" as const, label: "L", color: "bg-amber-500 text-[#0A0A0A]" },
  { key: "mythic" as const, label: "M", color: "bg-fuchsia-600" },
];

function countById(ids: string[]): Record<string, number> {
  const m: Record<string, number> = {};
  for (const id of ids) m[id] = (m[id] || 0) + 1;
  return m;
}

function getMaxCopies(cardId: string, playerState: PlayerState): number {
  const owned = playerState.ownedCardIds.includes(cardId);
  if (!owned) return 0;
  const card = allGameCards.find((c) => c.id === cardId);
  if (!card) return 0;
  const dubs = Math.max(0, Math.floor(Number(playerState.cardDubs?.[cardId] || 0)));
  return card.rarity === "mythic" ? 1 : Math.min(3, 1 + dubs);
}

export default function DeckGrimoire(props: {
  playerState: PlayerState;
  onStateChange: (s: PlayerState) => void;
  onStartBattle?: (deckIds: string[]) => void;
}) {
  const { playerState, onStateChange, onStartBattle } = props;

  const presets = playerState.deckPresets || [];
  const [editingPresetId, setEditingPresetId] = useState<string | null>(presets[0]?.id ?? null);
  const [deckIds, setDeckIds] = useState<string[]>(() => {
    const p = presets[0];
    return p?.cardIds ? [...p.cardIds] : [];
  });
  const [deckName, setDeckName] = useState<string>(() => presets[0]?.name ?? "New Deck");
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);

  const [typeFilter, setTypeFilter] = useState<"all" | CardType>("all");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<(typeof SORT_OPTIONS)[number]["id"]>("rarity_desc");
  const [showSaveDialog, setShowSaveDialog] = useState(false);

  const counts = useMemo(() => countById(deckIds), [deckIds]);

  const deckSlots = useMemo(() => {
    return deckIds.map((id, index) => {
      const card = allGameCards.find((c) => c.id === id);
      if (!card) return null;
      return { card, slotKey: `${id}-${index}` };
    }).filter(Boolean) as Array<{ card: GameCard; slotKey: string }>;
  }, [deckIds]);

  const rarityInDeck = useMemo(() => {
    const r = { common: 0, rare: 0, legendary: 0, mythic: 0 };
    for (const id of deckIds) {
      const c = allGameCards.find((x) => x.id === id);
      if (c && c.rarity in r) r[c.rarity as keyof typeof r] += 1;
    }
    return r;
  }, [deckIds]);

  const underMinToBattle = deckIds.length < 4;

  const selectedCard = selectedCardId ? allGameCards.find((c) => c.id === selectedCardId) ?? null : null;
  const selectedCount = selectedCardId ? counts[selectedCardId] || 0 : 0;
  const selectedMax = selectedCardId ? getMaxCopies(selectedCardId, playerState) : 0;

  useEffect(() => {
    if (selectedCardId && allGameCards.some((c) => c.id === selectedCardId)) return;
    const fallback = deckIds[0] ?? playerState.ownedCardIds[0] ?? null;
    setSelectedCardId(fallback);
  }, [selectedCardId, deckIds, playerState.ownedCardIds]);

  const removeOne = (cardId: string) => {
    setDeckIds((prev) => {
      const idx = prev.lastIndexOf(cardId);
      if (idx < 0) return prev;
      const next = [...prev];
      next.splice(idx, 1);
      return next;
    });
  };

  const addOne = (cardId: string) => {
    setDeckIds((prev) => {
      const countInDeck = prev.reduce((n, id) => (id === cardId ? n + 1 : n), 0);
      const maxCopies = getMaxCopies(cardId, playerState);
      if (maxCopies <= 0) return prev;
      if (prev.length >= MAX_DECK_SIZE) return prev;
      if (countInDeck >= maxCopies) return prev;
      return [...prev, cardId];
    });
  };

  const reset = () => {
    setEditingPresetId(null);
    setDeckName("New Deck");
    setDeckIds([]);
    toast({ title: "Deck reset" });
  };

  const saveDeck = () => {
    const name = deckName.trim();
    if (!name) {
      toast({ title: "Name required", variant: "destructive" });
      return;
    }
    if (deckIds.length === 0) {
      toast({ title: "Add some cards first", variant: "destructive" });
      return;
    }

    const existing = [...presets];
    if (editingPresetId) {
      const idx = existing.findIndex((p) => p.id === editingPresetId);
      if (idx >= 0) {
        existing[idx] = { ...existing[idx], name, cardIds: [...deckIds], updatedAt: Date.now() };
      } else {
        existing.push({ id: `preset_${Date.now()}`, name, cardIds: [...deckIds], updatedAt: Date.now() });
      }
    } else {
      if (existing.length >= MAX_PRESETS) {
        toast({ title: "Max 5 decks", description: "Delete one first.", variant: "destructive" });
        return;
      }
      const id = `preset_${Date.now()}`;
      existing.push({ id, name, cardIds: [...deckIds], updatedAt: Date.now() });
      setEditingPresetId(id);
    }

    onStateChange({ ...playerState, deckPresets: existing });
    setShowSaveDialog(false);
    toast({ title: "Deck saved!", description: `"${name}" saved with ${deckIds.length} cards.` });
  };

  const loadPreset = (preset: DeckPreset) => {
    setEditingPresetId(preset.id);
    setDeckName(preset.name);
    setDeckIds([...preset.cardIds]);
    if (preset.cardIds[0]) setSelectedCardId(preset.cardIds[0]);
  };

  const panelBg = {
    background: "linear-gradient(180deg, rgba(14,10,6,0.98), rgba(8,5,3,0.99))",
    borderColor: "rgba(212,175,55,0.18)",
  };

  return (
    <div
      className="flex flex-col -mx-4 sm:-mx-6 md:-mx-8 -mt-8 min-h-[calc(100svh-5rem)]"
      data-testid="deck-screen"
    >
      {/* Top bar */}
      <div
        className="shrink-0 flex flex-wrap items-center gap-3 px-4 py-3 border-b z-20"
        style={{
          ...panelBg,
          borderBottom: "1px solid rgba(212,175,55,0.22)",
        }}
      >
        <div className="flex items-center gap-2">
          {RARITY_BAR.map(({ key, label, color }) => (
            <div
              key={key}
              className="flex items-center gap-1.5 px-2 py-1 rounded-md border border-[rgba(255,255,255,0.08)]"
              style={{ background: "rgba(0,0,0,0.35)" }}
            >
              <span className={cn("text-[9px] font-bold w-4 h-4 rounded flex items-center justify-center", color)}>
                {label}
              </span>
              <span className="font-stat text-xs text-[#f8e4a1] tabular-nums">{rarityInDeck[key]}</span>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 ml-auto flex-wrap">
          <select
            value={editingPresetId ?? ""}
            onChange={(e) => {
              const id = e.target.value || null;
              const p = presets.find((x) => x.id === id);
              if (p) loadPreset(p);
              else {
                setEditingPresetId(null);
                setDeckName("New Deck");
                setDeckIds([]);
              }
            }}
            className="px-3 py-1.5 rounded-md text-xs font-body text-[#f8e4a1] outline-none"
            style={{ background: "rgba(10,6,3,0.8)", border: "1px solid rgba(212,175,55,0.4)" }}
          >
            <option value="">New Deck</option>
            {presets.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <span className="font-stat text-[10px] text-[#9a7b3c]">{presets.length}/{MAX_PRESETS}</span>
          <button type="button" className="btn-ghost text-xs" onClick={reset} data-testid="reset-deck-btn">
            <RotateCcw size={12} /> Reset
          </button>
          <button type="button" className="btn-gold text-xs" onClick={() => setShowSaveDialog(true)} data-testid="save-deck-btn">
            <Save size={12} /> Save
          </button>
          {onStartBattle && (
            <Button
              onClick={() => !underMinToBattle && onStartBattle(deckIds)}
              disabled={underMinToBattle}
              className="btn-gold text-xs h-8"
              type="button"
            >
              Battle
            </Button>
          )}
        </div>
      </div>

      {underMinToBattle && (
        <div className="shrink-0 px-4 py-1.5 flex items-center gap-2 text-[#ff9966] font-stat text-xs bg-[rgba(255,100,50,0.08)] border-b border-[rgba(255,100,50,0.2)]">
          <AlertTriangle size={14} /> At least 4 cards required to battle.
        </div>
      )}

      {/* 3-column body */}
      <div className="flex flex-1 min-h-0 flex-col lg:flex-row">
        {/* Left: inspector */}
        <aside
          className="hidden lg:flex w-[260px] shrink-0 flex-col border-r min-h-0"
          style={panelBg}
        >
          <DeckCardInspector
            card={selectedCard}
            playerState={playerState}
            countInDeck={selectedCount}
            maxCopies={selectedMax}
            deckFull={deckIds.length >= MAX_DECK_SIZE}
            onAdd={() => selectedCardId && addOne(selectedCardId)}
            onRemove={() => selectedCardId && removeOne(selectedCardId)}
          />
        </aside>

        {/* Center: deck grid */}
        <section className="flex-1 min-w-0 min-h-[280px] lg:min-h-0 border-b lg:border-b-0 lg:border-r" style={panelBg}>
          <DeckCenterGrid
            deckName={deckName}
            onDeckNameChange={setDeckName}
            deckSlots={deckSlots}
            maxSize={MAX_DECK_SIZE}
            selectedCardId={selectedCardId}
            onSelectCard={setSelectedCardId}
          />
        </section>

        {/* Right: card list */}
        <aside className="w-full lg:w-[min(440px,42vw)] shrink-0 flex flex-col min-h-[360px] lg:min-h-0 border-l" style={panelBg}>
          <div
            className="shrink-0 px-3 py-2 flex items-center gap-2 border-b border-[rgba(212,175,55,0.15)]"
            style={{ background: "rgba(76,175,80,0.12)" }}
          >
            <span className="font-heading text-xs tracking-widest text-[#a5d6a7] uppercase">Card List</span>
            <span className="ml-auto font-stat text-[10px] text-[#9a7b3c]">{playerState.ownedCardIds.length} owned</span>
          </div>

          <div className="shrink-0 p-3 space-y-2 border-b border-[rgba(212,175,55,0.12)]">
            <input
              placeholder="Search by card name…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              data-testid="deck-search"
              className="w-full px-3 py-2 rounded-md font-body text-xs text-[#f8e4a1] outline-none"
              style={{ background: "rgba(10,6,3,0.85)", border: "1px solid rgba(212,175,55,0.35)" }}
            />
            <div className="flex flex-wrap gap-1">
              {TYPE_FILTERS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTypeFilter(t.id)}
                  className={cn("btn-ghost px-2 py-1", typeFilter === t.id ? "active" : "")}
                  style={{ fontSize: 9 }}
                  type="button"
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <SlidersHorizontal size={12} className="text-[#9a7b3c] shrink-0" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as (typeof SORT_OPTIONS)[number]["id"])}
                className="flex-1 px-2 py-1.5 rounded-md text-[10px] font-body text-[#f8e4a1] outline-none"
                style={{ background: "rgba(10,6,3,0.8)", border: "1px solid rgba(212,175,55,0.3)" }}
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto p-2">
            <CollectionView
              onSelectCard={(id) => setSelectedCardId(id)}
              selectedCardId={selectedCardId}
              deckCardIds={deckIds}
              playerState={playerState}
              searchQuery={search}
              typeFilter={typeFilter}
              rarityFilter="all"
              sortBy={sortBy}
              maxCards={48}
              showLoreArcFilters={false}
            />
          </div>
        </aside>

        {/* Mobile inspector strip */}
        <div className="lg:hidden border-t shrink-0 max-h-[220px] overflow-hidden" style={panelBg}>
          <DeckCardInspector
            card={selectedCard}
            playerState={playerState}
            countInDeck={selectedCount}
            maxCopies={selectedMax}
            deckFull={deckIds.length >= MAX_DECK_SIZE}
            onAdd={() => selectedCardId && addOne(selectedCardId)}
            onRemove={() => selectedCardId && removeOne(selectedCardId)}
          />
        </div>
      </div>

      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Deck</DialogTitle>
            <DialogDescription>Name your deck to save it.</DialogDescription>
          </DialogHeader>
          <Input
            value={deckName}
            onChange={(e) => setDeckName(e.target.value)}
            placeholder="e.g. Fire Aggro, Shadow Control…"
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
              Cancel
            </Button>
            <Button onClick={saveDeck} className="gap-1">
              <Save className="w-4 h-4" /> Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
