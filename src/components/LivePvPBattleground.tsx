import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Loader2, Skull, Sparkles, Trophy } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { api } from "@/lib/apiClient";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { getCardById } from "@/data/cardIndex";
import battleBg from "@/assets/battle-bg.jpg";

type Props = { matchId: number; onExit: () => void };

/** Mirrors liveCardDamage on the server. */
function cardDamage(id: string): number {
  const card = getCardById(id);
  if (!card) return 3;
  if (card.rarity === "legendary") return 6;
  if (card.rarity === "rare") return 4;
  return 3;
}

// ─── Mini Hero Portrait (self-contained, no shield/AP) ────────────────────────
function PvPHeroPortrait({
  name, hp, cardsLeft, isActiveTurn, side,
}: {
  name: string; hp: number; cardsLeft: number; isActiveTurn: boolean; side: "player" | "enemy";
}) {
  const maxHp = 30;
  const pct = Math.max(0, Math.min(100, (hp / maxHp) * 100));
  const r = 30;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  const strokeCls = pct > 50 ? "stroke-green-500" : pct > 25 ? "stroke-yellow-500" : "stroke-destructive";

  return (
    <div className={cn("flex items-center gap-3", side === "enemy" ? "flex-row-reverse" : "flex-row")}>
      <div className="relative flex-shrink-0">
        <svg width="72" height="72" viewBox="0 0 72 72" className="transform -rotate-90">
          <circle cx="36" cy="36" r={r} fill="none" stroke="hsl(var(--border))" strokeWidth="4" />
          <circle cx="36" cy="36" r={r} fill="none" strokeWidth="4" strokeLinecap="round"
            strokeDasharray={circ} strokeDashoffset={offset}
            className={cn(strokeCls, "transition-all duration-500")}
          />
        </svg>
        <div className={cn(
          "absolute inset-0 flex items-center justify-center rounded-full m-2",
          side === "player" ? "bg-primary/20 border border-primary/40" : "bg-destructive/20 border border-destructive/40",
        )}>
          {side === "player"
            ? <Sparkles className="w-5 h-5 text-primary" />
            : <Skull className="w-5 h-5 text-destructive" />}
        </div>
        {isActiveTurn && <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-primary animate-pulse" />}
      </div>
      <div className={cn("flex flex-col gap-1", side === "enemy" ? "items-end" : "items-start")}>
        <span className={cn("font-heading text-xs font-bold truncate max-w-[120px]",
          side === "player" ? "text-primary" : "text-destructive")}>{name}</span>
        <span className={cn("text-sm font-bold",
          pct > 50 ? "text-green-400" : pct > 25 ? "text-yellow-400" : "text-destructive")}>
          {hp}/{maxHp} HP
        </span>
        <span className="text-[9px] text-muted-foreground">Cards left: {cardsLeft}</span>
      </div>
    </div>
  );
}

// ─── Played cards zone ────────────────────────────────────────────────────────
function PlayedZone({ usedIds, side }: { usedIds: string[]; side: "player" | "enemy" }) {
  if (usedIds.length === 0) {
    return (
      <div className="min-h-[80px] flex items-center justify-center">
        <p className="text-[10px] text-muted-foreground/40">
          {side === "player" ? "Play cards to attack" : "No cards played yet"}
        </p>
      </div>
    );
  }
  return (
    <div className="min-h-[80px] flex flex-wrap gap-1.5 justify-center items-center">
      {usedIds.map((id) => {
        const card = getCardById(id);
        return (
          <div key={id} className={cn(
            "w-14 rounded-lg border overflow-hidden opacity-60",
            side === "player" ? "border-primary/30" : "border-border/50",
          )}>
            {card?.image && <img src={card.image} alt={card.name} className="w-full h-16 object-cover" />}
            <div className="p-0.5 bg-card/90 text-[7px] font-bold text-center truncate">{card?.name ?? id}</div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function LivePvPBattleground({ matchId, onExit }: Props) {
  const [me, setMe] = useState<{ id: number; username: string } | null>(null);
  const [liveMatch, setLiveMatch] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [acting, setActing] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [meRes, matchRes] = await Promise.all([api.getMe(), api.pvpLiveGet(matchId)]);
      setMe({ id: meRes.me.id, username: meRes.me.username });
      setLiveMatch(matchRes.match);
    } catch (e) {
      toast({ title: "Match load failed", description: e instanceof Error ? e.message : String(e) });
    } finally {
      setLoading(false);
    }
  }, [matchId]);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    if (!liveMatch) return;
    if (liveMatch.status !== "pending" && liveMatch.status !== "active") return;
    const id = window.setInterval(() => refresh(), 2500);
    return () => window.clearInterval(id);
  }, [liveMatch?.status, liveMatch?.id, refresh]);

  const isA = useMemo(() => (me && liveMatch ? liveMatch.playerA?.id === me.id : true), [me, liveMatch]);
  const myKey = isA ? "A" : "B";
  const oppKey = isA ? "B" : "A";

  const s = liveMatch?.state || {};
  const myDeck: string[] = (myKey === "A" ? s.deckA : s.deckB) || [];
  const oppDeck: string[] = (oppKey === "A" ? s.deckA : s.deckB) || [];
  const myUsed: string[] = (myKey === "A" ? s.usedA : s.usedB) || [];
  const oppUsed: string[] = (oppKey === "A" ? s.usedA : s.usedB) || [];
  const myHp: number = myKey === "A" ? (s.hpA ?? 30) : (s.hpB ?? 30);
  const oppHp: number = oppKey === "A" ? (s.hpA ?? 30) : (s.hpB ?? 30);
  const myAvailable = myDeck.filter((id) => !myUsed.includes(id));

  const isMyTurn = !!(me && liveMatch?.turnPlayerId === me.id && liveMatch?.status === "active");
  const opponentName = (isA ? liveMatch?.playerB?.username : liveMatch?.playerA?.username) ?? "Opponent";
  const myName = me?.username ?? "You";

  const isDone = liveMatch?.status === "completed" || liveMatch?.status === "cancelled";
  const result = liveMatch?.result;
  const iWon = isDone && !!(result?.winner) && (
    (result.winner === "playerA" && myKey === "A") || (result.winner === "playerB" && myKey === "B")
  );
  const isDraw = isDone && result?.winner == null && liveMatch?.status === "completed";

  async function playCard(cardId: string) {
    if (!isMyTurn || acting) return;
    setActing(true);
    try {
      await api.pvpLiveAction(matchId, { type: "play", cardId });
      await refresh();
    } catch (e: any) {
      toast({ title: "Play failed", description: e?.message || "Could not play card" });
    } finally { setActing(false); }
  }

  async function endTurn() {
    if (!isMyTurn || acting) return;
    setActing(true);
    try {
      await api.pvpLiveAction(matchId, { type: "end" });
      await refresh();
    } catch (e: any) {
      toast({ title: "End turn failed", description: e?.message || String(e) });
    } finally { setActing(false); }
  }

  if (!liveMatch) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-10 h-10 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div
      className="relative rounded-2xl overflow-hidden min-h-[700px]"
      style={{ backgroundImage: `url(${battleBg})`, backgroundSize: "cover", backgroundPosition: "center" }}
    >
      <div className="absolute inset-0 pointer-events-none rounded-2xl bg-background/60" />

      {/* Retreat */}
      <div className="absolute top-2 left-2 z-30">
        <button
          onClick={onExit}
          className="flex items-center gap-1 px-2 py-1 rounded-lg bg-secondary/80 text-secondary-foreground text-[10px] font-bold hover:bg-secondary transition-colors backdrop-blur-sm"
        >
          <ArrowLeft className="w-3 h-3" /> Retreat
        </button>
      </div>

      {/* Match ID + refresh indicator */}
      <div className="absolute top-2 right-2 z-30 flex items-center gap-1.5">
        {loading && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />}
        <span className="text-[9px] text-muted-foreground font-heading">Match #{matchId}</span>
      </div>

      <div className="relative p-3 sm:p-4 space-y-2 pt-10">
        {/* ===== Opponent Hero ===== */}
        <div className="flex justify-center">
          <PvPHeroPortrait
            name={opponentName}
            hp={oppHp}
            cardsLeft={oppDeck.length - oppUsed.length}
            isActiveTurn={!isMyTurn && liveMatch?.status === "active"}
            side="enemy"
          />
        </div>

        {/* ===== Opponent played cards ===== */}
        <PlayedZone usedIds={oppUsed} side="enemy" />

        {/* ===== VS Divider + Turn Badge ===== */}
        <div className="flex items-center gap-2 py-1">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
          <motion.span
            key={`${String(isMyTurn)}-${liveMatch?.status}`}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={cn(
              "px-3 py-1 rounded-full text-[10px] font-heading font-bold uppercase tracking-wider",
              liveMatch?.status === "pending"
                ? "bg-muted text-muted-foreground border border-border"
                : isMyTurn
                  ? "bg-primary/20 text-primary border border-primary/30"
                  : "bg-destructive/20 text-destructive border border-destructive/30",
            )}
          >
            {liveMatch?.status === "pending"
              ? "Waiting for opponent…"
              : isMyTurn ? "Your Turn" : "Opponent's Turn"}
          </motion.span>
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
        </div>

        {/* ===== My played cards ===== */}
        <PlayedZone usedIds={myUsed} side="player" />

        {/* ===== My Hero ===== */}
        <div className="flex justify-center">
          <PvPHeroPortrait
            name={myName}
            hp={myHp}
            cardsLeft={myAvailable.length}
            isActiveTurn={isMyTurn}
            side="player"
          />
        </div>

        {/* ===== Hand + End Turn ===== */}
        <div className="bg-card/80 backdrop-blur-sm border border-border rounded-xl p-2 sm:p-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold">
              Your Cards ({myAvailable.length})
            </span>
            {isMyTurn && (
              <button
                onClick={endTurn}
                disabled={acting}
                className="text-[10px] px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:brightness-110 transition-colors font-heading font-bold animate-glow-pulse disabled:opacity-50"
              >
                End Turn
              </button>
            )}
          </div>

          <div className="flex gap-1.5 sm:gap-2 overflow-x-auto pb-1 justify-center">
            {myAvailable.map((id) => {
              const card = getCardById(id);
              const dmg = cardDamage(id);
              return (
                <motion.div
                  key={id}
                  whileHover={isMyTurn && !acting ? { y: -6, scale: 1.05 } : undefined}
                  className={cn(
                    "flex-shrink-0 w-[68px] sm:w-20 rounded-lg border-2 overflow-hidden cursor-pointer transition-shadow",
                    isMyTurn && !acting
                      ? "border-primary/50 hover:border-primary hover:shadow-md hover:shadow-primary/30"
                      : "border-border opacity-50 pointer-events-none",
                  )}
                  onClick={() => { if (isMyTurn && !acting) playCard(id); }}
                >
                  {card?.image ? (
                    <div className="w-full h-16 sm:h-20 overflow-hidden">
                      <img src={card.image} alt={card.name} className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="w-full h-16 sm:h-20 bg-secondary flex items-center justify-center">
                      <span className="text-[9px] text-muted-foreground">{id}</span>
                    </div>
                  )}
                  <div className="p-1 bg-card/90 space-y-0.5">
                    <p className="text-[7px] sm:text-[8px] font-bold text-foreground truncate">{card?.name ?? id}</p>
                    <p className="text-[6px] sm:text-[7px] text-muted-foreground uppercase">{card?.type ?? "card"}</p>
                    <p className="text-[7px] text-destructive font-bold">⚔ {dmg} dmg</p>
                  </div>
                </motion.div>
              );
            })}
            {myAvailable.length === 0 && liveMatch?.status === "active" && (
              <p className="text-[10px] text-muted-foreground py-3">No cards remaining — end your turn!</p>
            )}
            {liveMatch?.status === "pending" && (
              <p className="text-[10px] text-muted-foreground py-3">Cards will appear once your opponent joins.</p>
            )}
          </div>
        </div>
      </div>

      {/* ===== Game Over Overlay ===== */}
      <AnimatePresence>
        {isDone && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-2xl"
          >
            <motion.div
              initial={{ y: 30 }}
              animate={{ y: 0 }}
              className="bg-card border border-border rounded-2xl p-8 text-center max-w-md mx-4"
            >
              {liveMatch?.status === "cancelled" ? (
                <>
                  <Skull className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-heading text-2xl font-bold text-foreground mb-2">Match Cancelled</h3>
                  <p className="text-muted-foreground text-sm">The match was declined or cancelled.</p>
                </>
              ) : iWon ? (
                <>
                  <Trophy className="w-16 h-16 text-[hsl(var(--legendary))] mx-auto mb-4" />
                  <h3 className="font-heading text-2xl font-bold text-[hsl(var(--legendary))] mb-2">Victory!</h3>
                  <p className="text-muted-foreground text-sm">You defeated {opponentName}!</p>
                </>
              ) : isDraw ? (
                <>
                  <Sparkles className="w-16 h-16 text-[hsl(var(--synergy))] mx-auto mb-4" />
                  <h3 className="font-heading text-2xl font-bold text-[hsl(var(--synergy))] mb-2">Draw!</h3>
                  <p className="text-muted-foreground text-sm">Both sides fell simultaneously.</p>
                </>
              ) : (
                <>
                  <Skull className="w-16 h-16 text-destructive mx-auto mb-4" />
                  <h3 className="font-heading text-2xl font-bold text-destructive mb-2">Defeat</h3>
                  <p className="text-muted-foreground text-sm">{opponentName} won this round.</p>
                </>
              )}
              <button
                onClick={onExit}
                className="mt-6 px-5 py-2.5 rounded-xl bg-secondary text-secondary-foreground font-heading font-bold text-sm hover:bg-secondary/80"
              >
                Back to PvP
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
