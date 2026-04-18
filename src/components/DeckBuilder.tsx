import { useMemo, useState, useEffect } from "react";
import { allGameCards } from "@/data/cardIndex";
import CollectionView from "./CollectionView";
import {
  X, Swords, Layers, Shield, Zap, Flame, Plus, ChevronRight,
  Sparkles, Save, Trash2, Eye, EyeOff, ArrowLeft
} from "lucide-react";
import type { PlayerState, DeckPreset } from "@/lib/playerState";
import { getCardProgress } from "@/lib/playerState";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

const MAX_DECK_SIZE = 10;
const MAX_PRESETS = 5;

type WizardStep = "manage" | "pick" | "review";

type SortBy =
  | "rarity_desc"
  | "rarity_asc"
  | "name_asc"
  | "name_desc"
  | "attack_desc"
  | "defense_desc"
  | "hp_desc"
  | "level_desc";

interface DeckBuilderProps {
  onStartBattle?: (deckIds: string[]) => void;
  /** Shown above the deck when launching from Combat Hall for a special mode */
  pendingCombatHint?: string | null;
  playerState: PlayerState;
  onStateChange: (state: PlayerState) => void;
}

/* ─── Strength helpers ─── */
function getDeckStrength(deckCards: typeof allGameCards): "weak" | "balanced" | "strong" | "empty" {
  if (deckCards.length === 0) return "empty";
  const avg = deckCards.reduce((a, c) => a + c.attack + c.defense + c.hp, 0) / deckCards.length;
  if (avg > 180) return "strong";
  if (avg > 100) return "balanced";
  return "weak";
}

const strengthConfig = {
  empty: { label: "Empty", color: "text-muted-foreground", bg: "bg-muted" },
  weak: { label: "Weak", color: "text-destructive", bg: "bg-destructive/20" },
  balanced: { label: "Balanced", color: "text-primary", bg: "bg-primary/20" },
  strong: { label: "Strong", color: "text-synergy", bg: "bg-synergy/20" },
};

/* ─── Synergy detection ─── */
function getActiveSynergies(deckIds: string[]) {
  const deckCards = deckIds.map(id => allGameCards.find(c => c.id === id)!).filter(Boolean);
  const synergies: { name: string; description: string; cards: string[] }[] = [];
  for (const card of deckCards) {
    for (const syn of card.synergies) {
      if (deckIds.includes(syn.partnerId) && !synergies.find(s => s.name === syn.name)) {
        const partner = allGameCards.find(c => c.id === syn.partnerId);
        synergies.push({ name: syn.name, description: syn.description, cards: [card.name, partner?.name || ""] });
      }
    }
  }
  return synergies;
}

function getSynergyPartnerIds(deckIds: string[]): Set<string> {
  const partners = new Set<string>();
  const deckCards = deckIds.map(id => allGameCards.find(c => c.id === id)!).filter(Boolean);
  for (const card of deckCards) {
    for (const syn of card.synergies) {
      if (!deckIds.includes(syn.partnerId)) {
        partners.add(syn.partnerId);
      }
    }
  }
  return partners;
}

/* ─── Deck Warnings ─── */
function getDeckWarnings(deckCards: typeof allGameCards): string[] {
  const warnings: string[] = [];
  const heroGodCount = deckCards.filter(c => c.type === "hero" || c.type === "god").length;
  const spellCount = deckCards.filter(c => c.type === "spell").length;
  const weaponCount = deckCards.filter(c => c.type === "weapon").length;
  if (heroGodCount === 0 && deckCards.length > 0) warnings.push("No heroes or gods — your deck has no fighters!");
  if (spellCount > 6) warnings.push("Too many spells — consider more fighters");
  if (weaponCount === 0 && deckCards.length >= 5) warnings.push("No weapons equipped");
  return warnings;
}

