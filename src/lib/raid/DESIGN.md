# Co-op raid — locked rules

## Party model

- **Shared field (4 slots)** for both allies: any raider may play a unit into an empty slot; field cards track `owner: "allyA" | "allyB"` for UI and targeting clarity.
- **Two hands, two decks**: each ally keeps a 10-card deck (standard size), shuffled independently; each has their own hand and gains AP on their own turn.
- **Turn order**: `allyA → allyB → boss` (boss runs full AI turn once per round).

## Win / lose

- **Shared party HP**: one pool (default 50) for both allies; damage from the boss applies to this pool. If it reaches 0, the raid is lost.
- **Boss win condition**: reduce the boss hero HP to 0 (boss uses inflated `hp` / `shield` from raid definition).

## Boss scaling

- Bosses are defined with a **scripted deck** (card IDs) plus optional `enemyHp`, `enemyShield` multipliers over the default 30/10 hero stats.
- Tiered difficulty can reuse the same `bossId` with different multipliers in a future table.

## Online sync

- **Authoritative** `seed` + `actionLog`; `turnPlayerId` distinguishes host (allyA), guest (allyB), and boss phase (sentinel `0` or dedicated enum in API).
- Boss AI steps are **deterministic** from seed + prior log (server may append boss intents after each pair of ally turns).
