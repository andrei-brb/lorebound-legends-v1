import type { GameCard } from "./cards";

const img = (id: string) => `/cards/interaction-pack/${id}.png`;

type RawSpellEffect =
  | { type: "damage"; target: "single_enemy" | "all_enemies"; value: number }
  | { type: "heal"; target: "single_ally" | "all_allies"; value: number }
  | { type: "buff_attack"; target: "single_ally" | "all_allies"; value: number; duration: number }
  | { type: "buff_defense"; target: "single_ally" | "all_allies"; value: number; duration: number }
  | { type: "debuff_attack"; target: "single_enemy" | "all_enemies"; value: number; duration: number }
  | { type: "debuff_defense"; target: "single_enemy" | "all_enemies"; value: number; duration: number }
  | { type: "stun"; target: "single_enemy"; duration: number }
  | { type: "shield"; target: "single_ally" | "all_allies"; value: number; duration: number }
  | { type: "draw"; value: number }
  | { type: "tutor"; pick: "trap" | "spell"; reveal: boolean };

type RawTrapEffect = {
  trigger: "on_attacked" | "on_spell_cast" | "on_enemy_play";
  effect:
    | { type: "damage"; value: number }
    | { type: "reflect_damage"; value: number }
    | { type: "stun"; duration: number }
    | { type: "debuff_attack"; value: number; duration: number }
    | { type: "debuff_defense"; value: number; duration: number }
    | { type: "shield"; value: number; duration: number };
};

type RawCard = {
  id: string;
  name: string;
  type: "spell" | "trap";
  rarity: "common" | "rare" | "legendary";
  element: "fire" | "water" | "nature" | "shadow" | "light" | "neutral";
  spellEffect?: RawSpellEffect;
  spellSpeed?: "normal" | "quick";
  trapEffect?: RawTrapEffect;
  lore: string;
  specialAbility: { name: string; description: string; cost: number };
  synergies: Array<{
    partnerId: string;
    name: string;
    description: string;
    boostedStat: "attack" | "defense" | "hp";
    boostValue: number;
  }>;
  image: string;
};

function toGameCard(c: RawCard): GameCard {
  const base: GameCard = {
    id: c.id,
    name: c.name,
    type: c.type,
    rarity: c.rarity,
    image: c.image,
    attack: 0,
    defense: 0,
    hp: 0,
    tags: ["interaction-pack", c.element],
    specialAbility: c.specialAbility,
    lore: c.lore,
    synergies: c.synergies as any,
    level: 1,
    xp: 0,
    xpToNext: 100,
    element: c.element as any,
  };

  if (c.type === "spell" && c.spellEffect) {
    base.spellSpeed = c.spellSpeed ?? "normal";
    const e = c.spellEffect;
    if (e.type === "stun") {
      base.spellEffect = { type: "stun", target: "single_enemy", duration: e.duration };
    } else if (e.type === "draw") {
      base.spellEffect = { type: "draw", value: e.value };
    } else if (e.type === "tutor") {
      base.spellEffect = { type: "tutor", pick: e.pick, reveal: e.reveal };
    } else if (e.type === "shield") {
      base.spellEffect = { type: "shield", value: e.value, target: e.target === "all_allies" ? "all_allies" : e.target === "single_ally" ? "single_ally" : "self", duration: e.duration };
    } else {
      // damage/heal/buffs/debuffs
      base.spellEffect = e as any;
    }
  }

  if (c.type === "trap" && c.trapEffect) {
    const te = c.trapEffect;
    const eff = te.effect;
    base.trapEffect = {
      trigger: te.trigger as any,
      effect: eff.type as any,
      value: eff.value ?? 0,
      duration: (eff as any).duration,
    };
  }

  return base;
}

