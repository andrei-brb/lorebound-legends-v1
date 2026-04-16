import { useState, useEffect, useRef } from "react";
import battleBg from "@/assets/battle-bg.jpg";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Skull, Coins, Sparkles, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BattleState, FieldCard } from "@/lib/battleEngine";
import { initBattle, playCard, equipWeapon, castSpell, attackTarget, useAbility, performAITurn, generateEnemyDeck, endTurnAction } from "@/lib/battleEngine";
import BattleCardToken from "./BattleCardToken";
import BattleRadialMenu from "./BattleRadialMenu";
import HeroPortrait from "./HeroPortrait";
import BattleInfoPanel from "./BattleInfoPanel";
import CardLevelUp from "./CardLevelUp";
import { type PlayerState, getCardProgress, savePlayerState } from "@/lib/playerState";
import { awardXp, type LevelUpResult } from "@/lib/progressionEngine";
import { getBattleGoldReward } from "@/lib/gachaEngine";
import { loadDailyQuests, progressQuest, saveDailyQuests } from "@/lib/questEngine";
import { toast } from "@/hooks/use-toast";
import { awardBattlePassXp } from "@/lib/battlePassEngine";
import { getCosmeticById } from "@/data/cosmetics";
import { useIsMobile } from "@/hooks/use-mobile";

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

