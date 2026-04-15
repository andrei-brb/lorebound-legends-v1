import type { GameCard } from "@/data/cards";
import { allCards } from "@/data/cards";
import { calculateFieldSynergies, calculatePassiveBonuses, type ActiveSynergy } from "./synergyEngine";

// =================== Types ===================

export interface FieldCard {
  card: GameCard;
  currentHp: number;
  maxHp: number;
  attack: number;
  defense: number;
  baseAttack: number;
  baseDefense: number;
  equippedWeapon: GameCard | null;
  abilityUsed: boolean;
  stunned: boolean; // can't act this turn
  tempBuffs: TempBuff[];
}

export interface TempBuff {
  stat: "attack" | "defense";
  value: number;
  turnsRemaining: number;
}

export interface TrapOnField {
  card: GameCard;
  faceDown: boolean;
}

export interface PlayerSide {
  hp: number;
  shield: number;
  hand: GameCard[];
  field: (FieldCard | null)[]; // 4 slots
  traps: (TrapOnField | null)[]; // 2 trap slots
  deck: GameCard[];
  graveyard: GameCard[];
  ap: number;
  fatigue: number;
  hasCastSpellThisTurn: boolean;
}

export interface BattleLog {
  message: string;
  type: "attack" | "ability" | "synergy" | "defeat" | "info" | "spell" | "trap" | "weapon" | "direct";
  timestamp: number;
}

export interface BattleState {
  player: PlayerSide;
  enemy: PlayerSide;
  turn: "player" | "enemy";
  phase: "select-action" | "select-target" | "animating" | "game-over";
  logs: BattleLog[];
  winner: "player" | "enemy" | "draw" | null;
  turnNumber: number;
  activeSynergies: { player: ActiveSynergy[]; enemy: ActiveSynergy[] };
  pendingAction: PendingAction | null;
}

export type PendingAction =
  | { type: "play-card"; cardIndex: number }
  | { type: "attack"; fieldIndex: number }
  | { type: "equip-weapon"; cardIndex: number }
  | { type: "cast-spell"; cardIndex: number }
  | { type: "ability"; fieldIndex: number };

// =================== Init ===================

