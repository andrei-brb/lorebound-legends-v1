import type { GameCard } from "./cards";

// Gods (full-body)
import godFire from "@/assets/cards/mythic/god-fire-pyrahkan.png";
import godWater from "@/assets/cards/mythic/god-water-thalassor.png";
import godNature from "@/assets/cards/mythic/god-nature-sylvarion.png";
import godShadow from "@/assets/cards/mythic/god-shadow-noxareth.png";
import godLight from "@/assets/cards/mythic/god-light-aurelia.png";
import godNeutral from "@/assets/cards/mythic/god-neutral-equilix.png";

// Heroes (full-body)
import heroFire from "@/assets/cards/mythic/hero-fire-vyraka.png";
import heroWater from "@/assets/cards/mythic/hero-water-marenthil.png";
import heroNature from "@/assets/cards/mythic/hero-nature-thalwen.png";
import heroShadow from "@/assets/cards/mythic/hero-shadow-vexar.png";
import heroLight from "@/assets/cards/mythic/hero-light-seraphine.png";
import heroNeutral from "@/assets/cards/mythic/hero-neutral-kaidran.png";

// Weapons
import wpnFire from "@/assets/cards/mythic/weapon-fire-emberfang.png";
import wpnWater from "@/assets/cards/mythic/weapon-water-tidecaller.png";
import wpnNature from "@/assets/cards/mythic/weapon-nature-verdantbow.png";
import wpnShadow from "@/assets/cards/mythic/weapon-shadow-voidreaper.png";
import wpnLight from "@/assets/cards/mythic/weapon-light-dawnbreaker.png";
import wpnNeutral from "@/assets/cards/mythic/weapon-neutral-runeblade.png";

// Traps
import trpFire from "@/assets/cards/mythic/trap-fire-infernoglyph.png";
import trpWater from "@/assets/cards/mythic/trap-water-maelstrom.png";
import trpNature from "@/assets/cards/mythic/trap-nature-thornsnare.png";
import trpShadow from "@/assets/cards/mythic/trap-shadow-voidrift.png";
import trpLight from "@/assets/cards/mythic/trap-light-radiantward.png";
import trpNeutral from "@/assets/cards/mythic/trap-neutral-aegis.png";

// Skills (spells)
import sklFire from "@/assets/cards/mythic/skill-fire-cataclysm.png";
import sklWater from "@/assets/cards/mythic/skill-water-leviathan.png";
import sklNature from "@/assets/cards/mythic/skill-nature-worldtree.png";
import sklShadow from "@/assets/cards/mythic/skill-shadow-eclipse.png";
import sklLight from "@/assets/cards/mythic/skill-light-judgment.png";
import sklNeutral from "@/assets/cards/mythic/skill-neutral-chronoshift.png";

/**
 * MYTHIC CARDS — top tier of the game.
 * 30 cards total = 6 elements × (1 god, 1 hero, 1 weapon, 1 trap, 1 skill).
 * Stats are noticeably above legendary baseline.
 */
