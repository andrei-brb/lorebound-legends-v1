import type { GameCard } from "./cards";

// Seasonal card images
import shadowWraithKingImg from "@/assets/cards/shadow-wraith-king.jpg";
import voidShadeImg from "@/assets/cards/void-shade.jpg";
import nightwalkerImg from "@/assets/cards/nightwalker.jpg";
import eclipseDaggerImg from "@/assets/cards/eclipse-dagger.jpg";
import shadowEclipseSpellImg from "@/assets/cards/shadow-eclipse-spell.jpg";

import infernalPhoenixImg from "@/assets/cards/infernal-phoenix.jpg";
import moltenTitanImg from "@/assets/cards/molten-titan.jpg";
import emberDancerImg from "@/assets/cards/ember-dancer.jpg";
import infernalBladeImg from "@/assets/cards/infernal-blade.jpg";
import hellfireRainImg from "@/assets/cards/hellfire-rain.jpg";

import bloomMotherImg from "@/assets/cards/bloom-mother.jpg";
import crystalStagImg from "@/assets/cards/crystal-stag.jpg";
import faeSpriteImg from "@/assets/cards/fae-sprite.jpg";
import thornbloomStaffImg from "@/assets/cards/thornbloom-staff.jpg";
import bloomBurstImg from "@/assets/cards/bloom-burst.jpg";

// =================== SHADOW WEEK CARDS ===================

export const shadowWeekCards: GameCard[] = [
  {
    id: "shadow-wraith-king", name: "Malachar, Wraith King", type: "god", rarity: "legendary",
    image: shadowWraithKingImg, attack: 13, defense: 8, hp: 32,
    tags: ["shadow", "undead", "divine"], seasonal: true,
    element: "shadow",
    specialAbility: { name: "Eternal Darkness", description: "Drains 5 HP from all enemies and heals self for the total drained.", cost: 6 },
    passiveAbility: { name: "Shadow Dominion", description: "+2 ATK to all shadow cards on field", stat: "attack", value: 2, targetTag: "shadow" },
    lore: "The Wraith King rules the realm between death and oblivion. During Shadow Week, his power eclipses even the gods.",
    synergies: [
      { partnerId: "void-shade", name: "King's Shadow", description: "Void Shade becomes invisible for 2 turns.", boostedStat: "attack", boostValue: 5 },
      { partnerId: "nyx", name: "Eclipse Pact", description: "Both gain lifesteal on attacks.", boostedStat: "attack", boostValue: 4 },
    ],
    level: 1, xp: 0, xpToNext: 100, loreArc: "The Shadow Eclipse",
  },
  {
    id: "void-shade", name: "Void Shade", type: "hero", rarity: "rare",
    image: voidShadeImg, attack: 9, defense: 5, hp: 18,
    tags: ["shadow", "void", "assassin"], seasonal: true,
    element: "shadow",
    specialAbility: { name: "Phase Strike", description: "Teleports behind the weakest enemy, dealing 12 damage and ignoring defense.", cost: 4 },
    lore: "Born from the void between worlds, the Shade exists in neither realm — and strikes from both.",
    synergies: [
      { partnerId: "shadow-wraith-king", name: "King's Shadow", description: "Becomes invisible for 2 turns.", boostedStat: "attack", boostValue: 5 },
    ],
    level: 1, xp: 0, xpToNext: 80,
  },
  {
    id: "nightwalker", name: "Nightwalker", type: "hero", rarity: "rare",
    image: nightwalkerImg, attack: 10, defense: 6, hp: 20,
    tags: ["shadow", "beast", "dark"], seasonal: true,
    element: "shadow",
    specialAbility: { name: "Terror Howl", description: "Stuns all enemies for 1 turn and reduces their ATK by 2.", cost: 4 },
    lore: "When the shadow moon rises, the Nightwalker prowls. Its howl freezes the blood of even the bravest warriors.",
    synergies: [],
    level: 1, xp: 0, xpToNext: 80,
  },
  {
    id: "eclipse-dagger", name: "Eclipse Dagger", type: "weapon", rarity: "rare",
    image: eclipseDaggerImg, attack: 0, defense: 0, hp: 0,
    tags: ["shadow", "void"], seasonal: true,
    element: "shadow",
    weaponBonus: { attack: 5, defense: 0 },
    specialAbility: { name: "Eclipse Dagger", description: "Grants +5 ATK. Shadow cards deal bonus damage during Shadow Week.", cost: 0 },
    lore: "Forged during a shadow eclipse, this dagger cuts through reality itself.",
    synergies: [], level: 1, xp: 0, xpToNext: 80,
  },
  {
    id: "shadow-eclipse-spell", name: "Shadow Eclipse", type: "spell", rarity: "legendary",
    image: shadowEclipseSpellImg, attack: 0, defense: 0, hp: 0,
    tags: ["shadow", "void"], seasonal: true,
    element: "shadow",
    spellEffect: { type: "damage", value: 10, target: "all_enemies" },
    specialAbility: { name: "Shadow Eclipse", description: "Darkness consumes the battlefield, dealing 10 damage to all enemies.", cost: 0 },
    lore: "The sky turns black as the shadow moon devours the sun. All light fades.",
    synergies: [], level: 1, xp: 0, xpToNext: 100,
  },
];

