import { useMemo, useState } from "react";
import { AlertTriangle, Minus, Plus, RotateCcw, Save } from "lucide-react";
import type { DeckPreset, PlayerState } from "@/lib/playerState";
import { getCardProgress } from "@/lib/playerState";
import { allGameCards, type CardType } from "@/data/cardIndex";
import { cn } from "@/lib/utils";
import CollectionView from "@/components/CollectionView";
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

function countById(ids: string[]): Record<string, number> {
  const m: Record<string, number> = {};
  for (const id of ids) m[id] = (m[id] || 0) + 1;
  return m;
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
  const [deckName, setDeckName] = useState<string>(() => presets[0]?.name ?? "");

  const [typeFilter, setTypeFilter] = useState<"all" | CardType>("all");
  const [search, setSearch] = useState("");
  const [showSaveDialog, setShowSaveDialog] = useState(false);

  const counts = useMemo(() => countById(deckIds), [deckIds]);
  const deckCards = useMemo(
    () => deckIds.map((id) => allGameCards.find((c) => c.id === id)).filter(Boolean),
    [deckIds],
  );

  const breakdown = useMemo(() => {
    const types: Partial<Record<CardType, number>> = {};
    for (const c of deckCards) types[c.type] = (types[c.type] || 0) + 1;
    return types;
  }, [deckCards]);

  const underMinToBattle = deckIds.length < 4;

  /** Remove a single copy from the deck. */
  const removeOne = (cardId: string) => {
    setDeckIds((prev) => {
      const idx = prev.lastIndexOf(cardId);
      if (idx < 0) return prev;
      const next = [...prev];
      next.splice(idx, 1);
      return next;
    });
  };

  /**
   * Add one copy respecting owned + dubs cap.
   * (Mythic: 1 copy. Others: up to 3, limited by dubs.)
   */
  const addOne = (cardId: string) => {
    setDeckIds((prev) => {
      const countInDeck = prev.reduce((n, id) => (id === cardId ? n + 1 : n), 0);
      const owned = playerState.ownedCardIds.includes(cardId);
      const dubs = Math.max(0, Math.floor(Number(playerState.cardDubs?.[cardId] || 0)));
      const card = allGameCards.find((c) => c.id === cardId);
      const maxCopies =
        owned && card ? (card.rarity === "mythic" ? 1 : Math.min(3, 1 + dubs)) : 0;
      if (!owned || maxCopies <= 0) return prev;
      if (prev.length >= MAX_DECK_SIZE) return prev;
      if (countInDeck >= maxCopies) return prev;
      return [...prev, cardId];
    });
  };

  const reset = () => {
    setEditingPresetId(null);
    setDeckName("");
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
      existing.push({ id: `preset_${Date.now()}`, name, cardIds: [...deckIds], updatedAt: Date.now() });
      setEditingPresetId(existing[existing.length - 1].id);
    }

    onStateChange({ ...playerState, deckPresets: existing });
    setShowSaveDialog(false);
    toast({ title: "Deck saved!", description: `"${name}" saved with ${deckIds.length} cards.` });
  };

  const loadPreset = (preset: DeckPreset) => {
    setEditingPresetId(preset.id);
    setDeckName(preset.name);
    setDeckIds([...preset.cardIds]);
  };

  const sortedDeckRows = useMemo(() => {
    const rows = Object.entries(counts)
      .map(([id, count]) => ({ id, count, card: allGameCards.find((c) => c.id === id) || null }))
      .filter((r) => r.card);
    rows.sort((a, b) => (a.card!.type.localeCompare(b.card!.type) || a.card!.name.localeCompare(b.card!.name)));
    return rows as Array<{ id: string; count: number; card: (typeof allGameCards)[number] }>;
  }, [counts]);

  return (
    <div className="relative min-h-[calc(100vh-72px)] px-5 md:px-10 py-8" data-testid="deck-screen">
      <div className="section-heading mb-2">The Grimoire</div>
      <p className="text-center font-lore text-[#d6c293] mb-6">
        Forge your deck. Tap a card to enlist it into your summoner&apos;s arsenal.
      </p>

      {/* Presets */}
      <div className="max-w-6xl mx-auto panel-gold p-4 mb-4 relative">
        <div className="corner-deco absolute inset-0" />
        <div className="relative z-10 flex flex-wrap items-center gap-3">
          <div className="font-heading text-[#f5c842] tracking-[0.25em] text-xs">MY DECKS</div>
          <div className="font-stat text-[10px] text-[#c9a74a]">{presets.length}/{MAX_PRESETS} slots used</div>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <select
              value={editingPresetId ?? ""}
              onChange={(e) => {
                const id = e.target.value || null;
                const p = presets.find((x) => x.id === id);
                if (p) loadPreset(p);
                else {
                  setEditingPresetId(null);
                  setDeckName("");
                  setDeckIds([]);
                }
              }}
              className="px-3 py-2 rounded-full text-xs font-body text-[#f8e4a1] outline-none"
              style={{ background: "rgba(10,6,3,0.8)", border: "1px solid rgba(212,175,55,0.4)" }}
            >
              <option value="">New Deck</option>
              {presets.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <button type="button" className="btn-ghost" onClick={() => setShowSaveDialog(true)}>
              <Save size={12} /> Save Deck
            </button>
          </div>
        </div>
      </div>

      {/* Deck stats */}
      <div className="max-w-6xl mx-auto panel-gold p-4 mb-6 flex flex-wrap items-center gap-6 relative">
        <div className="corner-deco absolute inset-0" />
        <Stat label="Deck Size" value={`${deckIds.length} / ${MAX_DECK_SIZE}`} danger={underMinToBattle} />
        <Stat label="Heroes" value={breakdown.hero || 0} />
        <Stat label="Gods" value={breakdown.god || 0} />
        <Stat label="Weapons" value={breakdown.weapon || 0} />
        <Stat label="Spells" value={breakdown.spell || 0} />
        <Stat label="Traps" value={breakdown.trap || 0} />
        <div className="ml-auto flex gap-2">
          <button className="btn-ghost flex items-center gap-2" onClick={reset} data-testid="reset-deck-btn" type="button">
            <RotateCcw size={12} /> Reset
          </button>
          <button className="btn-gold flex items-center gap-2" onClick={() => setShowSaveDialog(true)} data-testid="save-deck-btn" type="button">
            <Save size={14} /> Save Deck
          </button>
        </div>
        {underMinToBattle && (
          <div className="w-full flex items-center gap-2 text-[#ff9966] font-stat text-xs tracking-widest mt-1">
            <AlertTriangle size={14} /> Deck must contain at least 4 cards to battle.
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
        {/* Collection */}
        <div>
          <div className="font-heading text-[#f5c842] tracking-[0.25em] mb-3">
            COLLECTION ({playerState.ownedCardIds.length})
          </div>
          <div className="flex flex-wrap gap-1 mb-3">
            {TYPE_FILTERS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTypeFilter(t.id)}
                className={cn("btn-ghost", typeFilter === t.id ? "active" : "")}
                style={{ padding: "5px 10px", fontSize: 10 }}
                type="button"
              >
                {t.label}
              </button>
            ))}
          </div>
          <input
            placeholder="Search…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            data-testid="deck-search"
            className="w-full px-3 py-1.5 mb-4 rounded-full font-body text-xs text-[#f8e4a1] outline-none"
            style={{ background: "rgba(10,6,3,0.8)", border: "1px solid rgba(212,175,55,0.4)" }}
          />

          <div className="panel-gold p-3 relative">
            <div className="corner-deco absolute inset-0" />
            <div className="relative z-10">
              <CollectionView
                onAddToDeck={(id) => addOne(id)}
                deckCardIds={deckIds}
                playerState={playerState}
                searchQuery={search}
                typeFilter={typeFilter}
                rarityFilter="all"
                elementFilter="all"
                sortBy="rarity_desc"
                maxCards={36}
                showLoreArcFilters={false}
              />
            </div>
          </div>
        </div>

        {/* Current deck list */}
        <div>
          <div className="font-heading text-[#f5c842] tracking-[0.25em] mb-4">YOUR DECK</div>
          <div className="panel-gold p-3 relative max-h-[700px] overflow-y-auto">
            <div className="corner-deco absolute inset-0" />
            <div className="relative z-10">
              {sortedDeckRows.length === 0 ? (
                <div className="font-lore text-[#c9a74a] text-center py-12">Your grimoire lies empty…</div>
              ) : (
                sortedDeckRows.map(({ id, count, card }) => {
                  const prog = getCardProgress(playerState, card.id);
                  const owned = playerState.ownedCardIds.includes(card.id);
                  const dubs = Math.max(0, Math.floor(Number(playerState.cardDubs?.[card.id] || 0)));
                  const maxCopies = card.rarity === "mythic" ? 1 : Math.min(3, 1 + dubs);
                  const canAdd = owned && deckIds.length < MAX_DECK_SIZE && count < maxCopies;
                  return (
                    <div
                      key={id}
                      data-testid={`deck-row-${id}`}
                      className="flex items-center gap-3 p-2 rounded mb-2"
                      style={{
                        background: "linear-gradient(90deg, rgba(22,15,8,0.9), rgba(10,6,3,0.6))",
                        border: "1px solid rgba(212,175,55,0.25)",
                      }}
                    >
                      <div
                        className="w-10 h-14 rounded bg-cover bg-center shrink-0"
                        style={{
                          backgroundImage: `url(${card.image})`,
                          border: "1px solid rgba(212,175,55,0.5)",
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-heading text-[#f8e4a1] text-sm truncate">{card.name}</div>
                        <div className="font-stat text-[10px] tracking-[0.15em] text-[#c9a74a] uppercase">
                          {card.type} · {card.rarity} · Lv.{prog.level}
                        </div>
                      </div>
                      <div className="font-heading text-[#f5c842] text-sm w-8 text-center">×{count}</div>
                      <button
                        className="btn-ghost px-2"
                        onClick={() => removeOne(id)}
                        data-testid={`remove-${id}`}
                        type="button"
                        title="Remove one copy"
                      >
                        <Minus size={12} />
                      </button>
                      <button
                        className={cn("btn-ghost px-2", !canAdd && "opacity-50 cursor-not-allowed")}
                        onClick={() => canAdd && addOne(id)}
                        type="button"
                        title={canAdd ? "Add one copy" : "At copy cap or deck full"}
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                  );
                })
              )}

              {onStartBattle && (
                <div className="pt-3 mt-3 border-t border-[rgba(212,175,55,0.18)] flex justify-end">
                  <Button
                    onClick={() => !underMinToBattle && onStartBattle(deckIds)}
                    disabled={underMinToBattle}
                    className="btn-gold"
                    type="button"
                  >
                    Begin Battle
                  </Button>
                </div>
              )}
            </div>
          </div>
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

function Stat({ label, value, danger }: { label: string; value: string | number; danger?: boolean }) {
  return (
    <div className="flex flex-col">
      <div className="font-stat text-[10px] tracking-[0.2em] uppercase text-[#c9a74a]">{label}</div>
      <div className={cn("font-heading text-lg", danger ? "text-[#ff7043]" : "text-[#f8e4a1]")}>
        {value}
      </div>
    </div>
  );
}

