import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sword, Sparkles, Trophy, Skull, Coins, Shield, Heart, Zap, Target, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BattleState, FieldCard } from "@/lib/battleEngine";
import { initBattle, playCard, equipWeapon, castSpell, attackTarget, useAbility, performAITurn, generateEnemyDeck } from "@/lib/battleEngine";
import BattleCardDisplay from "./BattleCardDisplay";
import CardLevelUp from "./CardLevelUp";
import { type PlayerState, getCardProgress, savePlayerState } from "@/lib/playerState";
import { awardXp, type LevelUpResult } from "@/lib/progressionEngine";
import { getBattleGoldReward } from "@/lib/gachaEngine";

interface BattleArenaProps {
  playerDeckIds: string[];
  onExit: () => void;
  playerState: PlayerState;
  onStateChange: (state: PlayerState) => void;
  isOnline?: boolean;
  submitBattleResultApi?: (data: {
    won: boolean;
    draw?: boolean;
    turnCount: number;
    deckCardIds: string[];
  }) => Promise<{
    goldReward: number;
    levelUps: Array<{ cardId: string; oldLevel: number; newLevel: number }>;
  } | null>;
}

type ActionMode = "none" | "select-field-attacker" | "select-attack-target" | "select-equip-target" | "select-spell-target";

