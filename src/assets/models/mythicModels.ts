// Central registry of mythic hero/god 3D models.
// Keys are `GameCard.id` values from `src/data/mythicCards.ts`.
// Values are CDN paths (no bundling/importing of GLBs).

function cdnBase(): string {
  const base = import.meta.env?.VITE_MODEL_CDN_BASE_URL as string | undefined;
  return (base ?? "").replace(/\/+$/, "");
}

function toUrl(path: string): string {
  const base = cdnBase();
  return base ? `${base}/${path.replace(/^\/+/, "")}` : `/${path.replace(/^\/+/, "")}`;
}

export const mythicModelUrlByCardId: Readonly<Record<string, string>> = Object.freeze({
  "myth-pyrahkan": toUrl("models/mythic/god-fire-pyrahkan.glb"),
  "myth-thalassor": toUrl("models/mythic/god-water-thalassor.glb"),
  "myth-sylvarion": toUrl("models/mythic/god-nature-sylvarion.glb"),
  "myth-noxareth": toUrl("models/mythic/god-shadow-noxareth.glb"),
  "myth-aurelia": toUrl("models/mythic/god-light-aurelia.glb"),
  "myth-equilix": toUrl("models/mythic/god-neutral-equilix.glb"),

  "myth-vyraka": toUrl("models/mythic/hero-fire-vyraka.glb"),
  "myth-marenthil": toUrl("models/mythic/hero-water-marenthil.glb"),
  "myth-thalwen": toUrl("models/mythic/hero-nature-thalwen.glb"),
  "myth-vexar": toUrl("models/mythic/hero-shadow-vexar.glb"),
  "myth-seraphine": toUrl("models/mythic/hero-light-seraphine.glb"),
  "myth-kaidran": toUrl("models/mythic/hero-neutral-kaidran.glb"),
});

export function getMythicModelUrl(cardId: string): string | undefined {
  return mythicModelUrlByCardId[cardId];
}

