// Central registry of legendary hero/god 3D models.
// Keep keys aligned with `GameCard.id` strings.

import aegisStormShield from "@/assets/models/legendary/aegis-storm-shield.glb";
import ascendedTempesta from "@/assets/models/legendary/ascended-tempesta.glb";
import bloomMother from "@/assets/models/legendary/bloom-mother.glb";
import bpCelestialSolara from "@/assets/models/legendary/bp-celestial-solara.glb";
import bpPyralisBloomKnight from "@/assets/models/legendary/bp-pyralis-bloom-knight.glb";
import bpSolaraBloomEmpress from "@/assets/models/legendary/bp-solara-bloom-empress.glb";
import bpThornweaver from "@/assets/models/legendary/bp-thornweaver.glb";
import bpVerdantSprout from "@/assets/models/legendary/bp-verdant-sprout.glb";
import celestialLunara from "@/assets/models/legendary/celestial-lunara.glb";
import chronos from "@/assets/models/legendary/chronos.glb";
import fireDragon from "@/assets/models/legendary/fire-dragon.glb";
import gaiara from "@/assets/models/legendary/gaiara.glb";
import infernalPhoenix from "@/assets/models/legendary/infernal-phoenix.glb";
import kaelenStormKnight from "@/assets/models/legendary/kaelen-storm-knight.glb";
import lunaraVeilEmpress from "@/assets/models/legendary/lunara-veil-empress.glb";
import moonGoddess from "@/assets/models/legendary/moon-goddess.glb";
import moonpetalFawn from "@/assets/models/legendary/moonpetal-fawn.glb";
import nyxMoonAssassin from "@/assets/models/legendary/nyx-moon-assassin.glb";
import nyx from "@/assets/models/legendary/nyx.glb";
import pyrothos from "@/assets/models/legendary/pyrothos.glb";
import selenesWarden from "@/assets/models/legendary/selenes-warden.glb";
import shadowWraithKing from "@/assets/models/legendary/shadow-wraith-king.glb";
import solarius from "@/assets/models/legendary/solarius.glb";
import stormGod from "@/assets/models/legendary/storm-god.glb";
import tempestaStormSovereign from "@/assets/models/legendary/tempesta-storm-sovereign.glb";
import thalassia from "@/assets/models/legendary/thalassia.glb";
import thanatos from "@/assets/models/legendary/thanatos.glb";
import thunderlingScout from "@/assets/models/legendary/thunderling-scout.glb";
import warriorKing from "@/assets/models/legendary/warrior-king.glb";

export const legendaryModelUrlByCardId: Readonly<Record<string, string>> = Object.freeze({
  "aegis-storm-shield": aegisStormShield,
  "ascended-tempesta": ascendedTempesta,
  "bloom-mother": bloomMother,
  "bp-celestial-solara": bpCelestialSolara,
  "bp-pyralis-bloom-knight": bpPyralisBloomKnight,
  "bp-solara-bloom-empress": bpSolaraBloomEmpress,
  "bp-thornweaver": bpThornweaver,
  "bp-verdant-sprout": bpVerdantSprout,
  "celestial-lunara": celestialLunara,
  chronos,
  "fire-dragon": fireDragon,
  gaiara,
  "infernal-phoenix": infernalPhoenix,
  "kaelen-storm-knight": kaelenStormKnight,
  "lunara-veil-empress": lunaraVeilEmpress,
  "moon-goddess": moonGoddess,
  "moonpetal-fawn": moonpetalFawn,
  "nyx-moon-assassin": nyxMoonAssassin,
  nyx,
  pyrothos,
  "selenes-warden": selenesWarden,
  "shadow-wraith-king": shadowWraithKing,
  solarius,
  "storm-god": stormGod,
  "tempesta-storm-sovereign": tempestaStormSovereign,
  thalassia,
  thanatos,
  "thunderling-scout": thunderlingScout,
  "warrior-king": warriorKing,
});

export function getLegendaryModelUrl(cardId: string): string | undefined {
  return legendaryModelUrlByCardId[cardId];
}

