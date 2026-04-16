# Lorebound Legends / Mythic Arcana

Vite + React + TypeScript card game: collection, gacha packs, deck building, and turn-based battles. Progress is stored in `localStorage` via `src/lib/playerState.ts`. Core rules live under `src/lib/` (`battleEngine.ts`, `gachaEngine.ts`, `synergyEngine.ts`, etc.).

## Local development

```bash
npm install
npm run dev
```

Open the URL Vite prints (default port `8080`).

## Discord Embedded App (Activity)

The [Embedded App SDK](https://discord.com/developers/docs/developer-tools/embedded-app-sdk) runs Mythic Arcana inside Discord. The app code already does: `ready` → OAuth `authorize` → `POST /api/token` (or `/.proxy/api/token` behind Discord’s proxy) → `authenticate` (`src/lib/discordEmbedded.ts`, `vite.config.ts`).

### Add a `/play` command (Entry Point)

If you want a command named **`/play`** that opens the Activity, run:

```bash
npm run discord:register-play -- --app-id YOUR_APP_ID --bot-token YOUR_BOT_TOKEN
```

- `YOUR_APP_ID` is your Discord **Application ID** (same as `VITE_DISCORD_CLIENT_ID`).
- `YOUR_BOT_TOKEN` is from Developer Portal → **Bot** → **Reset Token**.

This updates (or creates) the app’s **PRIMARY_ENTRY_POINT** command so Discord launches the Activity automatically. Global commands can take a minute to appear.

### Integrate in Discord (portal checklist)

Complete these in [Discord Developer Portal](https://discord.com/developers/applications). IDs and secrets must match your project `.env`.

1. **Application**  
   Create **New Application** or open an existing one.

2. **OAuth2 — ID, secret, redirect**  
   - **Client ID** → put in `.env` as `VITE_DISCORD_CLIENT_ID`.  
   - **Client Secret** → `DISCORD_CLIENT_SECRET` (never commit).  
   - **Redirects** → add **`https://127.0.0.1`** and save. Discord requires a redirect URI for OAuth; the Embedded App SDK still completes auth inside the Activity ([docs](https://discord.com/developers/docs/activities/building-an-activity#add-a-redirect-uri)).

3. **`.env` in this repo** (restart `npm run dev` after edits):

   ```env
   VITE_DISCORD_CLIENT_ID=your_application_id
   DISCORD_CLIENT_SECRET=your_client_secret
   ```

4. **Enable Activities**  
   Sidebar: **Embedded** → **Settings** (or **Activities** → **Settings**). Turn **Enable Activities** on. Discord adds a default **Launch** command so users can open your Activity from the [App Launcher](https://discord.com/developers/docs/interactions/application-commands#entry-point-commands).

5. **URL Mappings**  
   **Activities** → **URL Mappings**. Prefix **`/`**, **Target** = **hostname only** (no `https://`).  
   - **Local testing:** `cloudflared tunnel --url http://localhost:8080` → use the tunnel hostname (e.g. `abc.trycloudflare.com`). Update the mapping when the tunnel URL changes.  
   - **Production:** your real HTTPS hostname.

6. **Discord client**  
   **Settings → App Settings → Advanced** → enable **Developer Mode** (helps with testing).

7. **Launch**  
   With dev server (+ tunnel) running and URL mapping set, open a server → **App Launcher** / voice **Activities** → your app → **Launch** (or the default entry point name).

More detail: [Building an Activity](https://discord.com/developers/docs/activities/building-an-activity), [local development + URL mapping](https://discord.com/developers/docs/activities/development-guides/local-development).

### How to test

- **Browser:** `http://localhost:8080` — full game; Discord init skipped when not in Discord’s iframe.  
- **In Discord:** requires HTTPS tunnel + URL mapping. Vite handles `POST /api/token` and `POST /.proxy/api/token`.

### Production

`npm run build`, host `dist/` on HTTPS, run token exchange (`npm run discord:token-server` or your API) on the same origin as `POST /api/token`. Point URL Mappings at production.

**Vercel + Railway:** step-by-step for this repo — [docs/deploy-vercel-railway.md](docs/deploy-vercel-railway.md). Summary: deploy the static site on Vercel, run `server/token-server.mjs` on Railway, then edit `vercel.json` so rewrites point token routes at your Railway hostname.

If `VITE_DISCORD_CLIENT_ID` is unset, Discord setup is skipped.
