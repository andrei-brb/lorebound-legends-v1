/**
 * Standalone OAuth token exchange for Discord Embedded Apps (production or local without Vite middleware).
 * Run: node server/token-server.mjs
 * Requires VITE_DISCORD_CLIENT_ID and DISCORD_CLIENT_SECRET in .env
 */
import dotenv from "dotenv";
import http from "node:http";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, "..", ".env") });

// Railway (and most hosts) set PORT; local dev can use DISCORD_TOKEN_PORT or default 3001
const PORT = Number(process.env.PORT || process.env.DISCORD_TOKEN_PORT) || 3001;

async function fetchAndRetry(url, options, nRetries = 3) {
  const response = await fetch(url, options);
  if (response.status === 429 && nRetries > 0) {
    const retryAfter = Number(response.headers.get("retry_after"));
    if (!Number.isNaN(retryAfter)) {
      await new Promise((r) => setTimeout(r, retryAfter * 1000));
      return fetchAndRetry(url, options, nRetries - 1);
    }
  }
  return response;
}

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (c) => {
      body += c;
    });
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on("error", reject);
  });
}

// Ed25519 signature verification for Discord interactions
async function verifyDiscordSignature(rawBody, signature, timestamp, publicKey) {
  try {
    const key = crypto.createPublicKey({
      key: Buffer.concat([
        Buffer.from("302a300506032b6570032100", "hex"),
        Buffer.from(publicKey, "hex"),
      ]),
      format: "der",
      type: "spki",
    });
    return crypto.verify(
      null,
      Buffer.concat([Buffer.from(timestamp, "utf8"), rawBody]),
      key,
      Buffer.from(signature, "hex"),
    );
  } catch {
    return false;
  }
}

function isInteractionsPost(url, method) {
  if (method !== "POST" || !url) return false;
  const path = url.split("?")[0];
  return path === "/interactions" || path === "/.proxy/interactions";
}

function isTokenPost(url, method) {
  if (method !== "POST" || !url) return false;
  const path = url.split("?")[0];
  return path === "/api/token" || path === "/.proxy/api/token";
}

const server = http.createServer(async (req, res) => {
  if (req.method === "GET" && (req.url === "/" || req.url === "/health")) {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, service: "discord-token" }));
    return;
  }

  // Discord Interactions endpoint (slash commands)
  if (isInteractionsPost(req.url, req.method)) {
    const publicKey = process.env.DISCORD_PUBLIC_KEY;
    if (!publicKey) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "DISCORD_PUBLIC_KEY not set" }));
      return;
    }

    const signature = req.headers["x-signature-ed25519"];
    const timestamp = req.headers["x-signature-timestamp"];
    const rawBody = await readRawBody(req);

    if (!signature || !timestamp || !(await verifyDiscordSignature(rawBody, signature, timestamp, publicKey))) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Invalid signature" }));
      return;
    }

    const interaction = JSON.parse(rawBody.toString("utf8"));

    // Type 1 = PING (Discord verification handshake)
    if (interaction.type === 1) {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ type: 1 }));
      return;
    }

    // Type 2 = APPLICATION_COMMAND
    if (interaction.type === 2 && interaction.data?.name === "play") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ type: 12 })); // LAUNCH_ACTIVITY
      return;
    }

    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Unhandled interaction" }));
    return;
  }

  if (!isTokenPost(req.url, req.method)) {
    res.writeHead(404);
    res.end();
    return;
  }

  let payload;
  try {
    payload = await readJsonBody(req);
  } catch {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Invalid JSON body" }));
    return;
  }

  const code = payload.code;
  if (!code || typeof code !== "string") {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Missing code" }));
    return;
  }

  const clientId =
    process.env.DISCORD_CLIENT_ID || process.env.VITE_DISCORD_CLIENT_ID;
  const clientSecret = process.env.DISCORD_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        error:
          "Set DISCORD_CLIENT_SECRET and DISCORD_CLIENT_ID or VITE_DISCORD_CLIENT_ID",
      }),
    );
    return;
  }

  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    grant_type: "authorization_code",
    code,
  });

  const tokenRes = await fetchAndRetry("https://discord.com/api/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  const json = await tokenRes.json();
  if (!tokenRes.ok) {
    res.writeHead(tokenRes.status, { "Content-Type": "application/json" });
    res.end(JSON.stringify(json));
    return;
  }

  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ access_token: json.access_token }));
});

server.listen(PORT, () => {
  console.log(`Discord token server listening on http://127.0.0.1:${PORT}/api/token`);
});
