

## Battle Pass — Reward Structure & Implementation Plan

### Reward Layout (30 Levels, Dual Track)

**FREE Track** — Moderate value, keeps F2P players progressing:

| Levels | Reward Type | Examples |
|--------|------------|---------|
| 1, 2, 3, 4 | Gold + Stardust | 200g, 50 dust, 300g, 75 dust |
| **5** | **Legendary milestone** | Seasonal card back "Bloom Crest" (season exclusive) |
| 6, 7, 8, 9 | XP Boost + Gold + Bronze Pack | 2x XP (1hr), 400g, Bronze Pack, 100 dust |
| **10** | **Legendary milestone** | Free Common hero "Verdant Sprout" (seasonal) |
| 11–14 | Gold, Dust, XP Boosts | Mixed currency rewards |
| **15** | **Legendary milestone** | Seasonal title "Bloomwalker" |
| 16–19 | Silver Pack, Gold, Dust | Escalating currency |
| **20** | **Legendary milestone** | Free Rare hero "Thornweaver" (seasonal) |
| 21–24 | Gold, Dust, Bronze Packs | Mixed |
| **25** | **Legendary milestone** | Seasonal emote "Petal Storm" |
| 26–29 | Silver Pack, Gold, Dust | Final push rewards |
| **30** | **Legendary milestone** | Exclusive cosmetic: "Bloom Aura" card frame |

**ELITE Track** — Premium flex, exclusive heroes & cosmetics:

| Levels | Reward Type | Examples |
|--------|------------|---------|
| 1–4 | 2x Gold + Stardust (doubled) | 400g, 100 dust, 600g, 150 dust |
| **5** | **Legendary milestone** | Animated card back "Bloom Inferno" (season exclusive) |
| 6–9 | Gold Packs + bonus currency | Gold Pack, 500g, 200 dust, 2x XP (2hr) |
| **10** | **Legendary milestone** | Elite Rare hero "Pyralis, the Bloom Knight" (seasonal) |
| 11–14 | Gold Packs, bonus Dust, crafting mats | Premium currency flow |
| **15** | **Legendary milestone** | Seasonal board skin "Runed Garden" |
| 16–19 | 2x Gold, Gold Packs, Dust | Escalating |
| **20** | **Legendary milestone** | Elite Legendary hero "Solara, Bloom Empress" (seasonal) |
| 21–24 | Gold Packs, bonus currency | Premium flow |
| **25** | **Legendary milestone** | Animated border "Eternal Bloom" |
| 26–29 | Gold Packs, 2x currency | Final stretch |
| **30** | **Legendary milestone** | Seasonal animated hero variant "Celestial Solara" (alternate art, never returns) |

### Implementation

**Files to create/edit:**

1. **Create `src/components/BattlePass.tsx`**
   - Horizontal scrollable 30-level grid, FREE row on top, ELITE row below
   - Hardcoded reward data arrays matching the tables above
   - Milestone cells (5/10/15/20/25/30): golden glow border + "Season Exclusive" badge
   - Hero reward cells show card art thumbnail; currency cells show icon + amount
   - Current level pulsing highlight, claimed = checkmark, locked = dimmed + lock
   - "Upgrade to Elite" CTA button, XP progress bar in header
   - Dark-gold mythic styling consistent with existing theme

2. **Fix `src/components/CollectionView.tsx`** — resolve `GameCard` naming collision (already partially done)

3. **Edit `src/pages/Index.tsx`** — add "Pass" tab with Shield icon, render `<BattlePass />`

### Visual Style
- Dark card cells (`bg-card`), gold accents on milestones
- Elite row: purple-gold gradient border accent
- Milestone legendary cells: animated golden shimmer border
- "Season Exclusive — Limited Time" label on all milestone rewards
- Hero thumbnails use existing card art from the card data

