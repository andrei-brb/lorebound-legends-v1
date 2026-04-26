import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import battleBg from "@/assets/battle-bg.jpg";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { GoldCurrencyIcon } from "@/components/CurrencyIcons";
import { cn } from "@/lib/utils";
import type { BattleLockstepIntent } from "@/lib/battleLockstep";
import {
  type RaidCoopState,
  raidGetBattleView,
  raidPlayCard,
  raidEquipWeapon,
  raidCastSpell,
  raidAttack,
  raidActivateAbility,
  raidEndCurrentAllyTurn,
  raidPartyWon,
  raidBossWon,
  raidIsDraw,
} from "@/lib/raid/raidCoopEngine";
import { getRaidGoldReward } from "@/lib/gachaEngine";
import { getApCapForTurn, getHandPlayApCost } from "@/lib/battleEngine";
import BattleCardToken from "./BattleCardToken";
import BattleRadialMenu from "./BattleRadialMenu";
import HeroPortrait from "./HeroPortrait";
import BattleInfoPanel from "./BattleInfoPanel";
import CardLevelUp from "./CardLevelUp";
import { type PlayerState, getCardProgress } from "@/lib/playerState";
import { awardXp, type LevelUpResult } from "@/lib/progressionEngine";
import { loadDailyQuests, progressQuest, saveDailyQuests } from "@/lib/questEngine";
import { toast } from "@/hooks/use-toast";
import { awardBattlePassXp } from "@/lib/battlePassEngine";
import { rollMysteryBox, claimFirstWin, FIRST_WIN_GOLD, FIRST_WIN_BP_XP } from "@/lib/dailyEngine";
import { getCosmeticById } from "@/data/cosmetics";
import { getRaidBoss } from "@/lib/raid/bosses";
import RewardPopup, { type RewardItem } from "@/components/battle3d/RewardPopup";

type ActionMode = "none" | "select-attack-target" | "select-equip-target" | "select-spell-target";

type Rect = { x: number; y: number; w: number; h: number };
type FlyingCard = { id: number; img: string; name: string; from: Rect; to: Rect };

type Props = {
  raid: RaidCoopState;
  onRaidPatch: (fn: (r: RaidCoopState) => void) => void;
  /** Online: send intent to server instead of local engine */
  onIntent?: (intent: BattleLockstepIntent) => Promise<void>;
  intentSubmitting?: boolean;
  onExit: () => void;
  playerDeckIds: string[];
  playerState: PlayerState;
  onStateChange: (state: PlayerState) => void;
  isOnline?: boolean;
  startPveBattleApi?: (body: {
    deckCardIds: string[];
    raidBossId?: string;
    raidCoopHotseat?: boolean;
  }) => Promise<{
    matchId: string;
    seed?: number;
    enemyDeckIds?: string[];
    skipReplayVerification?: boolean;
  } | null>;
  submitBattleResultApi?: (data: {
    matchId: string;
    actionLog?: import("@/lib/battleLockstep").BattleLockstepIntent[];
    won: boolean;
    draw?: boolean;
    turnCount: number;
    deckCardIds: string[];
    raidBossId?: string;
  }) => Promise<{
    goldReward: number;
    levelUps: Array<{ cardId: string; oldLevel: number; newLevel: number }>;
  } | null>;
  syncEconomyApi?: (gold?: number, stardust?: number) => Promise<void>;
};

