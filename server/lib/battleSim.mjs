import { getCardRarity } from "./gameLogic.mjs";

export function createSeededRng(seed) {
  let t = (Number(seed) || 0) >>> 0;
  return () => {
    t += 0x6D2B79F5;
    let x = t;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

function cardPower(cardId) {
  const r = getCardRarity(cardId);
  if (r === "legendary") return 3;
  if (r === "rare") return 2;
  return 1;
}

function deckPower(deckIds) {
  return (deckIds || []).reduce((sum, id) => sum + cardPower(String(id)), 0);
}

/**
 * Server-authoritative deterministic battle resolution.
 *
 * NOTE: This is a simplified simulation (rarity-based) designed to be:
 * - deterministic by seed
 * - cheap to compute on the server
 * - good enough for ranked async while the full battle engine is iterated
 */
export function simulateBattle({ deckA, deckB, seed }) {
  const rng = createSeededRng(seed ?? 12345);
  const powA = deckPower(deckA);
  const powB = deckPower(deckB);

  // Add a small deterministic variance so mirrors aren't always ties.
  const rollA = (rng() - 0.5) * 2; // [-1,1]
  const rollB = (rng() - 0.5) * 2;

  const scoreA = powA + rollA;
  const scoreB = powB + rollB;

  const turnCount = 6 + Math.floor(rng() * 10); // 6..15

  if (Math.abs(scoreA - scoreB) < 0.15) {
    return { winner: "draw", turnCount, scoreA, scoreB, powA, powB };
  }
  return scoreA > scoreB
    ? { winner: "A", turnCount, scoreA, scoreB, powA, powB }
    : { winner: "B", turnCount, scoreA, scoreB, powA, powB };
}

