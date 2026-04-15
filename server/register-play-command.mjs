/**
 * Registers the `/play` slash command (CHAT_INPUT type 1) that launches the Activity,
 * and keeps the entry point command in sync.
 *
 * Usage:
 *   node server/register-play-command.mjs --app-id YOUR_APP_ID --bot-token YOUR_BOT_TOKEN
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

  // 1) Ensure entry point command exists (for App Launcher)
  const entry = Array.isArray(commands) ? commands.find((c) => c?.type === 4) : null;
  const entryPayload = {
    name: "launch",
    description: "Launch Lorebound Legends",
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
      body: JSON.stringify(entryPayload),
    });
    console.log(`Entry point command OK → /launch (id: ${entry.id})`);
  } else {
    const created = await discordFetch(`/applications/${appId}/commands`, {
      method: "POST",
      body: JSON.stringify(entryPayload),
    });
    console.log(`Created entry point → /launch (id: ${created?.id ?? "unknown"})`);
  }

  // 2) Create or update CHAT_INPUT `/play` command (type 1, shows in slash autocomplete)
  const playCmd = Array.isArray(commands)
    ? commands.find((c) => c?.type === 1 && c?.name === "play")
    : null;
  const playPayload = {
    name: "play",
    description: "Open Lorebound Legends",
    type: 1, // CHAT_INPUT — shows in slash command autocomplete
    integration_types: [0, 1],
    contexts: [0, 1, 2],
  };

  if (playCmd?.id) {
    await discordFetch(`/applications/${appId}/commands/${playCmd.id}`, {
      method: "PATCH",
      body: JSON.stringify(playPayload),
    });
    console.log(`Updated /play slash command (id: ${playCmd.id})`);
  } else {
    const created = await discordFetch(`/applications/${appId}/commands`, {
      method: "POST",
      body: JSON.stringify(playPayload),
    });
    console.log(`Created /play slash command (id: ${created?.id ?? "unknown"})`);
  }

  console.log("\nDone. Global commands can take 1-2 minutes to propagate.");
  console.log("Make sure your Interactions Endpoint URL is set in the Developer Portal:");
  console.log("  → https://YOUR_RAILWAY_HOST/interactions");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