// =================== INFERNAL FESTIVAL CARDS ===================

export const infernalFestivalCards: GameCard[] = [
  {
    id: "infernal-phoenix", name: "Ignarax, Infernal Phoenix", type: "god", rarity: "legendary",
    image: infernalPhoenixImg, attack: 14, defense: 6, hp: 28,
    tags: ["fire", "phoenix", "divine"], seasonal: true,
    element: "fire",
    specialAbility: { name: "Rebirth Inferno", description: "When destroyed, revives with 50% HP and deals 8 damage to all enemies.", cost: 0 },
    passiveAbility: { name: "Infernal Aura", description: "+2 ATK to all fire cards on field", stat: "attack", value: 2, targetTag: "fire" },
    lore: "Ignarax is the phoenix that set the first volcano ablaze. During the Infernal Festival, it is reborn in ultimate glory.",
    synergies: [
      { partnerId: "molten-titan", name: "Volcanic Fury", description: "Both gain +4 ATK and burn enemies each turn.", boostedStat: "attack", boostValue: 4 },
      { partnerId: "pyrothos", name: "Twin Suns", description: "Fire damage doubled for both gods.", boostedStat: "attack", boostValue: 6 },
    ],
    level: 1, xp: 0, xpToNext: 100, loreArc: "The Infernal Pact",
  },
  {
    id: "molten-titan", name: "Molten Titan", type: "hero", rarity: "rare",
    image: moltenTitanImg, attack: 11, defense: 8, hp: 24,
    tags: ["fire", "lava", "beast"], seasonal: true,
    element: "fire",
    specialAbility: { name: "Magma Slam", description: "Slams the ground dealing 8 damage to a target and 4 splash to adjacent.", cost: 4 },
    lore: "A titan forged in the earth's core, its body is living magma. Each step leaves pools of molten rock.",
    synergies: [
      { partnerId: "infernal-phoenix", name: "Volcanic Fury", description: "Both gain +4 ATK.", boostedStat: "attack", boostValue: 4 },
    ],
    level: 1, xp: 0, xpToNext: 80,
  },
  {
    id: "ember-dancer", name: "Ember Dancer", type: "hero", rarity: "rare",
    image: emberDancerImg, attack: 8, defense: 4, hp: 16,
    tags: ["fire", "flame", "mage"], seasonal: true,
    element: "fire",
    specialAbility: { name: "Flame Waltz", description: "Attacks twice this turn, each hit dealing 6 damage.", cost: 3 },
    lore: "She dances in the flames as others flee. Each movement is both art and destruction.",
    synergies: [],
    level: 1, xp: 0, xpToNext: 80,
  },
  {
    id: "infernal-blade", name: "Infernal Blade", type: "weapon", rarity: "rare",
    image: infernalBladeImg, attack: 0, defense: 0, hp: 0,
    tags: ["fire", "infernal"], seasonal: true,
    element: "fire",
    weaponBonus: { attack: 6, defense: -1 },
    specialAbility: { name: "Infernal Blade", description: "Grants +6 ATK but -1 DEF. Burns with hellfire.", cost: 0 },
    lore: "A blade quenched in hellfire. It burns the wielder as much as the enemy — but the power is intoxicating.",
    synergies: [], level: 1, xp: 0, xpToNext: 80,
  },
  {
    id: "hellfire-rain", name: "Hellfire Rain", type: "spell", rarity: "legendary",
    image: hellfireRainImg, attack: 0, defense: 0, hp: 0,
    tags: ["fire", "infernal"], seasonal: true,
    element: "fire",
    spellEffect: { type: "damage", value: 8, target: "all_enemies" },
    specialAbility: { name: "Hellfire Rain", description: "Rain of hellfire deals 8 damage to all enemies and reduces their DEF by 2.", cost: 0 },
    lore: "The sky cracks open and molten rock rains from above. There is no shelter from the Infernal Festival.",
    synergies: [], level: 1, xp: 0, xpToNext: 100,
  },
];

