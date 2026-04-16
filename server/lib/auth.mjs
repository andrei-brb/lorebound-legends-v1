/**
 * Discord token verification middleware.
 * Validates a Bearer access_token by calling Discord's /users/@me endpoint.
 * Returns the Discord user object { id, username, avatar, ... } or null.
 */

const DISCORD_API = "https://discord.com/api/v10";

const tokenCache = new Map();
const CACHE_TTL = 5 * 60 * 1000;

export async function verifyDiscordToken(accessToken) {
  if (!accessToken) return null;

  const cached = tokenCache.get(accessToken);
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return cached.user;
  }

  try {
    const res = await fetch(`${DISCORD_API}/users/@me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return null;
    const user = await res.json();
    tokenCache.set(accessToken, { user, ts: Date.now() });

    if (tokenCache.size > 10000) {
      const now = Date.now();
      for (const [k, v] of tokenCache) {
        if (now - v.ts > CACHE_TTL) tokenCache.delete(k);
      }
    }

    return user;
  } catch {
    return null;
  }
}

export function extractBearerToken(req) {
  const header = req.headers["authorization"] || "";
  if (header.startsWith("Bearer ")) return header.slice(7);
  return null;
}

/**
 * Auth middleware: extracts Bearer token, verifies with Discord, attaches user to req.
 * Returns the Discord user or sends 401 and returns null.
 */
export async function requireAuth(req, res) {
  const token = extractBearerToken(req);
  if (!token) {
    res.writeHead(401, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Missing Authorization header" }));
    return null;
  }

  const user = await verifyDiscordToken(token);
  if (!user) {
    res.writeHead(401, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Invalid or expired Discord token" }));
    return null;
  }

  return user;
}
