

## Plan: Full Feature Expansion for Mythic Arcana (Discord Game)

This is a large scope. I recommend building in **4 phases** so you can test each batch before moving on. Here's everything organized by priority and dependency.

---

### Phase 1 — Daily Loop & Economy (keeps players coming back)

**1. Daily Quests System**
- New `src/lib/questEngine.ts` — quest definitions, progress tracking, reward logic
- New `src/components/DailyQuests.tsx` — UI showing 3 daily quests with progress bars
- New "Quests" tab in `Index.tsx` header nav
- Quest types: "Win N battles", "Pull N packs", "Level up a card", "Play N cards in battle"
- Server: new `DailyQuest` Prisma model tracking per-player quest state, reset daily
- Server: quest progress hooks in existing battle/pull/level endpoints

**2. Crafting & Fusion**
- New `src/components/CraftingWorkshop.tsx` — UI to select 3 duplicate commons → fuse into random rare (or 3 rares → legendary)
- New `src/lib/craftingEngine.ts` — fusion rules, sacrifice-for-stardust math
- Server: `/api/craft` endpoint with validation
- Add "Workshop" tab to nav

**3. Achievement Badges**
- New `src/lib/achievementEngine.ts` — ~15 achievements ("First Legendary", "10-Win Streak", "Full Collection", "Max Level Card", etc.)
- New `src/components/AchievementPanel.tsx` — badge grid displayed in a profile section
- Server: `Achievement` Prisma model, checked after key actions
- Add achievement popup toast when unlocked

---

### Phase 2 — Gameplay Depth (makes battles more strategic)

**4. Elemental Weakness Triangle**
- Add `element` field to card data: `"fire" | "nature" | "shadow" | "water" | "light" | "dark" | "neutral"`
- Update `src/data/cards.ts` — assign elements to all ~80+ hero/god cards based on existing tags
- Update `src/lib/battleEngine.ts` — apply 1.3x damage when attacker has type advantage (Fire > Nature > Shadow > Fire), 0.7x when disadvantaged
- Show element icon on `GameCard.tsx` and type advantage indicator in battle UI

**5. Card Abilities & Spells (Active mid-battle)**
- Already partially implemented (spells exist). Extend hero/god cards with `activeAbility` field
- New ability types: heal self, stun enemy, double-strike, shield ally
- Add "Use Ability" button on field cards in `BattleArena.tsx` (costs 1 AP, once per battle per card)
- Update battle engine to process active abilities

**6. Campaign / PvE Mode**
- New `src/components/Campaign.tsx` — world map with 3 chapters (Fire Realm, Nature Grove, Shadow Depths), 5 stages each
- Each stage has a pre-built AI deck with increasing difficulty + unique boss mechanics
- First-clear rewards: gold, stardust, exclusive cards
- Server: `CampaignProgress` Prisma model tracking cleared stages
- Add "Campaign" tab to nav

---

### Phase 3 — Social & Discord Integration

**7. Leaderboards**
- New `src/components/Leaderboard.tsx` — tabs for Wins, Collection %, Rarest Cards
- Server: `/api/leaderboard` endpoint querying BattleStat + CardProgress
- Shows top 20 players with avatars from Discord

**8. Trading System**
- New `src/components/TradeUI.tsx` — offer/counter-offer interface with card previews
- Server: `TradeOffer` Prisma model (offerer, receiver, offered cards, requested cards, status)
- Endpoints: create, counter, accept, reject, cancel
- Confirmation step before finalizing

**9. Slash Commands** (server-side only)
- Update `server/register-play-command.mjs` to register: `/mythic profile`, `/mythic daily`, `/mythic duel @user`
- Update `server/token-server.mjs` interaction handler to respond with embed cards showing player stats
- Quick actions without opening the Activity

**10. Card Drop Events**
- Server: scheduled random drops via Discord webhook to a designated channel
- First user to react (emoji) claims the card → server processes claim
- Configurable frequency per server

---

### Phase 4 — Events & Competitive

**11. Seasonal Events**
- Data-driven event system: `src/lib/eventEngine.ts` with start/end dates
- Limited-time cards added to `cards.ts` with `seasonal: true` flag
- Special event packs in PackShop, themed battle modifiers (e.g. "Shadow Week" = +20% shadow card stats)
- Event banner in UI

**12. Tournament Mode**
- New `src/components/Tournament.tsx` — bracket visualization
- Server: `Tournament` + `TournamentEntry` Prisma models
- Entry fee (gold), prize pool distribution
- Auto-matchmaking with AI-vs-AI simulation for absent players

**13. Server Boost Rewards**
- Check Discord server boost status via API
- Boosters get: exclusive card backs, bonus daily pack, cosmetic profile flair
- Server: store boost status on Player model

---

### Database Changes (all phases)

New Prisma models needed:
- `DailyQuest` (playerId, questType, progress, target, completed, resetAt)
- `Achievement` (playerId, achievementId, unlockedAt)
- `CampaignProgress` (playerId, stageId, cleared, stars)
- `TradeOffer` (offererId, receiverId, offeredCardIds, requestedCardIds, status)
- `Tournament`, `TournamentEntry`
- Add `element` column to card metadata (or keep in code since cards are defined in `cards.ts`)

---

### Won't it be too full?

No — each feature lives in its own tab/section. The nav will grow but we can use a collapsible sidebar or icon-only mobile nav. Campaign and Tournaments are separate screens. PvP battles stay in the existing Battle tab. Trading/Leaderboards are social tabs that open as overlays.

For the Discord slash commands, those work outside the Activity entirely — no UI needed.

---

### Recommended start

**Phase 1 first** (Daily Quests + Crafting + Achievements). These are self-contained, add immediate replay value, and don't require multiplayer networking. Shall I begin with Phase 1?

