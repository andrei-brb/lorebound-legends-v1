/**
 * Battle Pass: season-switchable track data.
 * Assets live under src/assets/battlepass/ (season-02, season-03) and root bloom files for S1.
 */

/* ─── Season 1 — Bloom (existing art) ─── */
import heroVerdantSprout from "@/assets/battlepass/hero-verdant-sprout.jpg";
import heroThornweaver from "@/assets/battlepass/hero-thornweaver.jpg";
import heroPyralis from "@/assets/battlepass/hero-pyralis.jpg";
import heroSolara from "@/assets/battlepass/hero-solara.jpg";
import heroCelestialSolara from "@/assets/battlepass/hero-celestial-solara.jpg";
import cardbackBloomCrest from "@/assets/battlepass/cardback-bloom-crest.jpg";
import cardbackBloomInferno from "@/assets/battlepass/cardback-bloom-inferno.jpg";
import boardRunedGarden from "@/assets/battlepass/board-runed-garden.jpg";
import boardMossyHearth from "@/assets/battlepass/board-mossy-hearth.jpg";
import frameBloomAura from "@/assets/battlepass/frame-bloom-aura.jpg";
import borderEternalBloom from "@/assets/battlepass/border-eternal-bloom.jpg";

/* ─── Season 2 — Veil of Lunara ─── */
import s02Banner from "@/assets/battlepass/season-02/banner.jpg";
import s02Free05 from "@/assets/battlepass/season-02/free-05.jpg";
import s02Free10 from "@/assets/battlepass/season-02/free-10.jpg";
import s02Free15 from "@/assets/battlepass/season-02/free-15.jpg";
import s02Free20 from "@/assets/battlepass/season-02/free-20.jpg";
import s02Free25 from "@/assets/battlepass/season-02/free-25.jpg";
import s02Free30 from "@/assets/battlepass/season-02/free-30.jpg";
import s02Elite05 from "@/assets/battlepass/season-02/elite-05.jpg";
import s02Elite10 from "@/assets/battlepass/season-02/elite-10.jpg";
import s02Elite15 from "@/assets/battlepass/season-02/elite-15.jpg";
import s02Elite20 from "@/assets/battlepass/season-02/elite-20.jpg";
import s02Elite25 from "@/assets/battlepass/season-02/elite-25.jpg";
import s02Elite30 from "@/assets/battlepass/season-02/elite-30.jpg";

/* ─── Season 3 — Crown of Storms ─── */
import s03Banner from "@/assets/battlepass/season-03/banner.jpg";
import s03Free05 from "@/assets/battlepass/season-03/free-05.jpg";
import s03Free10 from "@/assets/battlepass/season-03/free-10.jpg";
import s03Free15 from "@/assets/battlepass/season-03/free-15.jpg";
import s03Free20 from "@/assets/battlepass/season-03/free-20.jpg";
import s03Free25 from "@/assets/battlepass/season-03/free-25.jpg";
import s03Free30 from "@/assets/battlepass/season-03/free-30.jpg";
import s03Elite05 from "@/assets/battlepass/season-03/elite-05.jpg";
import s03Elite10 from "@/assets/battlepass/season-03/elite-10.jpg";
import s03Elite15 from "@/assets/battlepass/season-03/elite-15.jpg";
import s03Elite20 from "@/assets/battlepass/season-03/elite-20.jpg";
import s03Elite25 from "@/assets/battlepass/season-03/elite-25.jpg";
import s03Elite30 from "@/assets/battlepass/season-03/elite-30.jpg";

export type RewardKind =
  | "gold"
  | "dust"
  | "xp_boost"
  | "bronze_pack"
  | "silver_pack"
  | "gold_pack"
  | "hero"
  | "card_back"
  | "title"
  | "emote"
  | "board_skin"
  | "border"
  | "card_frame"
  | "hero_variant"
  | "crafting_mats";

export interface Reward {
  kind: RewardKind;
  label: string;
  amount?: number;
  seasonal?: boolean;
  rarity?: "common" | "rare" | "legendary";
  image?: string;
  // Real grant targets
  cardId?: string;
  cosmeticId?: string;
  packId?: "bronze" | "silver" | "gold";
  xpBoostMinutes?: number;
}

export interface LevelRewards {
  level: number;
  free: Reward;
  elite: Reward;
}

export interface BattlePassSeasonDefinition {
  id: "season-01" | "season-02" | "season-03";
  title: string;
  emoji?: string;
  subtitle: string;
  banner?: string;
  passData: LevelRewards[];
}

