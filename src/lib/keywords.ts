/**
 * Keyword handlers (Phase C). Wired in battleEngine (attackTarget, startTurn, endTurn).
 */
export type BattleKeywordId = "taunt" | "lifesteal" | "poison";

export const KEYWORD_DESCRIPTIONS: Record<BattleKeywordId, string> = {
  taunt: "Enemies must target this unit while taunt is active.",
  lifesteal: "Heal for damage dealt by attacks (and direct).",
  poison: "Damage at the start of this unit's controller's turn.",
};

export function cardHasKeyword(card: { keywords?: BattleKeywordId[] } | null | undefined, k: BattleKeywordId): boolean {
  return !!card?.keywords?.includes(k);
}
