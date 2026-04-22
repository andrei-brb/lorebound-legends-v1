// Central registry of mythic hero/god 3D models.
// Keys are `GameCard.id` values from `src/data/mythicCards.ts`.

import godFirePyrahkan from "@/assets/models/mythic/god-fire-pyrahkan.glb";
import godWaterThalassor from "@/assets/models/mythic/god-water-thalassor.glb";
import godNatureSylvarion from "@/assets/models/mythic/god-nature-sylvarion.glb";
import godShadowNoxareth from "@/assets/models/mythic/god-shadow-noxareth.glb";
import godLightAurelia from "@/assets/models/mythic/god-light-aurelia.glb";
import godNeutralEquilix from "@/assets/models/mythic/god-neutral-equilix.glb";

import heroFireVyraka from "@/assets/models/mythic/hero-fire-vyraka.glb";
import heroWaterMarenthil from "@/assets/models/mythic/hero-water-marenthil.glb";
import heroNatureThalwen from "@/assets/models/mythic/hero-nature-thalwen.glb";
import heroShadowVexar from "@/assets/models/mythic/hero-shadow-vexar.glb";
import heroLightSeraphine from "@/assets/models/mythic/hero-light-seraphine.glb";
import heroNeutralKaidran from "@/assets/models/mythic/hero-neutral-kaidran.glb";

export const mythicModelUrlByCardId: Readonly<Record<string, string>> = Object.freeze({
  "myth-pyrahkan": godFirePyrahkan,
  "myth-thalassor": godWaterThalassor,
  "myth-sylvarion": godNatureSylvarion,
  "myth-noxareth": godShadowNoxareth,
  "myth-aurelia": godLightAurelia,
  "myth-equilix": godNeutralEquilix,

  "myth-vyraka": heroFireVyraka,
  "myth-marenthil": heroWaterMarenthil,
  "myth-thalwen": heroNatureThalwen,
  "myth-vexar": heroShadowVexar,
  "myth-seraphine": heroLightSeraphine,
  "myth-kaidran": heroNeutralKaidran,
});

export function getMythicModelUrl(cardId: string): string | undefined {
  return mythicModelUrlByCardId[cardId];
}