function shuffleDeck(cards: GameCard[]): GameCard[] {
  const arr = [...cards];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function createSide(deckIds: string[]): PlayerSide {
  const deckCards = deckIds.map(id => allCards.find(c => c.id === id)).filter(Boolean) as GameCard[];
  const shuffled = shuffleDeck(deckCards);
  const hand = shuffled.slice(0, 5);
  const deck = shuffled.slice(5);

  return {
    hp: 30,
    shield: 10,
    hand,
    field: [null, null, null, null],
    traps: [null, null],
    deck,
    graveyard: [],
    ap: 0,
    fatigue: 0,
    hasCastSpellThisTurn: false,
  };
}

export function initBattle(playerDeckIds: string[], enemyDeckIds: string[]): BattleState {
  const state: BattleState = {
    player: createSide(playerDeckIds),
    enemy: createSide(enemyDeckIds),
    turn: "player",
    phase: "select-action",
    logs: [{ message: "⚔️ Battle begins! Draw your weapons!", type: "info", timestamp: Date.now() }],
    winner: null,
    turnNumber: 1,
    activeSynergies: { player: [], enemy: [] },
    pendingAction: null,
  };
  return startTurn(state);
}

// =================== Helpers ===================

function getFieldCardIds(side: PlayerSide): string[] {
  return side.field.filter(Boolean).map(fc => fc!.card.id);
}

function getEquippedWeapons(side: PlayerSide): Map<string, string> {
  const map = new Map<string, string>();
  for (const fc of side.field) {
    if (fc?.equippedWeapon) {
      map.set(fc.card.id, fc.equippedWeapon.id);
    }
  }
  return map;
}

function recalcFieldStats(state: BattleState): BattleState {
  for (const sideKey of ["player", "enemy"] as const) {
    const side = state[sideKey];
    const fieldIds = getFieldCardIds(side);
    const equippedWeapons = getEquippedWeapons(side);

    const synergyResult = calculateFieldSynergies(fieldIds, equippedWeapons);
    const passiveBonuses = calculatePassiveBonuses(fieldIds);

    state.activeSynergies[sideKey] = synergyResult.synergies;

    for (const fc of side.field) {
      if (!fc) continue;
      let atk = fc.baseAttack;
      let def = fc.baseDefense;

      // Weapon bonus
      if (fc.equippedWeapon?.weaponBonus) {
        atk += fc.equippedWeapon.weaponBonus.attack;
        def += fc.equippedWeapon.weaponBonus.defense;
      }

      // Synergy bonus
      const synBonus = synergyResult.bonusMap.get(fc.card.id);
      if (synBonus) {
        atk += synBonus.attack;
        def += synBonus.defense;
      }

      // Passive bonus
      const passBonus = passiveBonuses.get(fc.card.id);
      if (passBonus) {
        atk += passBonus.attack;
        def += passBonus.defense;
      }

      // Temp buffs
      for (const buff of fc.tempBuffs) {
        if (buff.stat === "attack") atk += buff.value;
        else def += buff.value;
      }

      fc.attack = Math.max(0, atk);
      fc.defense = Math.max(0, def);
    }
  }

  return state;
}

function createFieldCard(card: GameCard): FieldCard {
  return {
    card,
    currentHp: card.hp,
    maxHp: card.hp,
    attack: card.attack,
    defense: card.defense,
    baseAttack: card.attack,
    baseDefense: card.defense,
    equippedWeapon: null,
    abilityUsed: false,
    stunned: false,
    tempBuffs: [],
  };
}

function addLog(state: BattleState, message: string, type: BattleLog["type"]): void {
  state.logs.push({ message, type, timestamp: Date.now() });
}

function getActiveSide(state: BattleState): PlayerSide {
  return state.turn === "player" ? state.player : state.enemy;
}

function getOtherSide(state: BattleState): PlayerSide {
  return state.turn === "player" ? state.enemy : state.player;
}

function startTurn(state: BattleState): BattleState {
  if (state.phase === "game-over") return state;

  const side = getActiveSide(state);
  const sideLabel = state.turn === "player" ? "You" : "Enemy";

  side.ap = 2;
  side.hasCastSpellThisTurn = false;

  // Draw 1 card at start of turn; apply fatigue only on draw.
  if (side.deck.length > 0) {
    side.hand.push(side.deck.shift()!);
  } else {
    side.fatigue += 1;
    side.hp = Math.max(0, side.hp - side.fatigue);
    addLog(state, `📦 ${sideLabel} fatigues for ${side.fatigue} damage!`, "info");
  }

  return checkWinCondition(state);
}

function canSpendAp(state: BattleState, cost: number): boolean {
  const side = getActiveSide(state);
  return side.ap >= cost;
}

function spendAp(state: BattleState, cost: number): void {
  const side = getActiveSide(state);
  side.ap = Math.max(0, side.ap - cost);
}

function maybeAutoEndTurn(state: BattleState): BattleState {
  const side = getActiveSide(state);
  if (state.phase === "game-over") return state;
  if (side.ap > 0) return state;
  return endTurn(state);
}

export function endTurnAction(state: BattleState): BattleState {
  const newState = deepCopy(state);
  return endTurn(newState);
}

function checkWinCondition(state: BattleState): BattleState {
  const playerDead = state.player.hp <= 0;
  const enemyDead = state.enemy.hp <= 0;

  if (playerDead && enemyDead) {
    state.phase = "game-over";
    state.winner = "draw";
    addLog(state, "🤝 Both sides have fallen! It's a draw!", "info");
  } else if (playerDead) {
    state.phase = "game-over";
    state.winner = "enemy";
    addLog(state, "💀 You have been defeated!", "defeat");
  } else if (enemyDead) {
    state.phase = "game-over";
    state.winner = "player";
    addLog(state, "🏆 Victory! The enemy has fallen!", "defeat");
  }

  // Check total wipe condition
  for (const sideKey of ["player", "enemy"] as const) {
    const side = state[sideKey];
    const hasField = side.field.some(fc => fc !== null);
    const hasHand = side.hand.length > 0;
    const hasDeck = side.deck.length > 0;
    if (!hasField && !hasHand && !hasDeck && state.phase !== "game-over") {
      state.phase = "game-over";
      state.winner = sideKey === "player" ? "enemy" : "player";
      addLog(state, `💀 ${sideKey === "player" ? "You have" : "Enemy has"} no cards left! Total wipe!`, "defeat");
    }
  }

  return state;
}

// =================== Turn Actions ===================

export function playCard(state: BattleState, handIndex: number): BattleState {
  const newState = deepCopy(state);
  const side = getActiveSide(newState);
  const card = side.hand[handIndex];
  if (!card) return state;

  if (card.type === "hero" || card.type === "god") {
    if (!canSpendAp(newState, 1)) return state;
    const slotIndex = side.field.findIndex(s => s === null);
    if (slotIndex === -1) {
      addLog(newState, "❌ Field is full! Max 4 cards.", "info");
      return state;
    }

    // Check for enemy traps that trigger on play
    const enemySide = getOtherSide(newState);
    let trapDamage = 0;
    for (let i = 0; i < enemySide.traps.length; i++) {
      const trap = enemySide.traps[i];
      if (trap && trap.faceDown && trap.card.trapEffect?.trigger === "on_enemy_play") {
        trapDamage = trap.card.trapEffect.value;
        addLog(newState, `🪤 ${trap.card.name} triggered! Deals ${trapDamage} damage!`, "trap");
        enemySide.traps[i] = null;
        enemySide.graveyard.push(trap.card);
        break;
      }
    }

    const fc = createFieldCard(card);
    if (trapDamage > 0) {
      fc.currentHp = Math.max(1, fc.currentHp - trapDamage);
    }
    side.field[slotIndex] = fc;
    side.hand.splice(handIndex, 1);
    spendAp(newState, 1);

    const sideLabel = newState.turn === "player" ? "You" : "Enemy";
    addLog(newState, `🃏 ${sideLabel} played ${card.name} to the field!`, "info");

    return maybeAutoEndTurn(recalcFieldStats(newState));
  }

  if (card.type === "trap") {
    if (!canSpendAp(newState, 1)) return state;
    const trapSlot = side.traps.findIndex(s => s === null);
    if (trapSlot === -1) {
      addLog(newState, "❌ Trap slots full! Max 2 traps.", "info");
      return state;
    }
    side.traps[trapSlot] = { card, faceDown: true };
    side.hand.splice(handIndex, 1);
    spendAp(newState, 1);
    const sideLabel = newState.turn === "player" ? "You" : "Enemy";
    addLog(newState, `🪤 ${sideLabel} set a trap face-down!`, "trap");
    return maybeAutoEndTurn(newState);
  }

  return state; // weapons and spells handled separately
}

export function equipWeapon(state: BattleState, handIndex: number, fieldIndex: number): BattleState {
  const newState = deepCopy(state);
  const side = getActiveSide(newState);
  const card = side.hand[handIndex];
  const target = side.field[fieldIndex];

  if (!card || card.type !== "weapon" || !target) return state;
  if (!canSpendAp(newState, 1)) return state;
  if (target.equippedWeapon) {
    addLog(newState, "❌ This card already has a weapon equipped!", "info");
    return state;
  }

  target.equippedWeapon = card;
  side.hand.splice(handIndex, 1);
  spendAp(newState, 1);

  const sideLabel = newState.turn === "player" ? "You" : "Enemy";
  addLog(newState, `⚔️ ${sideLabel} equipped ${card.name} to ${target.card.name}! (+${card.weaponBonus?.attack || 0} ATK, +${card.weaponBonus?.defense || 0} DEF)`, "weapon");

  return maybeAutoEndTurn(recalcFieldStats(newState));
}

function getSpellApCost(card: GameCard): number {
  if (card.id === "time-stop") return 2;
  return 1;
}

export function castSpell(state: BattleState, handIndex: number, targetFieldIndex?: number): BattleState {
  const newState = deepCopy(state);
  const side = getActiveSide(newState);
  const otherSide = getOtherSide(newState);
  const card = side.hand[handIndex];

  if (!card || card.type !== "spell" || !card.spellEffect) return state;
  const apCost = getSpellApCost(card);
  if (!canSpendAp(newState, apCost)) return state;
  if (side.hasCastSpellThisTurn) {
    addLog(newState, "❌ You can only cast 1 spell per turn.", "info");
    return state;
  }

  const effect = card.spellEffect;
  const sideLabel = newState.turn === "player" ? "You" : "Enemy";

  switch (effect.type) {
    case "damage": {
      if (effect.target === "single_enemy" && targetFieldIndex !== undefined) {
        const target = otherSide.field[targetFieldIndex];
        if (target) {
          const dmg = Math.max(1, effect.value - Math.floor(target.defense * 0.2));
          target.currentHp = Math.max(0, target.currentHp - dmg);
          addLog(newState, `🔥 ${sideLabel} cast ${card.name}! Deals ${dmg} damage to ${target.card.name}!`, "spell");
          if (target.currentHp <= 0) {
            addLog(newState, `💀 ${target.card.name} was destroyed!`, "defeat");
            otherSide.graveyard.push(target.card);
            if (target.equippedWeapon) otherSide.graveyard.push(target.equippedWeapon);
            otherSide.field[targetFieldIndex] = null;
          }
        }
      } else if (effect.target === "all_enemies") {
        for (let i = 0; i < otherSide.field.length; i++) {
          const target = otherSide.field[i];
          if (!target) continue;
          const dmg = Math.max(1, effect.value - Math.floor(target.defense * 0.2));
          target.currentHp = Math.max(0, target.currentHp - dmg);
          if (target.currentHp <= 0) {
            addLog(newState, `💀 ${target.card.name} was destroyed by ${card.name}!`, "defeat");
            otherSide.graveyard.push(target.card);
            if (target.equippedWeapon) otherSide.graveyard.push(target.equippedWeapon);
            otherSide.field[i] = null;
          }
        }
        addLog(newState, `🔥 ${sideLabel} cast ${card.name}! Deals ${effect.value} damage to all enemies!`, "spell");
      }
      break;
    }
    case "heal": {
      if (effect.target === "single_ally" && targetFieldIndex !== undefined) {
        const target = side.field[targetFieldIndex];
        if (target) {
          const healed = Math.min(effect.value, target.maxHp - target.currentHp);
          target.currentHp += healed;
          addLog(newState, `💚 ${sideLabel} cast ${card.name}! Heals ${target.card.name} for ${healed} HP!`, "spell");
        }
      } else if (effect.target === "all_allies") {
        for (const fc of side.field) {
          if (!fc) continue;
          const healed = Math.min(effect.value, fc.maxHp - fc.currentHp);
          fc.currentHp += healed;
        }
        addLog(newState, `💚 ${sideLabel} cast ${card.name}! Heals all allies for ${effect.value} HP!`, "spell");
      }
      break;
    }
    case "buff_attack":
    case "buff_defense": {
      const stat = effect.type === "buff_attack" ? "attack" : "defense";
      const targets = effect.target === "all_allies" ? side.field : (targetFieldIndex !== undefined ? [side.field[targetFieldIndex]] : []);
      for (const fc of targets) {
        if (!fc) continue;
        fc.tempBuffs.push({ stat, value: effect.value, turnsRemaining: effect.duration || 2 });
      }
      addLog(newState, `✨ ${sideLabel} cast ${card.name}! +${effect.value} ${stat.toUpperCase()} for ${effect.duration || 2} turns!`, "spell");
      break;
    }
    case "debuff_attack":
    case "debuff_defense": {
      const stat = effect.type === "debuff_attack" ? "attack" : "defense";
      const targets = effect.target === "all_enemies" ? otherSide.field : (targetFieldIndex !== undefined ? [otherSide.field[targetFieldIndex]] : []);
      for (const fc of targets) {
        if (!fc) continue;
        fc.tempBuffs.push({ stat, value: -effect.value, turnsRemaining: effect.duration || 2 });
      }
      addLog(newState, `❄️ ${sideLabel} cast ${card.name}! -${effect.value} ${stat.toUpperCase()} to enemies for ${effect.duration || 2} turns!`, "spell");
      break;
    }
  }

  side.hand.splice(handIndex, 1);
  side.graveyard.push(card);
  side.hasCastSpellThisTurn = true;
  spendAp(newState, apCost);

  return maybeAutoEndTurn(recalcFieldStats(checkWinCondition(newState)));
}

export function attackTarget(state: BattleState, attackerFieldIndex: number, targetFieldIndex: number | "direct"): BattleState {
  const newState = deepCopy(state);
  const side = getActiveSide(newState);
  const otherSide = getOtherSide(newState);
  const attacker = side.field[attackerFieldIndex];

  if (!attacker || attacker.stunned) return state;
  if (!canSpendAp(newState, 1)) return state;

  const sideLabel = newState.turn === "player" ? "You" : "Enemy";

  if (targetFieldIndex === "direct") {
    // Direct attack — only if enemy has no field cards
    const hasFieldCards = otherSide.field.some(fc => fc !== null);
    if (hasFieldCards) {
      addLog(newState, "❌ Cannot attack directly while enemy has field cards!", "info");
      return state;
    }

    // Check for traps
    for (let i = 0; i < otherSide.traps.length; i++) {
      const trap = otherSide.traps[i];
      if (trap && trap.faceDown && trap.card.trapEffect?.trigger === "on_attacked") {
        const effect = trap.card.trapEffect;
        if (effect.effect === "reflect_damage") {
          attacker.currentHp = Math.max(0, attacker.currentHp - effect.value);
          addLog(newState, `🪤 ${trap.card.name} triggered! Reflects ${effect.value} damage!`, "trap");
        } else if (effect.effect === "damage") {
          attacker.currentHp = Math.max(0, attacker.currentHp - effect.value);
          addLog(newState, `🪤 ${trap.card.name} triggered! Deals ${effect.value} damage!`, "trap");
        } else if (effect.effect === "stun") {
          attacker.stunned = true;
          addLog(newState, `🪤 ${trap.card.name} triggered! ${attacker.card.name} is stunned!`, "trap");
        }
        otherSide.traps[i] = null;
        otherSide.graveyard.push(trap.card);

        if (attacker.currentHp <= 0) {
          addLog(newState, `💀 ${attacker.card.name} was destroyed by a trap!`, "defeat");
          side.graveyard.push(attacker.card);
          if (attacker.equippedWeapon) side.graveyard.push(attacker.equippedWeapon);
          side.field[attackerFieldIndex] = null;
          spendAp(newState, 1);
          return maybeAutoEndTurn(recalcFieldStats(checkWinCondition(newState)));
        }
        break;
      }
    }

    const dmg = attacker.attack;
    // Shield absorbs first
    if (otherSide.shield > 0) {
      const absorbed = Math.min(otherSide.shield, dmg);
      otherSide.shield -= absorbed;
      const remaining = dmg - absorbed;
      otherSide.hp = Math.max(0, otherSide.hp - remaining);
      addLog(newState, `💥 ${attacker.card.name} attacks directly! Shield absorbs ${absorbed}, ${remaining} damage to HP!`, "direct");
    } else {
      otherSide.hp = Math.max(0, otherSide.hp - dmg);
      addLog(newState, `💥 ${attacker.card.name} attacks directly for ${dmg} damage!`, "direct");
    }

    spendAp(newState, 1);
    return maybeAutoEndTurn(recalcFieldStats(checkWinCondition(newState)));
  }

  // Attack a field card
  const target = otherSide.field[targetFieldIndex];
  if (!target) return state;

  // Check for traps
  for (let i = 0; i < otherSide.traps.length; i++) {
    const trap = otherSide.traps[i];
    if (trap && trap.faceDown && trap.card.trapEffect?.trigger === "on_attacked") {
      const effect = trap.card.trapEffect;
      if (effect.effect === "reflect_damage") {
        attacker.currentHp = Math.max(0, attacker.currentHp - effect.value);
        addLog(newState, `🪤 ${trap.card.name} triggered! Reflects ${effect.value} damage back!`, "trap");
      } else if (effect.effect === "damage") {
        attacker.currentHp = Math.max(0, attacker.currentHp - effect.value);
        addLog(newState, `🪤 ${trap.card.name} triggered! Deals ${effect.value} damage!`, "trap");
      } else if (effect.effect === "stun") {
        attacker.stunned = true;
        addLog(newState, `🪤 ${trap.card.name} triggered! ${attacker.card.name} is stunned!`, "trap");
      }
      otherSide.traps[i] = null;
      otherSide.graveyard.push(trap.card);

      if (attacker.currentHp <= 0) {
        addLog(newState, `💀 ${attacker.card.name} was destroyed by a trap!`, "defeat");
        side.graveyard.push(attacker.card);
        if (attacker.equippedWeapon) side.graveyard.push(attacker.equippedWeapon);
        side.field[attackerFieldIndex] = null;
        spendAp(newState, 1);
        return maybeAutoEndTurn(recalcFieldStats(checkWinCondition(newState)));
      }
      break;
    }
  }

  // Calculate damage
  const rawDmg = Math.max(1, attacker.attack - Math.floor(target.defense * 0.4));
  const variance = 0.9 + Math.random() * 0.2;
  const dmg = Math.max(1, Math.round(rawDmg * variance));

  target.currentHp = Math.max(0, target.currentHp - dmg);
  addLog(newState, `⚔️ ${attacker.card.name} attacks ${target.card.name} for ${dmg} damage!`, "attack");

  if (target.currentHp <= 0) {
    addLog(newState, `💀 ${target.card.name} was destroyed!`, "defeat");
    otherSide.graveyard.push(target.card);
    if (target.equippedWeapon) otherSide.graveyard.push(target.equippedWeapon);
    otherSide.field[targetFieldIndex] = null;
  }

  // Check if attacker died from trap
  if (attacker.currentHp <= 0) {
    side.graveyard.push(attacker.card);
    if (attacker.equippedWeapon) side.graveyard.push(attacker.equippedWeapon);
    side.field[attackerFieldIndex] = null;
  }

  spendAp(newState, 1);
  return maybeAutoEndTurn(recalcFieldStats(checkWinCondition(newState)));
}

export function useAbility(state: BattleState, fieldIndex: number): BattleState {
  const newState = deepCopy(state);
  const side = getActiveSide(newState);
  const otherSide = getOtherSide(newState);
  const fc = side.field[fieldIndex];

  if (!fc || fc.abilityUsed || fc.stunned) return state;
  if (!canSpendAp(newState, 1)) return state;

  fc.abilityUsed = true;
  const ability = fc.card.specialAbility;
  const sideLabel = newState.turn === "player" ? "You" : "Enemy";

  // Generic ability: deal damage based on ability cost to strongest enemy
  const targets = otherSide.field.filter(Boolean) as FieldCard[];
  if (targets.length > 0) {
    const target = targets.sort((a, b) => b.currentHp - a.currentHp)[0];
    const abilityDmg = Math.max(2, Math.round(fc.attack * 1.2 + (ability.cost || 3)));
    const dmg = Math.max(1, abilityDmg - Math.floor(target.defense * 0.25));
    target.currentHp = Math.max(0, target.currentHp - dmg);

    addLog(newState, `✨ ${fc.card.name} uses ${ability.name}! Deals ${dmg} damage to ${target.card.name}!`, "ability");

    if (target.currentHp <= 0) {
      const targetIdx = otherSide.field.indexOf(target);
      addLog(newState, `💀 ${target.card.name} was destroyed!`, "defeat");
      otherSide.graveyard.push(target.card);
      if (target.equippedWeapon) otherSide.graveyard.push(target.equippedWeapon);
      otherSide.field[targetIdx] = null;
    }
  }

  spendAp(newState, 1);
  return maybeAutoEndTurn(recalcFieldStats(checkWinCondition(newState)));
}

// =================== Turn Management ===================

function endTurn(state: BattleState): BattleState {
  if (state.phase === "game-over") return state;

  const side = getActiveSide(state);

  // Tick down temp buffs
  for (const fc of side.field) {
    if (!fc) continue;
    fc.tempBuffs = fc.tempBuffs
      .map(b => ({ ...b, turnsRemaining: b.turnsRemaining - 1 }))
      .filter(b => b.turnsRemaining > 0);
    fc.stunned = false;
  }

  // Switch turn
  state.turn = state.turn === "player" ? "enemy" : "player";
  if (state.turn === "player") state.turnNumber++;
  state.phase = "select-action";
  state.pendingAction = null;

  return startTurn(checkWinCondition(state));
}

// =================== AI ===================

export function performAITurn(state: BattleState): BattleState {
  // Enemy may take multiple actions per turn based on AP.
  let s = state;
  const MAX_ACTIONS = 6; // guard against accidental loops

  for (let i = 0; i < MAX_ACTIONS; i++) {
    if (s.phase === "game-over") return s;
    if (s.turn !== "enemy") return s;
    if (s.enemy.ap <= 0) return s;

    const side = s.enemy;

    // Priority: Play unit → equip weapon → cast spell → ability/attack → set trap
    const emptySlot = side.field.findIndex((slot) => slot === null);
    if (emptySlot !== -1) {
      const unitIdx = side.hand.findIndex((c) => c.type === "hero" || c.type === "god");
      if (unitIdx !== -1) {
        const next = playCard(s, unitIdx);
        if (next !== s) { s = next; continue; }
      }
    }

    const weaponIdx = side.hand.findIndex((c) => c.type === "weapon");
    if (weaponIdx !== -1) {
      const unequipped = side.field.findIndex((fc) => fc !== null && !fc.equippedWeapon);
      if (unequipped !== -1) {
        const next = equipWeapon(s, weaponIdx, unequipped);
        if (next !== s) { s = next; continue; }
      }
    }

    const spellIdx = side.hand.findIndex((c) => c.type === "spell");
    if (spellIdx !== -1 && !side.hasCastSpellThisTurn) {
      const spell = side.hand[spellIdx];
      if (spell.spellEffect) {
        if (spell.spellEffect.type === "damage") {
          const targetIdx = s.player.field.findIndex((fc) => fc !== null);
          const next = castSpell(s, spellIdx, targetIdx >= 0 ? targetIdx : undefined);
          if (next !== s) { s = next; continue; }
        } else {
          const allyIdx = side.field.findIndex((fc) => fc !== null);
          const next = castSpell(s, spellIdx, allyIdx >= 0 ? allyIdx : undefined);
          if (next !== s) { s = next; continue; }
        }
      }
    }

    const attackerIdx = side.field.findIndex((fc) => fc !== null && !fc.stunned);
    if (attackerIdx !== -1) {
      const fc = side.field[attackerIdx]!;
      if (!fc.abilityUsed && Math.random() < 0.3) {
        const next = useAbility(s, attackerIdx);
        if (next !== s) { s = next; continue; }
      }

      const playerFieldCards = s.player.field
        .map((fc2, idx) => (fc2 ? { fc: fc2, idx } : null))
        .filter(Boolean) as { fc: FieldCard; idx: number }[];

      if (playerFieldCards.length > 0) {
        const weakest = playerFieldCards.sort((a, b) => a.fc.currentHp - b.fc.currentHp)[0];
        const next = attackTarget(s, attackerIdx, weakest.idx);
        if (next !== s) { s = next; continue; }
      } else {
        const next = attackTarget(s, attackerIdx, "direct");
        if (next !== s) { s = next; continue; }
      }
    }

    const trapIdx = side.hand.findIndex((c) => c.type === "trap");
    if (trapIdx !== -1) {
      const next = playCard(s, trapIdx);
      if (next !== s) { s = next; continue; }
    }

    // Nothing to do; end turn.
    return endTurn(deepCopy(s));
  }

  return s;
}

// =================== Utilities ===================

function deepCopy<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

export function generateEnemyDeck(size: number = 10): string[] {
  // Build a balanced deck: mix of heroes, gods, weapons, spells, traps
  const heroes = allCards.filter(c => c.type === "hero");
  const gods = allCards.filter(c => c.type === "god");
  const weapons = allCards.filter(c => c.type === "weapon");
  const spells = allCards.filter(c => c.type === "spell");
  const traps = allCards.filter(c => c.type === "trap");

  const shuffled = (arr: GameCard[]) => [...arr].sort(() => Math.random() - 0.5);

  const picked: string[] = [];
  // 4 heroes, 2 gods, 2 weapons, 1 spell, 1 trap
  const heroCount = Math.min(4, Math.ceil(size * 0.4));
  const godCount = Math.min(2, Math.ceil(size * 0.2));
  const weaponCount = Math.min(2, Math.ceil(size * 0.2));
  const spellCount = Math.min(1, Math.ceil(size * 0.1));
  const trapCount = Math.min(1, Math.ceil(size * 0.1));

  for (const c of shuffled(heroes).slice(0, heroCount)) picked.push(c.id);
  for (const c of shuffled(gods).slice(0, godCount)) picked.push(c.id);
  for (const c of shuffled(weapons).slice(0, weaponCount)) picked.push(c.id);
  for (const c of shuffled(spells).slice(0, spellCount)) picked.push(c.id);
  for (const c of shuffled(traps).slice(0, trapCount)) picked.push(c.id);

  // Fill remaining with random heroes/gods
  while (picked.length < size) {
    const pool = [...heroes, ...gods].filter(c => !picked.includes(c.id));
    if (pool.length === 0) break;
    picked.push(pool[Math.floor(Math.random() * pool.length)].id);
  }

  return picked.slice(0, size);
}
