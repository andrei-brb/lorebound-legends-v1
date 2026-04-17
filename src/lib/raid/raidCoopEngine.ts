import type { GameCard } from "@/data/cards";
import type { BattleLockstepIntent } from "@/lib/battleLockstep";
import type { BattleState, FieldCard, RNG } from "@/lib/battleEngine";
import {
  applyEndOfTurnCleanupForActiveSide,
  createPlayerSideFromDeck,
  createSeededRng,
  playCard,
  equipWeapon,
  castSpell,
  attackTarget,
  activateAbility,
  performAITurn,
  startTurn,
  endTurn,
} from "@/lib/battleEngine";
import { resolveBossDeck, type RaidBossDefinition } from "./bosses";

export interface RaidAllyPouch {
  hand: GameCard[];
  deck: GameCard[];
  graveyard: GameCard[];
  fatigue: number;
}

export type RaidSubPhase = "allyA" | "allyB" | "boss";

export interface RaidCoopState {
  partyHp: number;
  partyShield: number;
  partyField: (FieldCard | null)[];
  partyTokens: BattleState["player"]["tokens"];
  partyTraps: BattleState["player"]["traps"];
  allyA: RaidAllyPouch;
  allyB: RaidAllyPouch;
  enemy: BattleState["enemy"];
  subPhase: RaidSubPhase;
  live: BattleState;
  bossId: string;
  bossName: string;
  goldRewardMultiplier: number;
  rng: RNG;
  rngSeed?: number;
}

function deepCopyBattle<T>(obj: T): T {
  const copy = JSON.parse(JSON.stringify(obj)) as T;
  if (obj && typeof obj === "object" && copy && typeof copy === "object") {
    const src = obj as unknown as Record<string, unknown>;
    const dst = copy as unknown as Record<string, unknown>;
    if (typeof src.rng === "function") dst.rng = src.rng;
    if (src.rngSeed !== undefined) dst.rngSeed = src.rngSeed;
  }
  return copy;
}

function buildRaidLive(raid: RaidCoopState): BattleState {
  const ally =
    raid.subPhase === "allyA" ? raid.allyA : raid.subPhase === "allyB" ? raid.allyB : raid.allyA;
  const turn: BattleState["turn"] = raid.subPhase === "boss" ? "enemy" : "player";
  return {
    player: {
      hp: raid.partyHp,
      shield: raid.partyShield,
      hand: ally.hand,
      field: raid.partyField,
      tokens: raid.partyTokens,
      traps: raid.partyTraps,
      deck: ally.deck,
      graveyard: ally.graveyard,
      ap: 0,
      fatigue: ally.fatigue,
      hasCastSpellThisTurn: false,
    },
    enemy: raid.enemy,
    turn,
    turnPhase: "start",
    phase: "select-action",
    logs: raid.live?.logs ?? [],
    winner: raid.live?.winner ?? null,
    turnNumber: raid.live?.turnNumber ?? 1,
    activeSynergies: { player: [], enemy: [] },
    pendingAction: null,
    rng: raid.rng,
    rngSeed: raid.rngSeed,
    skipPlayerWipeCheck: true,
  };
}

function syncEnemyFromLive(raid: RaidCoopState): void {
  raid.enemy = raid.live.enemy;
}

function syncFatigueFromLive(raid: RaidCoopState): void {
  if (raid.subPhase === "allyA") raid.allyA.fatigue = raid.live.player.fatigue;
  else if (raid.subPhase === "allyB") raid.allyB.fatigue = raid.live.player.fatigue;
}

function syncPartyFromLive(raid: RaidCoopState): void {
  raid.partyHp = raid.live.player.hp;
  raid.partyShield = raid.live.player.shield;
}

function tagRaidOwnerOnPlay(raid: RaidCoopState, prevField: (FieldCard | null)[]): void {
  const owner = raid.subPhase === "allyA" ? "allyA" : "allyB";
  for (let i = 0; i < raid.partyField.length; i++) {
    const prev = prevField[i];
    const next = raid.partyField[i];
    if (!next || prev === next) continue;
    if (!prev || prev.card.id !== next.card.id) {
      next.raidOwner = owner === "allyA" ? "allyA" : "allyB";
    }
  }
}