/** Filler rows between milestones — same economy as Season of the Bloom (repeatable per season). */
const FILL = {
  1: {
    free: { kind: "board_skin" as const, label: "Mossy Hearth", image: boardMossyHearth },
    elite: { kind: "gold" as const, label: "400 Gold", amount: 400 },
  },
  2: {
    free: { kind: "dust" as const, label: "50 Dust", amount: 50 },
    elite: { kind: "dust" as const, label: "100 Dust", amount: 100 },
  },
  3: {
    free: { kind: "gold" as const, label: "300 Gold", amount: 300 },
    elite: { kind: "gold" as const, label: "600 Gold", amount: 600 },
  },
  4: {
    free: { kind: "dust" as const, label: "75 Dust", amount: 75 },
    elite: { kind: "dust" as const, label: "150 Dust", amount: 150 },
  },
  6: {
    free: { kind: "xp_boost" as const, label: "2x XP (1hr)" },
    elite: { kind: "gold_pack" as const, label: "Gold Pack" },
  },
  7: {
    free: { kind: "gold" as const, label: "400 Gold", amount: 400 },
    elite: { kind: "gold" as const, label: "500 Gold", amount: 500 },
  },
  8: {
    free: { kind: "bronze_pack" as const, label: "Bronze Pack" },
    elite: { kind: "dust" as const, label: "200 Dust", amount: 200 },
  },
  9: {
    free: { kind: "dust" as const, label: "100 Dust", amount: 100 },
    elite: { kind: "xp_boost" as const, label: "2x XP (2hr)" },
  },
  11: {
    free: { kind: "gold" as const, label: "500 Gold", amount: 500 },
    elite: { kind: "gold_pack" as const, label: "Gold Pack" },
  },
  12: {
    free: { kind: "dust" as const, label: "125 Dust", amount: 125 },
    elite: { kind: "dust" as const, label: "300 Dust", amount: 300 },
  },
  13: {
    free: { kind: "xp_boost" as const, label: "2x XP (1hr)" },
    elite: { kind: "crafting_mats" as const, label: "Crafting Mats" },
  },
  14: {
    free: { kind: "gold" as const, label: "600 Gold", amount: 600 },
    elite: { kind: "gold_pack" as const, label: "Gold Pack" },
  },
  16: {
    free: { kind: "silver_pack" as const, label: "Silver Pack" },
    elite: { kind: "gold" as const, label: "800 Gold", amount: 800 },
  },
  17: {
    free: { kind: "gold" as const, label: "700 Gold", amount: 700 },
    elite: { kind: "gold_pack" as const, label: "Gold Pack" },
  },
  18: {
    free: { kind: "dust" as const, label: "150 Dust", amount: 150 },
    elite: { kind: "dust" as const, label: "400 Dust", amount: 400 },
  },
  19: {
    free: { kind: "gold" as const, label: "800 Gold", amount: 800 },
    elite: { kind: "gold" as const, label: "1200 Gold", amount: 1200 },
  },
  21: {
    free: { kind: "gold" as const, label: "900 Gold", amount: 900 },
    elite: { kind: "gold_pack" as const, label: "Gold Pack" },
  },
  22: {
    free: { kind: "dust" as const, label: "175 Dust", amount: 175 },
    elite: { kind: "dust" as const, label: "500 Dust", amount: 500 },
  },
  23: {
    free: { kind: "bronze_pack" as const, label: "Bronze Pack" },
    elite: { kind: "gold_pack" as const, label: "Gold Pack" },
  },
  24: {
    free: { kind: "gold" as const, label: "1000 Gold", amount: 1000 },
    elite: { kind: "gold" as const, label: "1500 Gold", amount: 1500 },
  },
  26: {
    free: { kind: "silver_pack" as const, label: "Silver Pack" },
    elite: { kind: "gold_pack" as const, label: "Gold Pack" },
  },
  27: {
    free: { kind: "gold" as const, label: "1100 Gold", amount: 1100 },
    elite: { kind: "gold" as const, label: "1800 Gold", amount: 1800 },
  },
  28: {
    free: { kind: "dust" as const, label: "200 Dust", amount: 200 },
    elite: { kind: "dust" as const, label: "600 Dust", amount: 600 },
  },
  29: {
    free: { kind: "silver_pack" as const, label: "Silver Pack" },
    elite: { kind: "gold_pack" as const, label: "Gold Pack" },
  },
} satisfies Record<number, { free: Reward; elite: Reward }>;

