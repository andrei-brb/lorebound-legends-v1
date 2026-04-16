import boardMossyHearth from "@/assets/battlepass/board-mossy-hearth.jpg";
import boardRunedGarden from "@/assets/battlepass/board-runed-garden.jpg";
import frameBloomAura from "@/assets/battlepass/frame-bloom-aura.jpg";
import borderEternalBloom from "@/assets/battlepass/border-eternal-bloom.jpg";
import cardbackBloomCrest from "@/assets/battlepass/cardback-bloom-crest.jpg";
import cardbackBloomInferno from "@/assets/battlepass/cardback-bloom-inferno.jpg";

import s02Banner from "@/assets/battlepass/season-02/banner.jpg";
import s02Free05 from "@/assets/battlepass/season-02/free-05.jpg";
import s02Free15 from "@/assets/battlepass/season-02/free-15.jpg";
import s02Free25 from "@/assets/battlepass/season-02/free-25.jpg";
import s02Free30 from "@/assets/battlepass/season-02/free-30.jpg";
import s02Elite05 from "@/assets/battlepass/season-02/elite-05.jpg";
import s02Elite15 from "@/assets/battlepass/season-02/elite-15.jpg";
import s02Elite25 from "@/assets/battlepass/season-02/elite-25.jpg";
import s02Elite30 from "@/assets/battlepass/season-02/elite-30.jpg";

import s03Banner from "@/assets/battlepass/season-03/banner.jpg";
import s03Free05 from "@/assets/battlepass/season-03/free-05.jpg";
import s03Free15 from "@/assets/battlepass/season-03/free-15.jpg";
import s03Free25 from "@/assets/battlepass/season-03/free-25.jpg";
import s03Free30 from "@/assets/battlepass/season-03/free-30.jpg";
import s03Elite05 from "@/assets/battlepass/season-03/elite-05.jpg";
import s03Elite15 from "@/assets/battlepass/season-03/elite-15.jpg";
import s03Elite25 from "@/assets/battlepass/season-03/elite-25.jpg";
import s03Elite30 from "@/assets/battlepass/season-03/elite-30.jpg";

export type CosmeticType = "board_skin" | "card_frame" | "card_back" | "border" | "title" | "emote";

export interface Cosmetic {
  id: string;
  type: CosmeticType;
  name: string;
  seasonId?: "season-01" | "season-02" | "season-03";
  image?: string;
}

export const COSMETICS: Cosmetic[] = [
  // Season 1 — Bloom
  { id: "board_mossy_hearth", type: "board_skin", name: "Mossy Hearth", seasonId: "season-01", image: boardMossyHearth },
  { id: "board_runed_garden", type: "board_skin", name: "Runed Garden", seasonId: "season-01", image: boardRunedGarden },
  { id: "frame_bloom_aura", type: "card_frame", name: "Bloom Aura", seasonId: "season-01", image: frameBloomAura },
  { id: "border_eternal_bloom", type: "border", name: "Eternal Bloom", seasonId: "season-01", image: borderEternalBloom },
  { id: "cardback_bloom_crest", type: "card_back", name: "Bloom Crest", seasonId: "season-01", image: cardbackBloomCrest },
  { id: "cardback_bloom_inferno", type: "card_back", name: "Bloom Inferno", seasonId: "season-01", image: cardbackBloomInferno },
  { id: "title_bloomwalker", type: "title", name: "Bloomwalker", seasonId: "season-01" },
  { id: "emote_petal_storm", type: "emote", name: "Petal Storm", seasonId: "season-01" },

  // Season 2 — Veil of Lunara
  { id: "banner_season_02", type: "board_skin", name: "Veil of Lunara Banner", seasonId: "season-02", image: s02Banner },
  { id: "cardback_lunar_sigil", type: "card_back", name: "Lunar Sigil", seasonId: "season-02", image: s02Free05 },
  { id: "cardback_eclipse_veil", type: "card_back", name: "Eclipse Veil", seasonId: "season-02", image: s02Elite05 },
  { id: "title_lunarbound", type: "title", name: "Lunarbound", seasonId: "season-02", image: s02Free15 },
  { id: "board_moonlit_shrine", type: "board_skin", name: "Moonlit Shrine", seasonId: "season-02", image: s02Elite15 },
  { id: "emote_moonbeam", type: "emote", name: "Moonbeam", seasonId: "season-02", image: s02Free25 },
  { id: "border_astral_crescent", type: "border", name: "Astral Crescent", seasonId: "season-02", image: s02Elite25 },
  { id: "frame_lunar_halo", type: "card_frame", name: "Lunar Halo", seasonId: "season-02", image: s02Free30 },
  { id: "variant_celestial_lunara", type: "card_frame", name: "Celestial Lunara (Variant)", seasonId: "season-02", image: s02Elite30 },

  // Season 3 — Crown of Storms
  { id: "banner_season_03", type: "board_skin", name: "Crown of Storms Banner", seasonId: "season-03", image: s03Banner },
  { id: "cardback_stormcrest", type: "card_back", name: "Stormcrest", seasonId: "season-03", image: s03Free05 },
  { id: "cardback_voltaic_edge", type: "card_back", name: "Voltaic Edge", seasonId: "season-03", image: s03Elite05 },
  { id: "title_stormcaller", type: "title", name: "Stormcaller", seasonId: "season-03", image: s03Free15 },
  { id: "board_lightning_spire", type: "board_skin", name: "Lightning Spire Arena", seasonId: "season-03", image: s03Elite15 },
  { id: "emote_lightning_strike", type: "emote", name: "Lightning Strike", seasonId: "season-03", image: s03Free25 },
  { id: "border_thunderborn", type: "border", name: "Thunderborn", seasonId: "season-03", image: s03Elite25 },
  { id: "frame_tempest_crown", type: "card_frame", name: "Tempest Crown", seasonId: "season-03", image: s03Free30 },
  { id: "variant_ascended_tempesta", type: "card_frame", name: "Ascended Tempesta (Variant)", seasonId: "season-03", image: s03Elite30 },
];

export function getCosmeticById(id: string): Cosmetic | undefined {
  return COSMETICS.find((c) => c.id === id);
}

