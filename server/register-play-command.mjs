/**
 * Registers all slash commands for Mythic Arcana:
 *  - /launch (entry point for Activity)
 *  - /play (opens Activity)
 *  - /mythic profile (show profile embed)
 *  - /mythic daily (claim daily reward)
 *  - /mythic duel @user (challenge a player)
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

async function upsertCommand(commands, payload) {
  const existing = Array.isArray(commands) ? commands.find(
    (c) => c?.type === payload.type && c?.name === payload.name
  ) : null;

  if (existing?.id) {
    await discordFetch(`/applications/${appId}/commands/${existing.id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
    console.log(`Updated /${payload.name} (id: ${existing.id})`);
  } else {
    const created = await discordFetch(`/applications/${appId}/commands`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    console.log(`Created /${payload.name} (id: ${created?.id ?? "unknown"})`);
  }
}

async function main() {
  const commands = await discordFetch(`/applications/${appId}/commands`, { method: "GET" });

  // 1) Entry point for Activity
  await upsertCommand(commands, {
    name: "launch",
    description: "Launch Mythic Arcana",
    type: 4, // PRIMARY_ENTRY_POINT
    handler: 2, // DISCORD_LAUNCH_ACTIVITY
    integration_types: [0, 1],
    contexts: [0, 1, 2],
  });

  // 2) /play — opens Activity
  await upsertCommand(commands, {
    name: "play",
    description: "Open Mythic Arcana",
    type: 1,
    integration_types: [0, 1],
    contexts: [0, 1, 2],
  });

  // 3) /mythic — subcommand group
  await upsertCommand(commands, {
    name: "mythic",
    description: "Mythic Arcana commands",
    type: 1,
    integration_types: [0, 1],
    contexts: [0, 1, 2],
    options: [
      {
        name: "profile",
        description: "View your Mythic Arcana profile",
        type: 1, // SUB_COMMAND
      },
      {
        name: "daily",
        description: "Claim your daily reward",
        type: 1,
      },
      {
        name: "duel",
        description: "Challenge another player to a duel",
        type: 1,
        options: [
          {
            name: "opponent",
            description: "The player to challenge",
            type: 6, // USER
            required: true,
          },
        ],
      },
      {
        name: "drop",
        description: "Trigger a card drop event in this channel (admin only)",
        type: 1,
      },
    ],
  });

  console.log("\nDone. Global commands can take 1-2 minutes to propagate.");
  console.log("Make sure your Interactions Endpoint URL is set in the Developer Portal:");
  console.log("  → https://YOUR_RAILWAY_HOST/interactions");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
