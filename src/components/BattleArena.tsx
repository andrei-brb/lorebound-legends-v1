import { useState, useEffect, useRef, useMemo } from "react";
import battleBg from "@/assets/battle-bg.jpg";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, Skull, Sparkles, ArrowLeft } from "lucide-react";
import { GoldCurrencyIcon } from "@/components/CurrencyIcons";
import { cn } from "@/lib/utils";
import type { BattleState } from "@/lib/battleEngine";
import {
  initBattle,
  playCard,
  equipWeapon,
  castSpell,
  attackTarget,
  activateAbility,
  performAITurn,
  generateEnemyDeck,
  endTurnAction,
  getApCapForTurn,
  getHandPlayApCost,
} from "@/lib/battleEngine";
import {
  replayBattleFromActions,
  toViewerBattleState,
  type BattleLockstepIntent,
  type LivePvPBattleConfig,
} from "@/lib/battleLockstep";
import BattleCardToken from "./BattleCardToken";
import BattleRadialMenu from "./BattleRadialMenu";
import HeroPortrait from "./HeroPortrait";
import BattleInfoPanel from "./BattleInfoPanel";
import CardLevelUp from "./CardLevelUp";
import BattleLogPanel from "./BattleLogPanel";
import { type PlayerState, type CardProgress, getCardProgress, addCardToCollection } from "@/lib/playerState";
import { awardXp, type LevelUpResult } from "@/lib/progressionEngine";
import { getBattleGoldReward, getRaidGoldReward } from "@/lib/gachaEngine";
import { getRaidBoss, resolveBossDeck } from "@/lib/raid/bosses";
import { loadDailyQuests, progressQuest, saveDailyQuests } from "@/lib/questEngine";
import { toast } from "@/hooks/use-toast";
import { awardBattlePassXp } from "@/lib/battlePassEngine";
import { rollMysteryBox, claimFirstWin, FIRST_WIN_GOLD, FIRST_WIN_BP_XP } from "@/lib/dailyEngine";
import { getCosmeticById } from "@/data/cosmetics";
import LegendaryPicker from "./LegendaryPicker";
import { useIsMobile } from "@/hooks/use-mobile";

interface BattleArenaProps {
  playerDeckIds: string[];
  /** If set, enemy uses this deck (e.g. ranked: opponent's snapshot). Otherwise random AI deck. */
  opponentDeckIds?: string[] | null;
  /** Ranked async: called once on game over before economy sync (submits MMR). */
  onRankedSubmit?: (data: {
    won: boolean;
    draw?: boolean;
    turnCount: number;
    actionLog?: BattleLockstepIntent[];
    seed?: number;
  }) => Promise<void>;
  /** When set (ranked async with server seed), RNG is fixed so the server can verify `actionLog`. */
  battleSeed?: number | null;
  /** Shown under retreat (e.g. "Ranked vs Name — AI controls their deck"). */
  rankedSubtitle?: string | null;
  onExit: () => void;
  playerState: PlayerState;
  onStateChange: (state: PlayerState) => void;
  isOnline?: boolean;
  startPveBattleApi?: (body: {
    deckCardIds: string[];
    raidBossId?: string;
    opponentDeckIds?: string[] | null;
    raidCoopHotseat?: boolean;
  }) => Promise<{
    matchId: string;
    seed?: number;
    enemyDeckIds?: string[];
    skipReplayVerification?: boolean;
  } | null>;
  submitBattleResultApi?: (data: {
    matchId: string;
    won: boolean;
    draw?: boolean;
    turnCount: number;
    deckCardIds: string[];
    raidBossId?: string;
    actionLog?: BattleLockstepIntent[];
  }) => Promise<{
    goldReward: number;
    levelUps: Array<{ cardId: string; oldLevel: number; newLevel: number }>;
  } | null>;
  /** Live friend PvP: same rules as vs AI; actions sync via server action log. */
  livePvP?: LivePvPBattleConfig;
  /** When online, sync gold/stardust after local-only bonuses (first win, mystery tally). */
  syncEconomyApi?: (gold?: number, stardust?: number) => Promise<void>;
  /** Solo raid vs scripted boss (inflated enemy HP / reward multiplier). */
  soloRaidBossId?: string | null;
}

