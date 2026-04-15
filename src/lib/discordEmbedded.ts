import { DiscordSDK } from "@discord/embedded-app-sdk";
import type { CommandResponse } from "@discord/embedded-app-sdk";

/** True when the page is loaded in an iframe (Discord runs Activities in an iframe). */
export function isEmbeddedIframe(): boolean {
  try {
    return window.parent !== window.self;
  } catch {
    return true;
  }
}

export function isDiscordEmbeddedConfigured(): boolean {
  return Boolean(import.meta.env.VITE_DISCORD_CLIENT_ID);
}

let sdk: DiscordSDK | null = null;
let auth: CommandResponse<"authenticate"> | null = null;

export function getDiscordSdk(): DiscordSDK | null {
  return sdk;
}

export function getDiscordAuth(): CommandResponse<"authenticate"> | null {
  return auth;
}

/** Discord’s Activity proxy serves the iframe from `{clientId}.discordsays.com`; API calls must use `/.proxy/…`. */
function getTokenFetchPath(): string {
  if (typeof window !== "undefined" && window.location.hostname.endsWith("discordsays.com")) {
    return "/.proxy/api/token";
  }
  return "/api/token";
}

/**
 * Initializes the Embedded App SDK: ready → OAuth authorize → token exchange → authenticate.
 * Call only when `VITE_DISCORD_CLIENT_ID` is set and the app runs inside Discord’s iframe.
 * Outside Discord, skips so the same build works in a normal browser.
 */
export async function setupDiscordEmbedded(): Promise<void> {
  const clientId = import.meta.env.VITE_DISCORD_CLIENT_ID;
  if (!clientId || !isEmbeddedIframe()) {
    return;
  }

  sdk = new DiscordSDK(clientId);
  await sdk.ready();

  const { code } = await sdk.commands.authorize({
    client_id: clientId,
    response_type: "code",
    state: "",
    prompt: "none",
    scope: ["identify", "applications.commands"],
  });

  const res = await fetch(getTokenFetchPath(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Discord token exchange failed: ${res.status} ${text}`);
  }

  const { access_token } = (await res.json()) as { access_token: string };
  const authenticated = await sdk.commands.authenticate({ access_token });
  if (!authenticated) {
    throw new Error("Discord authenticate command returned null");
  }
  auth = authenticated;
}