export function initRaidCoopBattle(
  deckAIds: string[],
  deckBIds: string[],
  boss: RaidBossDefinition,
  seed?: number,
): RaidCoopState {
  const rng = seed !== undefined ? createSeededRng(seed) : Math.random;
  const deckSize = Math.max(10, deckAIds.length);
  const bossDeck = resolveBossDeck(boss, deckSize, seed ?? 90210);
  const a = createPlayerSideFromDeck(deckAIds, rng);
  const b = createPlayerSideFromDeck(deckBIds, rng);
  const en = createPlayerSideFromDeck(bossDeck, rng, { hp: boss.enemyHp, shield: boss.enemyShield });

  const raid: RaidCoopState = {
    partyHp: 50,
    partyShield: 10,
    partyField: [null, null, null, null],
    partyTokens: [null, null],
    partyTraps: [null, null],
    allyA: { hand: a.hand, deck: a.deck, graveyard: a.graveyard, fatigue: a.fatigue },
    allyB: { hand: b.hand, deck: b.deck, graveyard: b.graveyard, fatigue: b.fatigue },
    enemy: en,
    subPhase: "allyA",
    bossId: boss.id,
    bossName: boss.name,
    goldRewardMultiplier: boss.goldRewardMultiplier,
    live: {} as BattleState,
    rng,
    rngSeed: seed,
  };
  raid.live = buildRaidLive(raid);
  raid.live = startTurn(raid.live);
  syncEnemyFromLive(raid);
  syncFatigueFromLive(raid);
  syncPartyFromLive(raid);
  return raid;
}

export function raidGetBattleView(raid: RaidCoopState): BattleState {
  return raid.live;
}

function raidCheckCombinedPartyWipe(raid: RaidCoopState): void {
  const live = raid.live;
  if (live.phase === "game-over") return;
  const aOut = raid.allyA.hand.length === 0 && raid.allyA.deck.length === 0;
  const bOut = raid.allyB.hand.length === 0 && raid.allyB.deck.length === 0;
  const fieldEmpty = !raid.partyField.some(Boolean);
  if (aOut && bOut && fieldEmpty) {
    live.phase = "game-over";
    live.winner = "enemy";
    live.logs.push({
      message: "💀 The party has no cards left! Total wipe!",
      type: "defeat",
      timestamp: live.logs.length,
    });
  }
}

/** Run boss AI until control returns to the party (ally A turn). Player refs point to ally A before boss so post-boss startTurn draws for ally A. */
export function raidRunBossTurn(raid: RaidCoopState): void {
  raid.subPhase = "boss";
  raid.live = buildRaidLive(raid);
  raid.live.player.hand = raid.allyA.hand;
  raid.live.player.deck = raid.allyA.deck;
  raid.live.player.graveyard = raid.allyA.graveyard;
  raid.live.player.fatigue = raid.allyA.fatigue;
  raid.live = startTurn(raid.live);
  syncEnemyFromLive(raid);
  syncPartyFromLive(raid);

  let guard = 0;
  while (raid.live.turn === "enemy" && raid.live.phase !== "game-over" && guard++ < 400) {
    if (raid.live.enemy.ap <= 0) {
      raid.live = endTurn(deepCopyBattle(raid.live));
      syncEnemyFromLive(raid);
      syncPartyFromLive(raid);
      break;
    }
    raid.live = performAITurn(deepCopyBattle(raid.live));
    syncEnemyFromLive(raid);
    syncPartyFromLive(raid);
    if (raid.live.phase === "game-over") return;
    if (raid.live.turn === "player") break;
  }

  if (raid.live.turn === "enemy" && raid.live.phase !== "game-over" && raid.live.enemy.ap <= 0) {
    raid.live = endTurn(deepCopyBattle(raid.live));
    syncEnemyFromLive(raid);
    syncPartyFromLive(raid);
  }

  raid.subPhase = "allyA";
  raidCheckCombinedPartyWipe(raid);
}

