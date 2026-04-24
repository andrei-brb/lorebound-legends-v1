import { useState, useEffect, useRef, useMemo, type SetStateAction } from "react";
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
  passResponseWindow,
  activateTrapFromResponseWindow,
  activateQuickSpellFromResponseWindow,
  resolveAiResponseWindow,
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
import BattleCardInspectPanel, { type Inspect } from "./BattleCardInspectPanel";
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
import defaultCardBack from "@/assets/battlepass/cardback-bloom-crest.jpg";
import {
  ActionLogRibbon,
  type ActionLogEntry,
  AltarAtmosphere,
  BattlefieldSceneV2,
  type SideState,
  type ZoneRef,
  PlayerBar,
  ZoneStack,
  PhaseIndicator,
  PlayerHand,
  type HandCard as AltarHandCard,
  CardDetailPanel,
  type DetailCard,
} from "@/components/battle3d";

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
  onStateChange: (next: SetStateAction<PlayerState>) => void;
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

type Rect = { x: number; y: number; w: number; h: number };
type FlyingCard = { id: number; img: string; name: string; from: Rect; to: Rect };

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
  // Hand → Field placement animation (real gameplay)
  const placementContainerRef = useRef<HTMLDivElement>(null);
  const playerSlotRefs = useRef<(HTMLDivElement | null)[]>([]);
  const handCardRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const flyIdRef = useRef(0);
  const lastStateRef = useRef<BattleState | null>(null);
  const pendingPlayRef = useRef<{ cardId: string; img: string; name: string; from: Rect } | null>(null);
  const [flyingCards, setFlyingCards] = useState<FlyingCard[]>([]);
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
  const [logsOpen, setLogsOpen] = useState(false);
  const [inspect, setInspect] = useState<Inspect>({ kind: "none" });
  const [hoveredZone3d, setHoveredZone3d] = useState<ZoneRef | null>(null);
  const [altarLog, setAltarLog] = useState<ActionLogEntry[]>([
    { id: "init", kind: "info", text: "The altar stirs…", ts: Date.now() },
  ]);

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
          ruleset: "ygoHybrid",
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

  /** ygoHybrid: enemy response windows block the engine until resolved — auto-resolve after a short beat. */
  useEffect(() => {
    if (livePvP) return;
    if (!state || state.phase === "game-over") return;
    if (state.ruleset !== "ygoHybrid") return;
    if (state.turn !== "player") return;
    if (!state.responseWindow || state.responseWindow.responder !== "enemy") return;
    if (animating) return;

    const t = window.setTimeout(() => {
      setSoloState((prev) => (prev ? resolveAiResponseWindow(prev) : prev));
    }, 450);
    return () => window.clearTimeout(t);
  }, [state, livePvP, animating]);

  useEffect(() => {
    if (!state) return;
    const last = state.logs[state.logs.length - 1];
    if (!last) return;
    const kind: ActionLogEntry["kind"] =
      last.type === "attack"
        ? "attack"
        : last.type === "defeat"
          ? "defeat"
          : last.type === "spell" || last.type === "trap" || last.type === "weapon"
            ? "summon"
            : "info";
    const id = `${last.timestamp}-${state.logs.length}`;
    setAltarLog((prev) => {
      if (prev.length && prev[prev.length - 1].id === id) return prev;
      return [...prev.slice(-24), { id, kind, text: last.message, ts: Date.now() }];
    });
  }, [state?.logs.length]); // eslint-disable-line react-hooks/exhaustive-deps

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
    setSoloState((prev) => {
      if (!prev) return prev;
      let s = prev;
      if (s.ruleset === "ygoHybrid" && s.responseWindow?.responder === "enemy") {
        s = resolveAiResponseWindow(s);
      }
      return endTurnAction(s);
    });
    setActionMode("none");
    setSelectedFieldIndex(null);
    setSelectedHandIndex(null);
  };

  const canPlayerRespond = Boolean(state?.responseWindow && state.responseWindow.responder === "player");

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
        const se = card.spellEffect;
        if (se && "target" in se && (se.target === "all_enemies" || se.target === "all_allies")) {
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
      // Capture start rect before the card leaves hand.
      const containerEl = placementContainerRef.current;
      const handEl = handCardRefs.current[index];
      if (containerEl && handEl) {
        pendingPlayRef.current = {
          cardId: card.id,
          img: card.image,
          name: card.name,
          from: rectInContainer(handEl, containerEl),
        };
      } else {
        pendingPlayRef.current = null;
      }
      queueBattleIntent({ kind: "play-card", handIndex: index });
      setAnimating(true);
      setTimeout(() => {
        setSoloState((prev) => {
          if (!prev) return prev;
          const next = playCard(prev, index);
          if (next === prev && prev.ruleset === "ygoHybrid") {
            cardsPlayedRef.current = Math.max(0, cardsPlayedRef.current - 1);
            if (card.type === "hero" || card.type === "god") {
              if (prev.turnPhase !== "main") {
                toast({
                  title: "Wrong phase",
                  description: "Normal Summon only in Main Phase. Use Next Phase to advance.",
                  variant: "destructive",
                });
              } else if (prev.player.normalSummonUsed) {
                toast({
                  title: "Normal Summon used",
                  description: "You can only Normal Summon 1 hero or god per turn.",
                  variant: "destructive",
                });
              }
            }
          }
          return next;
        });
        setAnimating(false);
        setActionMode("none");
      }, 150);
    } else if (card.type === "weapon") {
      setSelectedHandIndex(index);
      setActionMode("select-equip-target");
    } else if (card.type === "spell") {
      cardsPlayedRef.current += 1;
      const se = card.spellEffect;
      if (se && "target" in se && (se.target === "all_enemies" || se.target === "all_allies")) {
        queueBattleIntent({ kind: "cast-spell", handIndex: index });
        setAnimating(true);
        setTimeout(() => {
          setSoloState((prev) => {
            if (!prev) return prev;
            const next = castSpell(prev, index);
            if (next === prev && prev.ruleset === "ygoHybrid") {
              cardsPlayedRef.current = Math.max(0, cardsPlayedRef.current - 1);
              const sc = prev.player.hand[index];
              if (sc?.type === "spell" && sc.spellSpeed === "quick") {
                toast({
                  title: "Quick spell",
                  description: "Quick spells can only be activated during a response window.",
                  variant: "destructive",
                });
              } else if (sc?.type === "spell") {
                if (prev.turnPhase !== "main") {
                  toast({
                    title: "Wrong phase",
                    description: "Cast normal spells in Main Phase.",
                    variant: "destructive",
                  });
                } else if (prev.player.hasCastSpellThisTurn) {
                  toast({
                    title: "Spell limit",
                    description: "You can only cast 1 spell per turn.",
                    variant: "destructive",
                  });
                } else if (prev.player.ap < 1) {
                  toast({
                    title: "Not enough AP",
                    description: "Spells cost AP.",
                    variant: "destructive",
                  });
                }
              }
            }
            return next;
          });
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
        if (!spell || spell.type !== "spell") return;
        const se = spell.spellEffect;
        if (!se || !("target" in se)) return;
        const targetSide = se.target === "single_ally" ? "player" : "enemy";
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
      if (!spell || spell.type !== "spell") return;
      const se = spell.spellEffect;
      if (!se || !("target" in se)) return;
      const targetSide = se.target === "single_ally" ? "player" : "enemy";
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
    if (!fc || fc.stunned || fc.attackedThisTurn) {
      if (fc?.stunned) {
        toast({ title: "Stunned", description: "This unit cannot attack this turn.", variant: "destructive" });
      } else if (fc?.attackedThisTurn) {
        toast({ title: "Already attacked", description: "This unit has already attacked this turn.", variant: "destructive" });
      }
      return;
    }
    if (state.ruleset !== "ygoHybrid" && state.player.ap < 1) {
      toast({ title: "No AP", description: "You need at least 1 AP to attack.", variant: "destructive" });
      return;
    }
    if (state.ruleset === "ygoHybrid" && state.turnPhase !== "battle") {
      toast({
        title: "Wrong phase",
        description: "Attacks are only in Battle Phase. Use Next Phase to advance.",
        variant: "destructive",
      });
      return;
    }
    setActionMode("select-attack-target");
  };

  const handleDirectAttack = () => {
    if (!state || selectedFieldIndex === null || animating) return;
    if (livePvP?.isSubmitting) return;
    if (!livePvP && state.ruleset === "ygoHybrid" && state.turnPhase !== "battle") {
      toast({
        title: "Wrong phase",
        description: "Direct attacks are only in Battle Phase. Use Next Phase to advance.",
        variant: "destructive",
      });
      return;
    }
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

  const rectInContainer = (el: HTMLElement, container: HTMLElement): Rect => {
    const c = container.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    return { x: r.left - c.left, y: r.top - c.top, w: r.width, h: r.height };
  };

  const consumePendingIntoFlight = (nextState: BattleState) => {
    const pending = pendingPlayRef.current;
    const prevState = lastStateRef.current;
    const containerEl = placementContainerRef.current;
    if (!pending || !prevState || !containerEl) return;

    const prevField = prevState.player.field;
    const nextField = nextState.player.field;
    const slotIndex = nextField.findIndex((fc, i) => prevField[i] == null && fc?.card?.id === pending.cardId);
    if (slotIndex < 0) return;

    const slotEl = playerSlotRefs.current[slotIndex];
    if (!slotEl) return;

    const to = rectInContainer(slotEl, containerEl);
    const fly: FlyingCard = { id: flyIdRef.current++, img: pending.img, name: pending.name, from: pending.from, to };
    pendingPlayRef.current = null;
    setFlyingCards((arr) => [...arr, fly]);
  };

  useEffect(() => {
    if (!state) return;
    consumePendingIntoFlight(state);
    lastStateRef.current = state;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  if (!state) return null;

  const isPlayerTurn =
    state.turn === "player" &&
    !animating &&
    state.phase !== "game-over" &&
    !livePvP?.isSubmitting;

  const phaseLabel =
    state.ruleset === "ygoHybrid"
      ? state.turnPhase === "draw"
        ? "Draw"
        : state.turnPhase === "main"
          ? "Main"
          : state.turnPhase === "battle"
            ? "Battle"
            : state.turnPhase === "end"
              ? "End"
              : state.turnPhase
      : null;

  const phaseHelpText =
    state.ruleset === "ygoHybrid"
      ? state.turnPhase === "main"
        ? "Main: Normal Summon 1 unit, set traps, equip weapons, cast 1 spell."
        : state.turnPhase === "battle"
          ? "Battle: Attack with units that haven’t attacked."
          : state.turnPhase === "end"
            ? "End: Cleanup, then turn passes."
            : state.turnPhase === "draw"
              ? "Draw: Draw 1 card."
              : null
      : null;
  const boardSkinId = playerState.cosmeticsEquipped?.boardSkinId || null;
  const boardSkinImage = boardSkinId ? (getCosmeticById(boardSkinId)?.image || null) : null;
  const noEnemyField = !state.enemy.field.some((fc) => fc != null);

  const useAltarBattlefield = true;

  const phaseLabel3d =
    state.ruleset === "ygoHybrid"
      ? state.turnPhase === "main"
        ? "Main"
        : state.turnPhase === "battle"
          ? "Battle"
          : "End"
      : "Main";

  const endTurnLabel3d =
    state.ruleset === "ygoHybrid"
      ? state.turnPhase === "main"
        ? "To Battle"
        : state.turnPhase === "battle"
          ? "End Phase"
          : "Next Turn"
      : "End Turn";

  const toSideState = (side: BattleState["player"]): SideState => {
    const monsters = Array.from({ length: 5 }).map((_, i) => {
      const fc = side.field[i] ?? null;
      return { cardImage: fc?.card.image ?? null };
    });
    const spells = Array.from({ length: 5 }).map((_, i) => {
      const t = side.traps[i] ?? null;
      const img = t ? (t.faceDown ? defaultCardBack : t.card.image) : null;
      return { cardImage: img };
    });
    return { monsters, spells };
  };

  const altarPlayer = toSideState(state.player);
  const altarOpponent = toSideState(state.enemy);

  const altarHand: AltarHandCard[] = state.player.hand.map((c, i) => ({
    id: `${c.id}-${i}`,
    image: c.image,
    name: c.name,
    kind: c.type === "spell" || c.type === "trap" || c.type === "weapon" ? "spell" : "monster",
  }));

  const selectedHandId =
    selectedHandIndex != null && state.player.hand[selectedHandIndex]
      ? `${state.player.hand[selectedHandIndex]!.id}-${selectedHandIndex}`
      : null;

  const hoveredDetail: DetailCard | null = (() => {
    if (inspect.kind === "hand") {
      return {
        id: `hand-${inspect.card.id}`,
        image: inspect.card.image,
        name: inspect.card.name,
        kindLabel: inspect.card.type,
        atk: inspect.card.type === "hero" || inspect.card.type === "god" ? inspect.card.attack : undefined,
        def: inspect.card.type === "hero" || inspect.card.type === "god" ? inspect.card.defense : undefined,
      };
    }
    if (inspect.kind === "field") {
      const fc = inspect.fieldCard;
      return {
        id: `field-${fc.card.id}`,
        image: fc.card.image,
        name: fc.card.name,
        kindLabel: fc.card.type,
        atk: fc.attack,
        def: fc.defense,
      };
    }
    return null;
  })();

  return (
    <div
      className="relative rounded-2xl border border-border/40 overflow-hidden"
      style={{ backgroundImage: `url(${boardSkinImage || battleBg})`, backgroundSize: "cover", backgroundPosition: "center" }}
    >
      <div className="absolute inset-0 pointer-events-none rounded-2xl bg-background/60" />
      {showLevelUps && <CardLevelUp levelUps={levelUps} onClose={() => setShowLevelUps(false)} />}

      {/* ygoHybrid Response Window (player-side) */}
      <AnimatePresence>
        {state?.responseWindow && state.responseWindow.responder === "player" && state.phase !== "game-over" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-[min(92vw,420px)] rounded-2xl border border-border bg-card p-4 shadow-2xl"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Response Window</p>
                  <h3 className="font-heading text-base font-bold text-foreground mt-1">
                    Opponent action — respond?
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Trigger: <span className="font-mono">{state.responseWindow.cause}</span>
                  </p>
                </div>
              </div>

              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => setSoloState((prev) => (prev ? passResponseWindow(prev) : prev))}
                  className="flex-1 px-3 py-2 rounded-xl bg-secondary text-secondary-foreground font-heading font-bold text-sm hover:bg-secondary/80"
                >
                  No (Pass)
                </button>
                <div className="flex-1 space-y-2">
                  <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Activate</div>
                  <div className="space-y-1">
                    {state.player.traps
                      .map((t, idx) => ({ t, idx }))
                      .filter(({ t }) => t && t.faceDown && t.card.trapEffect?.trigger === state.responseWindow?.cause)
                      .map(({ t, idx }) => (
                        <button
                          key={`trap-${idx}`}
                          onClick={() => setSoloState((prev) => (prev ? activateTrapFromResponseWindow(prev, idx) : prev))}
                          className="w-full px-3 py-2 rounded-xl bg-primary text-primary-foreground font-heading font-bold text-xs hover:brightness-110 text-left"
                        >
                          🪤 {t!.card.name}
                        </button>
                      ))}

                    {state.player.hand
                      .map((c, idx) => ({ c, idx }))
                      .filter(({ c }) => c.type === "spell" && c.spellSpeed === "quick")
                      .map(({ c, idx }) => (
                        <button
                          key={`qs-${c.id}-${idx}`}
                          onClick={() => setSoloState((prev) => (prev ? activateQuickSpellFromResponseWindow(prev, idx) : prev))}
                          className="w-full px-3 py-2 rounded-xl bg-legendary/90 text-white font-heading font-bold text-xs hover:brightness-110 text-left"
                        >
                          ⚡ {c.name}
                        </button>
                      ))}

                    {state.player.hand.every((c) => !(c.type === "spell" && c.spellSpeed === "quick")) &&
                      state.player.traps.every((t) => !(t && t.faceDown && t.card.trapEffect?.trigger === state.responseWindow?.cause)) && (
                        <div className="text-[11px] text-muted-foreground">
                          No eligible traps or quick spells.
                        </div>
                      )}
                  </div>
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground mt-3">
                Pick 1 response. After activation, the window closes and play continues.
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative flex">
        <div className="flex-1 flex flex-col min-h-0">
          {useAltarBattlefield ? (
            <div className="fixed inset-0 overflow-hidden" style={{ background: "var(--gradient-altar)" }}>
              <div className="absolute inset-0 bottom-44">
                <BattlefieldSceneV2
                  player={altarPlayer}
                  opponent={altarOpponent}
                  attackingZone={
                    actionMode === "select-attack-target" && selectedFieldIndex != null
                      ? { side: "player", row: "monsters", index: selectedFieldIndex }
                      : null
                  }
                  targetableZones={
                    actionMode === "select-attack-target"
                      ? (state.enemy.field
                          .map((fc, i) => (fc ? ({ side: "opponent", row: "monsters", index: i } as const) : null))
                          .filter(Boolean) as unknown as ZoneRef[])
                      : []
                  }
                  hoveredZone={hoveredZone3d}
                  onZoneHover={(z) => {
                    setHoveredZone3d(z);
                    if (!z) return;
                    if (z.side === "player" && z.row === "monsters") {
                      const fc = state.player.field[z.index];
                      if (fc) setInspect({ kind: "field", fieldCard: fc });
                    } else if (z.side === "opponent" && z.row === "monsters") {
                      const fc = state.enemy.field[z.index];
                      if (fc) setInspect({ kind: "field", fieldCard: fc });
                    }
                  }}
                  onZoneClick={(side, row, index) => {
                    if (row !== "monsters") return;
                    if (side === "player") handleFieldCardClick("player", index);
                    else handleFieldCardClick("enemy", index);
                  }}
                />
                <AltarAtmosphere />
              </div>

              <div className="pointer-events-none absolute left-4 top-4">
                <PlayerBar
                  name={soloBoss ? soloBoss.name : "Enemy"}
                  lp={state.enemy.hp}
                  maxLp={soloBoss?.enemyHp ?? 50}
                  side="top"
                  isActiveTurn={state.turn === "enemy"}
                />
              </div>
              <div className="pointer-events-none absolute right-4 top-4 flex gap-2">
                <ZoneStack label="Deck" count={state.enemy.deck.length} icon="shield" />
                <ZoneStack label="Grave" count={state.enemy.graveyard.length} icon="sword" />
              </div>

              <div className="pointer-events-none absolute bottom-44 left-4">
                <PlayerBar name="You" lp={state.player.hp} maxLp={50} side="bottom" isActiveTurn={state.turn === "player"} />
              </div>

              <div className="pointer-events-none absolute bottom-44 right-4 flex flex-col items-end gap-3">
                <div className="flex gap-2">
                  <ZoneStack label="Deck" count={state.player.deck.length} icon="shield" />
                  <ZoneStack label="Grave" count={state.player.graveyard.length} icon="sword" />
                </div>
                <PhaseIndicator
                  turn={state.turnNumber}
                  phase={phaseLabel3d}
                  onEndTurn={handleEndTurn}
                  canEndTurn={isPlayerTurn}
                  endTurnLabel={endTurnLabel3d}
                />
              </div>

              <ActionLogRibbon entries={altarLog} />

              <PlayerHand
                cards={altarHand}
                selectedId={selectedHandId}
                disabled={!isPlayerTurn}
                onSelect={(id) => {
                  if (!isPlayerTurn) return;
                  if (!id) {
                    setSelectedHandIndex(null);
                    setActionMode("none");
                    return;
                  }
                  const idx = altarHand.findIndex((c) => c.id === id);
                  if (idx >= 0) handleHandCardClick(idx);
                }}
                onHoverChange={(id) => {
                  if (!id) {
                    setInspect((prev) => (prev.kind === "hand" ? { kind: "none" } : prev));
                    return;
                  }
                  const idx = altarHand.findIndex((c) => c.id === id);
                  const c = state.player.hand[idx];
                  if (c) setInspect({ kind: "hand", card: c });
                }}
              />

              <CardDetailPanel card={hoveredDetail} />

              <div className="pointer-events-auto absolute top-3 left-3 z-40 flex flex-col gap-1 items-start max-w-[min(100%,280px)]">
                <button onClick={onExit} className="altar-panel px-3 py-2 rounded-md text-[10px] font-bold uppercase tracking-wider altar-text-gold">
                  <ArrowLeft className="w-3 h-3 inline mr-1" /> Retreat
                </button>
                <button
                  type="button"
                  onClick={() => setLogsOpen((v) => !v)}
                  className="altar-panel px-3 py-2 rounded-md text-[10px] font-bold uppercase tracking-wider altar-text-gold"
                >
                  {logsOpen ? "Hide logs" : "Logs"}
                </button>
              </div>
            </div>
          ) : (
            <div ref={placementContainerRef} className="relative p-3 sm:p-4 space-y-2">
              {/* legacy battlefield retained */}
            </div>
          )}
        </div>
      </div>

      {/* ===== Right-side hover inspect (desktop) ===== */}
      {!useAltarBattlefield && (
        <div className="hidden md:block absolute top-3 right-3 z-30 w-[320px] pointer-events-none">
          <BattleCardInspectPanel inspect={inspect} className={inspect.kind === "none" ? "hidden" : ""} />
        </div>
      )}

      {/* ===== Logs drawer (overlay; doesn't steal board space) ===== */}
      {logsOpen && (
        <div className="absolute left-3 bottom-3 z-40 w-[min(300px,92vw)] h-[220px] sm:h-[260px] md:h-[300px]">
          <BattleLogPanel logs={state.logs} className="h-full" />
        </div>
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
                      setSoloState(initBattle(playerDeckIds, enemyIds, { ruleset: "ygoHybrid" }));
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