function buildPass(
  milestones: Record<5 | 10 | 15 | 20 | 25 | 30, { free: Reward; elite: Reward }>
): LevelRewards[] {
  const levels: LevelRewards[] = [];
  for (let lvl = 1; lvl <= 30; lvl++) {
    const m = milestones[lvl as keyof typeof milestones];
    if (m) {
      levels.push({ level: lvl, free: m.free, elite: m.elite });
    } else {
      const f = FILL[lvl as keyof typeof FILL];
      levels.push({ level: lvl, free: f.free, elite: f.elite });
    }
  }
  return levels;
}

const PASS_SEASON_01: LevelRewards[] = [
  { level: 1, ...FILL[1] },
  { level: 2, ...FILL[2] },
  { level: 3, ...FILL[3] },
  { level: 4, ...FILL[4] },
  {
    level: 5,
    free: { kind: "card_back", label: "Bloom Crest", seasonal: true, rarity: "legendary", image: cardbackBloomCrest, cosmeticId: "cardback_bloom_crest" },
    elite: { kind: "card_back", label: "Bloom Inferno", seasonal: true, rarity: "legendary", image: cardbackBloomInferno, cosmeticId: "cardback_bloom_inferno" },
  },
  { level: 6, ...FILL[6] },
  { level: 7, ...FILL[7] },
  { level: 8, ...FILL[8] },
  { level: 9, ...FILL[9] },
  {
    level: 10,
    free: { kind: "hero", label: "Verdant Sprout", seasonal: true, rarity: "legendary", image: heroVerdantSprout, cardId: "bp-verdant-sprout" },
    elite: { kind: "hero", label: "Pyralis, Bloom Knight", seasonal: true, rarity: "legendary", image: heroPyralis, cardId: "bp-pyralis-bloom-knight" },
  },
  { level: 11, ...FILL[11] },
  { level: 12, ...FILL[12] },
  { level: 13, ...FILL[13] },
  { level: 14, ...FILL[14] },
  {
    level: 15,
    free: { kind: "title", label: "Bloomwalker", seasonal: true, rarity: "legendary", cosmeticId: "title_bloomwalker" },
    elite: { kind: "board_skin", label: "Runed Garden", seasonal: true, rarity: "legendary", image: boardRunedGarden, cosmeticId: "board_runed_garden" },
  },
  { level: 16, ...FILL[16] },
  { level: 17, ...FILL[17] },
  { level: 18, ...FILL[18] },
  { level: 19, ...FILL[19] },
  {
    level: 20,
    free: { kind: "hero", label: "Thornweaver", seasonal: true, rarity: "legendary", image: heroThornweaver, cardId: "bp-thornweaver" },
    elite: { kind: "hero", label: "Solara, Bloom Empress", seasonal: true, rarity: "legendary", image: heroSolara, cardId: "bp-solara-bloom-empress" },
  },
  { level: 21, ...FILL[21] },
  { level: 22, ...FILL[22] },
  { level: 23, ...FILL[23] },
  { level: 24, ...FILL[24] },
  {
    level: 25,
    free: { kind: "emote", label: "Petal Storm", seasonal: true, rarity: "legendary", cosmeticId: "emote_petal_storm" },
    elite: { kind: "border", label: "Eternal Bloom", seasonal: true, rarity: "legendary", image: borderEternalBloom, cosmeticId: "border_eternal_bloom" },
  },
  { level: 26, ...FILL[26] },
  { level: 27, ...FILL[27] },
  { level: 28, ...FILL[28] },
  { level: 29, ...FILL[29] },
  {
    level: 30,
    free: { kind: "card_frame", label: "Bloom Aura", seasonal: true, rarity: "legendary", image: frameBloomAura, cosmeticId: "frame_bloom_aura" },
    elite: { kind: "hero_variant", label: "Celestial Solara", seasonal: true, rarity: "legendary", image: heroCelestialSolara, cardId: "bp-celestial-solara" },
  },
];