export const mythicCards: GameCard[] = [
  // ============= FIRE =============
  {
    id: "myth-pyrahkan", name: "Pyrahkan, Lord of the Forge", type: "god", rarity: "mythic",
    image: godFire, attack: 18, defense: 12, hp: 42,
    tags: ["fire", "divine", "infernal", "mythic"], element: "fire",
    specialAbility: { name: "Cataclysmic Eruption", description: "Erupts in molten fury, dealing 14 damage to all enemies and granting +3 ATK to all fire allies for 2 turns.", cost: 7 },
    passiveAbility: { name: "Forge Aura", description: "+3 ATK to all fire cards on field", stat: "attack", value: 3, targetTag: "fire" },
    lore: "Pyrahkan forged the first sun in the heart of a dying volcano. To draw breath in his presence is to inhale flame.",
    synergies: [{ partnerId: "myth-vyraka", name: "Forge Bond", description: "Vyraka gains +5 ATK and lifesteal.", boostedStat: "attack", boostValue: 5 }],
    level: 1, xp: 0, xpToNext: 200, loreArc: "The Mythic Pantheon",
  },
  {
    id: "myth-vyraka", name: "Vyraka, Emberblade Reaver", type: "hero", rarity: "mythic",
    image: heroFire, attack: 16, defense: 9, hp: 30,
    tags: ["fire", "warrior", "flame", "mythic"], element: "fire",
    specialAbility: { name: "Twin Flame Dance", description: "Strikes twice this turn, each hit dealing 10 damage and applying burn (3 dmg/turn for 2 turns).", cost: 5 },
    lore: "Born of a battlefield where the dead burned for nine days, Vyraka inherited the flame as her birthright.",
    synergies: [{ partnerId: "myth-pyrahkan", name: "Forge Bond", description: "Gains +5 ATK and lifesteal.", boostedStat: "attack", boostValue: 5 }],
    level: 1, xp: 0, xpToNext: 200,
  },
  {
    id: "myth-emberfang", name: "Emberfang, Phoenix Blade", type: "weapon", rarity: "mythic",
    image: wpnFire, attack: 0, defense: 0, hp: 0,
    tags: ["fire", "phoenix", "mythic"], element: "fire",
    weaponBonus: { attack: 9, defense: 1 },
    specialAbility: { name: "Phoenix Blade", description: "Grants +9 ATK and +1 DEF. Once per battle, revives the wielder with 30% HP.", cost: 0 },
    lore: "Quenched in the tears of a dying phoenix. As long as ash exists, the blade remembers fire.", synergies: [], level: 1, xp: 0, xpToNext: 200,
  },
  {
    id: "myth-infernoglyph", name: "Glyph of the Inferno", type: "trap", rarity: "mythic",
    image: trpFire, attack: 0, defense: 0, hp: 0,
    tags: ["fire", "infernal", "mythic"], element: "fire",
    trapEffect: { trigger: "on_attacked", effect: "damage", value: 16 },
    specialAbility: { name: "Glyph of the Inferno", description: "When triggered, erupts a fire geyser dealing 16 damage to the attacker and burning them for 2 turns.", cost: 0 },
    lore: "Carved into obsidian during a solar eclipse, the glyph hungers for any who step into its circle.",
    synergies: [], level: 1, xp: 0, xpToNext: 200,
  },
  {
    id: "myth-cataclysm", name: "Cataclysm", type: "spell", rarity: "mythic",
    image: sklFire, attack: 0, defense: 0, hp: 0,
    tags: ["fire", "infernal", "mythic"], element: "fire",
    spellEffect: { type: "damage", value: 18, target: "all_enemies" },
    specialAbility: { name: "Cataclysm", description: "A meteor of pure flame deals 18 damage to all enemies and reduces their DEF by 3.", cost: 0 },
    lore: "The spell that ended the Age of Embers. It does not need to be aimed.", synergies: [], level: 1, xp: 0, xpToNext: 200,
  },

  // ============= WATER =============
  {
    id: "myth-thalassor", name: "Thalassor, Ocean Sovereign", type: "god", rarity: "mythic",
    image: godWater, attack: 13, defense: 16, hp: 46,
    tags: ["water", "divine", "ocean", "mythic"], element: "water",
    specialAbility: { name: "Abyssal Tide", description: "Summons a crushing tide dealing 12 damage to all enemies and healing all water allies for 8 HP.", cost: 7 },
    passiveAbility: { name: "Tidal Aura", description: "+3 DEF to all water cards on field", stat: "defense", value: 3, targetTag: "water" },
    lore: "She does not rule the ocean. She IS the ocean — and the ocean remembers every drowned ship.",
    synergies: [{ partnerId: "myth-marenthil", name: "Tide's Blessing", description: "Marenthil gains a 12-point shield each turn.", boostedStat: "defense", boostValue: 6 }],
    level: 1, xp: 0, xpToNext: 200, loreArc: "The Mythic Pantheon",
  },
  {
    id: "myth-marenthil", name: "Marenthil, Tidecaller Prince", type: "hero", rarity: "mythic",
    image: heroWater, attack: 13, defense: 13, hp: 32,
    tags: ["water", "tidal", "warrior", "mythic"], element: "water",
    specialAbility: { name: "Coral Lance Surge", description: "Pierces an enemy line for 12 damage and heals self for 6 HP.", cost: 5 },
    lore: "Heir to the drowned crown. The waves rise when he steps onto the shore.",
    synergies: [{ partnerId: "myth-thalassor", name: "Tide's Blessing", description: "Gains a 12-point shield each turn.", boostedStat: "defense", boostValue: 6 }],
    level: 1, xp: 0, xpToNext: 200,
  },
  {
    id: "myth-tidecaller", name: "Tidecaller, Trident of Depths", type: "weapon", rarity: "mythic",
    image: wpnWater, attack: 0, defense: 0, hp: 0,
    tags: ["water", "ocean", "mythic"], element: "water",
    weaponBonus: { attack: 7, defense: 4 },
    specialAbility: { name: "Trident of Depths", description: "Grants +7 ATK and +4 DEF. Attacks have a 30% chance to stun for 1 turn.", cost: 0 },
    lore: "Carved from coral that grew on the bones of a leviathan king.", synergies: [], level: 1, xp: 0, xpToNext: 200,
  },
  {
    id: "myth-maelstrom", name: "Maelstrom Sigil", type: "trap", rarity: "mythic",
    image: trpWater, attack: 0, defense: 0, hp: 0,
    tags: ["water", "tidal", "mythic"], element: "water",
    trapEffect: { trigger: "on_attacked", effect: "redirect", value: 14 },
    specialAbility: { name: "Maelstrom Sigil", description: "Drags the attacker into a whirlpool: 14 damage, ATK reduced by 4 for 2 turns.", cost: 0 },
    lore: "A spinning rune that opens a brief gateway to the abyss. Nothing returns the same.", synergies: [], level: 1, xp: 0, xpToNext: 200,
  },
  {
    id: "myth-leviathan", name: "Leviathan's Wrath", type: "spell", rarity: "mythic",
    image: sklWater, attack: 0, defense: 0, hp: 0,
    tags: ["water", "ocean", "mythic"], element: "water",
    spellEffect: { type: "damage", value: 14, target: "all_enemies" },
    specialAbility: { name: "Leviathan's Wrath", description: "A tidal wave deals 14 damage to all enemies and stuns the strongest for 1 turn.", cost: 0 },
    lore: "The leviathans have not been seen for an age. They have not, however, been forgotten.", synergies: [], level: 1, xp: 0, xpToNext: 200,
  },

  // ============= NATURE =============
  {
    id: "myth-sylvarion", name: "Sylvarion, Heartwood Ancient", type: "god", rarity: "mythic",
    image: godNature, attack: 11, defense: 18, hp: 50,
    tags: ["nature", "divine", "verdant", "mythic"], element: "nature",
    specialAbility: { name: "Worldroot Embrace", description: "Heals all allies for 12 HP and grants +4 DEF for 3 turns.", cost: 7 },
    passiveAbility: { name: "Heartwood Aura", description: "+3 DEF to all nature cards on field", stat: "defense", value: 3, targetTag: "nature" },
    lore: "He stood before the first season. Every forest is his memory made manifest.",
    synergies: [{ partnerId: "myth-thalwen", name: "Wildbond", description: "Thalwen's arrows root enemies in place.", boostedStat: "attack", boostValue: 5 }],
    level: 1, xp: 0, xpToNext: 200, loreArc: "The Mythic Pantheon",
  },
  {
    id: "myth-thalwen", name: "Thalwen, Wildwood Huntress", type: "hero", rarity: "mythic",
    image: heroNature, attack: 15, defense: 10, hp: 30,
    tags: ["nature", "ranger", "beast", "mythic"], element: "nature",
    specialAbility: { name: "Thornvolley", description: "Looses three glowing arrows: 6 damage each, with the third applying poison (4 dmg/turn for 3 turns).", cost: 5 },
    lore: "Raised by wolves under a green moon. She does not miss.",
    synergies: [{ partnerId: "myth-sylvarion", name: "Wildbond", description: "Arrows root enemies in place.", boostedStat: "attack", boostValue: 5 }],
    level: 1, xp: 0, xpToNext: 200,
  },
  {
    id: "myth-verdantbow", name: "Verdantbow, Living Yew", type: "weapon", rarity: "mythic",
    image: wpnNature, attack: 0, defense: 0, hp: 0,
    tags: ["nature", "vine", "mythic"], element: "nature",
    weaponBonus: { attack: 7, defense: 3 },
    specialAbility: { name: "Living Yew", description: "Grants +7 ATK and +3 DEF. Heals wielder for 3 HP per turn.", cost: 0 },
    lore: "A bow that still grows. It must be watered, and pruned, and loved.", synergies: [], level: 1, xp: 0, xpToNext: 200,
  },
  {
    id: "myth-thornsnare", name: "Thornsnare of the Grove", type: "trap", rarity: "mythic",
    image: trpNature, attack: 0, defense: 0, hp: 0,
    tags: ["nature", "vine", "mythic"], element: "nature",
    trapEffect: { trigger: "on_attacked", effect: "stun", value: 2 },
    specialAbility: { name: "Thornsnare of the Grove", description: "Living vines bind the attacker, stunning them for 2 turns and dealing 6 damage per turn while held.", cost: 0 },
    lore: "The grove is patient. The grove always wins.", synergies: [], level: 1, xp: 0, xpToNext: 200,
  },
  {
    id: "myth-worldtree", name: "World Tree's Bloom", type: "spell", rarity: "mythic",
    image: sklNature, attack: 0, defense: 0, hp: 0,
    tags: ["nature", "verdant", "mythic"], element: "nature",
    spellEffect: { type: "heal", value: 16, target: "all_allies" },
    specialAbility: { name: "World Tree's Bloom", description: "All allies are restored for 16 HP and gain +3 DEF for 2 turns.", cost: 0 },
    lore: "When the World Tree blooms, even the dying remember they are alive.", synergies: [], level: 1, xp: 0, xpToNext: 200,
  },

  // ============= SHADOW =============
  {
    id: "myth-noxareth", name: "Noxareth, Voidcrowned King", type: "god", rarity: "mythic",
    image: godShadow, attack: 17, defense: 11, hp: 40,
    tags: ["shadow", "divine", "void", "mythic"], element: "shadow",
    specialAbility: { name: "Eclipse Verdict", description: "Drains 7 HP from each enemy and heals self for the total drained.", cost: 7 },
    passiveAbility: { name: "Voidcrown Aura", description: "+3 ATK to all shadow cards on field", stat: "attack", value: 3, targetTag: "shadow" },
    lore: "He sat upon a throne of broken stars. The constellations shifted to make room.",
    synergies: [{ partnerId: "myth-vexar", name: "Veil of the King", description: "Vexar becomes untargetable for 2 turns.", boostedStat: "attack", boostValue: 6 }],
    level: 1, xp: 0, xpToNext: 200, loreArc: "The Mythic Pantheon",
  },
  {
    id: "myth-vexar", name: "Vexar, Hollow Blade", type: "hero", rarity: "mythic",
    image: heroShadow, attack: 17, defense: 8, hp: 26,
    tags: ["shadow", "assassin", "void", "mythic"], element: "shadow",
    specialAbility: { name: "Voidstep Execution", description: "Vanishes and reappears behind the weakest enemy, dealing 18 damage and ignoring all defense.", cost: 5 },
    lore: "He cut his own shadow free, and the shadow agreed to fight beside him.",
    synergies: [{ partnerId: "myth-noxareth", name: "Veil of the King", description: "Becomes untargetable for 2 turns.", boostedStat: "attack", boostValue: 6 }],
    level: 1, xp: 0, xpToNext: 200,
  },
  {
    id: "myth-voidreaper", name: "Voidreaper, Soulcleaver", type: "weapon", rarity: "mythic",
    image: wpnShadow, attack: 0, defense: 0, hp: 0,
    tags: ["shadow", "void", "mythic"], element: "shadow",
    weaponBonus: { attack: 10, defense: -1 },
    specialAbility: { name: "Soulcleaver", description: "Grants +10 ATK but -1 DEF. Each kill heals wielder for 5 HP.", cost: 0 },
    lore: "The blade cuts what cannot be cut: regret, memory, the will to fight.", synergies: [], level: 1, xp: 0, xpToNext: 200,
  },
  {
    id: "myth-voidrift", name: "Voidrift Trap", type: "trap", rarity: "mythic",
    image: trpShadow, attack: 0, defense: 0, hp: 0,
    tags: ["shadow", "void", "mythic"], element: "shadow",
    trapEffect: { trigger: "on_enemy_play", effect: "damage", value: 18 },
    specialAbility: { name: "Voidrift Trap", description: "When an enemy plays a card, a rift opens dealing 18 damage and silencing them for 1 turn.", cost: 0 },
    lore: "A door that should not be opened. A door that always opens anyway.", synergies: [], level: 1, xp: 0, xpToNext: 200,
  },
  {
    id: "myth-eclipse", name: "Total Eclipse", type: "spell", rarity: "mythic",
    image: sklShadow, attack: 0, defense: 0, hp: 0,
    tags: ["shadow", "void", "mythic"], element: "shadow",
    spellEffect: { type: "damage", value: 13, target: "all_enemies" },
    specialAbility: { name: "Total Eclipse", description: "Darkness consumes the field: 13 damage to all enemies and reduces their ATK by 4 for 2 turns.", cost: 0 },
    lore: "The sun does not rise the next day. It has decided not to.", synergies: [], level: 1, xp: 0, xpToNext: 200,
  },

  // ============= LIGHT =============
  {
    id: "myth-aurelia", name: "Aurelia, Dawnsworn Sovereign", type: "god", rarity: "mythic",
    image: godLight, attack: 14, defense: 15, hp: 44,
    tags: ["light", "divine", "celestial", "mythic"], element: "light",
    specialAbility: { name: "Halo of Judgment", description: "Smites all enemies for 11 damage and heals all allies for 7 HP.", cost: 7 },
    passiveAbility: { name: "Dawnsworn Aura", description: "+3 DEF to all light cards on field", stat: "defense", value: 3, targetTag: "light" },
    lore: "She wove the first dawn from the threads of a fading star. Hers is the radiance that does not waver.",
    synergies: [{ partnerId: "myth-seraphine", name: "Vow of the Dawn", description: "Seraphine reflects 50% of damage taken.", boostedStat: "defense", boostValue: 6 }],
    level: 1, xp: 0, xpToNext: 200, loreArc: "The Mythic Pantheon",
  },
  {
    id: "myth-seraphine", name: "Seraphine, Lightward Paladin", type: "hero", rarity: "mythic",
    image: heroLight, attack: 14, defense: 14, hp: 32,
    tags: ["light", "paladin", "divine", "mythic"], element: "light",
    specialAbility: { name: "Sunblade Vow", description: "Strikes for 11 damage and grants a 10-point shield to all allies.", cost: 5 },
    lore: "Her sword was forged on the morning the sun first wept.",
    synergies: [{ partnerId: "myth-aurelia", name: "Vow of the Dawn", description: "Reflects 50% of damage taken.", boostedStat: "defense", boostValue: 6 }],
    level: 1, xp: 0, xpToNext: 200,
  },
  {
    id: "myth-dawnbreaker", name: "Dawnbreaker, Hammer of Sun", type: "weapon", rarity: "mythic",
    image: wpnLight, attack: 0, defense: 0, hp: 0,
    tags: ["light", "divine", "mythic"], element: "light",
    weaponBonus: { attack: 8, defense: 2 },
    specialAbility: { name: "Hammer of Sun", description: "Grants +8 ATK and +2 DEF. Attacks deal +50% damage to shadow enemies.", cost: 0 },
    lore: "Each strike is a sunrise. Each sunrise is the end of something dark.", synergies: [], level: 1, xp: 0, xpToNext: 200,
  },
  {
    id: "myth-radiantward", name: "Radiant Ward", type: "trap", rarity: "mythic",
    image: trpLight, attack: 0, defense: 0, hp: 0,
    tags: ["light", "divine", "mythic"], element: "light",
    trapEffect: { trigger: "on_enemy_ability", effect: "reflect_damage", value: 14 },
    specialAbility: { name: "Radiant Ward", description: "When an enemy uses an ability, a holy ward reflects 14 damage and silences them for 1 turn.", cost: 0 },
    lore: "A circle of light that does not forgive what crosses it.", synergies: [], level: 1, xp: 0, xpToNext: 200,
  },
  {
    id: "myth-judgment", name: "Pillar of Judgment", type: "spell", rarity: "mythic",
    image: sklLight, attack: 0, defense: 0, hp: 0,
    tags: ["light", "divine", "mythic"], element: "light",
    spellEffect: { type: "damage", value: 20, target: "single_enemy" },
    specialAbility: { name: "Pillar of Judgment", description: "A column of pure light deals 20 damage to one enemy and heals all allies for 6 HP.", cost: 0 },
    lore: "The verdict is rendered. The light does not negotiate.", synergies: [], level: 1, xp: 0, xpToNext: 200,
  },

  // ============= NEUTRAL =============
  {
    id: "myth-equilix", name: "Equilix, the Balanced One", type: "god", rarity: "mythic",
    image: godNeutral, attack: 15, defense: 15, hp: 42,
    tags: ["divine", "cosmic", "balance", "mythic"], element: "neutral",
    specialAbility: { name: "Cosmic Equilibrium", description: "Equalizes the field: deals 10 damage to the strongest enemy and heals the weakest ally for 10 HP.", cost: 6 },
    passiveAbility: { name: "Balance Aura", description: "+2 ATK and +2 DEF to all neutral cards on field", stat: "attack", value: 2 },
    lore: "Half stone, half cosmos. Equilix does not choose sides — only outcomes.",
    synergies: [{ partnerId: "myth-kaidran", name: "Steady Resolve", description: "Kaidran gains +4 ATK and +4 DEF.", boostedStat: "attack", boostValue: 4 }],
    level: 1, xp: 0, xpToNext: 200, loreArc: "The Mythic Pantheon",
  },
  {
    id: "myth-kaidran", name: "Kaidran, the Iron Wanderer", type: "hero", rarity: "mythic",
    image: heroNeutral, attack: 14, defense: 13, hp: 34,
    tags: ["warrior", "knight", "balance", "mythic"], element: "neutral",
    specialAbility: { name: "Greatsword Sweep", description: "Cleaves all enemies for 8 damage and gains +3 DEF for 2 turns.", cost: 5 },
    lore: "He has walked every road. He has buried every comrade. He has not stopped walking.",
    synergies: [{ partnerId: "myth-equilix", name: "Steady Resolve", description: "Gains +4 ATK and +4 DEF.", boostedStat: "attack", boostValue: 4 }],
    level: 1, xp: 0, xpToNext: 200,
  },
  {
    id: "myth-runeblade", name: "Runeblade of the Wanderer", type: "weapon", rarity: "mythic",
    image: wpnNeutral, attack: 0, defense: 0, hp: 0,
    tags: ["balance", "warrior", "mythic"], element: "neutral",
    weaponBonus: { attack: 6, defense: 4 },
    specialAbility: { name: "Wanderer's Edge", description: "Grants +6 ATK and +4 DEF. Wielder ignores element disadvantages.", cost: 0 },
    lore: "Forged by no master, owned by no king. The blade chose the wanderer, not the other way around.", synergies: [], level: 1, xp: 0, xpToNext: 200,
  },
  {
    id: "myth-aegis", name: "Aegis Pressure Plate", type: "trap", rarity: "mythic",
    image: trpNeutral, attack: 0, defense: 0, hp: 0,
    tags: ["balance", "warrior", "mythic"], element: "neutral",
    trapEffect: { trigger: "on_attacked", effect: "reflect_damage", value: 12 },
    specialAbility: { name: "Aegis Pressure Plate", description: "When triggered, fires a spike array reflecting 12 damage and stunning the attacker for 1 turn.", cost: 0 },
    lore: "An old design. A reliable design. The dwarves do not improve on what does not need improving.", synergies: [], level: 1, xp: 0, xpToNext: 200,
  },
  {
    id: "myth-chronoshift", name: "Chronoshift", type: "spell", rarity: "mythic",
    image: sklNeutral, attack: 0, defense: 0, hp: 0,
    tags: ["balance", "cosmic", "mythic"], element: "neutral",
    spellEffect: { type: "buff_attack", value: 5, target: "all_allies", duration: 3 },
    specialAbility: { name: "Chronoshift", description: "Bends time: all allies gain +5 ATK and an extra action this turn.", cost: 0 },
    lore: "A moment held still. A heartbeat stretched into a war.", synergies: [], level: 1, xp: 0, xpToNext: 200,
  },
];

