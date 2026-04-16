

## Battle UI Redesign — Hearthstone-Inspired

Based on your choices: centered battlefield with mini card frames (not round), side info panel, tap-to-select radial menu, hero portraits with HP rings, attack animations, and compact battle log.

---

### Layout Overview

```text
┌──────────────────────────────────────────────────────────┬──────────────┐
│                    ENEMY HERO PORTRAIT                   │              │
│                  (HP ring + shield + AP)                 │   INFO       │
│                                                         │   PANEL      │
│  [card] [card] [card] [card]   ← enemy field            │              │
│  ─────── trap slots ───────                             │  • Selected  │
│                                                         │    card      │
│              ═══ VS divider ═══                         │    details   │
│                                                         │  • Ability   │
│  ─────── trap slots ───────                             │  • Synergies │
│  [card] [card] [card] [card]   ← player field           │  • Log (3)   │
│                                                         │              │
│                   PLAYER HERO PORTRAIT                   │              │
│                  (HP ring + shield + AP)                 │              │
├──────────────────────────────────────────────────────────┴──────────────┤
│  [hand card] [hand card] [hand card] [hand card] [hand card]           │
│                          YOUR HAND                    [End Turn]       │
└────────────────────────────────────────────────────────────────────────┘
```

On mobile (<768px), the side panel collapses to a slide-up sheet triggered by tapping a card.

---

### 1. New `BattleCardToken` component (replaces `BattleCardDisplay` on the field)

Compact mini card frame (~64x80px):
- Card art fills the frame
- Rarity shown as border glow color (gold/purple/gray)
- ATK number badge bottom-left, HP badge bottom-right
- Weapon icon overlay (small sword) if equipped
- Element pip top-right
- Stunned = grayscale overlay
- No name, no ability text, no HP bar on the token itself

### 2. Radial action menu

When a player taps their own field card:
- A small popup appears anchored to the card with 2-3 icon buttons arranged in an arc above the card:
  - ⚔️ Attack (red) — starts target selection
  - ⚡ Ability (gold) — uses ability immediately
  - 🎯 Direct Attack (if no enemy field cards)
- Greyed out if stunned/already attacked/no AP
- Tap anywhere else or another card to dismiss
- No global "Attack" button in the bottom bar anymore

### 3. Hero portrait panels

Replace the flat HP bars with circular hero portraits:
- Player portrait (bottom center): circular frame with HP as a colored ring (green → yellow → red)
- Enemy portrait (top center): same style, skull-themed
- Shield shown as a small number badge on the portrait
- AP shown as crystal dots below the portrait (filled = available, empty = spent)

### 4. Side info panel (desktop)

Right panel (~240px wide, collapsible):
- **Selected card section**: When hovering/tapping a field card, shows full details — name, rarity, element, ATK/DEF/HP, ability name + description, passive, equipped weapon name + stats, synergies active on this card
- **Compact battle log**: Last 3 log entries visible, scrollable on expand. Replaces the full-width log section
- On mobile: this becomes a bottom sheet that slides up when a card is tapped

### 5. Attack animations

- **Lunge**: Attacking card briefly translates toward the target (using framer-motion `animate`)
- **Slash effect**: Brief CSS slash overlay on the target
- **Spell projectile**: A colored orb moves from caster to target
- **Death**: Card shrinks + fades with a brief red flash
- All animations use framer-motion, keep them under 500ms

### 6. Hand area

- Cards in hand stay as small rectangular frames (~72x96px) at the bottom
- Tapping a weapon in hand enters "select equip target" mode (tap a field card to equip)
- Tapping a spell enters target selection mode
- Tapping a hero/god plays it to an empty field slot
- Selected hand card gets a lift + glow effect

### 7. Header simplification

- Remove the top header bar (title, turn indicator)
- Turn indicator becomes a badge centered between the two fields ("YOUR TURN" / "ENEMY TURN")
- End Turn button moves to the right side of the hand area
- Retreat button becomes a small icon in the top-left corner

---

### Files to change

| File | Change |
|------|--------|
| `src/components/BattleCardToken.tsx` | **New** — compact field card token component |
| `src/components/BattleRadialMenu.tsx` | **New** — tap-to-select radial action menu |
| `src/components/HeroPortrait.tsx` | **New** — circular hero portrait with HP ring |
| `src/components/BattleInfoPanel.tsx` | **New** — side panel for card details + log |
| `src/components/BattleArena.tsx` | **Major rewrite** — new layout, integrate all new components, attack animations |
| `src/components/BattleCardDisplay.tsx` | Keep for reference but no longer used on field (hand cards use inline rendering) |
| `src/index.css` | Add keyframes for slash effect and lunge animation |

### What stays the same

- All battle engine logic (`battleEngine.ts`) untouched
- All game-over rewards, quest progression, battle pass XP logic preserved
- Card interactions (play, equip, spell, trap, ability, attack) — same logic, just different UI triggers
- Enemy AI turn behavior unchanged
- Board skin cosmetic support preserved