const PASS_SEASON_02 = buildPass({
  5: {
    free: { kind: "card_back", label: "Lunar Sigil", seasonal: true, rarity: "legendary", image: s02Free05, cosmeticId: "cardback_lunar_sigil" },
    elite: { kind: "card_back", label: "Eclipse Veil", seasonal: true, rarity: "legendary", image: s02Elite05, cosmeticId: "cardback_eclipse_veil" },
  },
  10: {
    free: { kind: "hero", label: "Moonpetal Fawn", seasonal: true, rarity: "legendary", image: s02Free10, cardId: "moonpetal-fawn" },
    elite: { kind: "hero", label: "Nyx, Moon Assassin", seasonal: true, rarity: "legendary", image: s02Elite10, cardId: "nyx-moon-assassin" },
  },
  15: {
    free: { kind: "title", label: "Lunarbound", seasonal: true, rarity: "legendary", image: s02Free15, cosmeticId: "title_lunarbound" },
    elite: { kind: "board_skin", label: "Moonlit Shrine", seasonal: true, rarity: "legendary", image: s02Elite15, cosmeticId: "board_moonlit_shrine" },
  },
  20: {
    free: { kind: "hero", label: "Selene's Warden", seasonal: true, rarity: "legendary", image: s02Free20, cardId: "selenes-warden" },
    elite: { kind: "hero", label: "Lunara, Veil Empress", seasonal: true, rarity: "legendary", image: s02Elite20, cardId: "lunara-veil-empress" },
  },
  25: {
    free: { kind: "emote", label: "Moonbeam", seasonal: true, rarity: "legendary", image: s02Free25, cosmeticId: "emote_moonbeam" },
    elite: { kind: "border", label: "Astral Crescent", seasonal: true, rarity: "legendary", image: s02Elite25, cosmeticId: "border_astral_crescent" },
  },
  30: {
    free: { kind: "card_frame", label: "Lunar Halo", seasonal: true, rarity: "legendary", image: s02Free30, cosmeticId: "frame_lunar_halo" },
    elite: { kind: "hero_variant", label: "Celestial Lunara", seasonal: true, rarity: "legendary", image: s02Elite30, cardId: "celestial-lunara" },
  },
});

const PASS_SEASON_03 = buildPass({
  5: {
    free: { kind: "card_back", label: "Stormcrest", seasonal: true, rarity: "legendary", image: s03Free05, cosmeticId: "cardback_stormcrest" },
    elite: { kind: "card_back", label: "Voltaic Edge", seasonal: true, rarity: "legendary", image: s03Elite05, cosmeticId: "cardback_voltaic_edge" },
  },
  10: {
    free: { kind: "hero", label: "Thunderling Scout", seasonal: true, rarity: "legendary", image: s03Free10, cardId: "thunderling-scout" },
    elite: { kind: "hero", label: "Kaelen, Storm Knight", seasonal: true, rarity: "legendary", image: s03Elite10, cardId: "kaelen-storm-knight" },
  },
  15: {
    free: { kind: "title", label: "Stormcaller", seasonal: true, rarity: "legendary", image: s03Free15, cosmeticId: "title_stormcaller" },
    elite: { kind: "board_skin", label: "Lightning Spire Arena", seasonal: true, rarity: "legendary", image: s03Elite15, cosmeticId: "board_lightning_spire" },
  },
  20: {
    free: { kind: "hero", label: "Aegis, Storm Shield", seasonal: true, rarity: "legendary", image: s03Free20, cardId: "aegis-storm-shield" },
    elite: { kind: "hero", label: "Tempesta, Storm Sovereign", seasonal: true, rarity: "legendary", image: s03Elite20, cardId: "tempesta-storm-sovereign" },
  },
  25: {
    free: { kind: "emote", label: "Lightning Strike", seasonal: true, rarity: "legendary", image: s03Free25, cosmeticId: "emote_lightning_strike" },
    elite: { kind: "border", label: "Thunderborn", seasonal: true, rarity: "legendary", image: s03Elite25, cosmeticId: "border_thunderborn" },
  },
  30: {
    free: { kind: "card_frame", label: "Tempest Crown", seasonal: true, rarity: "legendary", image: s03Free30, cosmeticId: "frame_tempest_crown" },
    elite: { kind: "hero_variant", label: "Ascended Tempesta", seasonal: true, rarity: "legendary", image: s03Elite30, cardId: "ascended-tempesta" },
  },
});

export const BATTLE_PASS_SEASONS: BattlePassSeasonDefinition[] = [
  {
    id: "season-01",
    title: "Season of the Bloom",
    emoji: "🌸",
    subtitle: "30 days remaining · Complete quests & battles to earn XP",
    passData: PASS_SEASON_01,
  },
  {
    id: "season-02",
    title: "Veil of Lunara",
    emoji: "🌙",
    subtitle: "Moon silver & lunar runes · Season exclusive legendaries at every 5 levels",
    banner: s02Banner,
    passData: PASS_SEASON_02,
  },
  {
    id: "season-03",
    title: "Crown of Storms",
    emoji: "⚡",
    subtitle: "Storm blue & lightning sigils · Season exclusive legendaries at every 5 levels",
    banner: s03Banner,
    passData: PASS_SEASON_03,
  },
];

/** Active season shown by default in the UI (swap when you rotate live seasons). */
export const ACTIVE_BATTLE_PASS_SEASON_ID: BattlePassSeasonDefinition["id"] = "season-01";
