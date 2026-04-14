

# Card Catalog Tab — Plan

## What We're Building
A new **"Catalog"** tab showing ALL cards in the game, organized by type (Gods, Heroes, Weapons/Shields, Skills, Traps) and then by rarity. Locked cards appear greyed out; owned cards show full color. Clicking any card opens a modal with the card at full size, flippable to see stats/lore on the back.

## Layout

```text
┌─────────────────────────────────────────────┐
│ [Collection] [Catalog] [Summon] [Deck] [Battle] │  ← new tab added
├─────────────────────────────────────────────┤
│  Filter pills: [Gods] [Heroes] [Weapons] [Skills] [Traps] [All]  │
├─────────────────────────────────────────────┤
│  ⚜️ Legendary                               │
│  ┌──┐ ┌──┐ ┌──┐ ┌──┐                       │
│  │🔓│ │🔒│ │🔓│ │🔒│  ← color vs greyscale │
│  └──┘ └──┘ └──┘ └──┘                       │
│  💎 Rare                                    │
│  ...                                        │
│  🗡️ Common                                  │
│  ...                                        │
├─────────────────────────────────────────────┤
│           Card Detail Modal                 │
│  ┌────────────────────────┐                 │
│  │   Full-size GameCard   │  ← click to flip│
│  │   (front / back)      │                  │
│  └────────────────────────┘                 │
│         [Close]                             │
└─────────────────────────────────────────────┘
```

## Steps

### 1. Create `CardCatalog.tsx` component
- Import `allCards` and group by `card.type`, then within each type group by `rarity` (legendary → rare → common).
- Add filter pills at the top to show one type or all.
- For each card, check if `playerState.ownedCardIds` includes it. If not, render with a CSS `grayscale` filter and reduced opacity.
- On card click, open a modal (Dialog) with the card rendered at `size="lg"`, flippable (the existing GameCard flip behavior handles this already since without an `onClick` prop it toggles flip).
- Show a count badge like "12/50 Gods unlocked".

### 2. Update `GameCard.tsx`
- Add an optional `locked` prop. When true, apply `filter: grayscale(100%)` and `opacity: 0.5` via CSS classes, and disable hover effects.
- The card should still be clickable when locked (to open the modal and see what it looks like greyed out and its specs).

### 3. Card Detail Modal
- Use the existing `Dialog` component from shadcn/ui.
- Render the selected `GameCard` at `size="lg"` centered in the modal.
- The card flips on click (default behavior when no `onClick` prop is passed).
- Show owned/locked status text below the card.

### 4. Add "Catalog" tab to `Index.tsx`
- Add a new tab entry with a `BookOpen` or `Grid` icon.
- Render `<CardCatalog playerState={playerState} />` when active.

## Technical Details
- Greyscale is pure CSS: `className="grayscale opacity-50"` (Tailwind classes).
- No new dependencies needed — uses existing Dialog, GameCard, and card data.
- Filter state is local `useState` in the Catalog component.
- Card types from data: `"hero" | "god" | "weapon" | "spell" | "trap"` — we'll label "spell" as "Skill" and group weapon as "Weapon/Shield" in the UI labels.