export default function BattleArena({ playerDeckIds, onExit, playerState, onStateChange, isOnline, submitBattleResultApi }: BattleArenaProps) {
  const [state, setState] = useState<BattleState | null>(null);
  const [animating, setAnimating] = useState(false);
  const [rewardsGiven, setRewardsGiven] = useState(false);
  const [goldEarned, setGoldEarned] = useState(0);
  const [levelUps, setLevelUps] = useState<(LevelUpResult & { cardId: string })[]>([]);
  const [showLevelUps, setShowLevelUps] = useState(false);
  const [actionMode, setActionMode] = useState<ActionMode>("none");
  const [selectedHandIndex, setSelectedHandIndex] = useState<number | null>(null);
  const [selectedFieldIndex, setSelectedFieldIndex] = useState<number | null>(null);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const enemyIds = generateEnemyDeck(playerDeckIds.length);
    setState(initBattle(playerDeckIds, enemyIds));
    setRewardsGiven(false);
    setGoldEarned(0);
    setLevelUps([]);
  }, [playerDeckIds]);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [state?.logs]);

  // Enemy AI turn
  useEffect(() => {
    if (!state || state.phase === "game-over" || state.turn !== "enemy" || animating) return;
    const timer = setTimeout(() => {
      setAnimating(true);
      setTimeout(() => {
        setState(prev => prev ? performAITurn(prev) : prev);
        setAnimating(false);
      }, 800);
    }, 600);
    return () => clearTimeout(timer);
  }, [state?.turn, state?.turnNumber, animating]);

  // Award rewards on game over
  useEffect(() => {
    if (!state || state.phase !== "game-over" || rewardsGiven) return;
    setRewardsGiven(true);
    const won = state.winner === "player";
    const isDraw = state.winner === "draw";

    if (isOnline && submitBattleResultApi) {
      submitBattleResultApi({
        won,
        draw: isDraw,
        turnCount: state.turnNumber,
        deckCardIds: playerDeckIds,
      }).then((result) => {
        if (result) {
          setGoldEarned(result.goldReward);
          const mapped = result.levelUps.map((lu) => ({
            ...lu,
            milestone: null as string | null,
          }));
          setLevelUps(mapped);
          if (mapped.length > 0) setShowLevelUps(true);
        }
      });
      return;
    }

    const gold = getBattleGoldReward(won, state.turnNumber);
    setGoldEarned(gold);
    let newState = { ...playerState, cardProgress: { ...playerState.cardProgress }, gold: playerState.gold + gold };
    const allLevelUps: (LevelUpResult & { cardId: string })[] = [];
    const xpAmount = won ? 50 : isDraw ? 35 : 20;
    for (const id of playerDeckIds) {
      const progress = getCardProgress(newState, id);
      const result = awardXp(progress, xpAmount);
      newState.cardProgress[id] = result.progress;
      for (const lu of result.levelUps) allLevelUps.push({ ...lu, cardId: id });
    }
    setLevelUps(allLevelUps);
    if (allLevelUps.length > 0) setShowLevelUps(true);
    onStateChange(newState);
    savePlayerState(newState);
  }, [state?.phase]);

  const handleHandCardClick = (index: number) => {
    if (!state || state.turn !== "player" || animating || state.phase === "game-over") return;
    const card = state.player.hand[index];
    if (!card) return;

    if (card.type === "hero" || card.type === "god" || card.type === "trap") {
      setAnimating(true);
      setTimeout(() => {
        setState(prev => prev ? playCard(prev, index) : prev);
        setAnimating(false);
        setActionMode("none");
      }, 400);
    } else if (card.type === "weapon") {
      setSelectedHandIndex(index);
      setActionMode("select-equip-target");
    } else if (card.type === "spell") {
      if (card.spellEffect?.target === "all_enemies" || card.spellEffect?.target === "all_allies") {
        setAnimating(true);
        setTimeout(() => {
          setState(prev => prev ? castSpell(prev, index) : prev);
          setAnimating(false);
          setActionMode("none");
        }, 400);
      } else {
        setSelectedHandIndex(index);
        setActionMode("select-spell-target");
      }
    }
  };

  const handleFieldCardClick = (side: "player" | "enemy", index: number) => {
    if (!state || state.turn !== "player" || animating || state.phase === "game-over") return;

    if (actionMode === "select-equip-target" && side === "player" && selectedHandIndex !== null) {
      setAnimating(true);
      setTimeout(() => {
        setState(prev => prev ? equipWeapon(prev, selectedHandIndex!, index) : prev);
        setAnimating(false);
        setActionMode("none");
        setSelectedHandIndex(null);
      }, 400);
    } else if (actionMode === "select-spell-target") {
      if (selectedHandIndex === null) return;
      const spell = state.player.hand[selectedHandIndex];
      const targetSide = spell?.spellEffect?.target === "single_ally" ? "player" : "enemy";
      if (side !== targetSide) return;
      setAnimating(true);
      setTimeout(() => {
        setState(prev => prev ? castSpell(prev, selectedHandIndex!, index) : prev);
        setAnimating(false);
        setActionMode("none");
        setSelectedHandIndex(null);
      }, 400);
    } else if (actionMode === "select-field-attacker" && side === "player") {
      setSelectedFieldIndex(index);
      setActionMode("select-attack-target");
    } else if (actionMode === "select-attack-target" && side === "enemy" && selectedFieldIndex !== null) {
      setAnimating(true);
      setTimeout(() => {
        setState(prev => prev ? attackTarget(prev, selectedFieldIndex!, index) : prev);
        setAnimating(false);
        setActionMode("none");
        setSelectedFieldIndex(null);
      }, 400);
    }
  };

  const handleDirectAttack = () => {
    if (!state || selectedFieldIndex === null || animating) return;
    setAnimating(true);
    setTimeout(() => {
      setState(prev => prev ? attackTarget(prev, selectedFieldIndex!, "direct") : prev);
      setAnimating(false);
      setActionMode("none");
      setSelectedFieldIndex(null);
    }, 400);
  };

  const handleUseAbility = (fieldIndex: number) => {
    if (!state || animating) return;
    setAnimating(true);
    setTimeout(() => {
      setState(prev => prev ? useAbility(prev, fieldIndex) : prev);
      setAnimating(false);
      setActionMode("none");
    }, 400);
  };

  if (!state) return null;

  const playerFieldCards = state.player.field.filter(Boolean) as FieldCard[];
  const enemyFieldCards = state.enemy.field.filter(Boolean) as FieldCard[];
  const isPlayerTurn = state.turn === "player" && !animating && state.phase !== "game-over";

  return (
    <div className="space-y-4">
      {showLevelUps && <CardLevelUp levelUps={levelUps} onClose={() => setShowLevelUps(false)} />}

      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="font-heading text-xl font-bold text-foreground">⚔️ Battle Arena</h2>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground font-heading">Turn {state.turnNumber}</span>
          <span className={cn("text-xs font-bold px-2 py-1 rounded", state.turn === "player" ? "bg-primary/20 text-primary" : "bg-destructive/20 text-destructive")}>
            {state.turn === "player" ? "YOUR TURN" : "ENEMY TURN"}
          </span>
          <button onClick={onExit} className="text-sm px-3 py-1.5 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors">
            Retreat
          </button>
        </div>
      </div>

      {/* Enemy HP */}
      <div className="flex items-center justify-between bg-card border border-border rounded-xl p-3">
        <div className="flex items-center gap-3">
          <Skull className="w-5 h-5 text-destructive" />
          <span className="font-heading text-sm font-bold text-destructive">ENEMY</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <Heart className="w-4 h-4 text-destructive" />
            <span className="font-bold text-sm">{state.enemy.hp}/30</span>
          </div>
          <div className="flex items-center gap-1">
            <Shield className="w-4 h-4 text-rare" />
            <span className="font-bold text-sm">{state.enemy.shield}</span>
          </div>
          <span className="text-xs text-muted-foreground">Deck: {state.enemy.deck.length} | Hand: {state.enemy.hand.length}</span>
        </div>
        {actionMode === "select-attack-target" && !state.enemy.field.some(fc => fc !== null) && (
          <button onClick={handleDirectAttack} className="px-3 py-1.5 rounded-lg bg-destructive text-destructive-foreground text-xs font-bold animate-pulse">
            ⚡ Direct Attack!
          </button>
        )}
      </div>

      {/* Enemy Field */}
      <div className="space-y-2">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Enemy Field</span>
        <div className="grid grid-cols-4 gap-2">
          {state.enemy.field.map((fc, i) => (
            <div key={i} className="min-h-[80px]">
              {fc ? (
                <BattleCardDisplay
                  fieldCard={fc}
                  side="enemy"
                  isActive={false}
                  selectable={actionMode === "select-attack-target" || (actionMode === "select-spell-target" && state.player.hand[selectedHandIndex!]?.spellEffect?.target === "single_enemy")}
                  onClick={() => handleFieldCardClick("enemy", i)}
                />
              ) : (
                <div className="h-full min-h-[80px] rounded-xl border border-dashed border-border/30 flex items-center justify-center text-muted-foreground/20 text-xs">
                  Empty
                </div>
              )}
            </div>
          ))}
        </div>
        {/* Enemy traps */}
        <div className="flex gap-2">
          {state.enemy.traps.map((trap, i) => (
            <div key={i} className={cn("w-12 h-16 rounded-lg border flex items-center justify-center text-xs", trap ? "border-destructive/40 bg-destructive/10 text-destructive" : "border-border/20 text-muted-foreground/20")}>
              {trap ? "🪤" : "—"}
            </div>
          ))}
        </div>
      </div>

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-border" />
        <span className="font-heading text-xl text-muted-foreground/30 font-bold">VS</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      {/* Player Field */}
      <div className="space-y-2">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Your Field</span>
        <div className="grid grid-cols-4 gap-2">
          {state.player.field.map((fc, i) => (
            <div key={i} className="min-h-[80px]">
              {fc ? (
                <div className="space-y-1">
                  <BattleCardDisplay
                    fieldCard={fc}
                    side="player"
                    isActive={selectedFieldIndex === i}
                    selectable={actionMode === "select-field-attacker" || (actionMode === "select-equip-target") || (actionMode === "select-spell-target" && state.player.hand[selectedHandIndex!]?.spellEffect?.target === "single_ally")}
                    onClick={() => handleFieldCardClick("player", i)}
                  />
                  {isPlayerTurn && actionMode === "none" && (
                    <div className="flex gap-1">
                      {!fc.abilityUsed && !fc.stunned && (
                        <button onClick={() => handleUseAbility(i)} className="flex-1 text-[8px] py-1 rounded bg-legendary/20 text-legendary font-bold hover:bg-legendary/30">
                          <Zap className="w-2.5 h-2.5 inline mr-0.5" />Ability
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-full min-h-[80px] rounded-xl border border-dashed border-border/30 flex items-center justify-center text-muted-foreground/20 text-xs">
                  Empty
                </div>
              )}
            </div>
          ))}
        </div>
        {/* Player traps */}
        <div className="flex gap-2">
          {state.player.traps.map((trap, i) => (
            <div key={i} className={cn("w-12 h-16 rounded-lg border flex items-center justify-center text-xs", trap ? "border-primary/40 bg-primary/10 text-primary" : "border-border/20 text-muted-foreground/20")}>
              {trap ? "🪤" : "—"}
            </div>
          ))}
        </div>
      </div>

      {/* Player HP */}
      <div className="flex items-center justify-between bg-card border border-border rounded-xl p-3">
        <div className="flex items-center gap-3">
          <Sparkles className="w-5 h-5 text-primary" />
          <span className="font-heading text-sm font-bold text-primary">YOU</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <Heart className="w-4 h-4 text-destructive" />
            <span className="font-bold text-sm">{state.player.hp}/30</span>
          </div>
          <div className="flex items-center gap-1">
            <Shield className="w-4 h-4 text-rare" />
            <span className="font-bold text-sm">{state.player.shield}</span>
          </div>
          <span className="text-xs text-muted-foreground">Deck: {state.player.deck.length}</span>
        </div>
      </div>

      {/* Action Buttons */}
      {isPlayerTurn && (
        <div className="flex gap-2 justify-center">
          {actionMode === "none" && (
            <button
              onClick={() => setActionMode("select-field-attacker")}
              disabled={!playerFieldCards.some(fc => !fc.stunned)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-destructive text-destructive-foreground font-heading font-bold text-xs hover:brightness-110 transition-all disabled:opacity-40"
            >
              <Sword className="w-4 h-4" /> Attack
            </button>
          )}
          {actionMode !== "none" && (
            <button
              onClick={() => { setActionMode("none"); setSelectedHandIndex(null); setSelectedFieldIndex(null); }}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-secondary text-secondary-foreground font-heading font-bold text-xs"
            >
              <ArrowLeft className="w-4 h-4" /> Cancel
            </button>
          )}
          {actionMode === "select-field-attacker" && (
            <span className="text-xs text-legendary font-bold self-center animate-pulse">Select your card to attack with →</span>
          )}
          {actionMode === "select-attack-target" && (
            <span className="text-xs text-destructive font-bold self-center animate-pulse">Select enemy target →</span>
          )}
          {actionMode === "select-equip-target" && (
            <span className="text-xs text-legendary font-bold self-center animate-pulse">Select your card to equip →</span>
          )}
          {actionMode === "select-spell-target" && (
            <span className="text-xs text-legendary font-bold self-center animate-pulse">Select target →</span>
          )}
        </div>
      )}

      {/* Hand */}
      <div className="bg-card border border-border rounded-xl p-3">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Your Hand ({state.player.hand.length})</span>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {state.player.hand.map((card, i) => (
            <motion.div
              key={`${card.id}-${i}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "flex-shrink-0 w-24 rounded-lg border-2 p-2 cursor-pointer transition-all hover:scale-105",
                selectedHandIndex === i ? "ring-2 ring-legendary border-legendary" : "border-border hover:border-primary/50",
                !isPlayerTurn && "opacity-50 pointer-events-none"
              )}
              onClick={() => isPlayerTurn && handleHandCardClick(i)}
            >
              <div className="w-full h-14 rounded overflow-hidden mb-1">
                <img src={card.image} alt={card.name} className="w-full h-full object-cover" />
              </div>
              <p className="text-[8px] font-bold text-foreground truncate">{card.name}</p>
              <p className="text-[7px] text-muted-foreground uppercase">{card.type}</p>
              {(card.type === "hero" || card.type === "god") && (
                <div className="flex gap-2 text-[8px] mt-0.5">
                  <span className="text-destructive">⚔{card.attack}</span>
                  <span className="text-rare">🛡{card.defense}</span>
                  <span className="text-green-500">❤{card.hp}</span>
                </div>
              )}
              {card.type === "weapon" && card.weaponBonus && (
                <div className="text-[8px] text-legendary mt-0.5">+{card.weaponBonus.attack}⚔ +{card.weaponBonus.defense}🛡</div>
              )}
              {card.type === "spell" && (
                <div className="text-[8px] text-synergy mt-0.5">{card.spellEffect?.type}</div>
              )}
              {card.type === "trap" && (
                <div className="text-[8px] text-destructive mt-0.5">🪤 Trap</div>
              )}
            </motion.div>
          ))}
          {state.player.hand.length === 0 && (
            <p className="text-xs text-muted-foreground py-4">No cards in hand</p>
          )}
        </div>
      </div>

      {/* Game Over */}
      <AnimatePresence>
        {state.phase === "game-over" && !showLevelUps && (
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
            <motion.div initial={{ y: 30 }} animate={{ y: 0 }} className="bg-card border border-border rounded-2xl p-8 text-center max-w-md mx-auto">
              {state.winner === "player" ? (
                <>
                  <Trophy className="w-16 h-16 text-legendary mx-auto mb-4" />
                  <h3 className="font-heading text-2xl font-bold text-legendary mb-2">Victory!</h3>
                  <p className="text-muted-foreground text-sm">Your strategy was flawless!</p>
                </>
              ) : state.winner === "draw" ? (
                <>
                  <Sparkles className="w-16 h-16 text-synergy mx-auto mb-4" />
                  <h3 className="font-heading text-2xl font-bold text-synergy mb-2">Draw!</h3>
                  <p className="text-muted-foreground text-sm">Both sides fell simultaneously.</p>
                </>
              ) : (
                <>
                  <Skull className="w-16 h-16 text-destructive mx-auto mb-4" />
                  <h3 className="font-heading text-2xl font-bold text-destructive mb-2">Defeat</h3>
                  <p className="text-muted-foreground text-sm">Rebuild and try again!</p>
                </>
              )}
              <div className="mt-4 p-3 rounded-xl bg-secondary space-y-2">
                <div className="flex items-center justify-center gap-2">
                  <Coins className="w-4 h-4 text-legendary" />
                  <span className="font-heading font-bold text-foreground">+{goldEarned} Gold</span>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  All deck cards earned {state.winner === "player" ? "50" : state.winner === "draw" ? "35" : "20"} XP
                </p>
              </div>
              <div className="flex gap-3 mt-6 justify-center">
                <button onClick={onExit} className="px-5 py-2.5 rounded-xl bg-secondary text-secondary-foreground font-heading font-bold text-sm hover:bg-secondary/80">
                  Back to Deck
                </button>
                <button
                  onClick={() => {
                    const enemyIds = generateEnemyDeck(playerDeckIds.length);
                    setState(initBattle(playerDeckIds, enemyIds));
                    setRewardsGiven(false);
                    setGoldEarned(0);
                    setLevelUps([]);
                    setActionMode("none");
                  }}
                  className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-heading font-bold text-sm hover:brightness-110"
                >
                  Battle Again
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Battle Log */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-4 py-2 border-b border-border bg-secondary/50">
          <span className="font-heading text-xs font-bold uppercase tracking-wider text-muted-foreground">Battle Log</span>
        </div>
        <div ref={logRef} className="p-3 max-h-32 overflow-y-auto space-y-1">
          {state.logs.map((log, i) => (
            <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className={cn(
              "text-xs py-0.5 px-2 rounded",
              log.type === "attack" && "text-destructive/90",
              log.type === "ability" && "text-legendary/90",
              log.type === "synergy" && "text-synergy",
              log.type === "defeat" && "text-destructive font-bold",
              log.type === "info" && "text-muted-foreground",
              log.type === "spell" && "text-synergy/90",
              log.type === "trap" && "text-legendary/90",
              log.type === "weapon" && "text-legendary/90",
              log.type === "direct" && "text-destructive font-bold",
            )}>
              {log.message}
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
