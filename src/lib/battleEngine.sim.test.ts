import { describe, it, expect } from "vitest";
import { allCards } from "@/data/cards";
import {
  initBattle,
  performAITurn,
  playCard,
  equipWeapon,
  castSpell,
  attackTarget,
  activateAbility,
  generateEnemyDeck,
  endTurnAction,
  passResponseWindow,
  type BattleState,
} from "@/lib/battleEngine";

function pickPlayerDeck(size = 10): string[] {
  // Prefer a mix: heroes/gods + some weapons/spells/traps.
  const heroes = allCards.filter((c) => c.type === "hero").slice(0, 6).map((c) => c.id);
  const gods = allCards.filter((c) => c.type === "god").slice(0, 2).map((c) => c.id);
  const weapons = allCards.filter((c) => c.type === "weapon").slice(0, 1).map((c) => c.id);
  const spells = allCards.filter((c) => c.type === "spell").slice(0, 1).map((c) => c.id);
  const picked = [...heroes, ...gods, ...weapons, ...spells].slice(0, size);
  while (picked.length < size) {
    const more = allCards.find((c) => (c.type === "hero" || c.type === "god") && !picked.includes(c.id));
    if (!more) break;
    picked.push(more.id);
  }
  return picked;
}

function playerHeuristicTurn(state: BattleState): BattleState {
  if (state.responseWindow && state.responseWindow.responder === "player") {
    return passResponseWindow(state);
  }
  const side = state.player;

  // Spend AP until done; if no good action, end turn.
  if (side.ap <= 0) return endTurnAction(state);

  // 1) Play a unit if field has space
  if (side.field.some((s) => s === null)) {
    const unitIdx = side.hand.findIndex((c) => c.type === "hero" || c.type === "god");
    if (unitIdx !== -1) return playCard(state, unitIdx);
  }

  // 2) Equip a weapon
  const weaponIdx = side.hand.findIndex((c) => c.type === "weapon");
  if (weaponIdx !== -1) {
    const unequipped = side.field.findIndex((fc) => fc !== null && !fc.equippedWeapon);
    if (unequipped !== -1) return equipWeapon(state, weaponIdx, unequipped);
  }

  // 3) Cast first spell (prefer damage to a target if exists)
  const spellIdx = side.hand.findIndex((c) => c.type === "spell");
  if (spellIdx !== -1) {
    const targetIdx = state.enemy.field.findIndex((fc) => fc !== null);
    return castSpell(state, spellIdx, targetIdx !== -1 ? targetIdx : undefined);
  }

  // 4) Use ability sometimes
  const abilIdx = side.field.findIndex((fc) => fc !== null && !fc.abilityUsed && !fc.stunned);
  if (abilIdx !== -1 && Math.random() < 0.25) {
    return activateAbility(state, abilIdx);
  }

  // 5) Attack with first available attacker; target weakest enemy or direct
  const attackerIdx = side.field.findIndex((fc) => fc !== null && !fc.stunned);
  if (attackerIdx !== -1) {
    const enemyFieldCards = state.enemy.field
      .map((fc, i) => (fc ? { i, hp: fc.currentHp } : null))
      .filter(Boolean) as { i: number; hp: number }[];

    if (enemyFieldCards.length > 0) {
      const weakest = enemyFieldCards.sort((a, b) => a.hp - b.hp)[0];
      return attackTarget(state, attackerIdx, weakest.i);
    }
    return attackTarget(state, attackerIdx, "direct");
  }

  // 6) Set a trap
  const trapIdx = side.hand.findIndex((c) => c.type === "trap");
  if (trapIdx !== -1) return playCard(state, trapIdx);

  return endTurnAction(state);
}

function runOneBattle(seedLabel: string): BattleState {
  const playerDeck = pickPlayerDeck(10);
  const enemyDeck = generateEnemyDeck(10);
  let state = initBattle(playerDeck, enemyDeck, { ruleset: "ygoHybrid" });

  const MAX_STEPS = 300;
  for (let step = 0; step < MAX_STEPS; step++) {
    if (state.phase === "game-over") break;
    if (state.responseWindow && state.responseWindow.responder === "player") {
      state = passResponseWindow(state);
      continue;
    }
    if (state.responseWindow && state.responseWindow.responder === "enemy") {
      state = passResponseWindow(state);
      continue;
    }

    const before = JSON.stringify({ turn: state.turn, turnNumber: state.turnNumber, phase: state.phase });
    if (state.turn === "enemy") state = performAITurn(state);
    else state = playerHeuristicTurn(state);

    const after = JSON.stringify({ turn: state.turn, turnNumber: state.turnNumber, phase: state.phase });
    // If we're stuck, end the turn explicitly.
    if (before === after) {
      state = endTurnAction(state);
    }
  }

  // High-signal summary for the test output
  const lastLogs = state.logs.slice(-12).map((l) => l.message).join("\n");
  console.log(
    [
      `\n[sim:${seedLabel}] winner=${state.winner} turns=${state.turnNumber} playerHP=${state.player.hp} enemyHP=${state.enemy.hp}`,
      `[sim:${seedLabel}] last logs:\n${lastLogs}\n`,
    ].join("\n"),
  );

  return state;
}

describe("battleEngine simulation", () => {
  it("runs a full battle to completion (sample)", () => {
    const finalState = runOneBattle("sample-1");
    expect(finalState.phase).toBe("game-over");
    expect(finalState.winner).not.toBeNull();
  });

  it("runs multiple battles without deadlocking", () => {
    const results = Array.from({ length: 5 }).map((_, i) => runOneBattle(`batch-${i + 1}`));
    for (const r of results) {
      expect(r.phase).toBe("game-over");
    }
  });
});

