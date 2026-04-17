import { useEffect, useMemo, useState } from "react";
import { Loader2, X } from "lucide-react";
import { api } from "@/lib/apiClient";
import { allCards } from "@/data/cards";
import type { PlayerState } from "@/lib/playerState";
import { toast } from "@/hooks/use-toast";
import SceneBackdrop from "./scene/SceneBackdrop";
import FloatingLabel from "./scene/FloatingLabel";
import GlowOrb from "./scene/GlowOrb";
import GameCard from "./GameCard";
import { cn } from "@/lib/utils";

interface TradeSceneProps {
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
 * "The Moonlit Bazaar" — trading reimagined as two stone pedestals
 * facing across a moonbeam, with travellers waiting in the mist.
 */
export default function TradeScene({ playerState, onStateChange }: TradeSceneProps) {
  const reduceMotion = !!playerState.settings?.reduceMotion;
  const [partner, setPartner] = useState<Friend | null>(null);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [offered, setOffered] = useState<string[]>([]);
  const [requested, setRequested] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState<"yours" | "theirs" | null>(null);

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

  const bothLocked = offered.length > 0 && requested.length > 0 && partner;

  const propose = async () => {
    if (!partner) return;
    setSubmitting(true);
    try {
      await api.createTrade({
        toPlayerId: partner.id,
        offeredCardIds: offered,
        requestedCardIds: requested,
      });
      toast({ title: "Offer sealed", description: `Sent to ${partner.username}.` });
      setOffered([]);
      setRequested([]);
    } catch (e: any) {
      toast({ title: "Trade refused by the moon", description: e?.message || "", variant: "destructive" });
    } finally { setSubmitting(false); }
  };

  const reset = () => { setOffered([]); setRequested([]); setPartner(null); };

  return (
    <SceneBackdrop mood="moonlit" reduceMotion={reduceMotion}>
      <div className="relative px-4 sm:px-8 pt-8 pb-24 min-h-[calc(100vh-12rem)]">
        {/* Moon */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2">
          <GlowOrb size={80} hue="var(--primary)" intensity={bothLocked ? 1.1 : 0.6} pulse={!reduceMotion && !!bothLocked} />
        </div>
        {/* Moonbeam */}
        <div
          className="pointer-events-none absolute top-20 left-1/2 -translate-x-1/2 w-32 h-[60vh]"
          style={{
            background: `linear-gradient(180deg, hsl(var(--primary) / ${bothLocked ? 0.45 : 0.18}) 0%, transparent 100%)`,
            filter: "blur(24px)",
            transition: "all 600ms",
          }}
        />

        {/* Title */}
        <div className="text-center mt-28 mb-8">
          <FloatingLabel variant="ember" className="text-[10px] sm:text-xs">— Beneath the Moon —</FloatingLabel>
          <h1 className="font-heading text-3xl sm:text-4xl text-foreground mt-3 drop-shadow-[0_0_20px_hsl(var(--primary)/0.5)]">
            The Moonlit Bazaar
          </h1>
          <FloatingLabel variant="inked" className="text-muted-foreground text-sm block mt-2">
            {partner ? `with ${partner.username}` : "choose a traveller from the mist"}
          </FloatingLabel>
        </div>

        {/* Two pedestals */}
        <div className="grid grid-cols-2 gap-4 sm:gap-12 max-w-4xl mx-auto items-end mt-12">
          <Pedestal
            label="Your Offer"
            cards={offered.map((id) => allCards.find((c) => c.id === id)!).filter(Boolean)}
            onAdd={() => setDrawerOpen("yours")}
            onRemove={(id) => setOffered((o) => o.filter((x) => x !== id))}
            reduceMotion={reduceMotion}
            side="left"
          />
          <Pedestal
            label="Their Offer"
            cards={requested.map((id) => allCards.find((c) => c.id === id)!).filter(Boolean)}
            onAdd={() => partner ? setDrawerOpen("theirs") : toast({ title: "Pick a traveller first" })}
            onRemove={(id) => setRequested((o) => o.filter((x) => x !== id))}
            reduceMotion={reduceMotion}
            side="right"
            disabled={!partner}
          />
        </div>

        {/* Floor runes — confirm / cancel */}
        <div className="flex justify-center gap-16 mt-16">
          <RuneAction
            label="Withdraw"
            hue="var(--destructive)"
            onClick={reset}
            disabled={!offered.length && !requested.length && !partner}
            reduceMotion={reduceMotion}
          >
            ✕
          </RuneAction>
          <RuneAction
            label={submitting ? "Sealing…" : "Seal Pact"}
            hue="var(--legendary)"
            onClick={propose}
            disabled={!bothLocked || submitting}
            active={!!bothLocked}
            reduceMotion={reduceMotion}
          >
            {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "✦"}
          </RuneAction>
        </div>

        {/* Travellers in the mist */}
        <div className="mt-20">
          <div className="text-center mb-6">
            <FloatingLabel className="text-xs">— Travellers in the Mist —</FloatingLabel>
          </div>
          {loading ? (
            <div className="flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
          ) : friends.length === 0 ? (
            <div className="text-center">
              <FloatingLabel variant="inked" className="text-muted-foreground text-sm">
                no travellers tonight — befriend others to trade
              </FloatingLabel>
            </div>
          ) : (
            <div className="flex flex-wrap justify-center gap-6 sm:gap-10">
              {friends.map((f) => (
                <Traveller
                  key={f.id}
                  friend={f}
                  selected={partner?.id === f.id}
                  onClick={() => setPartner(f)}
                  reduceMotion={reduceMotion}
                />
              ))}
            </div>
          )}
        </div>

        {/* Card-picker drawer */}
        {drawerOpen && (
          <CardDrawer
            title={drawerOpen === "yours" ? "Place from your collection" : "What do you seek from them?"}
            cards={drawerOpen === "yours" ? ownedCards : catalogCards}
            selected={drawerOpen === "yours" ? offered : requested}
            onToggle={(id) => {
              if (drawerOpen === "yours") {
                setOffered((o) => o.includes(id) ? o.filter((x) => x !== id) : o.length < 3 ? [...o, id] : o);
              } else {
                setRequested((o) => o.includes(id) ? o.filter((x) => x !== id) : o.length < 3 ? [...o, id] : o);
              }
            }}
            onClose={() => setDrawerOpen(null)}
          />
        )}
      </div>
    </SceneBackdrop>
  );
}

/* ---------- Sub-elements ---------- */

function Pedestal({
  label,
  cards,
  onAdd,
  onRemove,
  reduceMotion,
  side,
  disabled,
}: {
  label: string;
  cards: typeof allCards;
  onAdd: () => void;
  onRemove: (id: string) => void;
  reduceMotion?: boolean;
  side: "left" | "right";
  disabled?: boolean;
}) {
  return (
    <div className={cn("flex flex-col items-center", side === "left" ? "items-end sm:items-center" : "items-start sm:items-center")}>
      {/* Floating cards above pedestal */}
      <div className="relative h-44 flex items-end justify-center gap-2 mb-4">
        {cards.length === 0 ? (
          <button
            type="button"
            onClick={onAdd}
            disabled={disabled}
            className={cn(
              "w-24 h-36 rounded-full flex items-center justify-center transition-all",
              "border-2 border-dashed border-foreground/20 hover:border-[hsl(var(--primary)/0.6)]",
              !reduceMotion && "animate-float-slow",
              disabled && "opacity-30 cursor-not-allowed"
            )}
            style={{
              background: "radial-gradient(ellipse at center, hsl(var(--primary)/0.08) 0%, transparent 70%)",
            }}
          >
            <FloatingLabel className="text-xl">+</FloatingLabel>
          </button>
        ) : (
          cards.map((card, i) => (
            <div
              key={card.id}
              className={cn("relative", !reduceMotion && "animate-float")}
              style={{ animationDelay: `${i * 0.4}s`, transform: `rotate(${(i - (cards.length - 1) / 2) * 4}deg)` }}
            >
              <div className="scale-50 origin-bottom -mb-16">
                <GameCard card={card} />
              </div>
              <button
                onClick={() => onRemove(card.id)}
                className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-destructive/80 text-destructive-foreground flex items-center justify-center text-xs hover:bg-destructive z-10"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))
        )}
        {cards.length > 0 && cards.length < 3 && (
          <button
            type="button"
            onClick={onAdd}
            className="w-12 h-36 rounded-full flex items-center justify-center border-2 border-dashed border-foreground/20 hover:border-[hsl(var(--primary)/0.6)] transition-colors"
          >
            <FloatingLabel>+</FloatingLabel>
          </button>
        )}
      </div>

      {/* The pedestal itself — radial pool, no rectangle */}
      <div className="relative w-48 h-12">
        <div
          className="absolute inset-x-0 top-0 h-12"
          style={{
            background:
              "radial-gradient(ellipse at center top, hsl(var(--primary)/0.5) 0%, hsl(var(--primary)/0.15) 40%, transparent 70%)",
            filter: "blur(2px)",
          }}
        />
        <div
          className="absolute inset-x-6 top-1 h-2 rounded-full"
          style={{
            background: "linear-gradient(90deg, transparent, hsl(var(--primary)/0.6), transparent)",
            filter: "blur(1px)",
          }}
        />
      </div>
      <FloatingLabel variant="ember" className="mt-3 text-[10px]">{label}</FloatingLabel>
    </div>
  );
}

function RuneAction({
  children, label, hue, onClick, disabled, active, reduceMotion,
}: {
  children: React.ReactNode;
  label: string;
  hue: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  reduceMotion?: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      <GlowOrb
        size={56}
        hue={hue}
        intensity={disabled ? 0.15 : active ? 1 : 0.55}
        pulse={!!active && !reduceMotion}
        onClick={disabled ? undefined : onClick}
      >
        <span className="text-background text-xl font-bold">{children}</span>
      </GlowOrb>
      <FloatingLabel variant="ember" className={cn("text-[10px]", disabled && "opacity-40")}>{label}</FloatingLabel>
    </div>
  );
}

function Traveller({
  friend, selected, onClick, reduceMotion,
}: {
  friend: Friend;
  selected: boolean;
  onClick: () => void;
  reduceMotion?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn("flex flex-col items-center gap-2 transition-transform", !reduceMotion && "hover:-translate-y-1")}
    >
      <GlowOrb
        size={64}
        hue={selected ? "var(--legendary)" : "var(--primary)"}
        intensity={selected ? 0.9 : 0.3}
        pulse={selected && !reduceMotion}
      >
        <span className="text-background font-heading text-xl">
          {friend.username.slice(0, 1).toUpperCase()}
        </span>
      </GlowOrb>
      <FloatingLabel
        variant="inked"
        className={cn("text-sm", selected ? "text-[hsl(var(--legendary))]" : "text-foreground/70")}
      >
        {friend.username}
      </FloatingLabel>
    </button>
  );
}

function CardDrawer({
  title, cards, selected, onToggle, onClose,
}: {
  title: string;
  cards: typeof allCards;
  selected: string[];
  onToggle: (id: string) => void;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-x-0 bottom-0 z-30 max-h-[60vh] overflow-y-auto px-6 pt-6 pb-8 animate-fade-in"
      style={{
        background:
          "linear-gradient(180deg, transparent 0%, hsl(var(--background)/0.85) 12%, hsl(var(--background)) 25%)",
        backdropFilter: "blur(8px)",
      }}
    >
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <FloatingLabel variant="ember" className="text-xs">{title}</FloatingLabel>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>
        {cards.length === 0 ? (
          <FloatingLabel variant="inked" className="text-muted-foreground text-center block py-8">
            nothing here to offer
          </FloatingLabel>
        ) : (
          <div className="flex flex-wrap gap-3 justify-center">
            {cards.slice(0, 60).map((c) => {
              const isSel = selected.includes(c.id);
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => onToggle(c.id)}
                  className={cn(
                    "transition-transform scale-75 origin-center hover:scale-90",
                    isSel && "scale-90 drop-shadow-[0_0_16px_hsl(var(--legendary)/0.8)]"
                  )}
                >
                  <GameCard card={c} />
                </button>
              );
            })}
          </div>
        )}
        <div className="text-center mt-4">
          <FloatingLabel className="text-[10px]">tap to place / tap again to take back · max 3</FloatingLabel>
        </div>
      </div>
    </div>
  );
}
