

## Plan: Single Demo Card with All 7 Visual Upgrades

Create a temporary demo page showing one legendary card with all seven effects layered together, so you can see the full visual potential before choosing which to keep.

### What you'll see
A single legendary card (centered on screen) with:
1. **Holographic Tilt** — card follows your mouse in 3D, rainbow sheen shifts across surface
2. **Rarity Frame** — ornate gold corner flourishes and gradient border
3. **Animated Art Overlay** — light sweep + floating ember particles over the artwork
4. **Stat Bar Redesign** — gem-shaped attack/defense badges with colored glows
5. **Elemental Accent** — subtle type-based color tint over the art
6. **Entrance Animation** — card springs in with rotation + scale bounce
7. **Hover Detail Panel** — bottom stats expand on hover to show ability preview

A "Back to Game" button returns you to the normal app.

### Files changed

1. **`src/components/CardVisualDemo.tsx`** (new) — Self-contained demo component with:
   - Mouse-tracking 3D tilt via `onMouseMove` + CSS `transform: perspective(800px) rotateX() rotateY()`
   - Holographic overlay div with shifting `background-position` tied to cursor
   - Framer Motion entrance animation (spring physics)
   - Hover state that expands stat panel
   - Ember particle divs (CSS animated)
   - Redesigned stat gems instead of plain text
   - Elemental color tint overlay mapped from card type
   - Ornate corner pseudo-elements

2. **`src/index.css`** — Add new keyframes:
   - `@keyframes holo-shift` for rainbow sheen
   - `@keyframes ember-float` for particle drift
   - `@keyframes light-sweep` for art overlay
   - `.card-demo-frame` styles for ornate rarity borders

3. **`src/pages/Index.tsx`** — Add a temporary toggle/route: if `showCardDemo` state is true, render `<CardVisualDemo />` instead of the main game. A floating "Preview Card Demo" button triggers it.

### No permanent changes to GameCard.tsx
The existing card component stays untouched. Once you pick which effects you like, I'll integrate only those into the real `GameCard`.

