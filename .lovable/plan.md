

## Grouped Category Navigation

Reorganize the 14 flat tabs into 4 logical category groups displayed as a two-tier header: category bar on top, sub-tabs below.

### Category Groups

| Category | Icon | Tabs |
|----------|------|------|
| **Cards** | BookOpen | Collection, Catalog, Summon, Deck |
| **Combat** | Swords | Battle, Tournament |
| **Progress** | Trophy | Quests, Workshop, Badges, Pass, Boost, Events |
| **Social** | ArrowLeftRight | Trade, Ranks |

### Layout

```text
┌─────────────────────────────────────────────────────┐
│ ⚔ Mythic Arcana          💰 1200  💎 50            │
├─────────────────────────────────────────────────────┤
│  [📖 Cards]  [⚔ Combat]  [🏆 Progress]  [↔ Social]│  ← category bar
├─────────────────────────────────────────────────────┤
│  Collection · Catalog · Summon · Deck               │  ← sub-tabs for active category
└─────────────────────────────────────────────────────┘
```

- Clicking a category shows its sub-tabs below
- Active category highlighted with `bg-primary`, sub-tabs use existing pill style
- Default: Cards → Collection
- Remembers last visited sub-tab per category

### Files Changed

1. **`src/pages/Index.tsx`** — Replace flat `tabs` array with grouped structure. Render two rows: category selector + sub-tab selector. Add `activeCategory` state alongside `activeTab`. Fix the existing "Rendered more hooks" runtime error (likely conditional hook call).

No new components needed — just restructuring the existing header nav in Index.tsx.

