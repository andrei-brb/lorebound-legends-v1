import { allCards, type GameCard, type Rarity, type CardType, loreArcs } from "./cards";
import { allSeasonalCards } from "./seasonalCards";

export { type GameCard, type Rarity, type CardType, loreArcs };

/** Base cards + seasonal/event cards. */
export const allGameCards: GameCard[] = [...allCards, ...allSeasonalCards];

export function getCardById(id: string): GameCard | undefined {
  return allGameCards.find((c) => c.id === id);
}

