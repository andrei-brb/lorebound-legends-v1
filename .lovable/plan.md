

## UI Polish Plan — Mythic Arcana

This is a comprehensive visual/UX polish pass across 7 tabs. No features are removed; all existing behaviors (mail badge, live PvP invite flow, trade typeahead, animations) are preserved.

---

### 1. Deck Builder (`DeckBuilder.tsx`)

**Problems**: Raw `<select>` elements instead of shadcn Select; preset management area is visually noisy; no empty-state illustration; filter bar sprawls.

**Changes**:
- Replace native `<select>` dropdowns with shadcn `Select` components (already used for sort)
- Wrap preset section in a collapsible `Accordion` — collapsed by default, showing preset count badge
- Add proper empty state for deck panel: illustration icon + "Tap cards below to build your deck" CTA
- Group filter controls into a compact horizontal bar with shadcn `Badge` toggle chips instead of native selects
- Add deck strength indicator (simple avg stats bar) in the deck panel header
- Sticky deck panel: add subtle gradient top fade when scrolled
- Mobile FAB: add pulsing dot when deck has 4+ cards (battle-ready indicator)

### 2. Collection View (`CollectionView.tsx`)

**Problems**: Cards dump in a flat `flex-wrap`; no empty state for "no owned cards"; lore arc pills aren't interactive; XP bars feel detached.

**Changes**:
- Wrap each rarity section in a shadcn `Card` with `CardHeader` for the rarity title
- Add collection completion percentage badge per rarity
- Improve empty state: "No cards yet — visit the Summon tab!" with link button
- Make lore arc pills clickable to filter cards by arc
- Tighten card grid gap on mobile; use CSS grid with `auto-fill` minmax for responsive columns instead of flex-wrap

### 3. Summon / Pack Shop (`PackShop.tsx`)

**Problems**: Stats bar is a flat row of boxes; pack cards lack hover polish; free pack claim button uses `animate-pulse` which feels janky.

**Changes**:
- Replace `animate-pulse` on claim button with a smoother `animate-bounce` or a subtle glow keyframe
- Wrap stats bar items in a single shadcn `Card` row with dividers
- Add shimmer/shine effect on pack card hover (CSS-only `::after` gradient sweep)
- Show "BEST VALUE" badge on Gold pack
- Add confirmation dialog (shadcn `AlertDialog`) before spending gold on Silver/Gold packs
- Pity counter: make it a proper labeled progress bar with tooltip explanation

### 4. Trade UI (`TradeUI.tsx`)

**Problems**: Phase tabs are plain buttons; outgoing trades show minimal info; create-trade flow is dense; market listings lack visual hierarchy.

**Changes**:
- Replace phase buttons with shadcn `Tabs` / `TabsList` / `TabsTrigger` for cleaner tab switching
- Incoming/Outgoing empty states: add themed illustrations (crossed swords icon for empty, not just text)
- Create Trade: split into stepped flow with clearer card selection (left = your cards, right = requested cards) using two-column `Card` layout
- Add gold/stardust tax display as a callout badge
- Market listings: add seller avatar placeholder, card thumbnail previews, and "Buy" vs "Offer" CTA distinction
- Friend typeahead dropdown: use shadcn `Command` / `CommandInput` pattern for better UX

### 5. PvP Panel (`PvPPanel.tsx`)

**Problems**: Ranked and Live sections look identical; match history is minimal; live match view is raw data.

**Changes**:
- Ranked section: use shadcn `Card` with a gradient header strip (gold/legendary themed)
- Live section: use shadcn `Card` with primary-themed header
- Match history items: add win/loss badge coloring (green for win, red for loss)
- Live match view: display card names instead of raw IDs; add "Your Turn" as a prominent animated badge
- Queue button: add loading spinner state while waiting
- Replace native `<select>` for preset picker with shadcn `Select`
- Empty history state: trophy icon + "Play your first ranked match!"

### 6. Mail / Inbox (`InboxPanel.tsx`)

**Problems**: Messages are uniform rectangles; no visual distinction by type; empty state is plain text.

**Changes**:
- Add type-specific left accent colors (trade = blue, pvp = red, system = gray)
- Add type icon per notification (ArrowLeftRight for trade, Swords for pvp, Bell for system)
- Empty state: envelope icon illustration + "All caught up!" message
- PvP invite row: make Accept/Decline buttons more prominent with color coding (green/red)
- Add subtle slide-in animation for new messages
- Group messages by date (Today / Yesterday / Earlier) using section headers

### 7. Battle Pass (`BattlePass.tsx`)

**Problems**: Already the most polished tab. Minor tweaks only.

**Changes**:
- Season switcher: use shadcn `Tabs` instead of plain buttons for cleaner look
- XP progress card: add level-up sparkle animation when near threshold
- Preview modal: already uses a custom overlay — convert to shadcn `Dialog` for accessibility (keyboard trap, Escape to close)
- Reward cells: add subtle entrance stagger animation when scrolling into view

### 8. Global / Layout (`Index.tsx`)

**Changes**:
- Header category nav: on mobile (< 768px), show icons only with tooltip on long-press
- Sub-tab bar: add active indicator underline animation (sliding bar)
- Currency display: add subtle count-up animation on value changes
- Wrap main content area transitions in a shared fade-in/out for tab switches
- Ensure all tab content areas have consistent top padding and max-width

### Technical approach

- All changes use existing Tailwind classes + shadcn components already in the project
- No new dependencies needed (framer-motion already installed)
- Native `<select>` elements → shadcn `Select` across all panels
- Custom tab buttons → shadcn `Tabs` where appropriate
- Responsive: use Tailwind breakpoints (`sm:`, `md:`, `lg:`, `xl:`) consistently
- Animations: use CSS transitions/keyframes defined in `index.css`, avoid layout-triggering animations

### File change summary

| File | Type of change |
|------|---------------|
| `DeckBuilder.tsx` | Major refactor — shadcn selects, accordion presets, better empty state |
| `CollectionView.tsx` | Medium — grid layout, card wrappers, clickable arcs, empty state |
| `PackShop.tsx` | Medium — confirmation dialog, shimmer effect, stats card |
| `TradeUI.tsx` | Major — shadcn Tabs, stepped create flow, Command typeahead |
| `PvPPanel.tsx` | Medium — shadcn Cards/Select, match history badges, card names |
| `InboxPanel.tsx` | Medium — type accents, icons, date grouping, better empty state |
| `BattlePass.tsx` | Minor — Dialog for preview, Tabs for season switcher |
| `Index.tsx` | Minor — mobile nav polish, transition wrapper |
| `index.css` | Minor — new keyframes (shimmer, glow pulse) |