export default function RaidCoopArena({
  raid,
  onRaidPatch,
  onIntent,
  intentSubmitting = false,
  onExit,
  playerDeckIds,
  playerState,
  onStateChange,
  isOnline,
  submitBattleResultApi,
  startPveBattleApi,
  syncEconomyApi,
}: Props) {
  const state = raidGetBattleView(raid);
  const placementContainerRef = useRef<HTMLDivElement>(null);
  const playerSlotRefs = useRef<(HTMLDivElement | null)[]>([]);
  const handCardRefs = useRef<Record<number, HTMLButtonElement | null>>({});
  const flyIdRef = useRef(0);
  const lastStateRef = useRef<ReturnType<typeof raidGetBattleView> | null>(null);
  const pendingPlayRef = useRef<{ cardId: string; img: string; name: string; from: Rect } | null>(null);
  const [flyingCards, setFlyingCards] = useState<FlyingCard[]>([]);
  const [animating, setAnimating] = useState(false);
  const [rewardsGiven, setRewardsGiven] = useState(false);
  const [goldEarned, setGoldEarned] = useState(0);
  const [levelUps, setLevelUps] = useState<(LevelUpResult & { cardId: string })[]>([]);
  const [showLevelUps, setShowLevelUps] = useState(false);
  const [rewardPopupOpen, setRewardPopupOpen] = useState(false);
  const [rewardPopupClaimed, setRewardPopupClaimed] = useState(false);
  const [rewardPopupItems, setRewardPopupItems] = useState<RewardItem[]>([]);
  const [rewardPopupTitle, setRewardPopupTitle] = useState<string>("Raid Spoils");
  const [rewardPopupSubtitle, setRewardPopupSubtitle] = useState<string>("The altar records your deed.");
  const [actionMode, setActionMode] = useState<ActionMode>("none");
  const [selectedHandIndex, setSelectedHandIndex] = useState<number | null>(null);
  const [selectedFieldIndex, setSelectedFieldIndex] = useState<number | null>(null);
  const cardsPlayedRef = useRef(0);
  const pveMatchIdRef = useRef<string | null>(null);
  const bossMeta = getRaidBoss(raid.bossId);

  const rectInContainer = (el: HTMLElement, container: HTMLElement): Rect => {
    const c = container.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    return { x: r.left - c.left, y: r.top - c.top, w: r.width, h: r.height };
  };

  const consumePendingIntoFlight = (nextState: typeof state) => {
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

  const startPveSession = useCallback(async () => {
    pveMatchIdRef.current = null;
    if (!isOnline || !submitBattleResultApi || !startPveBattleApi) return;
    try {
      const started = await startPveBattleApi({
        deckCardIds: playerDeckIds,
        raidBossId: raid.bossId,
        raidCoopHotseat: true,
      });
      pveMatchIdRef.current = started?.matchId ?? null;
    } catch {
      pveMatchIdRef.current = null;
    }
  }, [isOnline, submitBattleResultApi, startPveBattleApi, playerDeckIds, raid.bossId]);

  useEffect(() => {
    void startPveSession();
  }, [raid.bossId, startPveSession]);

  const runLocal = (fn: (r: RaidCoopState) => void) => {
    onRaidPatch(fn);
  };

  const applyIntent = async (intent: BattleLockstepIntent) => {
    if (onIntent) {
      await onIntent(intent);
      return;
    }
    runLocal((r) => {
      switch (intent.kind) {
        case "play-card":
          raidPlayCard(r, intent.handIndex);
          break;
        case "equip-weapon":
          raidEquipWeapon(r, intent.handIndex, intent.fieldIndex);
          break;
        case "cast-spell":
          raidCastSpell(r, intent.handIndex, intent.targetFieldIndex);
          break;
        case "attack":
          raidAttack(r, intent.attackerFieldIndex, intent.targetFieldIndex);
          break;
        case "ability":
          raidActivateAbility(r, intent.fieldIndex);
          break;
        case "end-turn":
          raidEndCurrentAllyTurn(r);
          break;
        default:
          break;
      }
    });
  };

  const phaseLabel = useMemo(() => {
    if (raid.subPhase === "allyA") return "Ally 1";
    if (raid.subPhase === "allyB") return "Ally 2";
    return "Boss";
  }, [raid.subPhase]);

  useEffect(() => {
    if (!state || state.phase !== "game-over" || rewardsGiven) return;

    const won = raidPartyWon(raid);
    const isDraw = raidIsDraw(raid);
    const turnNumber = state.turnNumber;
    setRewardsGiven(true);
    const xpAmount = won ? 50 : isDraw ? 35 : 20;

    void (async () => {
      let usedOnline = false;
      if (isOnline && submitBattleResultApi) {
        const mid = pveMatchIdRef.current;
        if (mid) {
          try {
            const result = await submitBattleResultApi({
              matchId: mid,
              won,
              draw: isDraw,
              turnCount: turnNumber,
              deckCardIds: playerDeckIds,
              raidBossId: raid.bossId,
            });
            if (result) {
              setGoldEarned(result.goldReward);
              setRewardPopupTitle(won ? "Raid Spoils" : isDraw ? "Raid Tribute" : "Raid Tribute");
              setRewardPopupSubtitle(
                won ? "The altar acknowledges your triumph." : isDraw ? "Balance is maintained." : "The altar remembers your resolve.",
              );
              setRewardPopupItems(
                [
                  { kind: "gold", amount: result.goldReward, label: "Gold", rarity: won ? "legendary" : "rare" },
                  { kind: "xp", amount: xpAmount, label: "Battle XP", rarity: "rare" },
                  { kind: "rune", amount: won ? 1 : 0, label: "Astral Rune", rarity: won ? "mythic" : "common" },
                ].filter((x) => (typeof x.amount === "number" ? x.amount > 0 : true)),
              );
              setRewardPopupClaimed(false);
              setRewardPopupOpen(true);
              setLevelUps(result.levelUps.map((lu) => ({ ...lu, milestone: null as string | null })));
              if (result.levelUps.length > 0) setShowLevelUps(true);
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
                  toast({ title: "First win of the day!", description: `+${FIRST_WIN_GOLD} gold & +${FIRST_WIN_BP_XP} Battle Pass XP` });
                }
              }
              if (isOnline && syncEconomyApi) void syncEconomyApi(s.gold, s.stardust);
              return s;
            });
            usedOnline = true;
          } catch (e) {
            toast({
              title: "Raid rewards failed",
              description: e instanceof Error ? e.message : String(e),
              variant: "destructive",
            });
          }
        } else {
          toast({
            title: "Online raid rewards unavailable",
            description: "No server battle session. Using local gold and XP.",
            variant: "destructive",
          });
        }
      }
      if (usedOnline) {
        let questState = loadDailyQuests();
        if (won) questState = progressQuest(questState, "win_battles");
        if (cardsPlayedRef.current > 0) questState = progressQuest(questState, "play_cards_in_battle", cardsPlayedRef.current);
        saveDailyQuests(questState);
        return;
      }

      const mult = bossMeta?.goldRewardMultiplier ?? 1.25;
      const gold = getRaidGoldReward(won, turnNumber, mult);
      setGoldEarned(gold);
      setRewardPopupTitle(won ? "Raid Spoils" : isDraw ? "Raid Tribute" : "Raid Tribute");
      setRewardPopupSubtitle(
        won ? "The altar acknowledges your triumph." : isDraw ? "Balance is maintained." : "The altar remembers your resolve.",
      );
      setRewardPopupItems(
        [
          { kind: "gold", amount: gold, label: "Gold", rarity: won ? "legendary" : "rare" },
          { kind: "xp", amount: xpAmount, label: "Battle XP", rarity: "rare" },
          { kind: "rune", amount: won ? 1 : 0, label: "Astral Rune", rarity: won ? "mythic" : "common" },
        ].filter((x) => (typeof x.amount === "number" ? x.amount > 0 : true)),
      );
      setRewardPopupClaimed(false);
      setRewardPopupOpen(true);
      onStateChange((prev) => {
        let newState = { ...prev, cardProgress: { ...prev.cardProgress }, gold: prev.gold + gold };
        const allLevelUps: (LevelUpResult & { cardId: string })[] = [];
        for (const id of playerDeckIds) {
          const progress = getCardProgress(newState, id);
          const result = awardXp(progress, xpAmount);
          newState.cardProgress[id] = result.progress;
          for (const lu of result.levelUps) allLevelUps.push({ ...lu, cardId: id });
        }
        setLevelUps(allLevelUps);
        if (allLevelUps.length > 0) setShowLevelUps(true);
        newState = awardBattlePassXp(newState, won ? 120 : isDraw ? 80 : 60).state;
        newState = rollMysteryBox(newState);
        if (won) {
          const fw = claimFirstWin(newState);
          if (fw) {
            newState = fw.state;
            newState = awardBattlePassXp(newState, FIRST_WIN_BP_XP).state;
          }
        }
        return newState;
      });

      let questState = loadDailyQuests();
      if (won) questState = progressQuest(questState, "win_battles");
      if (cardsPlayedRef.current > 0) questState = progressQuest(questState, "play_cards_in_battle", cardsPlayedRef.current);
      saveDailyQuests(questState);
    })();
  }, [
    state,
    rewardsGiven,
    raid.bossId,
    isOnline,
    submitBattleResultApi,
    startPveBattleApi,
    playerDeckIds,
    onStateChange,
    syncEconomyApi,
    bossMeta,
  ]);

  const handleEndTurn = () => {
    if (!state || state.phase === "game-over" || animating) return;
    if (intentSubmitting) return;
    if (state.turn !== "player") return;
    void applyIntent({ kind: "end-turn" });
    setActionMode("none");
    setSelectedFieldIndex(null);
    setSelectedHandIndex(null);
  };

  const handleHandCardClick = (index: number) => {
    if (!state || state.turn !== "player" || animating || state.phase === "game-over") return;
    if (intentSubmitting) return;
    const card = state.player.hand[index];
    if (!card) return;

    const play = async () => {
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
      setAnimating(true);
      setTimeout(async () => {
        await applyIntent({ kind: "play-card", handIndex: index });
        setAnimating(false);
        setActionMode("none");
      }, 150);
    };

    if (card.type === "hero" || card.type === "god" || card.type === "trap") {
      void play();
    } else if (card.type === "weapon") {
      setSelectedHandIndex(index);
      setActionMode("select-equip-target");
    } else if (card.type === "spell") {
      if (card.spellEffect?.target === "all_enemies" || card.spellEffect?.target === "all_allies") {
        cardsPlayedRef.current += 1;
        setAnimating(true);
        setTimeout(async () => {
          await applyIntent({ kind: "cast-spell", handIndex: index });
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
    if (intentSubmitting) return;

    if (actionMode === "select-equip-target" && side === "player" && selectedHandIndex !== null) {
      cardsPlayedRef.current += 1;
      setAnimating(true);
      setTimeout(async () => {
        await applyIntent({ kind: "equip-weapon", handIndex: selectedHandIndex, fieldIndex: index });
        setAnimating(false);
        setActionMode("none");
        setSelectedHandIndex(null);
      }, 150);
    } else if (actionMode === "select-spell-target") {
      if (selectedHandIndex === null) return;
      const spell = state.player.hand[selectedHandIndex];
      const targetSide = spell?.spellEffect?.target === "single_ally" ? "player" : "enemy";
      if (side !== targetSide) return;
      cardsPlayedRef.current += 1;
      setAnimating(true);
      setTimeout(async () => {
        await applyIntent({ kind: "cast-spell", handIndex: selectedHandIndex, targetFieldIndex: index });
        setAnimating(false);
        setActionMode("none");
        setSelectedHandIndex(null);
      }, 150);
    } else if (actionMode === "select-attack-target" && side === "enemy" && selectedFieldIndex !== null) {
      setAnimating(true);
      setTimeout(async () => {
        await applyIntent({
          kind: "attack",
          attackerFieldIndex: selectedFieldIndex,
          targetFieldIndex: index,
        });
        setAnimating(false);
        setActionMode("none");
        setSelectedFieldIndex(null);
      }, 150);
    } else if (actionMode === "none" && side === "player") {
      const fc = state.player.field[index];
      if (!fc) return;
      setSelectedFieldIndex((prev) => (prev === index ? null : index));
    }
  };

  const beginAttackFromRadial = () => {
    if (!state || animating || selectedFieldIndex === null) return;
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
    setTimeout(async () => {
      await applyIntent({
        kind: "attack",
        attackerFieldIndex: selectedFieldIndex,
        targetFieldIndex: "direct",
      });
      setAnimating(false);
      setActionMode("none");
      setSelectedFieldIndex(null);
    }, 150);
  };

  const handleUseAbility = (fieldIndex: number) => {
    if (!state || animating) return;
    setAnimating(true);
    setTimeout(async () => {
      await applyIntent({ kind: "ability", fieldIndex });
      setAnimating(false);
      setActionMode("none");
      setSelectedFieldIndex(null);
    }, 150);
  };

  if (!state) {
    return (
      <div className="relative rounded-2xl border border-border/40 overflow-hidden min-h-[480px]">
        <div className="absolute inset-0 pointer-events-none rounded-2xl bg-background/70" />
        <div className="relative p-6 flex flex-col items-center justify-center min-h-[480px] text-center gap-4">
          <div className="font-heading text-xl text-foreground">Starting raid…</div>
          <div className="text-sm text-muted-foreground max-w-md">
            Summoning the party. If this takes too long, retreat and try again.
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onExit}
              className="btn-ghost"
              data-testid="raid-exit-loading"
            >
              Retreat
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isPlayerTurn =
    state.turn === "player" && !animating && state.phase !== "game-over" && !intentSubmitting;
  const boardSkinId = playerState.cosmeticsEquipped?.boardSkinId || null;
  const boardSkinImage = boardSkinId ? getCosmeticById(boardSkinId)?.image || null : null;
  const noEnemyField = !state.enemy.field.some((fc) => fc != null);
  const won = state.phase === "game-over" && raidPartyWon(raid);
  const lost = state.phase === "game-over" && raidBossWon(raid);

  return (
    <div
      className="relative rounded-2xl border border-border/40 overflow-hidden min-h-[480px]"
      style={{
        backgroundImage: `url(${boardSkinImage || battleBg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <RewardPopup
        open={rewardPopupOpen && state.phase === "game-over" && !showLevelUps && !rewardPopupClaimed}
        onClose={() => {
          setRewardPopupOpen(false);
          setRewardPopupClaimed(true);
        }}
        title={rewardPopupTitle}
        subtitle={rewardPopupSubtitle}
        rewards={rewardPopupItems}
        ctaLabel="Claim"
      />
      <div className="absolute inset-0 pointer-events-none rounded-2xl bg-background/60" />
      {showLevelUps && <CardLevelUp levelUps={levelUps} onClose={() => setShowLevelUps(false)} />}

      <div ref={placementContainerRef} className="relative p-3 sm:p-4 space-y-2">
        {/* Flying card layer (hand → field) */}
        <AnimatePresence>
          {flyingCards.map((f) => (
            <motion.div
              key={f.id}
              className="absolute pointer-events-none rounded-md overflow-hidden border-2 shadow-2xl z-40"
              style={{
                top: 0,
                left: 0,
                width: f.from.w,
                height: f.from.h,
                borderColor: "rgba(251,191,36,0.75)",
              }}
              initial={{ x: f.from.x, y: f.from.y, width: f.from.w, height: f.from.h, opacity: 1 }}
              animate={{ x: f.to.x, y: f.to.y, width: f.to.w, height: f.to.h, opacity: 1 }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              onAnimationComplete={() => setFlyingCards((arr) => arr.filter((x) => x.id !== f.id))}
            >
              <img src={f.img} alt={f.name} className="w-full h-full object-cover" />
              <motion.div
                className="absolute inset-0 rounded-md"
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 0.8, 0.2] }}
                transition={{ duration: 0.7 }}
                style={{ boxShadow: "0 0 30px 6px rgba(251,191,36,0.65)" }}
              />
            </motion.div>
          ))}
        </AnimatePresence>
        <div className="flex justify-between items-start gap-2">
          <button
            type="button"
            onClick={onExit}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-secondary/80 text-secondary-foreground text-[10px] font-bold"
          >
            <ArrowLeft className="w-3 h-3" /> Retreat
          </button>
          <div className="text-right space-y-0.5">
            <p className="text-[9px] uppercase text-muted-foreground font-heading">Raid co-op — {raid.bossName}</p>
            <p className="text-[10px] text-primary font-bold">{phaseLabel}</p>
          </div>
        </div>

        {state.phase === "game-over" && rewardPopupClaimed && (
          <div className="rounded-xl border border-border/50 bg-card/90 p-4 text-center space-y-2">
            <h3 className="font-heading text-lg">
              {won ? "Raid cleared!" : lost ? "Defeat" : "Draw"}
            </h3>
            {won && (
              <p className="text-sm text-legendary flex items-center justify-center gap-1">
                <GoldCurrencyIcon className="w-4 h-4" /> +{goldEarned} gold
              </p>
            )}
            <button type="button" onClick={onExit} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-heading">
              Continue
            </button>
          </div>
        )}

        {state.phase !== "game-over" && (
          <>
            <div className="flex justify-center">
              <HeroPortrait
                side="enemy"
                hp={state.enemy.hp}
                maxHp={bossMeta?.enemyHp ?? 30}
                shield={state.enemy.shield}
                ap={state.enemy.ap}
                maxAp={getApCapForTurn(state.turnNumber)}
                deckCount={state.enemy.deck.length}
                handCount={state.enemy.hand.length}
                isActiveTurn={state.turn === "enemy"}
              />
            </div>

            <div className="flex justify-center gap-2 flex-wrap min-h-[100px]">
              {state.enemy.field.map((fc, i) => (
                <div key={i} className="relative">
                  {fc ? (
                    <BattleCardToken
                      fieldCard={fc}
                      side="enemy"
                      selectable={actionMode === "select-attack-target" || (actionMode === "select-spell-target" && state.player.hand[selectedHandIndex!]?.spellEffect?.target === "single_enemy")}
                      onClick={() => handleFieldCardClick("enemy", i)}
                    />
                  ) : (
                    <div className="w-[72px] h-[92px] rounded-lg border border-dashed border-border/20" />
                  )}
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2 py-1 justify-center">
              <span
                className={cn(
                  "px-3 py-1 rounded-full text-[10px] font-heading font-bold uppercase",
                  state.turn === "player" ? "bg-primary/20 text-primary" : "bg-destructive/20 text-destructive",
                )}
              >
                {state.turn === "player" ? `${phaseLabel} — act` : "Boss / resolve"}
              </span>
            </div>

            <div className="flex justify-center gap-2 flex-wrap min-h-[100px]">
              {state.player.field.map((fc, i) => (
                <div
                  key={i}
                  ref={(el) => {
                    playerSlotRefs.current[i] = el;
                  }}
                  className="relative group"
                >
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
                      <div className="hidden group-hover:block absolute z-50 bottom-full mb-1 left-1/2 -translate-x-1/2">
                        <BattleInfoPanel fieldCard={fc} side="player" />
                      </div>
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
                    <div className="w-[72px] h-[92px] rounded-lg border border-dashed border-border/20" />
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-center">
              <HeroPortrait
                side="player"
                hp={state.player.hp}
                maxHp={50}
                shield={state.player.shield}
                ap={state.player.ap}
                maxAp={getApCapForTurn(state.turnNumber)}
                deckCount={state.player.deck.length}
                handCount={state.player.hand.length}
                isActiveTurn={state.turn === "player"}
              />
            </div>

            <div className="bg-card/80 border border-border rounded-xl p-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[9px] uppercase text-muted-foreground">Party hand</span>
                {isPlayerTurn && (
                  <button
                    type="button"
                    onClick={handleEndTurn}
                    className="text-[10px] px-3 py-1.5 rounded-lg bg-primary text-primary-foreground font-heading font-bold"
                  >
                    End Turn
                  </button>
                )}
              </div>
              <div className="flex gap-1.5 overflow-x-auto justify-center pb-1">
                {state.player.hand.map((card, i) => (
                  <button
                    key={`${card.id}-${i}`}
                    ref={(el) => {
                      handCardRefs.current[i] = el;
                    }}
                    type="button"
                    disabled={!isPlayerTurn}
                    onClick={() => handleHandCardClick(i)}
                    className={cn(
                      "shrink-0 w-14 h-[4.5rem] rounded-md border overflow-hidden relative",
                      isPlayerTurn ? "border-primary/40 hover:border-primary" : "opacity-50",
                    )}
                  >
                    <span
                      className="absolute top-0.5 right-0.5 z-10 rounded px-0.5 py-0.5 text-[7px] font-heading font-bold leading-none tabular-nums border border-amber-400/50 bg-black/80 text-amber-100 shadow-[0_1px_2px_rgba(0,0,0,0.9)]"
                      title="AP to play from hand"
                    >
                      {getHandPlayApCost(card)} AP
                    </span>
                    <img src={card.image} alt="" className="absolute inset-0 w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