export function raidEndCurrentAllyTurn(raid: RaidCoopState): void {
  if (raid.live.phase === "game-over") return;
  if (raid.subPhase !== "allyA" && raid.subPhase !== "allyB") return;

  raid.live = applyEndOfTurnCleanupForActiveSide(deepCopyBattle(raid.live));
  syncPartyFromLive(raid);
  syncFatigueFromLive(raid);
  syncEnemyFromLive(raid);

  if (raid.subPhase === "allyA") {
    raid.subPhase = "allyB";
    raid.live = buildRaidLive(raid);
    raid.live = startTurn(raid.live);
    syncEnemyFromLive(raid);
    syncFatigueFromLive(raid);
    syncPartyFromLive(raid);
    return;
  }

  raidRunBossTurn(raid);
}

function wrap(
  raid: RaidCoopState,
  fn: (s: BattleState) => BattleState,
  prevFieldSnapshot: (FieldCard | null)[],
): void {
  raid.live = fn(deepCopyBattle(raid.live));
  syncPartyFromLive(raid);
  syncFatigueFromLive(raid);
  syncEnemyFromLive(raid);
  tagRaidOwnerOnPlay(raid, prevFieldSnapshot);
  raidCheckCombinedPartyWipe(raid);
}

export function raidPlayCard(raid: RaidCoopState, handIndex: number): void {
  const prev = [...raid.partyField];
  wrap(raid, (s) => playCard(s, handIndex), prev);
}

export function raidEquipWeapon(raid: RaidCoopState, handIndex: number, fieldIndex: number): void {
  const prev = [...raid.partyField];
  wrap(raid, (s) => equipWeapon(s, handIndex, fieldIndex), prev);
}

export function raidCastSpell(raid: RaidCoopState, handIndex: number, targetFieldIndex?: number): void {
  const prev = [...raid.partyField];
  wrap(raid, (s) => castSpell(s, handIndex, targetFieldIndex), prev);
}

export function raidAttack(
  raid: RaidCoopState,
  attackerFieldIndex: number,
  targetFieldIndex: number | "direct",
): void {
  const prev = [...raid.partyField];
  wrap(raid, (s) => attackTarget(s, attackerFieldIndex, targetFieldIndex), prev);
}

export function raidActivateAbility(raid: RaidCoopState, fieldIndex: number): void {
  const prev = [...raid.partyField];
  wrap(raid, (s) => activateAbility(s, fieldIndex), prev);
}

export function raidApplyLockstepIntent(raid: RaidCoopState, intent: BattleLockstepIntent): void {
  switch (intent.kind) {
    case "play-card":
      return raidPlayCard(raid, intent.handIndex);
    case "equip-weapon":
      return raidEquipWeapon(raid, intent.handIndex, intent.fieldIndex);
    case "cast-spell":
      return raidCastSpell(raid, intent.handIndex, intent.targetFieldIndex);
    case "attack":
      return raidAttack(raid, intent.attackerFieldIndex, intent.targetFieldIndex);
    case "ability":
      return raidActivateAbility(raid, intent.fieldIndex);
    case "end-turn":
      return raidEndCurrentAllyTurn(raid);
    default:
      return;
  }
}

/** Deterministic replay for server validation (same order as live actions). */
export function raidReplayFromLog(
  deckAIds: string[],
  deckBIds: string[],
  boss: RaidBossDefinition,
  seed: number,
  log: BattleLockstepIntent[],
): RaidCoopState {
  const raid = initRaidCoopBattle(deckAIds, deckBIds, boss, seed);
  for (const intent of log) {
    if (raid.live.phase === "game-over") break;
    raidApplyLockstepIntent(raid, intent);
  }
  return raid;
}

export function raidPartyWon(raid: RaidCoopState): boolean {
  return raid.live.winner === "player";
}

export function raidBossWon(raid: RaidCoopState): boolean {
  return raid.live.winner === "enemy";
}

export function raidIsDraw(raid: RaidCoopState): boolean {
  return raid.live.winner === "draw";
}

export { getRaidBoss, type RaidBossDefinition };