export const ygoHybridInteractionPackCards: GameCard[] = [
  // NORMAL SPELLS (10)
  {
    id: "ember-lance",
    name: "Ember Lance",
    type: "spell",
    rarity: "common",
    element: "fire",
    spellSpeed: "normal",
    spellEffect: { type: "damage", target: "single_enemy", value: 3 },
    lore: "A focused dart of flame that punches through scale and ward alike.",
    specialAbility: { name: "Pierce", description: "Main Phase: Deal 3 damage to one enemy.", cost: 0 },
    synergies: [{ partnerId: "tide-surge", name: "Steam Volley", description: "If you also run Tide Surge, your damage spells gain extra reach.", boostedStat: "attack", boostValue: 1 }],
    image: img("ember-lance"),
  },
  {
    id: "tide-surge",
    name: "Tide Surge",
    type: "spell",
    rarity: "common",
    element: "water",
    spellSpeed: "normal",
    spellEffect: { type: "damage", target: "all_enemies", value: 1 },
    lore: "A breaking wave that washes the entire enemy line.",
    specialAbility: { name: "Wash Over", description: "Main Phase: Deal 1 damage to all enemies.", cost: 0 },
    synergies: [{ partnerId: "ember-lance", name: "Steam Volley", description: "Pairs with Ember Lance for combined elemental coverage.", boostedStat: "attack", boostValue: 1 }],
    image: img("tide-surge"),
  },
  {
    id: "meteor-shard",
    name: "Meteor Shard",
    type: "spell",
    rarity: "rare",
    element: "fire",
    spellSpeed: "normal",
    spellEffect: { type: "damage", target: "single_enemy", value: 5 },
    lore: "A jagged splinter of star-iron, hurled with ruinous intent.",
    specialAbility: { name: "Crater", description: "Main Phase: Deal 5 damage to one enemy.", cost: 0 },
    synergies: [],
    image: img("meteor-shard"),
  },
  {
    id: "warbanner-rite",
    name: "Warbanner Rite",
    type: "spell",
    rarity: "common",
    element: "fire",
    spellSpeed: "normal",
    spellEffect: { type: "buff_attack", target: "all_allies", value: 1, duration: 2 },
    lore: "A rallying chant raised over the line of battle.",
    specialAbility: { name: "Rally", description: "Main Phase: All allies gain +1 ATK for 2 turns.", cost: 0 },
    synergies: [{ partnerId: "stone-aegis", name: "Iron Wall, Iron Will", description: "Pair with Stone Aegis for a balanced offense + defense buff.", boostedStat: "attack", boostValue: 1 }],
    image: img("warbanner-rite"),
  },
  {
    id: "stone-aegis",
    name: "Stone Aegis",
    type: "spell",
    rarity: "common",
    element: "nature",
    spellSpeed: "normal",
    spellEffect: { type: "buff_defense", target: "all_allies", value: 2, duration: 2 },
    lore: "Roots of the deep mountains lend their endurance to your line.",
    specialAbility: { name: "Bedrock", description: "Main Phase: All allies gain +2 DEF for 2 turns.", cost: 0 },
    synergies: [{ partnerId: "warbanner-rite", name: "Iron Wall, Iron Will", description: "Pair with Warbanner Rite to buff both ATK and DEF together.", boostedStat: "defense", boostValue: 1 }],
    image: img("stone-aegis"),
  },
  {
    id: "withering-curse",
    name: "Withering Curse",
    type: "spell",
    rarity: "rare",
    element: "shadow",
    spellSpeed: "normal",
    spellEffect: { type: "debuff_attack", target: "all_enemies", value: 2, duration: 2 },
    lore: "A whispered hex that saps the strength from sword arms.",
    specialAbility: { name: "Sap Strength", description: "Main Phase: All enemies lose 2 ATK for 2 turns.", cost: 0 },
    synergies: [{ partnerId: "fogbind-trap", name: "Crippling Veil", description: "Stacks defensive value with Fogbind Trap to neutralize attackers.", boostedStat: "defense", boostValue: 1 }],
    image: img("withering-curse"),
  },
  {
    id: "scholars-insight",
    name: "Scholar's Insight",
    type: "spell",
    rarity: "common",
    element: "light",
    spellSpeed: "normal",
    spellEffect: { type: "draw", value: 1 },
    lore: "A page of forgotten lore turns of its own accord.",
    specialAbility: { name: "Study", description: "Main Phase: Draw 1 card.", cost: 0 },
    synergies: [],
    image: img("scholars-insight"),
  },
  {
    id: "arcane-archive",
    name: "Arcane Archive",
    type: "spell",
    rarity: "rare",
    element: "neutral",
    spellSpeed: "normal",
    spellEffect: { type: "draw", value: 2 },
    lore: "A vault of memory opened only to the prepared mind.",
    specialAbility: { name: "Open the Vault", description: "Main Phase: Draw 2 cards.", cost: 0 },
    synergies: [],
    image: img("arcane-archive"),
  },
  {
    id: "trapsmiths-call",
    name: "Trapsmith's Call",
    type: "spell",
    rarity: "rare",
    element: "shadow",
    spellSpeed: "normal",
    spellEffect: { type: "tutor", pick: "trap", reveal: false },
    lore: "Hidden mechanisms answer the master's quiet summons.",
    specialAbility: { name: "Hidden Wire", description: "Main Phase: Search your deck for 1 trap and add it to your hand (do not reveal).", cost: 0 },
    synergies: [{ partnerId: "mirror-bulwark", name: "Set the Stage", description: "Great for fetching Mirror Bulwark before a known attack.", boostedStat: "defense", boostValue: 1 }],
    image: img("trapsmiths-call"),
  },
  {
    id: "spellseekers-rite",
    name: "Spellseeker's Rite",
    type: "spell",
    rarity: "rare",
    element: "light",
    spellSpeed: "normal",
    spellEffect: { type: "tutor", pick: "spell", reveal: true },
    lore: "An open invocation — let all see the answer you seek.",
    specialAbility: { name: "Reveal the Tome", description: "Main Phase: Search your deck for 1 spell, reveal it, and add it to your hand.", cost: 0 },
    synergies: [{ partnerId: "arcane-archive", name: "Library Run", description: "Combos with Arcane Archive to fuel a heavy spell turn.", boostedStat: "attack", boostValue: 1 }],
    image: img("spellseekers-rite"),
  },
  // QUICK SPELLS (8)
  {
    id: "guardians-bulwark",
    name: "Guardian's Bulwark",
    type: "spell",
    rarity: "common",
    element: "light",
    spellSpeed: "quick",
    spellEffect: { type: "shield", target: "single_ally", value: 4, duration: 1 },
    lore: "A radiant ward snapped into being at the moment of need.\nResponse Prompt: When eligible, show popup \"Activate Guardian's Bulwark?\" YES/NO.",
    specialAbility: { name: "Snap Ward", description: "Quick: Grant one ally a 4 shield for 1 turn. Prompt: Activate now? (YES/NO)", cost: 0 },
    synergies: [{ partnerId: "mirror-bulwark", name: "Layered Defense", description: "Stacks with Mirror Bulwark for a near-impassable wall.", boostedStat: "defense", boostValue: 1 }],
    image: img("guardians-bulwark"),
  },
  {
    id: "mending-current",
    name: "Mending Current",
    type: "spell",
    rarity: "common",
    element: "water",
    spellSpeed: "quick",
    spellEffect: { type: "heal", target: "single_ally", value: 3 },
    lore: "Cool water finds the wound before the wound finds the grave.\nResponse Prompt: When eligible, show popup \"Activate Mending Current?\" YES/NO.",
    specialAbility: { name: "Tide-Mend", description: "Quick: Heal one ally for 3. Prompt: Activate now? (YES/NO)", cost: 0 },
    synergies: [],
    image: img("mending-current"),
  },
  {
    id: "rootbrace",
    name: "Rootbrace",
    type: "spell",
    rarity: "common",
    element: "nature",
    spellSpeed: "quick",
    spellEffect: { type: "buff_defense", target: "single_ally", value: 3, duration: 1 },
    lore: "Living vines lash an ally's stance to the earth.\nResponse Prompt: When eligible, show popup \"Activate Rootbrace?\" YES/NO.",
    specialAbility: { name: "Anchor", description: "Quick: Give one ally +3 DEF for 1 turn. Prompt: Activate now? (YES/NO)", cost: 0 },
    synergies: [{ partnerId: "stone-aegis", name: "Mountain Hold", description: "Layers with Stone Aegis to make a single ally nearly untouchable.", boostedStat: "defense", boostValue: 1 }],
    image: img("rootbrace"),
  },
  {
    id: "hex-of-stillness",
    name: "Hex of Stillness",
    type: "spell",
    rarity: "rare",
    element: "shadow",
    spellSpeed: "quick",
    spellEffect: { type: "stun", target: "single_enemy", duration: 1 },
    lore: "A single syllable, and the foe forgets how to move.\nResponse Prompt: When eligible, show popup \"Activate Hex of Stillness?\" YES/NO.",
    specialAbility: { name: "Bind", description: "Quick: Stun one enemy for 1 turn. Prompt: Activate now? (YES/NO)", cost: 0 },
    synergies: [{ partnerId: "snare-of-silence", name: "Total Lockdown", description: "Combos with Snare of Silence to fully shut down a key attacker.", boostedStat: "defense", boostValue: 1 }],
    image: img("hex-of-stillness"),
  },
  {
    id: "sapping-mist",
    name: "Sapping Mist",
    type: "spell",
    rarity: "common",
    element: "water",
    spellSpeed: "quick",
    spellEffect: { type: "debuff_attack", target: "single_enemy", value: 2, duration: 2 },
    lore: "A creeping fog that drinks the iron from a swordsman's arm.\nResponse Prompt: When eligible, show popup \"Activate Sapping Mist?\" YES/NO.",
    specialAbility: { name: "Drain", description: "Quick: One enemy loses 2 ATK for 2 turns. Prompt: Activate now? (YES/NO)", cost: 0 },
    synergies: [],
    image: img("sapping-mist"),
  },
  {
    id: "shroud-pierce",
    name: "Shroud Pierce",
    type: "spell",
    rarity: "rare",
    element: "shadow",
    spellSpeed: "quick",
    spellEffect: { type: "debuff_defense", target: "single_enemy", value: 3, duration: 2 },
    lore: "An unseen blade slips through ward and gambeson alike.\nResponse Prompt: When eligible, show popup \"Activate Shroud Pierce?\" YES/NO.",
    specialAbility: { name: "Expose", description: "Quick: One enemy loses 3 DEF for 2 turns. Prompt: Activate now? (YES/NO)", cost: 0 },
    synergies: [{ partnerId: "meteor-shard", name: "Open & Strike", description: "Set up Meteor Shard for a devastating follow-up.", boostedStat: "attack", boostValue: 1 }],
    image: img("shroud-pierce"),
  },
  {
    id: "quickdraw-omen",
    name: "Quickdraw Omen",
    type: "spell",
    rarity: "common",
    element: "neutral",
    spellSpeed: "quick",
    spellEffect: { type: "draw", value: 1 },
    lore: "A flicker at the edge of fate — and a card slides into your hand.\nResponse Prompt: When eligible, show popup \"Activate Quickdraw Omen?\" YES/NO.",
    specialAbility: { name: "Snap-Draw", description: "Quick: Draw 1 card. Prompt: Activate now? (YES/NO)", cost: 0 },
    synergies: [],
    image: img("quickdraw-omen"),
  },
  {
    id: "spark-jab",
    name: "Spark Jab",
    type: "spell",
    rarity: "common",
    element: "fire",
    spellSpeed: "quick",
    spellEffect: { type: "damage", target: "single_enemy", value: 2 },
    lore: "A short, sharp lash of flame, more insult than spell.\nResponse Prompt: When eligible, show popup \"Activate Spark Jab?\" YES/NO.",
    specialAbility: { name: "Jab", description: "Quick: Deal 2 damage to one enemy. Prompt: Activate now? (YES/NO)", cost: 0 },
    synergies: [{ partnerId: "ember-lance", name: "Burn Chain", description: "Stacks with Ember Lance for finishing damage.", boostedStat: "attack", boostValue: 1 }],
    image: img("spark-jab"),
  },
  // TRAPS (12) — using simplified trapEffect (effect/value/duration)
  {
    id: "mirror-bulwark",
    name: "Mirror Bulwark",
    type: "trap",
    rarity: "rare",
    element: "light",
    trapEffect: { trigger: "on_attacked", effect: "shield", value: 5, duration: 1 } as any,
    lore: "A hidden glass disk flares to mirror-bright at the first blow.\nResponse Prompt: When eligible, show popup \"Activate Mirror Bulwark?\" YES/NO.",
    specialAbility: { name: "Glass Ward", description: "Trap: When attacked, grant the target a 5 shield for 1 turn. Prompt: Activate now? (YES/NO)", cost: 0 },
    synergies: [{ partnerId: "guardians-bulwark", name: "Layered Defense", description: "Stacks with Guardian's Bulwark for an outright wall.", boostedStat: "defense", boostValue: 1 }],
    image: img("mirror-bulwark"),
  },
  { id: "thornwall-snare", name: "Thornwall Snare", type: "trap", rarity: "common", element: "nature", trapEffect: { trigger: "on_attacked", effect: "reflect_damage", value: 2 }, lore: "A bramble wall springs from nowhere — and bleeds the brave.\nResponse Prompt: When eligible, show popup \"Activate Thornwall Snare?\" YES/NO.", specialAbility: { name: "Thornlash", description: "Trap: When attacked, reflect 2 damage to the attacker. Prompt: Activate now? (YES/NO)", cost: 0 }, synergies: [], image: img("thornwall-snare") },
  { id: "blinding-flare", name: "Blinding Flare", type: "trap", rarity: "common", element: "light", trapEffect: { trigger: "on_attacked", effect: "stun", value: 1, duration: 1 }, lore: "A flash of holy light staggers the attacker mid-swing.\nResponse Prompt: When eligible, show popup \"Activate Blinding Flare?\" YES/NO.", specialAbility: { name: "Daze", description: "Trap: When attacked, stun the attacker for 1 turn. Prompt: Activate now? (YES/NO)", cost: 0 }, synergies: [{ partnerId: "hex-of-stillness", name: "Lockstep", description: "Combos with Hex of Stillness to chain crowd control.", boostedStat: "defense", boostValue: 1 }], image: img("blinding-flare") },
  { id: "fogbind-trap", name: "Fogbind Trap", type: "trap", rarity: "common", element: "shadow", trapEffect: { trigger: "on_attacked", effect: "debuff_attack", value: 2, duration: 2 }, lore: "Cold mist coils around the attacker, weighing the blade arm.\nResponse Prompt: When eligible, show popup \"Activate Fogbind Trap?\" YES/NO.", specialAbility: { name: "Smother", description: "Trap: When attacked, the attacker loses 2 ATK for 2 turns. Prompt: Activate now? (YES/NO)", cost: 0 }, synergies: [{ partnerId: "withering-curse", name: "Crippling Veil", description: "Stacks attack debuffs with Withering Curse.", boostedStat: "defense", boostValue: 1 }], image: img("fogbind-trap") },
  { id: "spellbreakers-toll", name: "Spellbreaker's Toll", type: "trap", rarity: "rare", element: "shadow", trapEffect: { trigger: "on_spell_cast", effect: "damage", value: 3 }, lore: "Every incantation rings a bell — and bells call debts due.\nResponse Prompt: When eligible, show popup \"Activate Spellbreaker's Toll?\" YES/NO.", specialAbility: { name: "Toll", description: "Trap: When an enemy casts a spell, deal 3 damage to that caster. Prompt: Activate now? (YES/NO)", cost: 0 }, synergies: [], image: img("spellbreakers-toll") },
  { id: "echo-rebound", name: "Echo Rebound", type: "trap", rarity: "rare", element: "water", trapEffect: { trigger: "on_spell_cast", effect: "reflect_damage", value: 3 }, lore: "The spell's own resonance turns and bites its maker.\nResponse Prompt: When eligible, show popup \"Activate Echo Rebound?\" YES/NO.", specialAbility: { name: "Resonate", description: "Trap: When an enemy casts a spell, reflect 3 damage back to them. Prompt: Activate now? (YES/NO)", cost: 0 }, synergies: [{ partnerId: "spellbreakers-toll", name: "Caster's Burden", description: "Doubles the punishment for opposing spell decks alongside Spellbreaker's Toll.", boostedStat: "attack", boostValue: 1 }], image: img("echo-rebound") },
  { id: "snare-of-silence", name: "Snare of Silence", type: "trap", rarity: "rare", element: "shadow", trapEffect: { trigger: "on_spell_cast", effect: "stun", value: 1, duration: 1 }, lore: "Words die in the throat as the snare closes.\nResponse Prompt: When eligible, show popup \"Activate Snare of Silence?\" YES/NO.", specialAbility: { name: "Silence", description: "Trap: When an enemy casts a spell, stun the caster for 1 turn. Prompt: Activate now? (YES/NO)", cost: 0 }, synergies: [{ partnerId: "hex-of-stillness", name: "Total Lockdown", description: "Pair with Hex of Stillness to lock a key target completely.", boostedStat: "defense", boostValue: 1 }], image: img("snare-of-silence") },
  { id: "warding-sigil", name: "Warding Sigil", type: "trap", rarity: "common", element: "light", trapEffect: { trigger: "on_spell_cast", effect: "shield", value: 3, duration: 1 } as any, lore: "A glyph etched on the floorstones flares when magic answers magic.\nResponse Prompt: When eligible, show popup \"Activate Warding Sigil?\" YES/NO.", specialAbility: { name: "Sanctify", description: "Trap: When an enemy casts a spell, grant one ally a 3 shield for 1 turn. Prompt: Activate now? (YES/NO)", cost: 0 }, synergies: [], image: img("warding-sigil") },
  { id: "ambush-pit", name: "Ambush Pit", type: "trap", rarity: "common", element: "nature", trapEffect: { trigger: "on_enemy_play", effect: "damage", value: 2 }, lore: "The unwary set foot — the unwary fall.\nResponse Prompt: When eligible, show popup \"Activate Ambush Pit?\" YES/NO.", specialAbility: { name: "Spike Floor", description: "Trap: When an enemy plays a card, deal 2 damage to them. Prompt: Activate now? (YES/NO)", cost: 0 }, synergies: [], image: img("ambush-pit") },
  { id: "doomtide-omen", name: "Doomtide Omen", type: "trap", rarity: "legendary", element: "water", trapEffect: { trigger: "on_enemy_play", effect: "debuff_defense", value: 3, duration: 2 }, lore: "When the tide turns black, all walls feel thinner.\nResponse Prompt: When eligible, show popup \"Activate Doomtide Omen?\" YES/NO.", specialAbility: { name: "Black Tide", description: "Trap: When an enemy plays a card, that enemy loses 3 DEF for 2 turns. Prompt: Activate now? (YES/NO)", cost: 0 }, synergies: [{ partnerId: "shroud-pierce", name: "Total Exposure", description: "Stacks defense reduction with Shroud Pierce for a guaranteed kill window.", boostedStat: "attack", boostValue: 2 }], image: img("doomtide-omen") },
  { id: "shadow-bind", name: "Shadow Bind", type: "trap", rarity: "rare", element: "shadow", trapEffect: { trigger: "on_enemy_play", effect: "stun", value: 1, duration: 1 }, lore: "Shadows reach up from the played card itself, holding it fast.\nResponse Prompt: When eligible, show popup \"Activate Shadow Bind?\" YES/NO.", specialAbility: { name: "Hold Fast", description: "Trap: When an enemy plays a card, stun that card's owner for 1 turn. Prompt: Activate now? (YES/NO)", cost: 0 }, synergies: [], image: img("shadow-bind") },
  { id: "auroral-decree", name: "Auroral Decree", type: "trap", rarity: "legendary", element: "light", trapEffect: { trigger: "on_enemy_play", effect: "shield", value: 5, duration: 2 } as any, lore: "When the foe acts, the dawn answers — and your line is made bright.\nResponse Prompt: When eligible, show popup \"Activate Auroral Decree?\" YES/NO.", specialAbility: { name: "Dawn's Answer", description: "Trap: When an enemy plays a card, grant all allies a 5 shield for 2 turns. Prompt: Activate now? (YES/NO)", cost: 0 }, synergies: [{ partnerId: "stone-aegis", name: "Bastion of Dawn", description: "Combines with Stone Aegis for a near-impassable defensive turn.", boostedStat: "defense", boostValue: 2 }], image: img("auroral-decree") },
].map(toGameCard);

