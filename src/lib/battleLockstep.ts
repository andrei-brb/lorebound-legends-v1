import type { BattleState } from "./battleEngine";
import {
  initBattle,
  playCard,
  equipWeapon,
  castSpell,
  attackTarget,
  useAbility,
  endTurnAction,
} from "./battleEngine";

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
      return useAbility(state, intent.fieldIndex);
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
