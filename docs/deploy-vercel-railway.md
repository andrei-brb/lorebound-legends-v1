# Deploy: Vercel (frontend) + Railway (Discord OAuth token API)

The static game ships on **Vercel**. The **Discord OAuth token exchange** (`POST /api/token`) must run with a **secret** on a server—this guide uses **Railway** for that small Node service. The browser only talks to your **Vercel** URL; Vercel **rewrites** proxy token requests to Railway so you avoid CORS and keep one public origin for Discord’s URL mapping.

## Overview

| Piece | Where |
|--------|--------|
| `npm run build` output (`dist/`) | Vercel |
| `server/token-server.mjs` | Railway |
| Discord Activity **URL mapping** `→` target | **Vercel hostname** (not Railway) |

Replace the placeholder in `vercel.json` **before** production deploy: open `vercel.json` and swap `REPLACE_ME_RAILWAY_HOST` for your Railway **public hostname** (no `https://`, no trailing slash), e.g. `lorebound-api-production.up.railway.app`.

---

## 1. Railway (token API)

1. Create a project: [railway.app](https://railway.app) → **New project** → **Deploy from GitHub** (this repo) or **Empty project** and connect the repo.
2. Add a **new service** from the same repo (or deploy only the `server/` entry via root directory settings if you use a monorepo layout—in this repo the app and server share the root `package.json`).
3. **Start command** (if not using default):  
   `node server/token-server.mjs`  
   `package.json` already defines `"start": "node server/token-server.mjs"`.
4. **Variables** (service → **Variables**):

   | Variable | Value |
   |----------|--------|
   | `DISCORD_CLIENT_SECRET` | From Discord → OAuth2 → Client Secret |
   | `DISCORD_CLIENT_ID` | Same as your app’s Application ID (recommended on Railway) |

   Optionally you can use `VITE_DISCORD_CLIENT_ID` instead of `DISCORD_CLIENT_ID` so it matches local `.env`; the server accepts either.

5. **Generate domain**: **Settings → Networking → Generate domain**. Copy the hostname (e.g. `something.up.railway.app`).
6. Smoke test: open `https://YOUR_HOST/health` — you should see JSON `{"ok":true,"service":"discord-token"}`.

---

## 2. Vercel (frontend + rewrites)

1. Import the repo: [vercel.com/new](https://vercel.com/new).
2. **Framework preset:** Vite (auto-detected).
3. **Environment variables** (project → **Settings → Environment Variables**):

   | Name | Value |
   |------|--------|
   | `VITE_DISCORD_CLIENT_ID` | Discord Application ID (same app as OAuth) |

   Do **not** put `DISCORD_CLIENT_SECRET` on Vercel unless you later add a serverless token route; for this split, the secret stays on Railway only.

4. Edit **`vercel.json`** at the repo root: replace `REPLACE_ME_RAILWAY_HOST` twice with the Railway hostname from step 1.5 (no `https://`).
5. Deploy. Your game URL will look like `https://your-project.vercel.app`.

---

## 3. Discord Developer Portal

1. **Activities → URL Mappings**: prefix `/`, **target** = your **Vercel** hostname only (e.g. `your-project.vercel.app`). No `https://`.
2. OAuth2 **Redirects** must still include `https://127.0.0.1` as required for Activities (see main README).
3. **Embedded → Settings**: **Enable Activities** on.

---

## 4. Local `.env` (unchanged for coding)

Frontend still uses:

```env
VITE_DISCORD_CLIENT_ID=your_application_id
DISCORD_CLIENT_SECRET=your_secret
```

Local dev continues to use Vite’s built-in `POST /api/token` handler; Railway is only for production/staging behind Vercel rewrites.

---

## Troubleshooting

- **401 / invalid_grant on token:** Check Railway vars and that Application ID matches the Discord app.
- **Rewrite loops or 404 on `/api/token`:** Confirm `vercel.json` host matches Railway’s **public** HTTPS host exactly.
- **Activity blank:** Confirm URL mapping points to **Vercel**, not Railway, and that `VITE_DISCORD_CLIENT_ID` is set on Vercel builds.
