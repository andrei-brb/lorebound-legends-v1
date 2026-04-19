import { useEffect, useMemo, useState } from "react";
import { Loader2, X, Search, ArrowLeftRight, Sparkles } from "lucide-react";
import { api } from "@/lib/apiClient";
import { allCards } from "@/data/cards";
import type { PlayerState } from "@/lib/playerState";
import { toast } from "@/hooks/use-toast";
import GlassPanel from "./scene/GlassPanel";
import HexAvatar from "./scene/HexAvatar";
import GameCard from "./GameCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import boxBazaar from "@/assets/box-tex-bazaar.jpg";
import boxParchment from "@/assets/box-tex-parchment.jpg";
import boxVelvet from "@/assets/box-tex-velvet.jpg";
import boxStone from "@/assets/box-tex-stone.jpg";

/** Textured top banner used inside any panel (panels must use padding="md" = p-5) */
function PanelBanner({ src, height = 64, title, hint }: { src: string; height?: number; title?: string; hint?: string }) {
  return (
    <div className="relative overflow-hidden rounded-t-2xl -mx-5 -mt-5 mb-3" style={{ height }} aria-hidden>
      <img src={src} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-r from-[hsl(var(--card)/0.7)] via-transparent to-[hsl(var(--card)/0.7)]" />
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-b from-transparent to-[hsl(var(--card)/0.9)]" />
      {title && (
        <div className="absolute inset-0 flex items-end px-5 pb-2 pointer-events-none">
          <div className="min-w-0">
            <h3 className="font-heading text-xs uppercase tracking-wider text-foreground drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">{title}</h3>
            {hint && <p className="text-[10px] text-foreground/70 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">{hint}</p>}
          </div>
        </div>
      )}
    </div>
  );
}

interface TradeHallProps {
  playerState: PlayerState;
  onStateChange: (state: PlayerState) => void;
}

interface Friend {
  id: number;
  discordId: string;
  username: string;
  avatar?: string | null;
}

/**
 * Trade Hall — glass + hex language with sticky sidebar.
 * Floating selected cards are the one motion accent.
 */
