import type { GameCard } from "@/data/cards";
import { allCards } from "@/data/cards";

export interface ActiveSynergy {
  name: string;
  description: string;
  cardIds: string[];
  bonuses: { cardId: string; stat: string; value: number }[];
}

export interface FieldSynergyResult {
  synergies: ActiveSynergy[];
  bonusMap: Map<string, { attack: number; defense: number }>;
}

/**
 * Calculate all active synergies for cards on a field.
 * Three tiers:
 * 1. Hero + God — both on field → stat buff from synergy definition
 * 2. Card + Weapon — weapon equipped on compatible card → extra bonus from synergy
 * 3. Multi-card (3+) — same tag on field → +2 DEF aura to all matching
 */
export function calculateFieldSynergies(
  fieldCardIds: string[],
  equippedWeapons: Map<string, string> // fieldCardId → weaponCardId
): FieldSynergyResult {
  const synergies: ActiveSynergy[] = [];
  const bonusMap = new Map<string, { attack: number; defense: number }>();

  for (const id of fieldCardIds) {
    bonusMap.set(id, { attack: 0, defense: 0 });
  }

  // Tier 1: Card-to-card synergies (Hero+God or any pair on field)
  for (const id of fieldCardIds) {
    const card = allCards.find(c => c.id === id);
    if (!card) continue;

    for (const syn of card.synergies) {
      if (fieldCardIds.includes(syn.partnerId)) {
        // Check if this synergy is already added
        if (synergies.find(s => s.name === syn.name)) continue;

        const partner = allCards.find(c => c.id === syn.partnerId);
        synergies.push({
          name: syn.name,
          description: syn.description,
          cardIds: [id, syn.partnerId],
          bonuses: [{ cardId: id, stat: syn.boostedStat, value: syn.boostValue }],
        });

        const bonus = bonusMap.get(id)!;
        if (syn.boostedStat === "attack") bonus.attack += syn.boostValue;
        else bonus.defense += syn.boostValue;
      }
    }
  }

  // Tier 2: Card + Weapon synergies
  for (const [fieldCardId, weaponId] of equippedWeapons) {
    const fieldCard = allCards.find(c => c.id === fieldCardId);
    const weapon = allCards.find(c => c.id === weaponId);
    if (!fieldCard || !weapon) continue;

    // Check weapon synergies with the equipped card
    for (const syn of weapon.synergies) {
      if (syn.partnerId === fieldCardId) {
        if (synergies.find(s => s.name === syn.name)) continue;
        synergies.push({
          name: syn.name,
          description: syn.description,
          cardIds: [fieldCardId, weaponId],
          bonuses: [{ cardId: fieldCardId, stat: syn.boostedStat, value: syn.boostValue }],
        });
        const bonus = bonusMap.get(fieldCardId)!;
        if (syn.boostedStat === "attack") bonus.attack += syn.boostValue;
        else bonus.defense += syn.boostValue;
      }
    }

    // Check field card synergies with the weapon
    for (const syn of fieldCard.synergies) {
      if (syn.partnerId === weaponId) {
        if (synergies.find(s => s.name === syn.name)) continue;
        synergies.push({
          name: syn.name,
          description: syn.description,
          cardIds: [fieldCardId, weaponId],
          bonuses: [{ cardId: fieldCardId, stat: syn.boostedStat, value: syn.boostValue }],
        });
        const bonus = bonusMap.get(fieldCardId)!;
        if (syn.boostedStat === "attack") bonus.attack += syn.boostValue;
        else bonus.defense += syn.boostValue;
      }
    }

    // Tag-based weapon synergy: if weapon and card share a tag, +2 ATK bonus
    const sharedTags = fieldCard.tags.filter(t => weapon.tags.includes(t));
    if (sharedTags.length > 0) {
      const bonus = bonusMap.get(fieldCardId)!;
      bonus.attack += 2; // tag match bonus
    }
  }

  // Tier 3: Multi-card tag synergy (3+ cards with same tag)
  const tagCounts = new Map<string, string[]>();
  for (const id of fieldCardIds) {
    const card = allCards.find(c => c.id === id);
    if (!card) continue;
    for (const tag of card.tags) {
      if (!tagCounts.has(tag)) tagCounts.set(tag, []);
      tagCounts.get(tag)!.push(id);
    }
  }

  for (const [tag, ids] of tagCounts) {
    if (ids.length >= 3) {
      const synergyName = `${tag.charAt(0).toUpperCase() + tag.slice(1)} Unity`;
      if (synergies.find(s => s.name === synergyName)) continue;

      synergies.push({
        name: synergyName,
        description: `3+ ${tag} cards on field: all gain +2 DEF`,
        cardIds: ids,
        bonuses: ids.map(id => ({ cardId: id, stat: "defense", value: 2 })),
      });

      for (const id of ids) {
        const bonus = bonusMap.get(id);
        if (bonus) bonus.defense += 2;
      }
    }
  }

  return { synergies, bonusMap };
}

/**
 * Calculate passive ability bonuses from cards on the field.
 */
export function calculatePassiveBonuses(
  fieldCardIds: string[]
): Map<string, { attack: number; defense: number }> {
  const bonusMap = new Map<string, { attack: number; defense: number }>();
  for (const id of fieldCardIds) {
    bonusMap.set(id, { attack: 0, defense: 0 });
  }

  // Gather all passive abilities from field cards
  for (const id of fieldCardIds) {
    const card = allCards.find(c => c.id === id);
    if (!card?.passiveAbility) continue;

    const passive = card.passiveAbility;
    for (const targetId of fieldCardIds) {
      if (targetId === id && !passive.targetTag) continue; // self-buff only if no tag filter
      const targetCard = allCards.find(c => c.id === targetId);
      if (!targetCard) continue;

      const applies = !passive.targetTag || targetCard.tags.includes(passive.targetTag);
      if (applies) {
        const bonus = bonusMap.get(targetId)!;
        if (passive.stat === "attack") bonus.attack += passive.value;
        else bonus.defense += passive.value;
      }
    }
  }

  return bonusMap;
}