export default function DeckBuilder({ onStartBattle, pendingCombatHint, playerState, onStateChange }: DeckBuilderProps) {
  const [step, setStep] = useState<WizardStep>("manage");
  const [deckIds, setDeckIds] = useState<string[]>([]);
  const [editingPresetId, setEditingPresetId] = useState<string | null>(null); // null = new deck
  const [deckName, setDeckName] = useState("");
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [expandedPresetId, setExpandedPresetId] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "hero" | "god" | "weapon" | "spell" | "trap">("all");
  const [rarityFilter, setRarityFilter] = useState<"all" | "legendary" | "rare" | "common">("all");
  const [elementFilter, setElementFilter] = useState<"all" | "fire" | "water" | "earth" | "air" | "shadow" | "light" | "neutral">("all");
  const [sortBy, setSortBy] = useState<SortBy>("rarity_desc");

  const presets = playerState.deckPresets || [];
  const deckCards = deckIds.map(id => allGameCards.find(c => c.id === id)!).filter(Boolean);
  const synergies = useMemo(() => getActiveSynergies(deckIds), [deckIds]);
  const synergyPartners = useMemo(() => getSynergyPartnerIds(deckIds), [deckIds]);
  const strength = getDeckStrength(deckCards);
  const warnings = useMemo(() => getDeckWarnings(deckCards), [deckCards]);
  const sConf = strengthConfig[strength];

  const heroGodCount = deckCards.filter(c => c.type === "hero" || c.type === "god").length;
  const weaponCount = deckCards.filter(c => c.type === "weapon").length;
  const spellCount = deckCards.filter(c => c.type === "spell").length;
  const trapCount = deckCards.filter(c => c.type === "trap").length;

  const avgStats = useMemo(() => {
    if (deckCards.length === 0) return { attack: 0, defense: 0, hp: 0 };
    const t = deckCards.reduce((a, c) => ({ attack: a.attack + c.attack, defense: a.defense + c.defense, hp: a.hp + c.hp }), { attack: 0, defense: 0, hp: 0 });
    return { attack: Math.round(t.attack / deckCards.length), defense: Math.round(t.defense / deckCards.length), hp: Math.round(t.hp / deckCards.length) };
  }, [deckCards]);

  // Auto-prompt save when deck hits 10
  useEffect(() => {
    if (deckIds.length === MAX_DECK_SIZE && step === "pick") {
      setStep("review");
    }
  }, [deckIds.length, step]);

  /** Remove one slot by index (tray order matches deckIds order). */
  const removeCardAtSlot = (index: number) => {
    setDeckIds((prev) => prev.filter((_, j) => j !== index));
  };

  /**
   * Toggle card in/out of deck. Ownership is only required when *adding* — otherwise you can
   * never remove cards that are still in a saved preset but no longer owned (fuse/sacrifice/sync).
   */
  const toggleCard = (cardId: string) => {
    setDeckIds((prev) => {
      if (prev.includes(cardId)) {
        return prev.filter((id) => id !== cardId);
      }
      if (!playerState.ownedCardIds.includes(cardId)) return prev;
      if (prev.length >= MAX_DECK_SIZE) return prev;
      return [...prev, cardId];
    });
  };

  const saveDeck = () => {
    const name = deckName.trim();
    if (!name) { toast({ title: "Name required", variant: "destructive" }); return; }
    if (deckIds.length === 0) { toast({ title: "Add some cards first", variant: "destructive" }); return; }

    const existing = [...presets];
    if (editingPresetId) {
      const idx = existing.findIndex(p => p.id === editingPresetId);
      if (idx >= 0) {
        existing[idx] = { ...existing[idx], name, cardIds: [...deckIds], updatedAt: Date.now() };
      }
    } else {
      if (existing.length >= MAX_PRESETS) { toast({ title: "Max 5 decks", description: "Delete one first.", variant: "destructive" }); return; }
      existing.push({ id: `preset_${Date.now()}`, name, cardIds: [...deckIds], updatedAt: Date.now() });
    }

    onStateChange({ ...playerState, deckPresets: existing });
    toast({ title: "Deck saved!", description: `"${name}" saved with ${deckIds.length} cards.` });
    setShowSaveDialog(false);
    setStep("manage");
    setDeckIds([]);
    setDeckName("");
    setEditingPresetId(null);
  };

  const deletePreset = (id: string) => {
    onStateChange({ ...playerState, deckPresets: presets.filter(p => p.id !== id) });
    if (expandedPresetId === id) setExpandedPresetId(null);
    toast({ title: "Deck deleted" });
  };

  const editPreset = (preset: DeckPreset) => {
    setEditingPresetId(preset.id);
    setDeckIds([...preset.cardIds]);
    setDeckName(preset.name);
    setStep("pick");
  };

  const startNewDeck = () => {
    setEditingPresetId(null);
    setDeckIds([]);
    setDeckName("");
    setStep("pick");
  };

  /* ═══════════════════════════════════════════════════════
     STEP 1: MANAGE — Gallery of saved decks
     ═══════════════════════════════════════════════════════ */
  const manageView = (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading text-xl font-bold text-foreground">My Decks</h2>
          <p className="text-sm text-muted-foreground">{presets.length}/{MAX_PRESETS} slots used</p>
        </div>
        {presets.length < MAX_PRESETS && (
          <Button onClick={startNewDeck} className="gap-2">
            <Plus className="w-4 h-4" /> New Deck
          </Button>
        )}
      </div>

      {presets.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Layers className="w-10 h-10 text-primary/40" />
          </div>
          <h3 className="font-heading text-lg font-bold text-foreground mb-2">No decks yet</h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-xs">
            Create your first deck to start battling! Pick 10 cards and save them as a deck.
          </p>
          <Button onClick={startNewDeck} size="lg" className="gap-2">
            <Plus className="w-5 h-5" /> Create Your First Deck
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {presets.map(preset => {
            const pCards = preset.cardIds.map(id => allGameCards.find(c => c.id === id)!).filter(Boolean);
            const pStrength = getDeckStrength(pCards);
            const pConf = strengthConfig[pStrength];
            const pSynergies = getActiveSynergies(preset.cardIds);
            const isExpanded = expandedPresetId === preset.id;

            return (
              <motion.div
                key={preset.id}
                layout
                className={cn(
                  "border rounded-xl overflow-hidden transition-colors cursor-pointer",
                  isExpanded ? "border-primary bg-card col-span-full" : "border-border bg-card hover:border-primary/50"
                )}
                onClick={() => setExpandedPresetId(isExpanded ? null : preset.id)}
              >
                {/* Header */}
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-heading text-base font-bold text-foreground truncate">{preset.name}</h3>
                    <Badge className={cn("text-[10px]", pConf.bg, pConf.color)}>{pConf.label}</Badge>
                  </div>

                  {/* Card art thumbnails */}
                  <div className="flex -space-x-2 mb-3">
                    {pCards.slice(0, 6).map(card => (
                      <img
                        key={card.id}
                        src={card.image}
                        alt={card.name}
                        className="w-9 h-12 rounded border-2 border-background object-cover"
                      />
                    ))}
                    {pCards.length > 6 && (
                      <div className="w-9 h-12 rounded border-2 border-background bg-secondary flex items-center justify-center text-[10px] font-bold text-muted-foreground">
                        +{pCards.length - 6}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    <span>{preset.cardIds.length} cards</span>
                    {pSynergies.length > 0 && (
                      <span className="text-synergy">✦ {pSynergies.length} synergies</span>
                    )}
                  </div>
                </div>

                {/* Expanded: show full card list + actions */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="border-t border-border p-4 space-y-3">
                        {/* Full card list */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                          {pCards.map(card => {
                            const prog = getCardProgress(playerState, card.id);
                            return (
                              <div key={card.id} className="flex items-center gap-2 bg-secondary rounded-lg p-2">
                                <img src={card.image} alt={card.name} className="w-8 h-10 rounded object-cover" />
                                <div className="min-w-0 flex-1">
                                  <p className="text-[11px] font-semibold text-foreground truncate">{card.name}</p>
                                  <p className="text-[9px] text-muted-foreground capitalize">{card.rarity} · Lv.{prog.level}</p>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Synergies */}
                        {pSynergies.length > 0 && (
                          <div className="space-y-1">
                            {pSynergies.map(s => (
                              <div key={s.name} className="synergy-highlight rounded-lg p-2 text-[10px]">
                                <span className="font-bold text-synergy">{s.name}</span>
                                <span className="text-muted-foreground ml-1">— {s.cards.join(" + ")}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                          <Button size="sm" onClick={() => editPreset(preset)} className="gap-1 flex-1">
                            <Layers className="w-3 h-3" /> Edit
                          </Button>
                          {onStartBattle && preset.cardIds.length >= 4 && (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => onStartBattle(preset.cardIds)}
                              className="gap-1 flex-1"
                            >
                              <Swords className="w-3 h-3" /> Battle!
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => deletePreset(preset.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );

  /* ═══════════════════════════════════════════════════════
     STEP 2: PICK — Live deck tray + card selection
     ═══════════════════════════════════════════════════════ */
  const pickView = (
    <div className="space-y-4">
      {/* Top bar */}
      <div className="flex items-center gap-3">
        <button onClick={() => { setStep("manage"); setDeckIds([]); setEditingPresetId(null); }} className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="font-heading text-lg font-bold text-foreground">
          {editingPresetId ? `Editing: ${deckName}` : "Build Your Deck"}
        </h2>
        <Badge variant="secondary" className="ml-auto font-heading">{deckIds.length}/{MAX_DECK_SIZE}</Badge>
      </div>

      {/* ── Live Deck Tray ── */}
      <div className="bg-card border border-border rounded-xl p-4">
        {/* Wizard progress */}
        <div className="flex items-center gap-2 mb-4">
          <div className="flex items-center gap-1">
            <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">1</div>
            <span className="text-xs font-semibold text-foreground hidden sm:inline">Pick Cards</span>
          </div>
          <div className="h-px flex-1 bg-border" />
          <div className="flex items-center gap-1">
            <div className={cn(
              "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
              deckIds.length >= 4 ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
            )}>2</div>
            <span className="text-xs font-semibold text-muted-foreground hidden sm:inline">Review & Save</span>
          </div>
        </div>

        {/* Card slots */}
        <div className="grid grid-cols-5 sm:grid-cols-10 gap-2 mb-3">
          {Array.from({ length: MAX_DECK_SIZE }).map((_, i) => {
            const slotId = deckIds[i];
            const card = slotId ? allGameCards.find((c) => c.id === slotId) : undefined;
            const isSynergyHighlight = card && synergies.some((s) => s.cards.includes(card.name));
            return (
              <motion.div
                key={`slot-${i}-${slotId ?? "empty"}`}
                layout
                className={cn(
                  "relative aspect-[3/4] rounded-lg border-2 overflow-hidden transition-all",
                  card
                    ? isSynergyHighlight
                      ? "border-synergy shadow-[0_0_8px_hsl(var(--synergy)/0.4)]"
                      : "border-primary/40"
                    : slotId
                      ? "border-destructive/50 bg-destructive/10"
                      : "border-dashed border-border bg-secondary/30",
                )}
              >
                {card ? (
                  <>
                    <img src={card.image} alt={card.name} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeCardAtSlot(i)}
                      className="absolute top-0 right-0 w-5 h-5 bg-background/80 rounded-bl flex items-center justify-center hover:bg-destructive hover:text-destructive-foreground transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent px-1 pb-0.5 pt-3">
                      <p className="text-[8px] font-bold text-white truncate">{card.name}</p>
                    </div>
                  </>
                ) : slotId ? (
                  <>
                    <div className="w-full h-full flex flex-col items-center justify-center p-1 text-center bg-secondary/80">
                      <p className="text-[8px] font-bold text-destructive leading-tight">Unavailable</p>
                      <p className="text-[7px] text-muted-foreground mt-0.5 break-all line-clamp-2">{slotId}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeCardAtSlot(i)}
                      className="absolute top-0 right-0 w-5 h-5 bg-background/80 rounded-bl flex items-center justify-center hover:bg-destructive hover:text-destructive-foreground transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Plus className="w-4 h-4 text-muted-foreground/30" />
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Strength meter + type composition */}
        <div className="flex flex-wrap items-center gap-3">
          <div className={cn("flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-bold", sConf.bg, sConf.color)}>
            <Sparkles className="w-3 h-3" /> {sConf.label}
          </div>
          {deckCards.length > 0 && (
            <>
              <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                <span>⚔️ {heroGodCount}</span>
                <span>🗡️ {weaponCount}</span>
                <span>✨ {spellCount}</span>
                <span>🪤 {trapCount}</span>
              </div>
            </>
          )}
          {warnings.map((w, i) => (
            <span key={i} className="text-[10px] text-destructive font-semibold">⚠ {w}</span>
          ))}
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 mt-3">
          {deckIds.length >= 4 && (
            <Button size="sm" onClick={() => setStep("review")} className="gap-1">
              Review Deck <ChevronRight className="w-3 h-3" />
            </Button>
          )}
          {deckIds.length > 0 && (
            <Button size="sm" variant="outline" onClick={() => setDeckIds([])}>
              Clear All
            </Button>
          )}
        </div>
      </div>

      {/* Synergy hints */}
      {synergyPartners.size > 0 && deckIds.length > 0 && deckIds.length < MAX_DECK_SIZE && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-synergy/10 border border-synergy/20">
          <Sparkles className="w-4 h-4 text-synergy shrink-0" />
          <p className="text-[11px] text-synergy">
            Cards with a <span className="font-bold">golden glow</span> below have synergies with your current deck!
          </p>
        </div>
      )}

      {/* Filters */}
      <div className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_200px] gap-2">
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search cards…" />
          <Select value={sortBy} onValueChange={v => setSortBy(v as SortBy)}>
            <SelectTrigger><SelectValue placeholder="Sort" /></SelectTrigger>
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
        <div className="flex flex-wrap items-center gap-2">
          <Select value={typeFilter} onValueChange={v => setTypeFilter(v as typeof typeFilter)}>
            <SelectTrigger className="h-9 w-[130px]"><SelectValue placeholder="All types" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="hero">Hero</SelectItem>
              <SelectItem value="god">God</SelectItem>
              <SelectItem value="weapon">Weapon</SelectItem>
              <SelectItem value="spell">Spell</SelectItem>
              <SelectItem value="trap">Trap</SelectItem>
            </SelectContent>
          </Select>
          <Select value={rarityFilter} onValueChange={v => setRarityFilter(v as typeof rarityFilter)}>
            <SelectTrigger className="h-9 w-[140px]"><SelectValue placeholder="All rarities" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All rarities</SelectItem>
              <SelectItem value="legendary">Legendary</SelectItem>
              <SelectItem value="rare">Rare</SelectItem>
              <SelectItem value="common">Common</SelectItem>
            </SelectContent>
          </Select>
          <Select value={elementFilter} onValueChange={v => setElementFilter(v as typeof elementFilter)}>
            <SelectTrigger className="h-9 w-[140px]"><SelectValue placeholder="All elements" /></SelectTrigger>
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
        </div>
      </div>

      {/* Card grid */}
      <CollectionView
        onAddToDeck={toggleCard}
        deckCardIds={deckIds}
        playerState={playerState}
        searchQuery={search}
        typeFilter={typeFilter}
        rarityFilter={rarityFilter}
        elementFilter={elementFilter}
        sortBy={sortBy}
        highlightCardIds={Array.from(synergyPartners)}
      />
    </div>
  );

  /* ═══════════════════════════════════════════════════════
     STEP 3: REVIEW — Full deck overview + save
     ═══════════════════════════════════════════════════════ */
  const reviewView = (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => setStep("pick")} className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="font-heading text-lg font-bold text-foreground">Review Your Deck</h2>
      </div>

      {/* Deck complete banner */}
      {deckIds.length === MAX_DECK_SIZE && (
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center py-4 px-6 rounded-xl bg-gradient-to-r from-synergy/20 via-primary/20 to-synergy/20 border border-synergy/30"
        >
          <h3 className="font-heading text-lg font-bold text-synergy mb-1">🎉 Deck Complete!</h3>
          <p className="text-xs text-muted-foreground">Save your deck to use it in battle</p>
        </motion.div>
      )}

      {/* Strength meter */}
      <div className="bg-card border border-border rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-foreground">Deck Strength</h3>
          <Badge className={cn(sConf.bg, sConf.color)}>{sConf.label}</Badge>
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Flame className="w-3 h-3 text-destructive" />
            <span className="text-[10px] text-muted-foreground w-10">ATK</span>
            <Progress value={(avgStats.attack / 100) * 100} className="h-2 flex-1 bg-secondary" />
            <span className="text-xs font-bold text-foreground w-8 text-right">{avgStats.attack}</span>
          </div>
          <div className="flex items-center gap-2">
            <Shield className="w-3 h-3 text-primary" />
            <span className="text-[10px] text-muted-foreground w-10">DEF</span>
            <Progress value={(avgStats.defense / 100) * 100} className="h-2 flex-1 bg-secondary" />
            <span className="text-xs font-bold text-foreground w-8 text-right">{avgStats.defense}</span>
          </div>
          <div className="flex items-center gap-2">
            <Zap className="w-3 h-3 text-synergy" />
            <span className="text-[10px] text-muted-foreground w-10">HP</span>
            <Progress value={(avgStats.hp / 100) * 100} className="h-2 flex-1 bg-secondary" />
            <span className="text-xs font-bold text-foreground w-8 text-right">{avgStats.hp}</span>
          </div>
        </div>

        {/* Composition bar */}
        {deckCards.length > 0 && (
          <div className="space-y-1">
            <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Composition</p>
            <div className="flex h-3 rounded-full overflow-hidden">
              {heroGodCount > 0 && <div className="bg-primary" style={{ width: `${(heroGodCount / deckCards.length) * 100}%` }} title={`Heroes/Gods: ${heroGodCount}`} />}
              {weaponCount > 0 && <div className="bg-[hsl(var(--legendary))]" style={{ width: `${(weaponCount / deckCards.length) * 100}%` }} title={`Weapons: ${weaponCount}`} />}
              {spellCount > 0 && <div className="bg-synergy" style={{ width: `${(spellCount / deckCards.length) * 100}%` }} title={`Spells: ${spellCount}`} />}
              {trapCount > 0 && <div className="bg-destructive" style={{ width: `${(trapCount / deckCards.length) * 100}%` }} title={`Traps: ${trapCount}`} />}
            </div>
            <div className="flex flex-wrap gap-2 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-primary" /> Heroes/Gods: {heroGodCount}</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[hsl(var(--legendary))]" /> Weapons: {weaponCount}</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-synergy" /> Spells: {spellCount}</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-destructive" /> Traps: {trapCount}</span>
            </div>
          </div>
        )}

        {/* Warnings */}
        {warnings.length > 0 && (
          <div className="space-y-1 pt-2 border-t border-border">
            {warnings.map((w, i) => (
              <p key={i} className="text-xs text-destructive">⚠ {w}</p>
            ))}
          </div>
        )}
      </div>

      {/* Cards grid */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {deckIds.map((id, index) => {
          const card = allGameCards.find((c) => c.id === id);
          if (!card) {
            return (
              <div
                key={`review-${index}-${id}`}
                className="relative rounded-lg border-2 border-destructive/40 overflow-hidden bg-secondary/60 flex flex-col items-center justify-center aspect-[3/4] p-2 group"
              >
                <p className="text-[10px] font-bold text-destructive text-center">Card not in collection</p>
                <p className="text-[8px] text-muted-foreground break-all text-center mt-1 line-clamp-3">{id}</p>
                <button
                  type="button"
                  onClick={() => removeCardAtSlot(index)}
                  className="absolute top-1 right-1 w-6 h-6 bg-background/70 rounded-full flex items-center justify-center opacity-80 group-hover:opacity-100 hover:bg-destructive hover:text-destructive-foreground"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            );
          }
          const prog = getCardProgress(playerState, card.id);
          const hasSynergy = synergies.some((s) => s.cards.includes(card.name));
          return (
            <div
              key={`review-${index}-${card.id}`}
              className={cn(
                "relative rounded-lg border-2 overflow-hidden group",
                hasSynergy ? "border-synergy shadow-[0_0_8px_hsl(var(--synergy)/0.3)]" : "border-border",
              )}
            >
              <img src={card.image} alt={card.name} className="w-full aspect-[3/4] object-cover" />
              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 to-transparent p-2 pt-6">
                <p className="text-xs font-bold text-white truncate">{card.name}</p>
                <p className="text-[9px] text-white/70 capitalize">
                  {card.rarity} {card.type} · Lv.{prog.level}
                </p>
              </div>
              <button
                type="button"
                onClick={() => removeCardAtSlot(index)}
                className="absolute top-1 right-1 w-6 h-6 bg-background/70 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive hover:text-destructive-foreground"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Synergies */}
      {synergies.length > 0 && (
        <div className="bg-card border border-border rounded-xl p-4 space-y-2">
          <h3 className="text-sm font-bold text-synergy flex items-center gap-1">
            <Sparkles className="w-4 h-4" /> Active Synergies ({synergies.length})
          </h3>
          {synergies.map(s => (
            <div key={s.name} className="synergy-highlight rounded-lg p-3">
              <p className="text-xs font-bold text-synergy">{s.name}</p>
              <p className="text-[10px] text-muted-foreground">{s.cards.join(" + ")}</p>
              <p className="text-[10px] text-synergy-glow mt-1">{s.description}</p>
            </div>
          ))}
        </div>
      )}

      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button onClick={() => setShowSaveDialog(true)} className="flex-1 gap-2" size="lg">
          <Save className="w-4 h-4" /> Save Deck
        </Button>
        {onStartBattle && deckIds.length >= 4 && (
          <Button onClick={() => onStartBattle(deckIds)} variant="destructive" className="flex-1 gap-2" size="lg">
            <Swords className="w-4 h-4" /> Battle Now!
          </Button>
        )}
        <Button onClick={() => setStep("pick")} variant="outline" className="gap-2">
          <ArrowLeft className="w-4 h-4" /> Edit Cards
        </Button>
      </div>

      {/* Save dialog */}
      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Deck</DialogTitle>
            <DialogDescription>Give your deck a name to save it.</DialogDescription>
          </DialogHeader>
          <Input
            value={deckName}
            onChange={e => setDeckName(e.target.value)}
            placeholder="e.g. Fire Aggro, Shadow Control…"
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>Cancel</Button>
            <Button onClick={saveDeck} className="gap-1">
              <Save className="w-4 h-4" /> Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );

  return (
    <div>
      {pendingCombatHint ? (
        <div className="mb-4 p-3 rounded-xl border border-primary/30 bg-primary/5 text-sm text-foreground">
          {pendingCombatHint}
        </div>
      ) : null}
      {step === "manage" && manageView}
      {step === "pick" && pickView}
      {step === "review" && reviewView}
    </div>
  );
}
