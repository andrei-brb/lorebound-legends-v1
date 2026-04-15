/**
 * Registers (or renames) the Discord Activity PRIMARY_ENTRY_POINT command to `/play`.
 *
 * Why a script: Entry Point commands live in Discord (global application commands),
 * so this must be done via the Discord HTTP API with a Bot token.
 *
 * Usage:
 *   node server/register-play-command.mjs --app-id YOUR_APP_ID --bot-token YOUR_BOT_TOKEN
 *
 * Notes:
 * - PRIMARY_ENTRY_POINT type = 4
 * - DISCORD_LAUNCH_ACTIVITY handler = 2
 */

const argv = process.argv.slice(2);
function argValue(name) {
  const idx = argv.indexOf(name);
  if (idx === -1) return null;
  return argv[idx + 1] ?? null;
}

const appId = argValue("--app-id") || process.env.VITE_DISCORD_CLIENT_ID || process.env.DISCORD_CLIENT_ID;
const botToken = argValue("--bot-token") || process.env.DISCORD_BOT_TOKEN;

if (!appId || !botToken) {
  console.error(
    "Missing required values. Provide --app-id and --bot-token (or set VITE_DISCORD_CLIENT_ID/DISCORD_CLIENT_ID and DISCORD_BOT_TOKEN).",
  );
  process.exit(1);
}

const API = "https://discord.com/api/v10";

async function discordFetch(path, init = {}) {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bot ${botToken}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  const text = await res.text();
  const json = text ? JSON.parse(text) : null;
  if (!res.ok) {
    throw new Error(`Discord API ${res.status} ${res.statusText}: ${text}`);
  }
  return json;
}

async function main() {
  const commands = await discordFetch(`/applications/${appId}/commands`, { method: "GET" });
  const entry = Array.isArray(commands) ? commands.find((c) => c?.type === 4) : null;

  const payload = {
    name: "play",
    description: "Open Lorebound Legends",
    // Clear prior localizations (the default entry point is often localized as "launch")
    // so the displayed command name matches `/play` across locales.
    name_localizations: {},
    description_localizations: {},
    type: 4, // PRIMARY_ENTRY_POINT
    handler: 2, // DISCORD_LAUNCH_ACTIVITY
    integration_types: [0, 1],
    contexts: [0, 1, 2],
  };

  if (entry?.id) {
    await discordFetch(`/applications/${appId}/commands/${entry.id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
    console.log(`Updated entry point command → /play (id: ${entry.id})`);
  } else {
    const created = await discordFetch(`/applications/${appId}/commands`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    console.log(`Created entry point command → /play (id: ${created?.id ?? "unknown"})`);
  }

  console.log("It can take a minute for global commands to appear everywhere.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