type ActionMode = "none" | "select-attack-target" | "select-equip-target" | "select-spell-target";

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
  const [hoveredCard, setHoveredCard] = useState<FieldCard | null>(null);
  const [mobileInfoOpen, setMobileInfoOpen] = useState(false);
  const cardsPlayedRef = useRef(0);
  const isMobile = useIsMobile();

  useEffect(() => {
    const enemyIds = generateEnemyDeck(playerDeckIds.length);
    setState(initBattle(playerDeckIds, enemyIds));
    setRewardsGiven(false);
    setGoldEarned(0);
    setLevelUps([]);
    cardsPlayedRef.current = 0;
  }, [playerDeckIds]);

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

  const handleEndTurn = () => {
    if (!state || state.phase === "game-over" || state.turn !== "player" || animating) return;
    setState((prev) => (prev ? endTurnAction(prev) : prev));
    setActionMode("none");
    setSelectedFieldIndex(null);
    setSelectedHandIndex(null);
  };

  // Award rewards on game over
  useEffect(() => {
    if (!state || state.phase !== "game-over" || rewardsGiven) return;
    setRewardsGiven(true);
    const won = state.winner === "player";
    const isDraw = state.winner === "draw";

    let questState = loadDailyQuests();
    if (won) questState = progressQuest(questState, "win_battles");
    if (cardsPlayedRef.current > 0) questState = progressQuest(questState, "play_cards_in_battle", cardsPlayedRef.current);
    saveDailyQuests(questState);

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
          if (mapped.length > 0) {
            setShowLevelUps(true);
            const qs = progressQuest(loadDailyQuests(), "level_up_card", mapped.length);
            saveDailyQuests(qs);
          }
        }
      });
      const bp = awardBattlePassXp(playerState, won ? 120 : isDraw ? 80 : 60);
      onStateChange(bp.state);
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
    if (allLevelUps.length > 0) {
      setShowLevelUps(true);
      const qs = progressQuest(loadDailyQuests(), "level_up_card", allLevelUps.length);
      saveDailyQuests(qs);
    }
    newState = awardBattlePassXp(newState, won ? 120 : isDraw ? 80 : 60).state;
    onStateChange(newState);
    savePlayerState(newState);
  }, [state?.phase]);

  const handleHandCardClick = (index: number) => {
    if (!state || state.turn !== "player" || animating || state.phase === "game-over") return;
    const card = state.player.hand[index];
    if (!card) return;

    if (card.type === "hero" || card.type === "god" || card.type === "trap") {
      cardsPlayedRef.current += 1;
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
      cardsPlayedRef.current += 1;
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
      cardsPlayedRef.current += 1;
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
    } else if (actionMode === "select-attack-target" && side === "enemy" && selectedFieldIndex !== null) {
      setAnimating(true);
      setTimeout(() => {
        setState(prev => prev ? attackTarget(prev, selectedFieldIndex!, index) : prev);
        setAnimating(false);
        setActionMode("none");
        setSelectedFieldIndex(null);
      }, 400);
    } else if (actionMode === "none" && side === "player") {
      const fc = state.player.field[index];
      if (!fc) return;
      setSelectedFieldIndex(prev => (prev === index ? null : index));
      if (isMobile) {
        setHoveredCard(fc);
        setMobileInfoOpen(true);
      }
    } else if (actionMode === "none" && side === "enemy") {
      const fc = state.enemy.field[index];
      if (fc) {
        setHoveredCard(fc);
        if (isMobile) setMobileInfoOpen(true);
      }
    }
  };

  const beginAttackFromRadial = () => {
    if (!state || !isPlayerTurn || animating || selectedFieldIndex === null) return;
    const fc = state.player.field[selectedFieldIndex];
    if (!fc || fc.stunned || fc.attackedThisTurn) return;
    if (state.player.ap < 1) {
      toast({ title: "No AP", description: "You need at least 1 AP to attack.", variant: "destructive" });
      return;
    }
    setActionMode("select-attack-target");
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
      setSelectedFieldIndex(null);
    }, 400);
  };

  if (!state) return null;

  const isPlayerTurn = state.turn === "player" && !animating && state.phase !== "game-over";
  const boardSkinId = playerState.cosmeticsEquipped?.boardSkinId || null;
  const boardSkinImage = boardSkinId ? (getCosmeticById(boardSkinId)?.image || null) : null;
  const noEnemyField = !state.enemy.field.some(fc => fc !== null);

  return (
    <div
      className="relative rounded-2xl border border-border/40 overflow-hidden"
      style={{ backgroundImage: `url(${boardSkinImage || battleBg})`, backgroundSize: "cover", backgroundPosition: "center" }}
    >
      <div className="absolute inset-0 pointer-events-none rounded-2xl bg-background/60" />
      {showLevelUps && <CardLevelUp levelUps={levelUps} onClose={() => setShowLevelUps(false)} />}

      <div className="relative flex">
        {/* ===== Main Battlefield ===== */}
        <div className="flex-1 flex flex-col min-h-0">
          {/* Retreat button */}
          <div className="absolute top-2 left-2 z-30">
            <button
              onClick={onExit}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-secondary/80 text-secondary-foreground text-[10px] font-bold hover:bg-secondary transition-colors backdrop-blur-sm"
            >
              <ArrowLeft className="w-3 h-3" /> Retreat
            </button>
          </div>

          {/* Turn indicator */}
          <div className="absolute top-2 right-2 z-30 md:left-1/2 md:-translate-x-1/2 md:right-auto">
            <span className="text-[9px] text-muted-foreground font-heading mr-2">Turn {state.turnNumber}</span>
          </div>

          <div className="p-3 sm:p-4 space-y-2">
            {/* ===== Enemy Hero ===== */}
            <div className="flex justify-center">
              <HeroPortrait
                side="enemy"
                hp={state.enemy.hp}
                maxHp={30}
                shield={state.enemy.shield}
                ap={state.enemy.ap}
                maxAp={2}
                deckCount={state.enemy.deck.length}
                handCount={state.enemy.hand.length}
                isActiveTurn={state.turn === "enemy"}
              />
            </div>

            {/* ===== Enemy Field ===== */}
            <div className="space-y-1.5">
              <div className="flex justify-center gap-2 sm:gap-3 min-h-[104px]">
                {state.enemy.field.map((fc, i) => (
                  <div key={i} className="relative group">
                    {fc ? (
                      <>
                        <BattleCardToken
                          fieldCard={fc}
                          side="enemy"
                          selectable={actionMode === "select-attack-target" || (actionMode === "select-spell-target" && state.player.hand[selectedHandIndex!]?.spellEffect?.target === "single_enemy")}
                          onClick={() => handleFieldCardClick("enemy", i)}
                        />
                        {/* Hover tooltip */}
                        <div className="hidden group-hover:block absolute z-50 top-full mt-1 left-1/2 -translate-x-1/2">
                          <BattleInfoPanel fieldCard={fc} side="enemy" />
                        </div>
                      </>
                    ) : (
                      <div className="w-[72px] h-[92px] sm:w-20 sm:h-[104px] rounded-lg border border-dashed border-border/20 flex items-center justify-center">
                        <span className="text-muted-foreground/15 text-[9px]">—</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Enemy traps */}
              <div className="flex justify-center gap-1.5">
                {state.enemy.traps.map((trap, i) => (
                  <div key={i} className={cn(
                    "w-8 h-10 rounded border flex items-center justify-center text-[9px]",
                    trap ? "border-destructive/40 bg-destructive/10 text-destructive" : "border-border/15 text-muted-foreground/15"
                  )}>
                    {trap ? "🪤" : "·"}
                  </div>
                ))}
              </div>
            </div>

            {/* ===== VS Divider + Turn Badge ===== */}
            <div className="flex items-center gap-2 py-1">
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
              <motion.span
                key={state.turn}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className={cn(
                  "px-3 py-1 rounded-full text-[10px] font-heading font-bold uppercase tracking-wider",
                  state.turn === "player"
                    ? "bg-primary/20 text-primary border border-primary/30"
                    : "bg-destructive/20 text-destructive border border-destructive/30",
                )}
              >
                {state.turn === "player" ? "Your Turn" : "Enemy Turn"}
              </motion.span>
              <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
            </div>

            {/* ===== Player Field ===== */}
            <div className="space-y-1.5">
              {/* Player traps */}
              <div className="flex justify-center gap-1.5">
                {state.player.traps.map((trap, i) => (
                  <div key={i} className={cn(
                    "w-8 h-10 rounded border flex items-center justify-center text-[9px]",
                    trap ? "border-primary/40 bg-primary/10 text-primary" : "border-border/15 text-muted-foreground/15"
                  )}>
                    {trap ? "🪤" : "·"}
                  </div>
                ))}
              </div>

              <div className="flex justify-center gap-2 sm:gap-3 min-h-[88px]">
                {state.player.field.map((fc, i) => (
                  <div key={i} className="relative">
                    {fc ? (
                      <>
                        <BattleCardToken
                          fieldCard={fc}
                          side="player"
                          isSelected={selectedFieldIndex === i}
                          selectable={
                            actionMode === "none" ||
                            actionMode === "select-equip-target" ||
                            (actionMode === "select-spell-target" && state.player.hand[selectedHandIndex!]?.spellEffect?.target === "single_ally")
                          }
                          onClick={() => handleFieldCardClick("player", i)}
                          onHover={() => setHoveredCard(fc)}
                          onHoverEnd={() => { if (hoveredCard === fc) setHoveredCard(null); }}
                        />

                        {/* Radial menu on selected card */}
                        {isPlayerTurn && selectedFieldIndex === i && actionMode === "none" && (
                          <BattleRadialMenu
                            fieldCard={fc}
                            visible
                            canAttack={!fc.stunned && !fc.attackedThisTurn && state.player.ap >= 1}
                            canAbility={!fc.abilityUsed && !fc.stunned}
                            canDirectAttack={noEnemyField && !fc.stunned && !fc.attackedThisTurn && state.player.ap >= 1}
                            ap={state.player.ap}
                            onAttack={beginAttackFromRadial}
                            onAbility={() => handleUseAbility(i)}
                            onDirectAttack={handleDirectAttack}
                            onDismiss={() => setSelectedFieldIndex(null)}
                          />
                        )}
                      </>
                    ) : (
                      <div className="w-16 h-20 sm:w-[72px] sm:h-[88px] rounded-lg border border-dashed border-border/20 flex items-center justify-center">
                        <span className="text-muted-foreground/15 text-[9px]">—</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* ===== Player Hero ===== */}
            <div className="flex justify-center">
              <HeroPortrait
                side="player"
                hp={state.player.hp}
                maxHp={30}
                shield={state.player.shield}
                ap={state.player.ap}
                maxAp={2}
                deckCount={state.player.deck.length}
                handCount={state.player.hand.length}
                isActiveTurn={state.turn === "player"}
              />
            </div>

            {/* ===== Action Mode Hint ===== */}
            {actionMode !== "none" && (
              <div className="flex items-center justify-center gap-2">
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                  className={cn(
                    "text-[10px] font-bold",
                    actionMode === "select-attack-target" ? "text-destructive" : "text-legendary",
                  )}
                >
                  {actionMode === "select-attack-target" && "⚔ Select enemy target"}
                  {actionMode === "select-equip-target" && "🗡 Select your card to equip"}
                  {actionMode === "select-spell-target" && "✨ Select target"}
                </motion.span>
                <button
                  onClick={() => { setActionMode("none"); setSelectedHandIndex(null); setSelectedFieldIndex(null); }}
                  className="text-[9px] px-2 py-0.5 rounded bg-secondary text-secondary-foreground hover:bg-secondary/80"
                >
                  Cancel
                </button>
              </div>
            )}

            {/* ===== Hand + End Turn ===== */}
            <div className="bg-card/80 backdrop-blur-sm border border-border rounded-xl p-2 sm:p-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold">
                  Hand ({state.player.hand.length})
                </span>
                {isPlayerTurn && (
                  <button
                    onClick={handleEndTurn}
                    className="text-[10px] px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:brightness-110 transition-colors font-heading font-bold animate-glow-pulse"
                  >
                    End Turn
                  </button>
                )}
              </div>
              <div className="flex gap-1.5 sm:gap-2 overflow-x-auto pb-1 justify-center">
                {state.player.hand.map((card, i) => (
                  <motion.div
                    key={`${card.id}-${i}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{
                      opacity: 1,
                      y: selectedHandIndex === i ? -8 : 0,
                    }}
                    whileHover={isPlayerTurn ? { y: -6, scale: 1.05 } : undefined}
                    className={cn(
                      "flex-shrink-0 w-[60px] sm:w-[72px] rounded-lg border-2 overflow-hidden cursor-pointer transition-shadow",
                      selectedHandIndex === i
                        ? "ring-2 ring-legendary border-legendary shadow-[0_0_12px_hsl(var(--legendary)/0.4)]"
                        : "border-border hover:border-primary/50",
                      !isPlayerTurn && "opacity-50 pointer-events-none"
                    )}
                    onClick={() => isPlayerTurn && handleHandCardClick(i)}
                  >
                    <div className="w-full h-14 sm:h-16 overflow-hidden">
                      <img src={card.image} alt={card.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="p-1 bg-card/90 space-y-0.5">
                      <p className="text-[7px] sm:text-[8px] font-bold text-foreground truncate">{card.name}</p>
                      <p className="text-[6px] sm:text-[7px] text-muted-foreground uppercase">{card.type}</p>
                      {(card.type === "hero" || card.type === "god") && (
                        <div className="flex gap-1.5 text-[7px]">
                          <span className="text-destructive">⚔{card.attack}</span>
                          <span className="text-blue-400">🛡{card.defense}</span>
                          <span className="text-green-400">❤{card.hp}</span>
                        </div>
                      )}
                      {card.type === "weapon" && card.weaponBonus && (
                        <div className="text-[7px] text-legendary">+{card.weaponBonus.attack}⚔ +{card.weaponBonus.defense}🛡</div>
                      )}
                      {card.type === "spell" && (
                        <div className="text-[7px] text-synergy">{card.spellEffect?.type}</div>
                      )}
                      {card.type === "trap" && (
                        <div className="text-[7px] text-destructive">🪤 Trap</div>
                      )}
                    </div>
                  </motion.div>
                ))}
                {state.player.hand.length === 0 && (
                  <p className="text-[10px] text-muted-foreground py-3">No cards in hand</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ===== Side Info Panel (desktop) ===== */}
        {!isMobile && (
          <div className="hidden md:flex border-l border-border">
            <BattleInfoPanel
              selectedCard={infoCard}
              synergies={state.activeSynergies.player}
              logs={state.logs}
            />
          </div>
        )}
      </div>

      {/* ===== Mobile Info Panel (bottom sheet) ===== */}
      {isMobile && (
        <BattleInfoPanel
          selectedCard={infoCard}
          synergies={state.activeSynergies.player}
          logs={state.logs}
          isMobile
          onClose={() => { setMobileInfoOpen(false); setHoveredCard(null); }}
        />
      )}

      {/* ===== Game Over Overlay ===== */}
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
                    setSelectedFieldIndex(null);
                    setSelectedHandIndex(null);
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
    </div>
  );
}
