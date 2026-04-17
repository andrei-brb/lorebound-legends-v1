import type { GameCard } from "@/data/cards";
import type { AbilityEffect, AbilityTarget } from "./abilityEffectTypes";
import { ABILITY_OVERRIDES } from "./abilityOverrides";

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

/** First integer in string, or null */
function firstInt(s: string): number | null {
  const m = s.match(/(\d+)/);
  return m ? parseInt(m[1], 10) : null;
}

/** e.g. "dealing 10 damage" -> 10 */
function damageNumber(d: string): number | null {
  const m = d.match(/(\d+)\s*damage/i);
  return m ? parseInt(m[1], 10) : null;
}

function scaledFallback(card: GameCard): AbilityEffect {
  const cost = card.specialAbility.cost ?? 3;
  const v = Math.max(2, Math.round(card.attack * 1.2 + cost));
  return { kind: "damage_single", target: "highest_hp", value: v };
}

export function inferAbilityEffect(card: GameCard): AbilityEffect {
  if (card.type !== "hero" && card.type !== "god") {
    return { kind: "generic_scaled" };
  }

  const raw = card.specialAbility.description;
  const d = raw.toLowerCase();

  // --- Blind / accuracy / miss chance ---
  // "enemies have 50% miss chance for 2 turns"
  const missChanceAll = d.match(/(\d+)%\s*miss chance.*?(\d+)\s*turn/i);
  if (missChanceAll) {
    const pct = clamp(parseInt(missChanceAll[1], 10), 0, 95);
    const turns = clamp(parseInt(missChanceAll[2], 10), 1, 6);
    return { kind: "blind_all_enemies", missChance: pct / 100, duration: turns };
  }
  // "accuracy reduced by 40% for 2 turns" / "reducing accuracy by 50%"
  const accAll = d.match(/accuracy (?:reduced|reducing).*?(\d+)%.*?(\d+)\s*turn/i) || d.match(/reducing accuracy by (\d+)%/i);
  if (accAll && /all enemies|enemies'/i.test(raw)) {
    const pct = clamp(parseInt(accAll[1], 10), 0, 95);
    const turns = accAll[2] ? clamp(parseInt(accAll[2], 10), 1, 6) : 2;
    return { kind: "blind_all_enemies", missChance: pct / 100, duration: turns };
  }
  // "blinds all enemies for 2 turns"
  const blindAll = d.match(/blinds?\s+all\s+enemies\s+for\s+(\d+)\s*turn/i);
  if (blindAll) {
    const turns = clamp(parseInt(blindAll[1], 10), 1, 6);
    // default 50% miss if not specified
    return { kind: "blind_all_enemies", missChance: 0.5, duration: turns };
  }
  // "blinds the target" / "blinds the strongest enemy for 2 turns"
  if (/blinds?\b/.test(d) && /target|strongest enemy|highest hp|most hp|weakest enemy|lowest hp/i.test(d)) {
    const turns = (() => {
      const tm = d.match(/for\s+(\d+)\s*turn/i);
      return tm ? clamp(parseInt(tm[1], 10), 1, 6) : 1;
    })();
    const pct = (() => {
      const pm = d.match(/(\d+)%\s*(?:miss|accuracy)/i) || d.match(/accuracy.*?(\d+)%/i);
      return pm ? clamp(parseInt(pm[1], 10), 0, 95) / 100 : 0.5;
    })();
    const which: AbilityTarget = /weakest|lowest/.test(d) ? "lowest_hp" : "highest_hp";
    return { kind: "blind_enemy", which, missChance: pct, duration: turns };
  }

  // --- Burn (DoT) ---
  // "Burns all enemies for 3 damage per turn for 3 turns."
  const burnAll = d.match(/burns?\s+all\s+enemies\s+for\s+(\d+)\s+damage\s+per\s+turn\s+for\s+(\d+)\s*turn/i);
  if (burnAll) {
    return {
      kind: "burn_all_enemies",
      damagePerTurn: clamp(parseInt(burnAll[1], 10), 1, 20),
      duration: clamp(parseInt(burnAll[2], 10), 1, 6),
    };
  }
  // "burning for 2/turn" or "burn for 2 turns"
  const burnPerTurn = d.match(/burn(?:ing|s)?\s+for\s+(\d+)\s*\/\s*turn/i);
  if (burnPerTurn && /strongest|target|weakest/.test(d)) {
    const which: AbilityTarget = /weakest|lowest/.test(d) ? "lowest_hp" : "highest_hp";
    const turns = (() => {
      const tm = d.match(/for\s+(\d+)\s*turn/i);
      return tm ? clamp(parseInt(tm[1], 10), 1, 6) : 2;
    })();
    return { kind: "burn_enemy", which, damagePerTurn: clamp(parseInt(burnPerTurn[1], 10), 1, 20), duration: turns };
  }
  // "Burns for 2 turns." (applies to all enemies if combined with AoE)
  const burnTurnsOnly = d.match(/burns?\s+for\s+(\d+)\s*turn/i);
  if (burnTurnsOnly && /\ball enemies\b/.test(d)) {
    return { kind: "burn_all_enemies", damagePerTurn: 3, duration: clamp(parseInt(burnTurnsOnly[1], 10), 1, 6) };
  }

  // "Blinds and burns the strongest enemy for 8 damage over 2 turns."
  const burnOver = d.match(/burns?\b.*?(\d+)\s*damage\s+over\s+(\d+)\s*turn/i);
  if (burnOver && /strongest|highest hp|most hp|weakest|lowest hp|target/i.test(d)) {
    const total = clamp(parseInt(burnOver[1], 10), 1, 40);
    const turns = clamp(parseInt(burnOver[2], 10), 1, 6);
    const per = Math.max(1, Math.floor(total / turns));
    const which: AbilityTarget = /weakest|lowest/.test(d) ? "lowest_hp" : "highest_hp";
    const steps: AbilityEffect[] = [];
    if (/blind/.test(d)) steps.push({ kind: "blind_enemy", which, missChance: 0.5, duration: turns });
    steps.push({ kind: "burn_enemy", which, damagePerTurn: per, duration: turns });
    return steps.length === 1 ? steps[0]! : { kind: "sequence", steps };
  }

  // --- Composites (heal + something) ---
  const healAllMatch = d.match(/heals?\s+all\s+allies\s+for\s+(\d+)\s*hp/);
  if (healAllMatch) {
    const h = parseInt(healAllMatch[1], 10);
    const steps: AbilityEffect[] = [{ kind: "heal", scope: "all_allies", value: h }];
    if (/invisibility|ethereal|barrier|defense/.test(d) && /grants?|granting|\+(\d+)\s*def/.test(d)) {
      const dm = d.match(/\+(\d+)\s*def/i);
      steps.push({ kind: "buff_allies", stat: "defense", value: dm ? parseInt(dm[1], 10) : 2, duration: 2 });
    } else if (/\+(\d+)\s*attack.*all allies|all allies.*\+(\d+)\s*attack/.test(d)) {
      const m = d.match(/\+(\d+)\s*attack/);
      steps.push({ kind: "buff_allies", stat: "attack", value: m ? parseInt(m[1], 10) : 2, duration: 2 });
    } else if (damageNumber(d) !== null && /all enemies/.test(d)) {
      steps.push({ kind: "damage_aoe", value: damageNumber(d)! });
    } else if (damageNumber(d) !== null && /strongest/.test(d)) {
      steps.push({
        kind: "damage_single",
        target: "highest_hp",
        value: damageNumber(d)!,
        stun: /stun/.test(d),
      });
    }
    if (steps.length > 1) return { kind: "sequence", steps };
    return steps[0]!;
  }

  // Bloom / similar: damage + heal allies
  if (/dealing\s+(\d+)\s+damage.*healing\s+allies\s+(\d+)/i.test(raw) || /(\d+)\s+damage.*heal.*allies\s+for\s+(\d+)/i.test(d)) {
    const m = raw.match(/(\d+)\s+damage/i);
    const h = raw.match(/heal(?:ing)?\s+allies\s+(\d+)/i) || raw.match(/allies\s+(\d+)\s*hp/i);
    const dmg = m ? parseInt(m[1], 10) : 4;
    const heal = h ? parseInt(h[1], 10) : 4;
    return { kind: "sequence", steps: [{ kind: "damage_aoe", value: dmg }, { kind: "heal", scope: "all_allies", value: heal }] };
  }

  // Sanctuary: heal + shield
  if (/prevents all damage|absorbs all damage/i.test(d) && /heals?\s+(\d+)/i.test(d)) {
    const hm = d.match(/heals?\s+(\d+)/);
    return {
      kind: "sequence",
      steps: [
        { kind: "heal", scope: "all_allies", value: hm ? parseInt(hm[1], 10) : 3 },
        { kind: "shield_side", value: 15 },
      ],
    };
  }

  // Heal: single ally
  if (/restores?\s+(\d+)\s*hp\s+to\s+a\s+single\s+ally|restores?\s+(\d+)\s*hp\s+to\s+one\s+ally/i.test(d)) {
    const m = raw.match(/(\d+)\s*hp/i);
    return { kind: "heal", scope: "lowest_ally", value: m ? parseInt(m[1], 10) : 5 };
  }

  // Heal self + damage (Holy Smite)
  if (/heals?\s+self\s+for\s+(\d+).*deals?\s+(\d+)/i.test(d) || /deals?\s+(\d+).*heals?\s+self\s+for\s+(\d+)/i.test(d)) {
    const m1 = d.match(/deals?\s+(\d+)/i);
    const m2 = d.match(/heals?\s+self\s+for\s+(\d+)/i);
    const dmg = m1 ? parseInt(m1[1], 10) : 7;
    const heal = m2 ? parseInt(m2[1], 10) : 3;
    return { kind: "drain", target: "highest_hp", damage: dmg, healSelf: heal };
  }

  // Purifying Flame / similar
  if (/holy damage.*heals?\s+self/i.test(d)) {
    const m = d.match(/(\d+)\s*holy/i);
    const h = d.match(/heals?\s+self\s+for\s+(\d+)/i);
    return {
      kind: "drain",
      target: "highest_hp",
      damage: m ? parseInt(m[1], 10) : 5,
      healSelf: h ? parseInt(h[1], 10) : 5,
    };
  }

  // Heal all allies (catch-all for phrasing not handled above)
  if (/heals?\s+all\s+allies/i.test(d) && !/heals?\s+all\s+allies\s+for\s+(\d+)\s*hp/.test(d)) {
    const m = d.match(/for\s+(\d+)/i);
    const n = m ? parseInt(m[1], 10) : firstInt(d) ?? 5;
    return { kind: "heal", scope: "all_allies", value: clamp(n, 2, 20) };
  }

  // AoE damage
  if (
    /\ball enemies\b/.test(d) &&
    /\bfire damage\b|\bdamage\b|\bburns\b|\bwave\b|\bmeteors\b|\bflame\b|\bdivine fire\b/i.test(d)
  ) {
    const n = damageNumber(d) ?? firstInt(d);
    if (n !== null) return { kind: "damage_aoe", value: clamp(n, 1, 25) };
  }

  if (/\bto all enemies\b/.test(d)) {
    const n = damageNumber(d) ?? firstInt(d);
    if (n !== null) {
      const debuff =
        /reduc(?:e|ing).*attack by (\d+).*(\d+)\s*turn/i.test(d) || /attack by (\d+).*for (\d+) turn/i.test(d)
          ? (() => {
              const dm = d.match(/attack by (\d+)/i);
              const tm = d.match(/(\d+)\s*turn/i);
              return {
                stat: "attack" as const,
                value: dm ? parseInt(dm[1], 10) : 2,
                duration: tm ? parseInt(tm[1], 10) : 2,
              };
            })()
          : undefined;
      return { kind: "damage_aoe", value: clamp(n, 1, 25), debuff };
    }
  }

  // Gale Force: damage + debuff all attack
  if (/deals?\s+(\d+)\s+damage.*reduc(?:e|ing).*all enemy attack by (\d+)/i.test(d)) {
    const m = raw.match(/(\d+)\s+damage/i);
    const dm = raw.match(/attack by (\d+)/i);
    const tm = raw.match(/(\d+)\s*turn/i);
    return {
      kind: "sequence",
      steps: [
        { kind: "damage_aoe", value: m ? parseInt(m[1], 10) : 5 },
        {
          kind: "debuff_all_enemies",
          stat: "attack",
          value: dm ? parseInt(dm[1], 10) : 2,
          duration: tm ? parseInt(tm[1], 10) : 2,
        },
      ],
    };
  }

  // Howl / terrify: debuff attack all
  if (/reduc(?:e|ing).*all enemy attack|reduc(?:e|ing).*their attack by/i.test(d) && /all enemies|all enemy/i.test(d)) {
    const dm = d.match(/attack by (\d+)/i);
    const tm = d.match(/(\d+)\s*turn/i);
    return {
      kind: "debuff_all_enemies",
      stat: "attack",
      value: dm ? parseInt(dm[1], 10) : 2,
      duration: tm ? parseInt(tm[1], 10) : 2,
    };
  }

  // Song of Valor / War Cry — buff all allies
  if (/grants?\s+\+(\d+)\s+attack.*all allies|all allies.*\+(\d+)\s+attack/i.test(d)) {
    const m = d.match(/\+(\d+)\s+attack/i);
    const tm = d.match(/(\d+)\s*turn/i);
    return {
      kind: "buff_allies",
      stat: "attack",
      value: m ? parseInt(m[1], 10) : 2,
      duration: tm ? parseInt(tm[1], 10) : 2,
    };
  }

  if (/grants?\s+\+(\d+)\s+attack and \+(\d+)\s+defense to all allies/i.test(d)) {
    const m = d.match(/\+(\d+)\s+attack/i);
    const m2 = d.match(/\+(\d+)\s+defense/i);
    const tm = d.match(/(\d+)\s*turn/i);
    return {
      kind: "sequence",
      steps: [
        { kind: "buff_allies", stat: "attack", value: m ? parseInt(m[1], 10) : 2, duration: tm ? parseInt(tm[1], 10) : 2 },
        { kind: "buff_allies", stat: "defense", value: m2 ? parseInt(m2[1], 10) : 2, duration: tm ? parseInt(tm[1], 10) : 2 },
      ],
    };
  }

  if (/\+(\d+)\s+defense to all allies/i.test(d)) {
    const m = d.match(/\+(\d+)\s+defense/i);
    const tm = d.match(/(\d+)\s*turn/i);
    return {
      kind: "buff_allies",
      stat: "defense",
      value: m ? parseInt(m[1], 10) : 3,
      duration: tm ? parseInt(tm[1], 10) : 2,
    };
  }

  // First Light: buff attack all
  if (/grants?\s+\+(\d+)\s+attack to all allies/i.test(d)) {
    const m = d.match(/\+(\d+)\s+attack/i);
    return { kind: "buff_allies", stat: "attack", value: m ? parseInt(m[1], 10) : 2, duration: 2 };
  }

  // Shield / barrier
  if (/absorb(?:ing)?\s+(\d+)\s+damage|barrier absorbing|light barrier/i.test(d)) {
    const m = d.match(/(\d+)\s*damage/i);
    return { kind: "shield_side", value: m ? parseInt(m[1], 10) : 8 };
  }

  // Strongest enemy
  if (/strongest enemy|highest hp|most hp/i.test(d)) {
    const n = damageNumber(d) ?? firstInt(d);
    if (n !== null) {
      return {
        kind: "damage_single",
        target: "highest_hp",
        value: clamp(n, 1, 25),
        stun: /stun/.test(d),
        ignoreDefenseFrac: /ignoring defense|ignores defense|bypass/i.test(d) ? 1 : undefined,
      };
    }
  }

  // Weakest enemy
  if (/weakest enemy|lowest hp|below \d+%/i.test(d)) {
    const n = damageNumber(d) ?? firstInt(d);
    if (n !== null) {
      return {
        kind: "damage_single",
        target: "lowest_hp",
        value: clamp(n, 1, 30),
        ignoreDefenseFrac: /ignoring defense|ignores/i.test(d) ? 1 : undefined,
      };
    }
  }

  // Soul Reap: execute low HP + drain
  if (/below\s+(\d+)%/i.test(d)) {
    const n = damageNumber(d) ?? 8;
    return { kind: "damage_single", target: "lowest_hp", value: n, ignoreDefenseFrac: 0.5 };
  }

  // Ignore defense single
  if (/ignores?\s+(\d+)%\s+defense|ignoring defense|ignore defense|bypass/i.test(d)) {
    const n = damageNumber(d) ?? firstInt(d);
    const frac = /50%/.test(d) ? 0.5 : /ignoring defense/i.test(d) ? 1 : 0.25;
    return {
      kind: "damage_single",
      target: "highest_hp",
      value: n ?? Math.max(2, Math.round(card.attack * 1.2 + cost)),
      ignoreDefenseFrac: frac,
    };
  }

  // Twin slash / double hit
  if (/(\d+)\+(\d+)\s* damage|strikes twice|each hit dealing (\d+)/i.test(d)) {
    const m = d.match(/each hit.*?(\d+)/i) || d.match(/(\d+)\+(\d+)/);
    const each = m ? parseInt(m[1], 10) : 4;
    return { kind: "damage_multi", hits: 2, damageEach: each, randomTargets: false };
  }

  // Random multi targets
  if (/(\d+)\s+random enemies/i.test(d)) {
    const hm = d.match(/(\d+)\s+random/i);
    const dm = d.match(/(\d+)\s*damage each/i) || d.match(/dealing (\d+)/i);
    const hits = hm ? parseInt(hm[1], 10) : 3;
    const each = dm ? parseInt(dm[1], 10) : 4;
    return { kind: "damage_multi", hits, damageEach: each, randomTargets: true };
  }

  if (/attacks\s+(\d+)\s+random enemies/i.test(d)) {
    const hm = d.match(/(\d+)\s+random/i);
    const dm = d.match(/(\d+)\s*damage each/i);
    return {
      kind: "damage_multi",
      hits: hm ? parseInt(hm[1], 10) : 3,
      damageEach: dm ? parseInt(dm[1], 10) : 3,
      randomTargets: true,
    };
  }

  // Volley
  if (/rain of arrows|volley/i.test(d) && /all enemies/i.test(d)) {
    const n = damageNumber(d) ?? 3;
    return { kind: "damage_aoe", value: n };
  }

  // Single target + stun (no strongest keyword)
  if (/stun.*turn|stuns for/i.test(d)) {
    const n = damageNumber(d) ?? firstInt(d);
    if (n !== null) {
      return { kind: "damage_single", target: "highest_hp", value: n, stun: true };
    }
  }

  // Frenzy: hurt self
  if (/takes\s+(\d+)\s+damage from exhaustion/i.test(d)) {
    const m = d.match(/takes\s+(\d+)/i);
    return {
      kind: "sequence",
      steps: [
        { kind: "damage_single", target: "highest_hp", value: 6 },
        { kind: "hurt_self", value: m ? parseInt(m[1], 10) : 3 },
      ],
    };
  }

  // Default: single target damage with parsed number or scaled
  const dn = damageNumber(d);
  if (dn !== null && !/all allies/i.test(d)) {
    const tgt: AbilityTarget = /weakest|lowest|below/i.test(d) ? "lowest_hp" : "highest_hp";
    return {
      kind: "damage_single",
      target: tgt,
      value: clamp(dn, 1, 25),
      stun: /stun|sleep|freeze/i.test(d) && !/all enemies/i.test(d),
      ignoreDefenseFrac: /ignore/i.test(d) ? 0.5 : undefined,
    };
  }

  return scaledFallback(card);
}

export function resolveAbilityEffect(card: GameCard): AbilityEffect {
  if (card.cardRules?.abilityEffect) return card.cardRules.abilityEffect;
  if (ABILITY_OVERRIDES[card.id]) return ABILITY_OVERRIDES[card.id]!;
  return inferAbilityEffect(card);
}