export default function TradeHall({ playerState, onStateChange }: TradeHallProps) {
  const reduceMotion = !!playerState.settings?.reduceMotion;
  const [partner, setPartner] = useState<Friend | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [offered, setOffered] = useState<string[]>([]);
  const [requested, setRequested] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [picker, setPicker] = useState<"yours" | "theirs" | null>(null);
  const [pickerQuery, setPickerQuery] = useState("");
  const [friendQuery, setFriendQuery] = useState("");

  useEffect(() => {
    let alive = true;
    api.getFriends()
      .then((r) => { if (alive) setFriends((r.accepted || []).map((f: any) => f.friend)); })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  const ownedCards = useMemo(
    () => playerState.ownedCardIds.map((id) => allCards.find((c) => c.id === id)).filter(Boolean) as typeof allCards,
    [playerState.ownedCardIds]
  );
  const catalogCards = useMemo(
    () => allCards.filter((c) => (c.type === "hero" || c.type === "god") && !playerState.ownedCardIds.includes(c.id)),
    [playerState.ownedCardIds]
  );

  const filteredFriends = useMemo(() => {
    const q = friendQuery.trim().toLowerCase();
    return q ? friends.filter((f) => f.username.toLowerCase().includes(q)) : friends;
  }, [friends, friendQuery]);

  const pickerCards = useMemo(() => {
    const src = picker === "yours" ? ownedCards : catalogCards;
    const q = pickerQuery.trim().toLowerCase();
    return q ? src.filter((c) => c.name.toLowerCase().includes(q)) : src;
  }, [picker, ownedCards, catalogCards, pickerQuery]);

  const ready = offered.length > 0 && requested.length > 0 && !!partner;

  const propose = async () => {
    if (!partner) return;
    setSubmitting(true);
    try {
      await api.createTrade({
        toPlayerId: partner.id,
        offeredCardIds: offered,
        requestedCardIds: requested,
      });
      toast({ title: "Offer sent", description: `Pact sealed with ${partner.username}.` });
      setOffered([]);
      setRequested([]);
    } catch (e: any) {
      toast({ title: "Trade refused", description: e?.message || "", variant: "destructive" });
    } finally { setSubmitting(false); }
  };

  const reset = () => { setOffered([]); setRequested([]); };

  return (
    <div className="px-4 sm:px-6 py-6 max-w-7xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-5">
        {/* ---------- Sticky sidebar ---------- */}
        <aside className="lg:sticky lg:top-24 lg:self-start space-y-4">
          <GlassPanel hue="var(--primary)" glow={0.5} padding="md">
            <div className="flex items-center gap-2 mb-3">
              <ArrowLeftRight className="w-4 h-4 text-primary" />
              <h2 className="font-heading text-sm uppercase tracking-widest text-foreground/90">Trade Hall</h2>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Choose a partner, place up to 3 cards on each side, then seal the pact.
            </p>
          </GlassPanel>

          <GlassPanel hue="var(--primary)" glow={0.35} padding="md">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-heading text-xs uppercase tracking-wider text-foreground/80">Partners</h3>
              <span className="text-[10px] text-muted-foreground">{friends.length}</span>
            </div>
            <div className="relative mb-3">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                value={friendQuery}
                onChange={(e) => setFriendQuery(e.target.value)}
                placeholder="Search…"
                className="h-8 pl-7 text-xs bg-background/40 border-border/40"
              />
            </div>
            {loading ? (
              <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 animate-spin text-primary" /></div>
            ) : filteredFriends.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-3">no friends to trade with</p>
            ) : (
              <ul className="space-y-1 max-h-[40vh] overflow-y-auto pr-1">
                {filteredFriends.map((f) => {
                  const sel = partner?.id === f.id;
                  return (
                    <li key={f.id}>
                      <button
                        type="button"
                        onClick={() => setPartner(f)}
                        className={cn(
                          "w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg transition-colors text-left",
                          sel ? "bg-primary/15 ring-1 ring-primary/40" : "hover:bg-foreground/5"
                        )}
                      >
                        <HexAvatar
                          size={32}
                          hue={sel ? "var(--legendary)" : "var(--primary)"}
                          src={f.avatar ? `https://cdn.discordapp.com/avatars/${f.discordId}/${f.avatar}.png?size=64` : null}
                        >
                          {f.username.slice(0, 1).toUpperCase()}
                        </HexAvatar>
                        <span className={cn("text-xs truncate", sel ? "text-foreground font-medium" : "text-foreground/80")}>
                          {f.username}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </GlassPanel>
        </aside>

        {/* ---------- Main panel ---------- */}
        <main className="space-y-4">
          {/* Header */}
          <GlassPanel hue="var(--primary)" glow={0.4} padding="md">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Trading with</p>
                <h1 className="font-heading text-lg text-foreground truncate">
                  {partner ? partner.username : "— select a partner —"}
                </h1>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={reset}
                  disabled={!offered.length && !requested.length}
                  className="text-xs"
                >
                  <X className="w-3.5 h-3.5 mr-1" /> Clear
                </Button>
                <Button
                  size="sm"
                  onClick={propose}
                  disabled={!ready || submitting}
                  className={cn(
                    "text-xs",
                    ready && "bg-gradient-to-r from-primary to-[hsl(var(--legendary))] hover:opacity-90"
                  )}
                >
                  {submitting ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 mr-1" />}
                  Seal Pact
                </Button>
              </div>
            </div>
          </GlassPanel>

          {/* Two trays */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Tray
              label="Your Offer"
              hue="var(--primary)"
              cards={offered.map((id) => allCards.find((c) => c.id === id)!).filter(Boolean)}
              onAdd={() => setPicker("yours")}
              onRemove={(id) => setOffered((o) => o.filter((x) => x !== id))}
              reduceMotion={reduceMotion}
            />
            <Tray
              label={partner ? `${partner.username}'s Offer` : "Their Offer"}
              hue="var(--legendary)"
              cards={requested.map((id) => allCards.find((c) => c.id === id)!).filter(Boolean)}
              onAdd={() => partner ? setPicker("theirs") : toast({ title: "Choose a partner first" })}
              onRemove={(id) => setRequested((o) => o.filter((x) => x !== id))}
              disabled={!partner}
              reduceMotion={reduceMotion}
            />
          </div>
        </main>
      </div>

      {/* Picker drawer */}
      {picker && (
        <CardPicker
          title={picker === "yours" ? "Choose from your collection" : "What do you seek?"}
          cards={pickerCards}
          selected={picker === "yours" ? offered : requested}
          query={pickerQuery}
          onQuery={setPickerQuery}
          onToggle={(id) => {
            const setFn = picker === "yours" ? setOffered : setRequested;
            setFn((o) => o.includes(id) ? o.filter((x) => x !== id) : o.length < 3 ? [...o, id] : o);
          }}
          onClose={() => { setPicker(null); setPickerQuery(""); }}
        />
      )}
    </div>
  );
}

/* ---------- Tray ---------- */

function Tray({
  label, hue, cards, onAdd, onRemove, disabled, reduceMotion,
}: {
  label: string;
  hue: string;
  cards: typeof allCards;
  onAdd: () => void;
  onRemove: (id: string) => void;
  disabled?: boolean;
  reduceMotion?: boolean;
}) {
  const slots = [0, 1, 2];
  return (
    <GlassPanel hue={hue} glow={cards.length ? 0.55 : 0.3} padding="md">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-heading text-xs uppercase tracking-wider text-foreground/90">{label}</h3>
        <span className="text-[10px] text-muted-foreground">{cards.length}/3</span>
      </div>
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        {slots.map((i) => {
          const card = cards[i];
          return (
            <div
              key={i}
              className="relative aspect-[3/4] rounded-xl overflow-hidden"
              style={{
                background: card
                  ? `radial-gradient(ellipse at center, hsl(${hue} / 0.12) 0%, transparent 70%)`
                  : !disabled
                    ? `radial-gradient(ellipse at center, hsl(${hue} / 0.06) 0%, transparent 70%)`
                    : undefined,
                border: card
                  ? `1px solid hsl(${hue} / 0.35)`
                  : "1px dashed hsl(var(--foreground) / 0.15)",
              }}
            >
              {card ? (
                <>
                  <div
                    className={cn(
                      "absolute inset-0 flex items-center justify-center pointer-events-none",
                      !reduceMotion && "animate-float-slow"
                    )}
                    style={{ animationDelay: `${i * 0.6}s` }}
                  >
                    {/* GameCard sm = 11rem × 16rem (176×256). Scale to fit slot. */}
                    <div className="w-44 h-64 origin-center scale-[0.42] sm:scale-[0.5] md:scale-[0.55] pointer-events-auto">
                      <GameCard card={card} size="sm" />
                    </div>
                  </div>
                  <button
                    onClick={() => onRemove(card.id)}
                    className="absolute top-1 right-1 w-6 h-6 rounded-full bg-destructive/90 text-destructive-foreground flex items-center justify-center hover:bg-destructive transition-colors z-10 shadow-lg"
                    aria-label="Remove"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={onAdd}
                  disabled={disabled}
                  className={cn(
                    "absolute inset-0 flex items-center justify-center transition-colors",
                    "hover:bg-primary/5",
                    disabled && "opacity-30 cursor-not-allowed hover:bg-transparent"
                  )}
                >
                  <span className="text-2xl text-foreground/30">+</span>
                </button>
              )}
            </div>
          );
        })}
      </div>
    </GlassPanel>
  );
}

/* ---------- Picker drawer ---------- */

function CardPicker({
  title, cards, selected, query, onQuery, onToggle, onClose,
}: {
  title: string;
  cards: typeof allCards;
  selected: string[];
  query: string;
  onQuery: (q: string) => void;
  onToggle: (id: string) => void;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-40 flex items-end sm:items-center justify-center p-3 sm:p-6 animate-fade-in"
      style={{ background: "hsl(var(--background) / 0.7)", backdropFilter: "blur(6px)" }}
      onClick={onClose}
    >
      <div className="w-full max-w-4xl max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <GlassPanel hue="var(--primary)" glow={0.5} padding="md" className="flex flex-col overflow-hidden">
          <div className="flex items-center justify-between gap-3 mb-3">
            <h3 className="font-heading text-sm uppercase tracking-wider text-foreground/90">{title}</h3>
            <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="relative mb-3">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => onQuery(e.target.value)}
              placeholder="Search cards…"
              className="h-9 pl-8 bg-background/40 border-border/40"
              autoFocus
            />
          </div>
          <div className="flex-1 overflow-y-auto -mx-2 px-2">
            {cards.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-12">no cards match</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 pb-2">
                {cards.slice(0, 80).map((c) => {
                  const isSel = selected.includes(c.id);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => onToggle(c.id)}
                      className={cn(
                        "relative transition-all rounded-lg",
                        isSel
                          ? "ring-2 ring-[hsl(var(--legendary))] shadow-[0_0_20px_hsl(var(--legendary)/0.5)]"
                          : "hover:scale-[1.03] opacity-90 hover:opacity-100"
                      )}
                    >
                      <div className="scale-90 origin-top">
                        <GameCard card={c} />
                      </div>
                      {isSel && (
                        <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-[hsl(var(--legendary))] flex items-center justify-center text-[10px] text-background font-bold shadow-md">
                          ✓
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          <p className="text-[10px] text-muted-foreground text-center mt-2">
            tap to add · tap again to remove · max 3
          </p>
        </GlassPanel>
      </div>
    </div>
  );
}
