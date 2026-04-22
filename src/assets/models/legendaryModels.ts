// Central registry of legendary hero/god 3D models.
// Keys align with `GameCard.id`. Values are CDN paths (no bundling/importing of GLBs).

function cdnBase(): string {
  // Vite will inline `import.meta.env.*` at build time.
  const base = (import.meta as any).env?.VITE_MODEL_CDN_BASE_URL as string | undefined;
  return (base ?? "").replace(/\/+$/, "");
}

function toUrl(path: string): string {
  const base = cdnBase();
  return base ? `${base}/${path.replace(/^\/+/, "")}` : `/${path.replace(/^\/+/, "")}`;
}

export const legendaryModelUrlByCardId: Readonly<Record<string, string>> = Object.freeze({
  "aegis-storm-shield": toUrl("models/legendary/aegis-storm-shield.glb"),
  "ascended-tempesta": toUrl("models/legendary/ascended-tempesta.glb"),
  "bloom-mother": toUrl("models/legendary/bloom-mother.glb"),
  "bp-celestial-solara": toUrl("models/legendary/bp-celestial-solara.glb"),
  "bp-pyralis-bloom-knight": toUrl("models/legendary/bp-pyralis-bloom-knight.glb"),
  "bp-solara-bloom-empress": toUrl("models/legendary/bp-solara-bloom-empress.glb"),
  "bp-thornweaver": toUrl("models/legendary/bp-thornweaver.glb"),
  "bp-verdant-sprout": toUrl("models/legendary/bp-verdant-sprout.glb"),
  "celestial-lunara": toUrl("models/legendary/celestial-lunara.glb"),
  chronos: toUrl("models/legendary/chronos.glb"),
  "fire-dragon": toUrl("models/legendary/fire-dragon.glb"),
  gaiara: toUrl("models/legendary/gaiara.glb"),
  "infernal-phoenix": toUrl("models/legendary/infernal-phoenix.glb"),
  "kaelen-storm-knight": toUrl("models/legendary/kaelen-storm-knight.glb"),
  "lunara-veil-empress": toUrl("models/legendary/lunara-veil-empress.glb"),
  "moon-goddess": toUrl("models/legendary/moon-goddess.glb"),
  "moonpetal-fawn": toUrl("models/legendary/moonpetal-fawn.glb"),
  "nyx-moon-assassin": toUrl("models/legendary/nyx-moon-assassin.glb"),
  nyx: toUrl("models/legendary/nyx.glb"),
  pyrothos: toUrl("models/legendary/pyrothos.glb"),
  "selenes-warden": toUrl("models/legendary/selenes-warden.glb"),
  "shadow-wraith-king": toUrl("models/legendary/shadow-wraith-king.glb"),
  solarius: toUrl("models/legendary/solarius.glb"),
  "storm-god": toUrl("models/legendary/storm-god.glb"),
  "tempesta-storm-sovereign": toUrl("models/legendary/tempesta-storm-sovereign.glb"),
  thalassia: toUrl("models/legendary/thalassia.glb"),
  thanatos: toUrl("models/legendary/thanatos.glb"),
  "thunderling-scout": toUrl("models/legendary/thunderling-scout.glb"),
  "warrior-king": toUrl("models/legendary/warrior-king.glb"),
});

export function getLegendaryModelUrl(cardId: string): string | undefined {
  return legendaryModelUrlByCardId[cardId];
}

