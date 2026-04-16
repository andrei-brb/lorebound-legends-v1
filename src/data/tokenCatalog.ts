import skeletonWarriorImg from "@/assets/cards/skeleton-warrior.jpg";
import wolfCompanionImg from "@/assets/cards/wolf-companion.jpg";
import direWolfImg from "@/assets/cards/dire-wolf.jpg";
import forestSpriteImg from "@/assets/cards/forest-sprite.jpg";
import ravenFlockImg from "@/assets/cards/raven-flock.jpg";
import { TOKEN_STATS, type TokenStats } from "./tokenDefinitions";

export type TokenDefinition = TokenStats & { image: string };

const IMAGES: Record<string, string> = {
  "skeleton-warrior": skeletonWarriorImg,
  "wolf-companion": wolfCompanionImg,
  "dire-wolf": direWolfImg,
  "forest-sprite": forestSpriteImg,
  "raven-flock": ravenFlockImg,
};

export const TOKEN_CATALOG: Record<string, TokenDefinition> = Object.fromEntries(
  Object.entries(TOKEN_STATS).map(([id, s]) => [id, { ...s, image: IMAGES[id]! }]),
);

export { TOKEN_IDS } from "./tokenDefinitions";