// =================== BLOOM OF AGES CARDS ===================

export const bloomOfAgesCards: GameCard[] = [
  {
    id: "bloom-mother", name: "Yggdria, Bloom Mother", type: "god", rarity: "legendary",
    image: bloomMotherImg, attack: 7, defense: 12, hp: 35,
    tags: ["nature", "verdant", "divine"], seasonal: true,
    element: "nature",
    specialAbility: { name: "Eternal Bloom", description: "Heals all allies for 6 HP and grants +3 DEF for 2 turns.", cost: 5 },
    passiveAbility: { name: "Life Aura", description: "+2 DEF to all nature cards on field", stat: "defense", value: 2, targetTag: "nature" },
    lore: "Yggdria is the ancient tree from which all life springs. During the Bloom of Ages, she awakens fully.",
    synergies: [
      { partnerId: "crystal-stag", name: "Forest Bond", description: "Crystal Stag gains regeneration: +3 HP per turn.", boostedStat: "defense", boostValue: 4 },
      { partnerId: "gaiara", name: "Twin Roots", description: "Both nature gods gain +5 DEF.", boostedStat: "defense", boostValue: 5 },
    ],
    level: 1, xp: 0, xpToNext: 100, loreArc: "The Verdant Cycle",
  },
  {
    id: "crystal-stag", name: "Crystal Stag", type: "hero", rarity: "rare",
    image: crystalStagImg, attack: 6, defense: 9, hp: 22,
    tags: ["nature", "beast", "verdant"], seasonal: true,
    element: "nature",
    specialAbility: { name: "Crystal Antlers", description: "Creates a barrier absorbing 8 damage for all allies.", cost: 4 },
    lore: "The Crystal Stag appears only during the Bloom. Its antlers channel the purest nature magic.",
    synergies: [
      { partnerId: "bloom-mother", name: "Forest Bond", description: "Gains regeneration: +3 HP per turn.", boostedStat: "defense", boostValue: 4 },
    ],
    level: 1, xp: 0, xpToNext: 80,
  },
  {
    id: "fae-sprite", name: "Fae Sprite", type: "hero", rarity: "common",
    image: faeSpriteImg, attack: 4, defense: 3, hp: 12,
    tags: ["nature", "forest", "fae"], seasonal: true,
    element: "nature",
    specialAbility: { name: "Pollen Cloud", description: "Heals a random ally for 5 HP and buffs their ATK by 2.", cost: 2 },
    lore: "Tiny but mighty, the Fae Sprites dance through the blooming forests, spreading life wherever they go.",
    synergies: [],
    level: 1, xp: 0, xpToNext: 60,
  },
  {
    id: "thornbloom-staff", name: "Thornbloom Staff", type: "weapon", rarity: "rare",
    image: thornbloomStaffImg, attack: 0, defense: 0, hp: 0,
    tags: ["nature", "vine"], seasonal: true,
    element: "nature",
    weaponBonus: { attack: 3, defense: 3 },
    specialAbility: { name: "Thornbloom Staff", description: "Grants +3 ATK and +3 DEF. Nature's balance.", cost: 0 },
    lore: "A living staff that blooms with thorns and flowers in equal measure.",
    synergies: [], level: 1, xp: 0, xpToNext: 80,
  },
  {
    id: "bloom-burst", name: "Bloom Burst", type: "spell", rarity: "rare",
    image: bloomBurstImg, attack: 0, defense: 0, hp: 0,
    tags: ["nature", "verdant"], seasonal: true,
    element: "nature",
    spellEffect: { type: "heal", value: 8, target: "all_allies" },
    specialAbility: { name: "Bloom Burst", description: "An explosion of life energy heals all allies for 8 HP.", cost: 0 },
    lore: "When the ancient trees bloom, their energy heals all living things in a burst of golden light.",
    synergies: [], level: 1, xp: 0, xpToNext: 80,
  },
];

// All seasonal cards combined
export const allSeasonalCards: GameCard[] = [
  ...shadowWeekCards,
  ...infernalFestivalCards,
  ...bloomOfAgesCards,
];
