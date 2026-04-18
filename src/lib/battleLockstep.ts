import type { BattleState } from "./battleEngine";
import type { CardProgress } from "./playerState";
import {
  initBattle,
  playCard,
  equipWeapon,
  castSpell,
  attackTarget,
  activateAbility,
  endTurnAction,
  performAITurn,
  simulateBattle,
  generateEnemyDeck,
  createSeededRng,
} from "./battleEngine";

export { simulateBattle, generateEnemyDeck, createSeededRng };

const MAX_REPLAY_STEPS = 16000;
const MAX_ENEMY_SUBSTEPS = 64;

/**
 * Ranked async: player A (deck A) submits a log of player-intents only;
 * opponent B runs the same `performAITurn` AI as the client between player turns.
 */
export type ReplayRankedInitOpts = {
  enemyHero?: { hp?: number; shield?: number };
  playerCardProgress?: Record<string, CardProgress>;
};

export function replayRankedFromPlayerActions(
  seed: number,
  deckA: string[],
  deckB: string[],
  playerActions: BattleLockstepIntent[],
  initOpts?: ReplayRankedInitOpts,
): BattleState {
  let s = initBattle(deckA, deckB, {
    seed,
    enemyHero: initOpts?.enemyHero,
    playerCardProgress: initOpts?.playerCardProgress,
  });
  let qi = 0;
  let steps = 0;
  while (s.phase !== "game-over" && steps++ < MAX_REPLAY_STEPS) {
    if (s.turn === "player") {
      if (qi >= playerActions.length) break;
      s = applyBattleLockstepIntent(s, playerActions[qi++]!);
    } else {
      let sub = 0;
      while (s.turn === "enemy" && s.phase !== "game-over" && sub++ < MAX_ENEMY_SUBSTEPS) {
        s = performAITurn(s);
      }
    }
  }
  return s;
}

/** Serialized actions for live PvP lockstep (same rules as vs AI). */
export type BattleLockstepIntent =
  | { kind: "play-card"; handIndex: number }
  | { kind: "equip-weapon"; handIndex: number; fieldIndex: number }
  | { kind: "cast-spell"; handIndex: number; targetFieldIndex?: number }
  | { kind: "attack"; attackerFieldIndex: number; targetFieldIndex: number | "direct" }
  | { kind: "ability"; fieldIndex: number }
  | { kind: "end-turn" };

export function applyBattleLockstepIntent(state: BattleState, intent: BattleLockstepIntent): BattleState {
  switch (intent.kind) {
    case "play-card":
      return playCard(state, intent.handIndex);
    case "equip-weapon":
      return equipWeapon(state, intent.handIndex, intent.fieldIndex);
    case "cast-spell":
      return castSpell(state, intent.handIndex, intent.targetFieldIndex);
    case "attack":
      return attackTarget(state, intent.attackerFieldIndex, intent.targetFieldIndex);
    case "ability":
      return activateAbility(state, intent.fieldIndex);
    case "end-turn":
      return endTurnAction(state);
    default:
      return state;
  }
}

export function replayBattleFromActions(
  seed: number,
  deckA: string[],
  deckB: string[],
  actions: BattleLockstepIntent[]
): BattleState {
  let s = initBattle(deckA, deckB, { seed });
  for (const a of actions) {
    s = applyBattleLockstepIntent(s, a);
  }
  return s;
}

/**
 * Player B sees themselves at the bottom (BattleArena "player" side).
 * Canonical state: player = A, enemy = B.
 */
export function toViewerBattleState(state: BattleState, viewerIsA: boolean): BattleState {
  if (viewerIsA) return state;
  return {
    ...state,
    player: state.enemy,
    enemy: state.player,
    turn: state.turn === "enemy" ? "player" : "enemy",
    winner:
      state.winner === "player"
        ? "enemy"
        : state.winner === "enemy"
          ? "player"
          : state.winner,
    activeSynergies: {
      player: state.activeSynergies.enemy,
      enemy: state.activeSynergies.player,
    },
    pendingAction: null,
  };
}

export type LivePvPBattleConfig = {
  seed: number;
  deckA: string[];
  deckB: string[];
  viewerIsA: boolean;
  actionLog: BattleLockstepIntent[];
  onIntent: (intent: BattleLockstepIntent) => Promise<void>;
  isSubmitting: boolean;
};
