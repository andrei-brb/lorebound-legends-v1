/**
 * Central season / event rules (Phase E). Apply in one place; do not duplicate strings in card text.
 * Example: { id: "bloom-week", tag: "nature", attackMult: 1.1, defenseMult: 1.1 }
 */
export type SeasonalModifier = {
  id: string;
  name: string;
  /** Tag on cards that receive the bonus */
  tag?: string;
  attackMult?: number;
  defenseMult?: number;
};

export const ACTIVE_SEASONAL_MODIFIERS: SeasonalModifier[] = [];