type ActionMode = "none" | "select-attack-target" | "select-equip-target" | "select-spell-target";

export default function BattleArena({
  playerDeckIds,
  opponentDeckIds,
  onRankedSubmit,
  battleSeed,
  rankedSubtitle,
  onExit,
  playerState,
  onStateChange,
  isOnline,
  submitBattleResultApi,
  startPveBattleApi,
  livePvP,
  syncEconomyApi,
  soloRaidBossId,
}: BattleArenaProps) {
  const playerStateRef = useRef(playerState);
  playerStateRef.current = playerState;

  const [soloState, setSoloState] = useState<BattleState | null>(null);
  const liveDisplayState = useMemo(() => {
    if (!livePvP) return null;
    const canonical = replayBattleFromActions(
      livePvP.seed,
      livePvP.deckA,
      livePvP.deckB,
      livePvP.actionLog
    );
    return toViewerBattleState(canonical, livePvP.viewerIsA);
  }, [livePvP]);

  const state = livePvP ? liveDisplayState : soloState;
  const [animating, setAnimating] = useState(false);
  const [rewardsGiven, setRewardsGiven] = useState(false);
  const [goldEarned, setGoldEarned] = useState(0);
  const [levelUps, setLevelUps] = useState<(LevelUpResult & { cardId: string })[]>([]);
  const [showLevelUps, setShowLevelUps] = useState(false);
  const [showLegendaryPicker, setShowLegendaryPicker] = useState(false);
  const [actionMode, setActionMode] = useState<ActionMode>("none");
  const [selectedHandIndex, setSelectedHandIndex] = useState<number | null>(null);
  const [selectedFieldIndex, setSelectedFieldIndex] = useState<number | null>(null);
  const cardsPlayedRef = useRef(0);
  const rankedActionLogRef = useRef<BattleLockstepIntent[]>([]);
  const pveActionLogRef = useRef<BattleLockstepIntent[]>([]);
  const pveMatchIdRef = useRef<string | null>(null);
  const isMobile = useIsMobile();
  const [mobileLogsOpen, setMobileLogsOpen] = useState(false);

  const queueBattleIntent = (intent: BattleLockstepIntent) => {
    if (livePvP) return;
    if (onRankedSubmit) rankedActionLogRef.current.push(intent);
    else pveActionLogRef.current.push(intent);
  };

  const soloBoss = soloRaidBossId ? getRaidBoss(soloRaidBossId) : undefined;

  useEffect(() => {
    if (livePvP) return;
    rankedActionLogRef.current = [];
    pveActionLogRef.current = [];
    pveMatchIdRef.current = null;
    let cancelled = false;

    (async () => {
      let serverSeed: number | null = null;
      let serverEnemyDeck: string[] | null = null;

      if (isOnline && submitBattleResultApi && startPveBattleApi && !onRankedSubmit) {
        try {
          const started = await startPveBattleApi({
            deckCardIds: playerDeckIds,
            raidBossId: soloRaidBossId ?? undefined,
            opponentDeckIds: opponentDeckIds ?? undefined,
          });
          if (!cancelled && started?.matchId) {
            pveMatchIdRef.current = started.matchId;
            if (!started.skipReplayVerification && started.seed != null && Array.isArray(started.enemyDeckIds)) {
              serverSeed = started.seed;
              serverEnemyDeck = started.enemyDeckIds;
            }
          } else if (!cancelled) {
            pveMatchIdRef.current = null;
          }
        } catch {
          if (!cancelled) pveMatchIdRef.current = null;
        }
      }
      if (cancelled) return;

      let enemyIds: string[];
      let initOpts: Parameters<typeof initBattle>[2];
      if (serverSeed != null && serverEnemyDeck != null) {
        enemyIds = serverEnemyDeck;
        if (soloBoss) {
          initOpts = {
            seed: serverSeed,
            enemyHero: { hp: soloBoss.enemyHp, shield: soloBoss.enemyShield },
          };
        } else {
          initOpts = { seed: serverSeed };
        }
      } else if (soloBoss) {
        const deckSeed = battleSeed ?? Math.floor(Math.random() * 1_000_000_000);
        enemyIds = resolveBossDeck(soloBoss, Math.max(10, playerDeckIds.length), deckSeed);
        initOpts = {
          seed: deckSeed,
          enemyHero: { hp: soloBoss.enemyHp, shield: soloBoss.enemyShield },
        };
      } else {
        enemyIds =
          opponentDeckIds && opponentDeckIds.length > 0 ? opponentDeckIds : generateEnemyDeck(playerDeckIds.length);
        initOpts = battleSeed != null ? { seed: battleSeed } : undefined;
      }
      const playerCardProgress: Partial<Record<string, CardProgress>> = {};
      for (const id of playerDeckIds) {
        playerCardProgress[id] = getCardProgress(playerStateRef.current, id);
      }
      setSoloState(
        initBattle(playerDeckIds, enemyIds, {
          ...initOpts,
          playerCardProgress: playerCardProgress as Record<string, CardProgress>,
        }),
      );
      setRewardsGiven(false);
      setGoldEarned(0);
      setLevelUps([]);
      cardsPlayedRef.current = 0;
    })();

    return () => {
      cancelled = true;
    };
  }, [
    playerDeckIds,
    opponentDeckIds,
    livePvP,
    battleSeed,
    soloRaidBossId,
    soloBoss?.id,
    isOnline,
    submitBattleResultApi,
    startPveBattleApi,
    onRankedSubmit,
  ]);

  // Enemy AI turn
  useEffect(() => {
    if (livePvP) return;
    if (!state || state.phase === "game-over" || state.turn !== "enemy" || animating) return;
    const timer = setTimeout(() => {
      setAnimating(true);
      setTimeout(() => {
        setSoloState(prev => prev ? performAITurn(prev) : prev);
        setAnimating(false);
      }, 500);
    }, 350);
    return () => clearTimeout(timer);
  }, [state, animating, livePvP]);

  const handleEndTurn = () => {
    if (!state || state.phase === "game-over" || animating) return;
    if (livePvP) {
      if (state.turn !== "player" || livePvP.isSubmitting) return;
      void livePvP.onIntent({ kind: "end-turn" });
      setActionMode("none");
      setSelectedFieldIndex(null);
      setSelectedHandIndex(null);
      return;
    }
    if (state.turn !== "player") return;
    queueBattleIntent({ kind: "end-turn" });
    setSoloState((prev) => (prev ? endTurnAction(prev) : prev));
    setActionMode("none");
    setSelectedFieldIndex(null);
    setSelectedHandIndex(null);
  };

  // Award rewards on game over (ranked MMR submit first when applicable)
  useEffect(() => {
    if (!state || state.phase !== "game-over" || rewardsGiven) return;

    if (livePvP) {
      setRewardsGiven(true);
      const won = state.winner === "player";
      onStateChange((prev) => {
        let s = prev;
        const prevPending = s.mysteryBoxesPending ?? 0;
        s = rollMysteryBox(s);
        if ((s.mysteryBoxesPending ?? 0) > prevPending) {
          toast({ title: "Mystery box earned!", description: "Open it in You → Daily." });
        }
        if (won) {
          const fw = claimFirstWin(s);
          if (fw) {
            s = fw.state;
            s = awardBattlePassXp(s, FIRST_WIN_BP_XP).state;
            toast({
              title: "First win of the day!",
              description: `+${FIRST_WIN_GOLD} gold & +${FIRST_WIN_BP_XP} Battle Pass XP`,
            });
          }
        }
        if (isOnline && syncEconomyApi) void syncEconomyApi(s.gold, s.stardust);
        return s;
      });
      return;
    }

    setRewardsGiven(true);
    const won = state.winner === "player";
    const isDraw = state.winner === "draw";
    const turnNumber = state.turnNumber;

    let questState = loadDailyQuests();
    if (won) questState = progressQuest(questState, "win_battles");
    if (cardsPlayedRef.current > 0) questState = progressQuest(questState, "play_cards_in_battle", cardsPlayedRef.current);
    saveDailyQuests(questState);

    void (async () => {
      try {
        if (onRankedSubmit) {
          await onRankedSubmit({
            won,
            draw: isDraw,
            turnCount: turnNumber,
            actionLog: rankedActionLogRef.current,
            seed: battleSeed ?? undefined,
          });
        }
      } catch (e) {
        toast({ title: "Ranked result failed", description: e instanceof Error ? e.message : String(e), variant: "destructive" });
      }

      let usedOnlinePvE = false;
      if (isOnline && submitBattleResultApi && !onRankedSubmit) {
        const mid = pveMatchIdRef.current;
        if (mid) {
          try {
            const result = await submitBattleResultApi({
              matchId: mid,
              won,
              draw: isDraw,
              turnCount: turnNumber,
              deckCardIds: playerDeckIds,
              raidBossId: soloRaidBossId ?? undefined,
              actionLog: pveActionLogRef.current,
            });
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
            onStateChange((prev) => {
              let s = awardBattlePassXp(prev, won ? 120 : isDraw ? 80 : 60).state;
              const prevPending = s.mysteryBoxesPending ?? 0;
              s = rollMysteryBox(s);
              if ((s.mysteryBoxesPending ?? 0) > prevPending) {
                toast({ title: "Mystery box earned!", description: "Open it in You → Daily." });
              }
              if (won) {
                const fw = claimFirstWin(s);
                if (fw) {
                  s = fw.state;
                  s = awardBattlePassXp(s, FIRST_WIN_BP_XP).state;
                  toast({
                    title: "First win of the day!",
                    description: `+${FIRST_WIN_GOLD} gold & +${FIRST_WIN_BP_XP} Battle Pass XP`,
                  });
                }
              }
              if (isOnline && syncEconomyApi) void syncEconomyApi(s.gold, s.stardust);
              return s;
            });
            usedOnlinePvE = true;
          } catch (e) {
            toast({
              title: "Online rewards failed",
              description: e instanceof Error ? e.message : String(e),
              variant: "destructive",
            });
          }
        } else {
          toast({
            title: "Online rewards unavailable",
            description: "Could not start a server battle session. Rewards use local rules until you reconnect.",
            variant: "destructive",
          });
        }
      }
      if (usedOnlinePvE) return;

      onStateChange((prev) => {
        const gold =
          soloBoss != null
            ? getRaidGoldReward(won, turnNumber, soloBoss.goldRewardMultiplier)
            : getBattleGoldReward(won, turnNumber);
        setGoldEarned(gold);
        let newState = { ...prev, cardProgress: { ...prev.cardProgress }, gold: prev.gold + gold };
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
        const prevPending = newState.mysteryBoxesPending ?? 0;
        newState = rollMysteryBox(newState);
        if ((newState.mysteryBoxesPending ?? 0) > prevPending) {
          toast({ title: "Mystery box earned!", description: "Open it in You → Daily." });
        }
        if (won) {
          const fw = claimFirstWin(newState);
          if (fw) {
            newState = fw.state;
            newState = awardBattlePassXp(newState, FIRST_WIN_BP_XP).state;
            toast({
              title: "First win of the day!",
              description: `+${FIRST_WIN_GOLD} gold & +${FIRST_WIN_BP_XP} Battle Pass XP`,
            });
          }
        }
        const tutorialDone = newState.tutorialBattlesCompleted ?? 0;
        if (won && tutorialDone < 5 && !livePvP && !onRankedSubmit) {
          setShowLegendaryPicker(true);
        }
        return newState;
      });
    })();
  }, [
    state,
    rewardsGiven,
    livePvP,
    onRankedSubmit,
    battleSeed,
    submitBattleResultApi,
    playerDeckIds,
    onStateChange,
    isOnline,
    syncEconomyApi,
    soloRaidBossId,
    soloBoss,
  ]);

  const handleHandCardClick = (index: number) => {
    if (!state || state.turn !== "player" || animating || state.phase === "game-over") return;
    if (livePvP?.isSubmitting) return;
    const card = state.player.hand[index];
    if (!card) return;

    if (livePvP) {
      if (card.type === "hero" || card.type === "god" || card.type === "trap") {
        void livePvP.onIntent({ kind: "play-card", handIndex: index });
        setActionMode("none");
        return;
      }
      if (card.type === "weapon") {
        setSelectedHandIndex(index);
        setActionMode("select-equip-target");
        return;
      }
      if (card.type === "spell") {
        if (card.spellEffect?.target === "all_enemies" || card.spellEffect?.target === "all_allies") {
          void livePvP.onIntent({ kind: "cast-spell", handIndex: index });
          setActionMode("none");
          return;
        }
        setSelectedHandIndex(index);
        setActionMode("select-spell-target");
        return;
      }
      return;
    }

    if (card.type === "hero" || card.type === "god" || card.type === "trap") {
      cardsPlayedRef.current += 1;
      queueBattleIntent({ kind: "play-card", handIndex: index });
      setAnimating(true);
      setTimeout(() => {
        setSoloState(prev => prev ? playCard(prev, index) : prev);
        setAnimating(false);
        setActionMode("none");
      }, 150);
    } else if (card.type === "weapon") {
      setSelectedHandIndex(index);
      setActionMode("select-equip-target");
    } else if (card.type === "spell") {
      cardsPlayedRef.current += 1;
      if (card.spellEffect?.target === "all_enemies" || card.spellEffect?.target === "all_allies") {
        queueBattleIntent({ kind: "cast-spell", handIndex: index });
        setAnimating(true);
        setTimeout(() => {
          setSoloState(prev => prev ? castSpell(prev, index) : prev);
          setAnimating(false);
          setActionMode("none");
        }, 150);
      } else {
        setSelectedHandIndex(index);
        setActionMode("select-spell-target");
      }
    }
  };

  const handleFieldCardClick = (side: "player" | "enemy", index: number) => {
    if (!state || state.turn !== "player" || animating || state.phase === "game-over") return;
    if (livePvP?.isSubmitting) return;

    if (livePvP) {
      if (actionMode === "select-equip-target" && side === "player" && selectedHandIndex !== null) {
        void livePvP.onIntent({ kind: "equip-weapon", handIndex: selectedHandIndex, fieldIndex: index });
        setActionMode("none");
        setSelectedHandIndex(null);
        return;
      }
      if (actionMode === "select-spell-target") {
        if (selectedHandIndex === null) return;
        const spell = state.player.hand[selectedHandIndex];
        const targetSide = spell?.spellEffect?.target === "single_ally" ? "player" : "enemy";
        if (side !== targetSide) return;
        void livePvP.onIntent({ kind: "cast-spell", handIndex: selectedHandIndex, targetFieldIndex: index });
        setActionMode("none");
        setSelectedHandIndex(null);
        return;
      }
      if (actionMode === "select-attack-target" && side === "enemy" && selectedFieldIndex !== null) {
        void livePvP.onIntent({ kind: "attack", attackerFieldIndex: selectedFieldIndex, targetFieldIndex: index });
        setActionMode("none");
        setSelectedFieldIndex(null);
        return;
      }
      if (actionMode === "none" && side === "player") {
        const fc = state.player.field[index];
        if (!fc) return;
        setSelectedFieldIndex(prev => (prev === index ? null : index));
      }
      return;
    }

    if (actionMode === "select-equip-target" && side === "player" && selectedHandIndex !== null) {
      cardsPlayedRef.current += 1;
      queueBattleIntent({ kind: "equip-weapon", handIndex: selectedHandIndex, fieldIndex: index });
      setAnimating(true);
      setTimeout(() => {
        setSoloState(prev => prev ? equipWeapon(prev, selectedHandIndex!, index) : prev);
        setAnimating(false);
        setActionMode("none");
        setSelectedHandIndex(null);
      }, 150);
    } else if (actionMode === "select-spell-target") {
      if (selectedHandIndex === null) return;
      const spell = state.player.hand[selectedHandIndex];
      const targetSide = spell?.spellEffect?.target === "single_ally" ? "player" : "enemy";
      if (side !== targetSide) return;
      queueBattleIntent({ kind: "cast-spell", handIndex: selectedHandIndex, targetFieldIndex: index });
      setAnimating(true);
      setTimeout(() => {
        setSoloState(prev => prev ? castSpell(prev, selectedHandIndex!, index) : prev);
        setAnimating(false);
        setActionMode("none");
        setSelectedHandIndex(null);
      }, 150);
    } else if (actionMode === "select-attack-target" && side === "enemy" && selectedFieldIndex !== null) {
      queueBattleIntent({
        kind: "attack",
        attackerFieldIndex: selectedFieldIndex,
        targetFieldIndex: index,
      });
      setAnimating(true);
      setTimeout(() => {
        setSoloState(prev => prev ? attackTarget(prev, selectedFieldIndex!, index) : prev);
        setAnimating(false);
        setActionMode("none");
        setSelectedFieldIndex(null);
      }, 150);
    } else if (actionMode === "none" && side === "player") {
      const fc = state.player.field[index];
      if (!fc) return;
      setSelectedFieldIndex(prev => (prev === index ? null : index));
    } else if (actionMode === "none" && side === "enemy") {
      // tooltip shows on hover, no action needed
    }
  };

  const beginAttackFromRadial = () => {
    if (!state || !isPlayerTurn || animating || selectedFieldIndex === null) return;
    if (livePvP?.isSubmitting) return;
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
    if (livePvP?.isSubmitting) return;
    if (livePvP) {
      void livePvP.onIntent({ kind: "attack", attackerFieldIndex: selectedFieldIndex, targetFieldIndex: "direct" });
      setActionMode("none");
      setSelectedFieldIndex(null);
      return;
    }
    queueBattleIntent({
      kind: "attack",
      attackerFieldIndex: selectedFieldIndex,
      targetFieldIndex: "direct",
    });
    setAnimating(true);
    setTimeout(() => {
      setSoloState(prev => prev ? attackTarget(prev, selectedFieldIndex!, "direct") : prev);
      setAnimating(false);
      setActionMode("none");
      setSelectedFieldIndex(null);
    }, 150);
  };

  const handleUseAbility = (fieldIndex: number) => {
    if (!state || animating) return;
    if (livePvP?.isSubmitting) return;
    if (livePvP) {
      void livePvP.onIntent({ kind: "ability", fieldIndex });
      setActionMode("none");
      setSelectedFieldIndex(null);
      return;
    }
    queueBattleIntent({ kind: "ability", fieldIndex });
    setAnimating(true);
    setTimeout(() => {
      setSoloState(prev => prev ? activateAbility(prev, fieldIndex) : prev);
      setAnimating(false);
      setActionMode("none");
      setSelectedFieldIndex(null);
    }, 150);
  };

  if (!state) return null;

  const isPlayerTurn =
    state.turn === "player" &&
    !animating &&
    state.phase !== "game-over" &&
    !livePvP?.isSubmitting;
  const boardSkinId = playerState.cosmeticsEquipped?.boardSkinId || null;
  const boardSkinImage = boardSkinId ? (getCosmeticById(boardSkinId)?.image || null) : null;
  const noEnemyField = !state.enemy.field.some((fc) => fc != null);

  return (
    <div
      className="relative rounded-2xl border border-border/40 overflow-hidden"
      style={{ backgroundImage: `url(${boardSkinImage || battleBg})`, backgroundSize: "cover", backgroundPosition: "center" }}
    >
      <div className="absolute inset-0 pointer-events-none rounded-2xl bg-background/60" />
      {showLevelUps && <CardLevelUp levelUps={levelUps} onClose={() => setShowLevelUps(false)} />}

      <div className="relative flex">
        {/* ===== Battle logs (left sidebar) ===== */}
        <div className="hidden lg:block w-[320px] p-3 sm:p-4">
          <BattleLogPanel logs={state.logs} className="h-full" />
        </div>

        {/* ===== Main Battlefield ===== */}
        <div className="flex-1 flex flex-col min-h-0">
          {/* Retreat button */}
          <div className="absolute top-2 left-2 z-30 flex flex-col gap-1 items-start max-w-[min(100%,280px)]">
            <button
              onClick={onExit}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-secondary/80 text-secondary-foreground text-[10px] font-bold hover:bg-secondary transition-colors backdrop-blur-sm"
            >
              <ArrowLeft className="w-3 h-3" /> Retreat
            </button>
            {isMobile && (
              <button
                type="button"
                onClick={() => setMobileLogsOpen((v) => !v)}
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-secondary/80 text-secondary-foreground text-[10px] font-bold hover:bg-secondary transition-colors backdrop-blur-sm"
              >
                {mobileLogsOpen ? "Hide logs" : "Show logs"}
              </button>
            )}
            {rankedSubtitle || soloBoss ? (
              <span className="text-[9px] text-muted-foreground font-heading leading-tight bg-background/70 px-2 py-1 rounded-md border border-border/50">
                {rankedSubtitle ?? (soloBoss ? `Raid — ${soloBoss.name}` : "")}
              </span>
            ) : null}
          </div>

          {/* Turn indicator */}
          <div className="absolute top-2 right-2 z-30 md:left-1/2 md:-translate-x-1/2 md:right-auto">
            <span className="text-[9px] text-muted-foreground font-heading mr-2">Turn {state.turnNumber}</span>
          </div>

          <div className="p-3 sm:p-4 space-y-2">
            {/* Mobile logs (top) */}
            {isMobile && mobileLogsOpen && (
              <div className="mb-2">
                <BattleLogPanel logs={state.logs} />
              </div>
            )}
            {/* ===== Enemy Hero ===== */}
            <div className="flex justify-center">
              <HeroPortrait
                side="enemy"
                hp={state.enemy.hp}
                maxHp={soloBoss?.enemyHp ?? 30}
                shield={state.enemy.shield}
                ap={state.enemy.ap}
                maxAp={getApCapForTurn(state.turnNumber)}
                deckCount={state.enemy.deck.length}
                handCount={state.enemy.hand.length}
                isActiveTurn={state.turn === "enemy"}
              />
            </div>

            {/* ===== Enemy Field ===== */}
            <div className="space-y-1.5">
              <div className="flex justify-center gap-1 flex-wrap">
                {state.enemy.tokens.map((tok, i) => (
                  <div
                    key={`et-${i}`}
                    className={cn(
                      "relative w-10 h-12 sm:w-11 sm:h-14 rounded-md border overflow-hidden flex flex-col items-center justify-end",
                      tok ? "border-amber-500/50 bg-amber-950/30" : "border-border/10 opacity-40",
                    )}
                  >
                    {tok ? (
                      <>
                        <img src={tok.image} alt="" className="absolute inset-0 w-full h-full object-cover opacity-90" />
                        <span className="relative z-10 text-[8px] font-bold text-white drop-shadow px-0.5">
                          {tok.attack}⚔ {tok.turnsRemaining}t
                        </span>
                      </>
                    ) : (
                      <span className="text-muted-foreground/20 text-[8px]">·</span>
                    )}
                  </div>
                ))}
              </div>
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

              <div className="flex justify-center gap-1 flex-wrap">
                {state.player.tokens.map((tok, i) => (
                  <div
                    key={`pt-${i}`}
                    className={cn(
                      "relative w-10 h-12 sm:w-11 sm:h-14 rounded-md border overflow-hidden flex flex-col items-center justify-end",
                      tok ? "border-primary/50 bg-primary/10" : "border-border/10 opacity-40",
                    )}
                  >
                    {tok ? (
                      <>
                        <img src={tok.image} alt="" className="absolute inset-0 w-full h-full object-cover opacity-90" />
                        <span className="relative z-10 text-[8px] font-bold text-white drop-shadow px-0.5">
                          {tok.attack}⚔ {tok.turnsRemaining}t
                        </span>
                      </>
                    ) : (
                      <span className="text-muted-foreground/20 text-[8px]">·</span>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex justify-center gap-2 sm:gap-3 min-h-[104px]">
                {state.player.field.map((fc, i) => (
                  <div key={i} className="relative group">
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
                        />

                        {/* Hover tooltip */}
                        <div className="hidden group-hover:block absolute z-50 bottom-full mb-1 left-1/2 -translate-x-1/2">
                          <BattleInfoPanel fieldCard={fc} side="player" />
                        </div>

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
                      <div className="w-[72px] h-[92px] sm:w-20 sm:h-[104px] rounded-lg border border-dashed border-border/20 flex items-center justify-center">
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
                maxAp={getApCapForTurn(state.turnNumber)}
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
                  <div
                    key={`${card.id}-${i}`}
                    className={cn(
                      "relative flex-shrink-0 w-[68px] sm:w-20 rounded-lg border-2 overflow-hidden cursor-pointer",
                      "transition-[transform,box-shadow,border-color] duration-150 ease-out will-change-transform",
                      selectedHandIndex === i
                        ? "-translate-y-2 ring-2 ring-legendary border-legendary shadow-[0_0_12px_hsl(var(--legendary)/0.4)]"
                        : "border-border translate-y-0",
                      isPlayerTurn && selectedHandIndex !== i && "hover:border-primary/50",
                      !isPlayerTurn && "opacity-50 pointer-events-none"
                    )}
                    onClick={() => isPlayerTurn && handleHandCardClick(i)}
                  >
                    <div
                      className="absolute top-0.5 right-0.5 z-10 rounded px-1 py-0.5 text-[8px] font-heading font-bold leading-none tabular-nums border border-amber-400/50 bg-black/80 text-amber-100 shadow-[0_1px_2px_rgba(0,0,0,0.9)]"
                      title="AP to play from hand"
                    >
                      {getHandPlayApCost(card)} AP
                    </div>
                    <div className="w-full h-16 sm:h-20 overflow-hidden">
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
                  </div>
                ))}
                {state.player.hand.length === 0 && (
                  <p className="text-[10px] text-muted-foreground py-3">No cards in hand</p>
                )}
              </div>
            </div>
          </div>
        </div>

      </div>

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
              {!livePvP && (
                <div className="mt-4 p-3 rounded-xl bg-secondary space-y-2">
                  <div className="flex items-center justify-center gap-2">
                    <GoldCurrencyIcon className="w-4 h-4" />
                    <span className="font-heading font-bold text-foreground">+{goldEarned} Gold</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    All deck cards earned {state.winner === "player" ? "50" : state.winner === "draw" ? "35" : "20"} XP
                  </p>
                </div>
              )}
              <div className="flex gap-3 mt-6 justify-center">
                <button onClick={onExit} className="px-5 py-2.5 rounded-xl bg-secondary text-secondary-foreground font-heading font-bold text-sm hover:bg-secondary/80">
                  {livePvP ? "Back to PvP" : "Back to Deck"}
                </button>
                {!livePvP && (
                  <button
                    onClick={() => {
                      const enemyIds = generateEnemyDeck(playerDeckIds.length);
                      setSoloState(initBattle(playerDeckIds, enemyIds));
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
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {showLegendaryPicker && (() => {
        const battleNum = Math.min(5, (playerState.tutorialBattlesCompleted ?? 0) + 1) as 1 | 2 | 3 | 4 | 5;
        return (
          <LegendaryPicker
            battleNumber={battleNum}
            playerState={playerState}
            onPick={(cardId) => {
              const { state: withCard } = addCardToCollection(playerState, cardId);
              onStateChange({
                ...withCard,
                tutorialBattlesCompleted: (playerState.tutorialBattlesCompleted ?? 0) + 1,
              });
              setShowLegendaryPicker(false);
            }}
          />
        );
      })()}
    </div>
  );
}
