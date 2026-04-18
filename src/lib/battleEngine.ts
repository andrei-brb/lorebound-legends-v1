import type { GameCard } from "@/data/cards";
import { allCards } from "@/data/cards";
import { allGameCards } from "@/data/cardIndex";
import { TOKEN_CATALOG } from "@/data/tokenCatalog";
import { calculateFieldSynergies, calculatePassiveBonuses, type ActiveSynergy } from "./synergyEngine";
import { getElementMultiplier, getElementAdvantageLabel, elementEmoji } from "./elementSystem";
import { getMilestoneCombatBonuses } from "./progressionEngine";
import type { CardProgress } from "./playerState";
import { resolveAbilityEffect } from "./abilityInference";
import type { AbilityEffect, AbilityTarget } from "./abilityEffectTypes";
import { cardHasKeyword } from "./keywords";

// =================== Types ===================

export type RNG = () => number;

export function createSeededRng(seed: number): RNG {
  // Mulberry32: fast, deterministic, good enough for game RNG.
  let t = seed >>> 0;
  return () => {
    t += 0x6D2B79F5;
    let x = t;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

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
  attackedThisTurn: boolean;
  stunned: boolean; // can't act this turn
  tempBuffs: TempBuff[];
  /** Temporary taunt from abilities (card keyword "taunt" is implicit while on field). */
  tauntTurnsRemaining?: number;
  /** Damage at start of this unit's controller's turn. */
  poison?: { damagePerTurn: number; turnsRemaining: number };
  /** Damage at start of this unit's controller's turn. */
  burn?: { damagePerTurn: number; turnsRemaining: number };
  /** Miss chance on attacks while active. */
  blind?: { missChance: number; turnsRemaining: number };
  /** Co-op raid: which ally controls this unit. */
  raidOwner?: "allyA" | "allyB";
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

/** Summoned token/minion (Phase B) — parallel to field units, max 2 slots per side. */
export interface FieldToken {
  tokenId: string;
  name: string;
  image: string;
  attack: number;
  defense: number;
  currentHp: number;
  maxHp: number;
  turnsRemaining: number;
  autoStrike: boolean;
}

export interface PlayerSide {
  hp: number;
  shield: number;
  hand: GameCard[];
  field: (FieldCard | null)[]; // 4 slots
  /** Token minions (max 2) */
  tokens: (FieldToken | null)[];
  traps: (TrapOnField | null)[]; // 2 trap slots
  deck: GameCard[];
  graveyard: GameCard[];
  ap: number;
  fatigue: number;
  hasCastSpellThisTurn: boolean;
}

export interface BattleLog {
  message: string;
  type: "attack" | "ability" | "synergy" | "defeat" | "info" | "spell" | "trap" | "weapon" | "direct" | "token";
  timestamp: number;
  /** Adjudication source, e.g. "Ability: Grave Call", "Weapon: Tome of the Dead" */
  source?: string;
  ruleTag?: string;
}

export interface BattleState {
  player: PlayerSide;
  enemy: PlayerSide;
  turn: "player" | "enemy";
  /** Start → main actions → end (Phase D UX) */
  turnPhase: "start" | "main" | "end";
  phase: "select-action" | "select-target" | "animating" | "game-over";
  logs: BattleLog[];
  winner: "player" | "enemy" | "draw" | null;
  turnNumber: number;
  activeSynergies: { player: ActiveSynergy[]; enemy: ActiveSynergy[] };
  pendingAction: PendingAction | null;
  rng: RNG;
  rngSeed?: number;
  /** Co-op raid: active player is one ally; skip wipe until both allies are out of cards. */
  skipPlayerWipeCheck?: boolean;
  /** PvE: collection levels for milestone passives (crit / lifesteal / DR) on player-side units. */
  playerCardProgress?: Record<string, CardProgress>;
}

export type PendingAction =
  | { type: "play-card"; cardIndex: number }
  | { type: "attack"; fieldIndex: number }
  | { type: "equip-weapon"; cardIndex: number }
  | { type: "cast-spell"; cardIndex: number }
  | { type: "ability"; fieldIndex: number };

// =================== Init ===================

function shuffleDeck(cards: GameCard[], rng: RNG): GameCard[] {
  const arr = [...cards];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function createSide(
  deckIds: string[],
  rng: RNG,
  heroStats?: { hp?: number; shield?: number },
): PlayerSide {
  const deckCards = deckIds.map((id) => allGameCards.find((c) => c.id === id)).filter(Boolean) as GameCard[];
  const shuffled = shuffleDeck(deckCards, rng);
  const hand = shuffled.slice(0, 5);
  const deck = shuffled.slice(5);

  return {
    hp: heroStats?.hp ?? 30,
    shield: heroStats?.shield ?? 10,
    hand,
    field: [null, null, null, null],
    tokens: [null, null],
    traps: [null, null],
    deck,
    graveyard: [],
    ap: 0,
    fatigue: 0,
    hasCastSpellThisTurn: false,
  };
}

/** Shuffled hand/deck from card IDs (same rules as battle init). For raid co-op ally sides. */
export function createPlayerSideFromDeck(
  deckIds: string[],
  rng: RNG,
  heroStats?: { hp?: number; shield?: number },
): PlayerSide {
  return createSide(deckIds, rng, heroStats);
}

export function initBattle(
  playerDeckIds: string[],
  enemyDeckIds: string[],
  opts?: {
    seed?: number;
    rng?: RNG;
    enemyHero?: { hp?: number; shield?: number };
    playerCardProgress?: Record<string, CardProgress>;
  },
): BattleState {
  const rng = opts?.rng ?? (opts?.seed !== undefined ? createSeededRng(opts.seed) : Math.random);
  const state: BattleState = {
    player: createSide(playerDeckIds, rng),
    enemy: createSide(enemyDeckIds, rng, opts?.enemyHero),
    turn: "player",
    turnPhase: "start",
    phase: "select-action",
    logs: [{ message: "⚔️ Battle begins! Draw your weapons!", type: "info", timestamp: 0 }],
    winner: null,
    turnNumber: 1,
    activeSynergies: { player: [], enemy: [] },
    pendingAction: null,
    rng,
    rngSeed: opts?.seed,
    playerCardProgress: opts?.playerCardProgress,
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
    attackedThisTurn: false,
    stunned: false,
    tempBuffs: [],
  };
}

function hasTaunt(fc: FieldCard): boolean {
  return (fc.tauntTurnsRemaining ?? 0) > 0 || cardHasKeyword(fc.card, "taunt");
}

/** If any enemy taunts, attacks and single-target effects must pick from these indices. */
function getTauntForcedEnemyIndices(field: (FieldCard | null)[]): number[] | null {
  const indices: number[] = [];
  for (let i = 0; i < field.length; i++) {
    const fc = field[i];
    if (fc && hasTaunt(fc)) indices.push(i);
  }
  return indices.length > 0 ? indices : null;
}

function addLog(
  state: BattleState,
  message: string,
  type: BattleLog["type"],
  meta?: { source?: string; ruleTag?: string },
): void {
  state.logs.push({ message, type, timestamp: state.logs.length, ...meta });
}

function getActiveSide(state: BattleState): PlayerSide {
  return state.turn === "player" ? state.player : state.enemy;
}

function getOtherSide(state: BattleState): PlayerSide {
  return state.turn === "player" ? state.enemy : state.player;
}

function createFieldTokenFromCatalog(tokenId: string): FieldToken | null {
  const def = TOKEN_CATALOG[tokenId];
  if (!def) return null;
  return {
    tokenId: def.id,
    name: def.name,
    image: def.image,
    attack: def.attack,
    defense: def.defense,
    currentHp: def.hp,
    maxHp: def.hp,
    turnsRemaining: 1,
    autoStrike: def.autoStrike,
  };
}

/** Place one token in first free slot; returns false if full or unknown id. */
function tryPlaceToken(
  state: BattleState,
  side: PlayerSide,
  tokenId: string,
  duration: number,
  meta?: { source?: string; ruleTag?: string },
): boolean {
  const slot = side.tokens.findIndex((t) => t === null);
  if (slot === -1) {
    addLog(state, `🪙 No token slot free — cannot summon ${tokenId}.`, "info", meta);
    return false;
  }
  const base = createFieldTokenFromCatalog(tokenId);
  if (!base) {
    addLog(state, `🪙 Unknown token: ${tokenId}`, "info", meta);
    return false;
  }
  base.turnsRemaining = duration;
  side.tokens[slot] = base;
  addLog(state, `🪙 Summoned ${base.name} (${duration} turns).`, "token", {
    source: meta?.source,
    ruleTag: meta?.ruleTag ?? "summon",
  });
  return true;
}

function applyWeaponTurnStartPassives(state: BattleState, side: PlayerSide): void {
  const sideLabel = state.turn === "player" ? "You" : "Enemy";
  for (const fc of side.field) {
    if (!fc?.equippedWeapon?.weaponRules?.onTurnStart) continue;
    const wr = fc.equippedWeapon.weaponRules.onTurnStart;
    if (wr.kind === "summon_token") {
      for (let i = 0; i < wr.count; i++) {
        tryPlaceToken(state, side, wr.tokenId, 99, {
          source: `Weapon: ${fc.equippedWeapon.name}`,
          ruleTag: "weapon_passive",
        });
      }
    }
  }
}

/** Token auto-strike: deal damage to weakest enemy field unit (or direct if empty). */
function processTokenAutoStrikes(state: BattleState, side: PlayerSide, otherSide: PlayerSide): void {
  const sideLabel = state.turn === "player" ? "You" : "Enemy";
  for (const tok of side.tokens) {
    if (!tok || !tok.autoStrike) continue;
    const raw = tok.attack;
    let enemies = otherSide.field.map((fc, i) => (fc ? { fc, i } : null)).filter(Boolean) as {
      fc: FieldCard;
      i: number;
    }[];
    const forcedTaunt = getTauntForcedEnemyIndices(otherSide.field);
    if (forcedTaunt) {
      enemies = forcedTaunt.map((i) => ({ fc: otherSide.field[i]!, i }));
    }
    if (enemies.length === 0) {
      let dmg = raw;
      if (otherSide.shield > 0) {
        const absorbed = Math.min(otherSide.shield, dmg);
        otherSide.shield -= absorbed;
        dmg -= absorbed;
      }
      otherSide.hp = Math.max(0, otherSide.hp - dmg);
      addLog(
        state,
        `🪶 ${tok.name} strikes ${sideLabel}'s foe for ${raw} direct damage!`,
        "token",
        { source: tok.name, ruleTag: "token_strike" },
      );
      continue;
    }
    enemies.sort((a, b) => a.fc.currentHp - b.fc.currentHp);
    const { fc: target, i: idx } = enemies[0];
    const dmg = Math.max(1, raw - Math.floor(target.defense * 0.25));
    target.currentHp = Math.max(0, target.currentHp - dmg);
    addLog(
      state,
      `🪶 ${tok.name} strikes ${target.card.name} for ${dmg}!`,
      "token",
      { source: tok.name, ruleTag: "token_strike" },
    );
    if (target.currentHp <= 0) {
      addLog(state, `💀 ${target.card.name} was destroyed!`, "defeat");
      otherSide.graveyard.push(target.card);
      if (target.equippedWeapon) otherSide.graveyard.push(target.equippedWeapon);
      otherSide.field[idx] = null;
    }
  }
}

export function startTurn(state: BattleState): BattleState {
  if (state.phase === "game-over") return state;

  state.turnPhase = "start";
  const side = getActiveSide(state);
  const otherSide = getOtherSide(state);
  const sideLabel = state.turn === "player" ? "You" : "Enemy";

  side.ap = 2;
  side.hasCastSpellThisTurn = false;
  for (const fc of side.field) {
    if (!fc) continue;
    fc.attackedThisTurn = false;
  }

  // Poison ticks at start of each unit's controller's turn
  for (let pi = 0; pi < side.field.length; pi++) {
    const fc = side.field[pi];
    if (!fc?.poison || fc.poison.turnsRemaining <= 0) continue;
    const pd = fc.poison.damagePerTurn;
    fc.currentHp = Math.max(0, fc.currentHp - pd);
    fc.poison.turnsRemaining -= 1;
    if (fc.poison.turnsRemaining <= 0) delete fc.poison;
    addLog(state, `☠️ ${fc.card.name} suffers ${pd} poison damage!`, "info");
    if (fc.currentHp <= 0) {
      addLog(state, `💀 ${fc.card.name} was destroyed!`, "defeat");
      side.graveyard.push(fc.card);
      if (fc.equippedWeapon) side.graveyard.push(fc.equippedWeapon);
      side.field[pi] = null;
    }
  }

  // Burn ticks at start of each unit's controller's turn
  for (let bi = 0; bi < side.field.length; bi++) {
    const fc = side.field[bi];
    if (!fc?.burn || fc.burn.turnsRemaining <= 0) continue;
    const bd = fc.burn.damagePerTurn;
    fc.currentHp = Math.max(0, fc.currentHp - bd);
    fc.burn.turnsRemaining -= 1;
    if (fc.burn.turnsRemaining <= 0) delete fc.burn;
    addLog(state, `🔥 ${fc.card.name} suffers ${bd} burn damage!`, "info");
    if (fc.currentHp <= 0) {
      addLog(state, `💀 ${fc.card.name} was destroyed!`, "defeat");
      side.graveyard.push(fc.card);
      if (fc.equippedWeapon) side.graveyard.push(fc.equippedWeapon);
      side.field[bi] = null;
    }
  }

  checkWinCondition(state);
  if (state.phase === "game-over") return state;

  // Draw 1 card at start of turn; apply fatigue only on draw.
  if (side.deck.length > 0) {
    side.hand.push(side.deck.shift()!);
  } else {
    side.fatigue += 1;
    side.hp = Math.max(0, side.hp - side.fatigue);
    addLog(state, `📦 ${sideLabel} fatigues for ${side.fatigue} damage!`, "info");
  }

  applyWeaponTurnStartPassives(state, side);
  processTokenAutoStrikes(state, side, otherSide);

  state.turnPhase = "main";
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

/** End-of-turn cleanup for the active side only (no turn flip). Used by raid co-op between ally A and ally B. */
export function applyEndOfTurnCleanupForActiveSide(state: BattleState): BattleState {
  if (state.phase === "game-over") return state;
  const side = getActiveSide(state);
  state.turnPhase = "end";
  for (const fc of side.field) {
    if (!fc) continue;
    fc.tempBuffs = fc.tempBuffs
      .map((b) => ({ ...b, turnsRemaining: b.turnsRemaining - 1 }))
      .filter((b) => b.turnsRemaining > 0);
    if (fc.tauntTurnsRemaining && fc.tauntTurnsRemaining > 0) {
      fc.tauntTurnsRemaining -= 1;
    }
    if (fc.blind && fc.blind.turnsRemaining > 0) {
      fc.blind.turnsRemaining -= 1;
      if (fc.blind.turnsRemaining <= 0) delete fc.blind;
    }
    fc.stunned = false;
  }
  tickTokenDurations(side);
  state.phase = "select-action";
  state.pendingAction = null;
  return checkWinCondition(state);
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
    if (sideKey === "player" && state.skipPlayerWipeCheck) continue;
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

  if (!attacker || attacker.stunned || attacker.attackedThisTurn) return state;
  if (!canSpendAp(newState, 1)) return state;

  const sideLabel = newState.turn === "player" ? "You" : "Enemy";

  // Blind: attacks may miss
  if (attacker.blind && attacker.blind.turnsRemaining > 0) {
    const missChance = Math.max(0, Math.min(0.95, attacker.blind.missChance));
    if (newState.rng() < missChance) {
      addLog(newState, `🌫️ ${attacker.card.name} misses the attack!`, "attack");
      spendAp(newState, 1);
      attacker.attackedThisTurn = true;
      return maybeAutoEndTurn(recalcFieldStats(checkWinCondition(newState)));
    }
  }

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

    if (attacker.stunned) {
      addLog(newState, `😵 ${attacker.card.name} is stunned — attack interrupted!`, "info");
      spendAp(newState, 1);
      attacker.attackedThisTurn = true;
      return maybeAutoEndTurn(recalcFieldStats(checkWinCondition(newState)));
    }

    let dmg = attacker.attack;
    if (newState.turn === "player") {
      const lv = newState.playerCardProgress?.[attacker.card.id]?.level ?? 1;
      const ms = getMilestoneCombatBonuses(lv);
      if (ms.critChance > 0 && newState.rng() < ms.critChance) {
        dmg = Math.round(dmg * 1.5);
        addLog(newState, `⭐ Critical strike!`, "attack");
      }
    } else {
      let dr = 0;
      const map = newState.playerCardProgress;
      if (map) {
        for (const p of Object.values(map)) {
          dr = Math.max(dr, getMilestoneCombatBonuses(p.level).damageReduction);
        }
      }
      if (dr > 0) {
        dmg = Math.max(1, Math.round(dmg * (1 - dr)));
        addLog(newState, `🛡️ Iron Skin reduces direct damage!`, "direct");
      }
    }
    // Shield absorbs first
    let hpDealt = 0;
    if (otherSide.shield > 0) {
      const absorbed = Math.min(otherSide.shield, dmg);
      otherSide.shield -= absorbed;
      const remaining = dmg - absorbed;
      hpDealt = remaining;
      otherSide.hp = Math.max(0, otherSide.hp - remaining);
      addLog(newState, `💥 ${attacker.card.name} attacks directly! Shield absorbs ${absorbed}, ${remaining} damage to HP!`, "direct");
    } else {
      hpDealt = dmg;
      otherSide.hp = Math.max(0, otherSide.hp - dmg);
      addLog(newState, `💥 ${attacker.card.name} attacks directly for ${dmg} damage!`, "direct");
    }

    const passiveLs =
      newState.turn === "player"
        ? getMilestoneCombatBonuses(newState.playerCardProgress?.[attacker.card.id]?.level ?? 1).lifesteal
        : 0;
    if (cardHasKeyword(attacker.card, "lifesteal") && hpDealt > 0 && attacker.currentHp > 0) {
      const healed = Math.min(hpDealt, attacker.maxHp - attacker.currentHp);
      attacker.currentHp += healed;
      addLog(newState, `💚 ${attacker.card.name} lifesteals ${healed} HP!`, "attack");
    } else if (passiveLs > 0 && hpDealt > 0 && attacker.currentHp > 0) {
      const healed = Math.min(Math.round(hpDealt * passiveLs), attacker.maxHp - attacker.currentHp);
      if (healed > 0) {
        attacker.currentHp += healed;
        addLog(newState, `💚 ${attacker.card.name} siphons ${healed} HP!`, "attack");
      }
    }

    spendAp(newState, 1);
    attacker.attackedThisTurn = true;
    return maybeAutoEndTurn(recalcFieldStats(checkWinCondition(newState)));
  }

  // Attack a field card
  const target = otherSide.field[targetFieldIndex];
  if (!target) return state;

  const tauntForced = getTauntForcedEnemyIndices(otherSide.field);
  if (tauntForced && !tauntForced.includes(targetFieldIndex)) {
    addLog(newState, "❌ Must attack a taunting unit first!", "info");
    return state;
  }

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

  if (attacker.stunned) {
    addLog(newState, `😵 ${attacker.card.name} is stunned — attack interrupted!`, "info");
    spendAp(newState, 1);
    attacker.attackedThisTurn = true;
    return maybeAutoEndTurn(recalcFieldStats(checkWinCondition(newState)));
  }

  // Calculate damage with elemental modifier
  const attackerElement = attacker.card.element || "neutral";
  const defenderElement = target.card.element || "neutral";
  const elemMult = getElementMultiplier(attackerElement, defenderElement);
  const elemLabel = getElementAdvantageLabel(attackerElement, defenderElement);

  const rawDmg = Math.max(1, attacker.attack - Math.floor(target.defense * 0.25));
  const variance = 0.9 + state.rng() * 0.2;
  let dmg = Math.max(1, Math.round(rawDmg * variance * elemMult));

  if (newState.turn === "player") {
    const lv = newState.playerCardProgress?.[attacker.card.id]?.level ?? 1;
    const ms = getMilestoneCombatBonuses(lv);
    if (ms.critChance > 0 && newState.rng() < ms.critChance) {
      dmg = Math.max(1, Math.round(dmg * 1.5));
      addLog(newState, `⭐ Critical strike!`, "attack");
    }
  } else {
    const defLv = newState.playerCardProgress?.[target.card.id]?.level ?? 1;
    const defMs = getMilestoneCombatBonuses(defLv);
    if (defMs.damageReduction > 0) {
      dmg = Math.max(1, Math.round(dmg * (1 - defMs.damageReduction)));
      addLog(newState, `🛡️ ${target.card.name}'s Iron Skin softens the blow!`, "attack");
    }
  }

  target.currentHp = Math.max(0, target.currentHp - dmg);
  
  let attackMsg = `⚔️ ${attacker.card.name} attacks ${target.card.name} for ${dmg} damage!`;
  if (elemLabel) {
    attackMsg += ` ${elementEmoji[attackerElement]} ${elemLabel}`;
  }
  addLog(newState, attackMsg, "attack");

  const passiveLsField =
    newState.turn === "player"
      ? getMilestoneCombatBonuses(newState.playerCardProgress?.[attacker.card.id]?.level ?? 1).lifesteal
      : 0;
  if (cardHasKeyword(attacker.card, "lifesteal") && dmg > 0 && attacker.currentHp > 0) {
    const healed = Math.min(dmg, attacker.maxHp - attacker.currentHp);
    attacker.currentHp += healed;
    addLog(newState, `💚 ${attacker.card.name} lifesteals ${healed} HP!`, "attack");
  } else if (passiveLsField > 0 && dmg > 0 && attacker.currentHp > 0) {
    const healed = Math.min(Math.round(dmg * passiveLsField), attacker.maxHp - attacker.currentHp);
    if (healed > 0) {
      attacker.currentHp += healed;
      addLog(newState, `💚 ${attacker.card.name} siphons ${healed} HP!`, "attack");
    }
  }

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
  attacker.attackedThisTurn = true;
  return maybeAutoEndTurn(recalcFieldStats(checkWinCondition(newState)));
}

function flattenAbilityEffects(effect: AbilityEffect): AbilityEffect[] {
  if (effect.kind === "sequence") return effect.steps.flatMap(flattenAbilityEffects);
  return [effect];
}

function pickEnemyFieldIndex(field: (FieldCard | null)[], mode: AbilityTarget): number {
  const forced = getTauntForcedEnemyIndices(field);
  const pool: number[] = forced ?? field.map((fc, i) => (fc ? i : -1)).filter((i) => i >= 0);
  const entries = pool.map((i) => ({ fc: field[i]!, i }));
  if (entries.length === 0) return -1;
  if (mode === "highest_hp") {
    entries.sort((a, b) => b.fc.currentHp - a.fc.currentHp);
    return entries[0].i;
  }
  entries.sort((a, b) => a.fc.currentHp - b.fc.currentHp);
  return entries[0].i;
}

function pickAllyFieldIndex(field: (FieldCard | null)[], mode: "lowest" | "self", selfIndex: number): number {
  const entries = field.map((fc, i) => (fc ? { fc, i } : null)).filter(Boolean) as { fc: FieldCard; i: number }[];
  if (mode === "self") return selfIndex;
  if (entries.length === 0) return -1;
  entries.sort((a, b) => a.fc.currentHp - b.fc.currentHp);
  return entries[0].i;
}

function abilityDefenseMitigation(defense: number, ignoreDefenseFrac?: number): number {
  if (ignoreDefenseFrac === 1) return 0;
  const base = Math.floor(defense * 0.25);
  if (ignoreDefenseFrac === undefined) return base;
  return Math.max(0, Math.floor(base * (1 - ignoreDefenseFrac)));
}

function dealAbilityDamageToField(
  state: BattleState,
  attackerCard: GameCard,
  target: FieldCard,
  rawDamage: number,
  ignoreDefenseFrac?: number,
): number {
  const atkEl = attackerCard.element || "neutral";
  const defEl = target.card.element || "neutral";
  const elemMult = getElementMultiplier(atkEl, defEl);
  const mit = abilityDefenseMitigation(target.defense, ignoreDefenseFrac);
  return Math.max(1, Math.round((rawDamage - mit) * elemMult));
}

function destroyFieldCardIfDead(state: BattleState, side: PlayerSide, fieldIndex: number) {
  const fc = side.field[fieldIndex];
  if (!fc || fc.currentHp > 0) return;
  addLog(state, `💀 ${fc.card.name} was destroyed!`, "defeat");
  side.graveyard.push(fc.card);
  if (fc.equippedWeapon) side.graveyard.push(fc.equippedWeapon);
  side.field[fieldIndex] = null;
}

/**
 * Applies resolved ability data (from card text + overrides). Mutates `newState`.
 */
function applyResolvedAbility(
  newState: BattleState,
  fc: FieldCard,
  fieldIndex: number,
  effect: AbilityEffect,
): void {
  const side = getActiveSide(newState);
  const otherSide = getOtherSide(newState);
  const ability = fc.card.specialAbility;
  const attackerElement = fc.card.element || "neutral";

  const run = (e: AbilityEffect) => {
    switch (e.kind) {
      case "generic_scaled": {
        const targets = otherSide.field.filter(Boolean) as FieldCard[];
        if (targets.length === 0) break;
        const target = targets.sort((a, b) => b.currentHp - a.currentHp)[0];
        const abilityDmg = Math.max(2, Math.round(fc.attack * 1.2 + (ability.cost || 3)));
        const dmg = dealAbilityDamageToField(newState, fc.card, target, abilityDmg);
        target.currentHp = Math.max(0, target.currentHp - dmg);
        const elemLabel = getElementAdvantageLabel(attackerElement, target.card.element || "neutral");
        let msg = `✨ ${fc.card.name} uses ${ability.name}! Deals ${dmg} damage to ${target.card.name}!`;
        if (elemLabel) msg += ` ${elementEmoji[attackerElement]} ${elemLabel}`;
        addLog(newState, msg, "ability");
        destroyFieldCardIfDead(newState, otherSide, otherSide.field.indexOf(target));
        break;
      }
      case "damage_single": {
        const idx = pickEnemyFieldIndex(otherSide.field, e.target);
        if (idx < 0) break;
        const target = otherSide.field[idx]!;
        const dmg = dealAbilityDamageToField(newState, fc.card, target, e.value, e.ignoreDefenseFrac);
        target.currentHp = Math.max(0, target.currentHp - dmg);
        const elemLabel = getElementAdvantageLabel(attackerElement, target.card.element || "neutral");
        let msg = `✨ ${fc.card.name} uses ${ability.name}! Deals ${dmg} damage to ${target.card.name}!`;
        if (elemLabel) msg += ` ${elementEmoji[attackerElement]} ${elemLabel}`;
        addLog(newState, msg, "ability");
        if (e.stun) {
          target.stunned = true;
          addLog(newState, `😵 ${target.card.name} is stunned!`, "ability");
        }
        if (e.debuff) {
          target.tempBuffs.push({
            stat: e.debuff.stat,
            value: -e.debuff.value,
            turnsRemaining: e.debuff.duration,
          });
        }
        destroyFieldCardIfDead(newState, otherSide, idx);
        break;
      }
      case "damage_aoe": {
        for (let i = 0; i < otherSide.field.length; i++) {
          const t = otherSide.field[i];
          if (!t) continue;
          const dmg = dealAbilityDamageToField(newState, fc.card, t, e.value);
          t.currentHp = Math.max(0, t.currentHp - dmg);
          const elemLabel = getElementAdvantageLabel(attackerElement, t.card.element || "neutral");
          let msg = `✨ ${fc.card.name} uses ${ability.name}! Hits ${t.card.name} for ${dmg}!`;
          if (elemLabel) msg += ` ${elementEmoji[attackerElement]} ${elemLabel}`;
          addLog(newState, msg, "ability");
          if (e.debuff) {
            t.tempBuffs.push({
              stat: e.debuff.stat,
              value: -e.debuff.value,
              turnsRemaining: e.debuff.duration,
            });
          }
          destroyFieldCardIfDead(newState, otherSide, i);
        }
        break;
      }
      case "damage_multi": {
        for (let h = 0; h < e.hits; h++) {
          const indices = otherSide.field.map((x, i) => (x ? i : -1)).filter((i) => i >= 0);
          if (indices.length === 0) break;
          let idx: number;
          if (e.randomTargets) {
            idx = indices[Math.floor(newState.rng() * indices.length)]!;
          } else {
            idx = indices[Math.min(h, indices.length - 1)]!;
          }
          const t = otherSide.field[idx]!;
          const dmg = dealAbilityDamageToField(newState, fc.card, t, e.damageEach);
          t.currentHp = Math.max(0, t.currentHp - dmg);
          addLog(newState, `✨ ${fc.card.name} uses ${ability.name}! Hits ${t.card.name} for ${dmg}!`, "ability");
          destroyFieldCardIfDead(newState, otherSide, idx);
        }
        break;
      }
      case "heal": {
        if (e.scope === "self") {
          fc.currentHp = Math.min(fc.maxHp, fc.currentHp + e.value);
          addLog(newState, `✨ ${fc.card.name} uses ${ability.name}! Heals self for ${e.value} HP.`, "ability");
        } else if (e.scope === "all_allies") {
          for (let i = 0; i < side.field.length; i++) {
            const ally = side.field[i];
            if (!ally) continue;
            ally.currentHp = Math.min(ally.maxHp, ally.currentHp + e.value);
          }
          addLog(newState, `✨ ${fc.card.name} uses ${ability.name}! Heals all allies for ${e.value} HP.`, "ability");
        } else {
          const ai = pickAllyFieldIndex(side.field, "lowest", fieldIndex);
          if (ai >= 0 && side.field[ai]) {
            const ally = side.field[ai]!;
            ally.currentHp = Math.min(ally.maxHp, ally.currentHp + e.value);
            addLog(newState, `✨ ${fc.card.name} uses ${ability.name}! Heals ${ally.card.name} for ${e.value} HP.`, "ability");
          }
        }
        break;
      }
      case "buff_allies": {
        for (let i = 0; i < side.field.length; i++) {
          const ally = side.field[i];
          if (!ally) continue;
          ally.tempBuffs.push({ stat: e.stat, value: e.value, turnsRemaining: e.duration });
        }
        addLog(
          newState,
          `✨ ${fc.card.name} uses ${ability.name}! ${e.stat === "attack" ? "ATK" : "DEF"} +${e.value} to allies (${e.duration} turns).`,
          "ability",
        );
        break;
      }
      case "buff_self": {
        fc.tempBuffs.push({ stat: e.stat, value: e.value, turnsRemaining: e.duration });
        addLog(newState, `✨ ${fc.card.name} uses ${ability.name}! ${e.stat.toUpperCase()} +${e.value} (${e.duration} turns).`, "ability");
        break;
      }
      case "debuff_all_enemies": {
        for (let i = 0; i < otherSide.field.length; i++) {
          const t = otherSide.field[i];
          if (!t) continue;
          t.tempBuffs.push({ stat: e.stat, value: -e.value, turnsRemaining: e.duration });
        }
        addLog(newState, `✨ ${fc.card.name} uses ${ability.name}! Weakens all enemies.`, "ability");
        break;
      }
      case "debuff_one_enemy": {
        const idx = pickEnemyFieldIndex(otherSide.field, e.which);
        if (idx < 0) break;
        const t = otherSide.field[idx]!;
        t.tempBuffs.push({ stat: e.stat, value: -e.value, turnsRemaining: e.duration });
        addLog(newState, `✨ ${fc.card.name} uses ${ability.name}! Debuffs ${t.card.name}.`, "ability");
        break;
      }
      case "drain": {
        const idx = pickEnemyFieldIndex(otherSide.field, e.target);
        if (idx < 0) break;
        const target = otherSide.field[idx]!;
        const dmg = dealAbilityDamageToField(newState, fc.card, target, e.damage);
        target.currentHp = Math.max(0, target.currentHp - dmg);
        addLog(newState, `✨ ${fc.card.name} uses ${ability.name}! Deals ${dmg} to ${target.card.name}.`, "ability");
        fc.currentHp = Math.min(fc.maxHp, fc.currentHp + e.healSelf);
        addLog(newState, `💚 Drains life: heals self for ${e.healSelf} HP.`, "ability");
        destroyFieldCardIfDead(newState, otherSide, idx);
        break;
      }
      case "shield_side": {
        side.shield += e.value;
        addLog(newState, `✨ ${fc.card.name} uses ${ability.name}! Gains ${e.value} shield.`, "ability");
        break;
      }
      case "hurt_self": {
        fc.currentHp = Math.max(1, fc.currentHp - e.value);
        addLog(newState, `✨ ${fc.card.name} strains for ${e.value} self-damage!`, "ability");
        break;
      }
      case "summon_tokens": {
        let count = e.count;
        let tokenId = e.tokenId;
        if (fc.card.id === "mortuus" && side.field.some((x) => x?.card.id === "bone-knight")) {
          count = 4;
        }
        if (fc.card.id === "kova" && side.field.some((x) => x?.card.id === "fenris")) {
          tokenId = "dire-wolf";
        }
        for (let i = 0; i < count; i++) {
          tryPlaceToken(newState, side, tokenId, e.duration, {
            source: `Ability: ${ability.name}`,
            ruleTag: "summon",
          });
        }
        break;
      }
      case "revive_from_graveyard": {
        const reviveeIdx = side.graveyard.findIndex((c) => c.type === "hero" || c.type === "god");
        if (reviveeIdx < 0) {
          addLog(newState, `✨ ${fc.card.name} finds no ally in the graveyard.`, "ability", {
            source: `Ability: ${ability.name}`,
            ruleTag: "revive",
          });
          break;
        }
        const slot = side.field.findIndex((s) => s === null);
        if (slot < 0) {
          addLog(newState, `✨ ${fc.card.name} cannot revive — field is full!`, "ability", {
            source: `Ability: ${ability.name}`,
            ruleTag: "revive",
          });
          break;
        }
        const revivee = side.graveyard[reviveeIdx]!;
        const hp = Math.max(1, Math.floor((revivee.hp * e.hpPercent) / 100));
        const risen = createFieldCard(revivee);
        risen.currentHp = hp;
        risen.maxHp = revivee.hp;
        side.field[slot] = risen;
        side.graveyard.splice(reviveeIdx, 1);
        addLog(newState, `✨ ${fc.card.name} raises ${revivee.name} at ${hp} HP!`, "ability", {
          source: `Ability: ${ability.name}`,
          ruleTag: "revive",
        });
        break;
      }
      case "taunt_self": {
        fc.tauntTurnsRemaining = (fc.tauntTurnsRemaining ?? 0) + e.duration;
        addLog(
          newState,
          `✨ ${fc.card.name} uses ${ability.name}! Gains Taunt (${e.duration} turns).`,
          "ability",
        );
        break;
      }
      case "poison_enemy": {
        const pidx = pickEnemyFieldIndex(otherSide.field, e.which);
        if (pidx < 0) break;
        const t = otherSide.field[pidx]!;
        t.poison = { damagePerTurn: e.damagePerTurn, turnsRemaining: e.duration };
        addLog(
          newState,
          `✨ ${fc.card.name} uses ${ability.name}! Poisons ${t.card.name} (${e.damagePerTurn}/turn, ${e.duration} turns).`,
          "ability",
        );
        break;
      }
      case "burn_enemy": {
        const pidx = pickEnemyFieldIndex(otherSide.field, e.which);
        if (pidx < 0) break;
        const t = otherSide.field[pidx]!;
        t.burn = { damagePerTurn: e.damagePerTurn, turnsRemaining: e.duration };
        addLog(
          newState,
          `✨ ${fc.card.name} uses ${ability.name}! Burns ${t.card.name} (${e.damagePerTurn}/turn, ${e.duration} turns).`,
          "ability",
        );
        break;
      }
      case "burn_all_enemies": {
        for (const t of otherSide.field) {
          if (!t) continue;
          t.burn = { damagePerTurn: e.damagePerTurn, turnsRemaining: e.duration };
        }
        addLog(
          newState,
          `✨ ${fc.card.name} uses ${ability.name}! Burns all enemies (${e.damagePerTurn}/turn, ${e.duration} turns).`,
          "ability",
        );
        break;
      }
      case "blind_enemy": {
        const pidx = pickEnemyFieldIndex(otherSide.field, e.which);
        if (pidx < 0) break;
        const t = otherSide.field[pidx]!;
        t.blind = { missChance: e.missChance, turnsRemaining: e.duration };
        addLog(
          newState,
          `✨ ${fc.card.name} uses ${ability.name}! Blinds ${t.card.name} (${Math.round(e.missChance * 100)}% miss, ${e.duration} turns).`,
          "ability",
        );
        break;
      }
      case "blind_all_enemies": {
        for (const t of otherSide.field) {
          if (!t) continue;
          t.blind = { missChance: e.missChance, turnsRemaining: e.duration };
        }
        addLog(
          newState,
          `✨ ${fc.card.name} uses ${ability.name}! Blinds all enemies (${Math.round(e.missChance * 100)}% miss, ${e.duration} turns).`,
          "ability",
        );
        break;
      }
      default:
        break;
    }
  };

  for (const ex of flattenAbilityEffects(effect)) {
    run(ex);
  }
}

export function activateAbility(state: BattleState, fieldIndex: number): BattleState {
  const newState = deepCopy(state);
  const side = getActiveSide(newState);
  const fc = side.field[fieldIndex];

  if (!fc || fc.abilityUsed || fc.stunned) return state;

  // Costs 1–2 use that much AP; higher listed costs are treated as 1 AP so abilities remain usable after playing a unit (2 AP/turn).
  const c = fc.card.specialAbility.cost ?? 1;
  const apCost = c <= 2 ? c : 1;
  if (!canSpendAp(newState, apCost)) return state;

  fc.abilityUsed = true;
  const resolved = resolveAbilityEffect(fc.card);
  applyResolvedAbility(newState, fc, fieldIndex, resolved);

  spendAp(newState, apCost);
  return maybeAutoEndTurn(recalcFieldStats(checkWinCondition(newState)));
}

// =================== Turn Management ===================

function tickTokenDurations(side: PlayerSide): void {
  for (let i = 0; i < side.tokens.length; i++) {
    const t = side.tokens[i];
    if (!t) continue;
    t.turnsRemaining -= 1;
    if (t.turnsRemaining <= 0) side.tokens[i] = null;
  }
}

export function endTurn(state: BattleState): BattleState {
  if (state.phase === "game-over") return state;

  const side = getActiveSide(state);
  state.turnPhase = "end";

  // Tick down temp buffs and temporary taunt
  for (const fc of side.field) {
    if (!fc) continue;
    fc.tempBuffs = fc.tempBuffs
      .map(b => ({ ...b, turnsRemaining: b.turnsRemaining - 1 }))
      .filter(b => b.turnsRemaining > 0);
    if (fc.tauntTurnsRemaining && fc.tauntTurnsRemaining > 0) {
      fc.tauntTurnsRemaining -= 1;
    }
    if (fc.blind && fc.blind.turnsRemaining > 0) {
      fc.blind.turnsRemaining -= 1;
      if (fc.blind.turnsRemaining <= 0) delete fc.blind;
    }
    fc.stunned = false;
  }

  tickTokenDurations(side);

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

    const attackerIdx = side.field.findIndex((fc) => fc !== null && !fc.stunned && !fc.attackedThisTurn);
    if (attackerIdx !== -1) {
      const fc = side.field[attackerIdx]!;
      if (!fc.abilityUsed && s.rng() < 0.3) {
        const next = activateAbility(s, attackerIdx);
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
  const copy = JSON.parse(JSON.stringify(obj)) as T;
  // Preserve non-serializable function refs (RNG) for deterministic simulation.
  if (obj && typeof obj === "object" && copy && typeof copy === "object") {
    const src = obj as unknown as Record<string, unknown>;
    const dst = copy as unknown as Record<string, unknown>;
    if (typeof src.rng === "function") dst.rng = src.rng;
    if (src.rngSeed !== undefined) dst.rngSeed = src.rngSeed;
    if (src.playerCardProgress !== undefined) dst.playerCardProgress = src.playerCardProgress;
  }
  return copy;
}

export function simulateBattle(params: {
  playerDeckIds: string[];
  enemyDeckIds: string[];
  seed?: number;
  maxTurns?: number;
}): { winner: BattleState["winner"]; turnCount: number; finalState: BattleState } {
  const seed = params.seed ?? 12345;
  const maxTurns = params.maxTurns ?? 60;
  let s = initBattle(params.playerDeckIds, params.enemyDeckIds, { seed });

  const performAutoPlayerTurn = (state: BattleState): BattleState => {
    let st = state;
    const MAX_ACTIONS = 6;
    for (let i = 0; i < MAX_ACTIONS; i++) {
      if (st.phase === "game-over") return st;
      if (st.turn !== "player") return st;
      if (st.player.ap <= 0) return endTurn(deepCopy(st));

      const side = st.player;
      const emptySlot = side.field.findIndex((slot) => slot === null);
      if (emptySlot !== -1) {
        const unitIdx = side.hand.findIndex((c) => c.type === "hero" || c.type === "god");
        if (unitIdx !== -1) {
          const next = playCard(st, unitIdx);
          if (next !== st) { st = next; continue; }
        }
      }

      const weaponIdx = side.hand.findIndex((c) => c.type === "weapon");
      if (weaponIdx !== -1) {
        const unequipped = side.field.findIndex((fc) => fc !== null && !fc.equippedWeapon);
        if (unequipped !== -1) {
          const next = equipWeapon(st, weaponIdx, unequipped);
          if (next !== st) { st = next; continue; }
        }
      }

      const spellIdx = side.hand.findIndex((c) => c.type === "spell");
      if (spellIdx !== -1 && !side.hasCastSpellThisTurn) {
        // Target: prefer damaging spells on enemy unit, otherwise buff an ally.
        const spell = side.hand[spellIdx];
        if (spell.spellEffect) {
          if (spell.spellEffect.type === "damage") {
            const targetIdx = st.enemy.field.findIndex((fc) => fc !== null);
            const next = castSpell(st, spellIdx, targetIdx >= 0 ? targetIdx : undefined);
            if (next !== st) { st = next; continue; }
          } else {
            const allyIdx = side.field.findIndex((fc) => fc !== null);
            const next = castSpell(st, spellIdx, allyIdx >= 0 ? allyIdx : undefined);
            if (next !== st) { st = next; continue; }
          }
        }
      }

      const attackerIdx = side.field.findIndex((fc) => fc !== null && !fc.stunned && !fc.attackedThisTurn);
      if (attackerIdx !== -1) {
        const fc = side.field[attackerIdx]!;
        if (!fc.abilityUsed && st.rng() < 0.3) {
          const next = activateAbility(st, attackerIdx);
          if (next !== st) { st = next; continue; }
        }

        const enemyFieldCards = st.enemy.field
          .map((fc2, idx) => (fc2 ? { fc: fc2, idx } : null))
          .filter(Boolean) as { fc: FieldCard; idx: number }[];

        if (enemyFieldCards.length > 0) {
          const weakest = enemyFieldCards.sort((a, b) => a.fc.currentHp - b.fc.currentHp)[0];
          const next = attackTarget(st, attackerIdx, weakest.idx);
          if (next !== st) { st = next; continue; }
        } else {
          const next = attackTarget(st, attackerIdx, "direct");
          if (next !== st) { st = next; continue; }
        }
      }

      const trapIdx = side.hand.findIndex((c) => c.type === "trap");
      if (trapIdx !== -1) {
        const next = playCard(st, trapIdx);
        if (next !== st) { st = next; continue; }
      }

      return endTurn(deepCopy(st));
    }
    return endTurn(deepCopy(st));
  };

  while (s.phase !== "game-over" && !s.winner && s.turnNumber <= maxTurns) {
    if (s.turn === "enemy") {
      const next = performAITurn(deepCopy(s));
      s = next.turn === "enemy" && next.phase !== "game-over" ? endTurn(deepCopy(next)) : next;
    } else {
      s = performAutoPlayerTurn(deepCopy(s));
    }
  }

  return { winner: s.winner, turnCount: s.turnNumber, finalState: s };
}

export function generateEnemyDeck(size: number = 10, rng: RNG = Math.random): string[] {
  // Build a balanced deck: mix of heroes, gods, weapons, spells, traps
  const heroes = allCards.filter(c => c.type === "hero");
  const gods = allCards.filter(c => c.type === "god");
  const weapons = allCards.filter(c => c.type === "weapon");
  const spells = allCards.filter(c => c.type === "spell");
  const traps = allCards.filter(c => c.type === "trap");

  const shuffled = (arr: GameCard[]) => shuffleDeck(arr, rng);

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
    picked.push(pool[Math.floor(rng() * pool.length)].id);
  }

  return picked.slice(0, size);
}
