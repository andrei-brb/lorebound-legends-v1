

# TCG Combat System Overhaul

## Overview
Complete rewrite of the battle system into a strategic hand/field TCG with 5 card types, deck drawing, 30 HP + shield, and a mirror-match AI.

---

## Card Types

| Type | Role | Field? |
|------|------|--------|
| **Hero** | Core fighters, placed on field (max 4), have HP/ATK/DEF | Yes |
| **God** | Powerful field units, synergize with Heroes, have HP/ATK/DEF | Yes |
| **Weapon** | Equip to a Hero/God on field, consumed from hand, boosts stats | No (consumed) |
| **Spell** | Instant effect (damage, heal, buff), single-use, discarded | No (consumed) |
| **Trap** | Played face-down, triggers on enemy action (counter, redirect) | Yes (hidden) |

Current `item` type cards will be reclassified as `weapon`. New spell and trap cards will be added to the card pool.

---

## Battle Flow

```text
SETUP
  - Both sides: 30 HP + 10 Shield (shield absorbs first direct hits)
  - Shuffle deck, draw 5 cards
  - Player goes first

EACH TURN (1 action only):
  ┌─ Play Hero/God → place on field (max 4 slots)
  ├─ Play Weapon → attach to field card (consumed)
  ├─ Play Spell → instant effect, discard
  ├─ Set Trap → place face-down on field
  ├─ Attack with field card → pick target (field card or direct)
  └─ Use Active Ability → costs the turn action
  
  Then: draw 1 card from deck
  If hand empty + no field cards + deck empty → instant loss
  Drawing from empty deck → lose 5 HP

DIRECT ATTACK
  - Only when opponent has NO field cards
  - Damage = Attacker ATK (DEF doesn't apply)
  - Shield absorbs first, then HP

WIN: Opponent HP reaches 0
LOSS: Your HP reaches 0
DRAW: Both hit 0 same turn → 50% rewards
```

---

## Synergy System

Three synergy tiers:
1. **Hero + God** — Both on field at same time → stat buff (e.g. Warrior + Ares = +15% ATK)
2. **Card + Weapon** — Matching tags → bonus stats beyond base weapon bonus
3. **Multi-card (3+)** — Same tag on field → aura buff (e.g. 3x Olympus Gods = +2 DEF all, "Divine Shield")

Visual indicators: gold text for bonuses, glowing connection lines between synergy pairs, tooltip on hover.

---

## Ability System

- **Passive**: Always active while card is on field (e.g. "+1 ATK to all Warriors")
- **Active**: Uses your turn action. 1 use per card per battle (or cooldown-based)
- **Synergy Ability**: Appears only when synergy condition is met. Stronger than base abilities

---

## Trap & Spell Cards

**Spells** (instant, discard after use):
- Damage spells (deal X to target), heals, buffs (temp ATK/DEF boost), debuffs

**Traps** (set face-down, auto-trigger):
- Counter-attack: When attacked, reflect X damage back
- Damage redirect: Redirect attack to another target
- Reveal: Force-flip an enemy trap

---

## Enemy AI (Mirror System)

The AI uses the same hand/field/deck mechanics as the player:
- Draws cards, plays to field, equips weapons, attacks
- Decision priority: Play high-value cards → equip weapons → attack weakest enemy → set traps
- No cheating — AI follows same rules and card limits

---

## Technical Changes

### Data Model Updates (`src/data/cards.ts`)
- Expand `CardType` to `"hero" | "god" | "weapon" | "spell" | "trap"`
- Add `hp` field to hero/god cards (field units need HP)
- Add `tags: string[]` for synergy matching (e.g. `["warrior", "olympus"]`)
- Add `weaponBonus?: { attack: number; defense: number }` for weapon cards
- Add `spellEffect?: { type: string; value: number; target: string }` for spells
- Add `trapEffect?: { trigger: string; effect: string; value: number }` for traps
- Add ~15 new weapon/spell/trap cards to the pool
- Reclassify existing `item` type cards as `weapon`

### New Engine (`src/lib/battleEngine.ts` — full rewrite)
- `BattleState`: tracks hand[], field[], deck[], graveyard[], playerHp, shield, traps
- Turn actions: `playCard`, `equipWeapon`, `castSpell`, `setTrap`, `attackTarget`, `useAbility`
- Trap trigger resolution on enemy attacks
- Draw phase at end of turn
- Empty deck penalty (5 HP)

### New Synergy Engine (`src/lib/synergyEngine.ts`)
- Recalculate synergies whenever field changes
- Three-tier check: Hero+God, Card+Weapon, Multi-card tag count
- Return active synergy list with bonuses

### New UI Components
- `BattleField.tsx` — 4 slots per side, shows field cards with HP bars, weapon icons, trap face-downs
- `BattleHand.tsx` — Scrollable hand of cards at bottom, click to play
- `BattleTargetSelect.tsx` — Target picker when attacking (which enemy field card, or direct)
- Update `BattleArena.tsx` — Wire new components, handle turn flow, AI turn logic

### Files Summary

| Action | File | Purpose |
|--------|------|---------|
| Modify | `src/data/cards.ts` | Add hp, tags, weapon/spell/trap fields, new cards, reclassify items |
| Rewrite | `src/lib/battleEngine.ts` | Full TCG state machine with hand/field/deck |
| Create | `src/lib/synergyEngine.ts` | Field-based synergy calculations |
| Rewrite | `src/components/BattleArena.tsx` | New layout with hand, field, HP bars |
| Create | `src/components/BattleField.tsx` | 4-slot field display per player |
| Create | `src/components/BattleHand.tsx` | Hand card display and play actions |
| Create | `src/components/BattleTargetSelect.tsx` | Target selection overlay |
| Modify | `src/components/BattleCardDisplay.tsx` | Show HP bar, weapon icon, trap state |
| Modify | `src/components/DeckBuilder.tsx` | Support mixed deck building (heroes, weapons, spells, traps) |

