

User picked from Q1-Q4 (Player Profile, Daily Engagement, UX & QoL, Social). Q5 (Meta Progression) deferred. Let me decode picks:

**Q1 Player Profile**: a (Profile page), e (Custom unlockable avatars), f (Player titles from achievements)
**Q2 Daily Engagement**: a (Daily login calendar), b (Hourly free chest), c (First-win-of-day bonus), d (Daily mystery box drops)
**Q3 UX & QoL**: a (Settings panel), c (Smooth page transitions), d (Interactive tutorials per tab)
**Q4 Social**: a (Friends list with online status), b (Spectate top PvP), c (Guilds/clans + chat), e (Global/regional chat)

That's 14 features across 4 areas — a substantial chunk. I'll group into a phased build plan so we don't break the existing app.

## Build Plan — Polish & Feature Pack (14 features)

### Phase 1 — Foundations (touch shared state once)
Add to `playerState.ts` + Prisma schema:
- `profile`: `{ avatarId, titleId, bannerId }`
- `unlockedAvatars: string[]`, `unlockedTitles: string[]`
- `dailyLogin`: `{ streak, lastClaimDate, claimedDays[] }`
- `lastChestClaimAt`, `firstWinDate`, `mysteryBoxesPending`
- `settings`: `{ musicVol, sfxVol, reduceMotion, animationsOn }`
- `tutorialsCompleted: string[]`
- `friends[]`, `friendRequests[]`, `guildId`

One DB migration covers all new columns.

### Phase 2 — Player Profile (Q1: a, e, f)
- **`ProfilePage.tsx`** — new route/tab. Shows avatar, title, equipped banner, win/loss, total cards, BP level
- **Avatar picker modal** — grid of unlocked avatars (locked ones grayed with unlock condition)
- **Title selector** — dropdown of unlocked titles, auto-unlocked from achievements
- Seed ~12 avatars + ~15 titles tied to existing achievements

### Phase 3 — Daily Engagement (Q2: a, b, c, d)
- **`DailyHub.tsx`** — single panel with 4 widgets:
  - **Login calendar** — 7-day grid, claim today's reward, streak counter
  - **Hourly chest** — countdown timer + claim button (gold/dust)
  - **First win banner** — shows "+200 gold +500 BP XP" until claimed via battle
  - **Mystery box inbox** — shows pending boxes from battle drops, click to open
- Hook into `BattleArena` win handler: 5% drop chance + first-win flag

### Phase 4 — UX & Quality of Life (Q3: a, c, d)
- **`SettingsPanel.tsx`** — modal with sliders (music/sfx) + toggles (reduce motion, animations). Persist to playerState. Wire `sfx.ts` to volume
- **Page transitions** — wrap tab content in `framer-motion AnimatePresence` with fade+slide (respects reduce-motion setting)
- **Interactive tutorials** — `TutorialOverlay.tsx` shown first time each tab opens (Collection, Deck Builder, Battle, Shop, etc). 3-5 step spotlight tour per tab. Tracked in `tutorialsCompleted`

### Phase 5 — Social (Q4: a, b, c, e)
- **Friends list** — `FriendsPanel.tsx` with add-by-username, online status (last-seen heartbeat), accept/reject requests. New API routes
- **Spectate mode** — list of currently-active PvP matches, click to view read-only `BattleArena` with live state polling
- **Guilds/clans** — create/join guild, member list, weekly goal tracker (e.g. "win 50 battles as a guild"), guild chat
- **Global chat** — single global channel + per-guild channel. Polling-based (3s) or SSE
- Backend: 4-5 new tables (`friends`, `friend_requests`, `guilds`, `guild_members`, `chat_messages`), routes in `server/token-server.mjs`

### Phase 6 — Wire it up
- New top-nav entries: **Profile**, **Daily**, **Friends**, **Guild**
- Settings gear icon top-right
- Tutorial spotlight triggers via `useEffect` on tab mount

---

### Order of build (3 chunks to keep things shippable)

1. **Chunk A — Profile + Daily + Settings** (Phases 1, 2, 3, settings part of 4) — fully client/local, fastest, biggest visible win
2. **Chunk B — Tutorials + Page transitions** (rest of Phase 4) — pure UI polish
3. **Chunk C — Social stack** (Phase 5) — needs backend, longest. Build friends → chat → guilds → spectate

I'll do all 3 chunks unless you want to pause between them.

### What stays untouched
Battle engine, card data, deck builder, packs, crafting, achievements, leaderboard, trade, mail, PvP matchmaking, tournaments, battle pass, events. We only add — no rewrites.

### Open question for later
Q5 Meta Progression — answer it whenever, I'll layer it on top.

