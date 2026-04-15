// Elemental Weakness Triangle:
// Fire > Nature > Shadow > Fire
// Water > Fire > Nature > Water (secondary)
// Light > Shadow > Light (mutual weakness)
// Neutral has no advantages or disadvantages

export type Element = "fire" | "water" | "nature" | "shadow" | "light" | "neutral";

// Returns damage multiplier: 1.3 = advantage, 0.7 = disadvantage, 1.0 = neutral
const advantageMap: Record<Element, Element[]> = {
  fire: ["nature"],
  nature: ["shadow", "water"],
  shadow: ["fire", "light"],
  water: ["fire"],
  light: ["shadow"],
  neutral: [],
};

export function getElementMultiplier(attackerElement: Element, defenderElement: Element): number {
  if (attackerElement === "neutral" || defenderElement === "neutral") return 1.0;
  if (advantageMap[attackerElement]?.includes(defenderElement)) return 1.3;
  if (advantageMap[defenderElement]?.includes(attackerElement)) return 0.7;
  return 1.0;
}

export function getElementAdvantageLabel(attackerElement: Element, defenderElement: Element): string | null {
  const mult = getElementMultiplier(attackerElement, defenderElement);
  if (mult > 1) return "Super Effective!";
  if (mult < 1) return "Not Very Effective...";
  return null;
}

export const elementColors: Record<Element, string> = {
  fire: "hsl(15, 90%, 55%)",
  water: "hsl(210, 80%, 55%)",
  nature: "hsl(130, 60%, 45%)",
  shadow: "hsl(270, 50%, 45%)",
  light: "hsl(45, 90%, 60%)",
  neutral: "hsl(230, 10%, 55%)",
};

export const elementEmoji: Record<Element, string> = {
  fire: "🔥",
  water: "💧",
  nature: "🌿",
  shadow: "🌑",
  light: "☀️",
  neutral: "⚪",
};

export const elementCssClass: Record<Element, string> = {
  fire: "text-element-fire",
  water: "text-element-water",
  nature: "text-element-nature",
  shadow: "text-element-shadow",
  light: "text-element-light",
  neutral: "text-muted-foreground",
};

export const elementBgClass: Record<Element, string> = {
  fire: "bg-element-fire/20 border-element-fire/40",
  water: "bg-element-water/20 border-element-water/40",
  nature: "bg-element-nature/20 border-element-nature/40",
  shadow: "bg-element-shadow/20 border-element-shadow/40",
  light: "bg-element-light/20 border-element-light/40",
  neutral: "bg-muted/20 border-muted/40",
};

// Infer element from card tags
export function inferElementFromTags(tags: string[]): Element {
  const tagSet = new Set(tags.map(t => t.toLowerCase()));
  if (tagSet.has("fire") || tagSet.has("flame") || tagSet.has("infernal") || tagSet.has("lava") || tagSet.has("phoenix")) return "fire";
  if (tagSet.has("water") || tagSet.has("ocean") || tagSet.has("sea") || tagSet.has("ice") || tagSet.has("frost") || tagSet.has("tidal") || tagSet.has("coral")) return "water";
  if (tagSet.has("nature") || tagSet.has("forest") || tagSet.has("earth") || tagSet.has("vine") || tagSet.has("beast") || tagSet.has("druid") || tagSet.has("verdant")) return "nature";
  if (tagSet.has("shadow") || tagSet.has("dark") || tagSet.has("void") || tagSet.has("death") || tagSet.has("undead") || tagSet.has("necro") || tagSet.has("phantom")) return "shadow";
  if (tagSet.has("light") || tagSet.has("divine") || tagSet.has("solar") || tagSet.has("holy") || tagSet.has("celestial") || tagSet.has("radiant") || tagSet.has("lunar")) return "light";
  if (tagSet.has("storm") || tagSet.has("wind") || tagSet.has("lightning") || tagSet.has("thunder")) return "nature"; // storm → nature
  if (tagSet.has("warrior") || tagSet.has("forge") || tagSet.has("iron") || tagSet.has("metal") || tagSet.has("stone")) return "neutral";
  return "neutral";
}
