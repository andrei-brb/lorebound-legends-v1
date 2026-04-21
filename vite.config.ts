import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import type { IncomingMessage, ServerResponse } from "node:http";

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (c: Buffer) => {
      chunks.push(c);
    });
    req.on("end", () => {
      resolve(Buffer.concat(chunks).toString("utf8"));
    });
    req.on("error", reject);
  });
}

async function fetchDiscordTokenWithRetry(
  input: RequestInfo | URL,
  init?: RequestInit,
  nRetries = 3,
): Promise<Response> {
  const response = await fetch(input, init);
  if (response.status === 429 && nRetries > 0) {
    const retryAfter = Number(response.headers.get("retry_after"));
    if (!Number.isNaN(retryAfter)) {
      await new Promise((r) => setTimeout(r, retryAfter * 1000));
      return fetchDiscordTokenWithRetry(input, init, nRetries - 1);
    }
  }
  return response;
}

function isDiscordTokenPost(url: string | undefined, method: string | undefined): boolean {
  if (method !== "POST" || !url) return false;
  const path = url.split("?")[0] ?? "";
  return path === "/api/token" || path === "/.proxy/api/token";
}

function discordTokenPlugin(mode: string): Plugin {
  return {
    name: "discord-oauth-token",
    configureServer(server) {
      const env = loadEnv(mode, process.cwd(), "");
      server.middlewares.use(async (req, res, next) => {
        if (!isDiscordTokenPost(req.url, req.method)) {
          return next();
        }
        const clientId = env.VITE_DISCORD_CLIENT_ID;
        const secret = env.DISCORD_CLIENT_SECRET;
        const httpRes = res as ServerResponse;
        if (!clientId || !secret) {
          httpRes.statusCode = 500;
          httpRes.setHeader("Content-Type", "application/json");
          httpRes.end(
            JSON.stringify({
              error: "Missing DISCORD_CLIENT_SECRET or VITE_DISCORD_CLIENT_ID in .env",
            }),
          );
          return;
        }
        try {
          const raw = await readBody(req as IncomingMessage);
          const body = JSON.parse(raw || "{}") as { code?: string };
          if (!body.code) {
            httpRes.statusCode = 400;
            httpRes.setHeader("Content-Type", "application/json");
            httpRes.end(JSON.stringify({ error: "Missing code" }));
            return;
          }
          const params = new URLSearchParams({
            client_id: clientId,
            client_secret: secret,
            grant_type: "authorization_code",
            code: body.code,
          });
          const tokenRes = await fetchDiscordTokenWithRetry("https://discord.com/api/oauth2/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: params.toString(),
          });
          const json = (await tokenRes.json()) as { access_token?: string };
          if (!tokenRes.ok) {
            httpRes.statusCode = tokenRes.status;
            httpRes.setHeader("Content-Type", "application/json");
            httpRes.end(JSON.stringify(json));
            return;
          }
          httpRes.setHeader("Content-Type", "application/json");
          httpRes.end(JSON.stringify({ access_token: json.access_token }));
        } catch (e) {
          httpRes.statusCode = 500;
          httpRes.setHeader("Content-Type", "application/json");
          httpRes.end(JSON.stringify({ error: String(e) }));
        }
      });
    },
    configurePreviewServer(server) {
      const env = loadEnv(mode, process.cwd(), "");
      server.middlewares.use(async (req, res, next) => {
        if (!isDiscordTokenPost(req.url, req.method)) {
          return next();
        }
        const clientId = env.VITE_DISCORD_CLIENT_ID;
        const secret = env.DISCORD_CLIENT_SECRET;
        const httpRes = res as ServerResponse;
        if (!clientId || !secret) {
          httpRes.statusCode = 500;
          httpRes.setHeader("Content-Type", "application/json");
          httpRes.end(
            JSON.stringify({
              error: "Missing DISCORD_CLIENT_SECRET or VITE_DISCORD_CLIENT_ID in .env",
            }),
          );
          return;
        }
        try {
          const raw = await readBody(req as IncomingMessage);
          const body = JSON.parse(raw || "{}") as { code?: string };
          if (!body.code) {
            httpRes.statusCode = 400;
            httpRes.setHeader("Content-Type", "application/json");
            httpRes.end(JSON.stringify({ error: "Missing code" }));
            return;
          }
          const params = new URLSearchParams({
            client_id: clientId,
            client_secret: secret,
            grant_type: "authorization_code",
            code: body.code,
          });
          const tokenRes = await fetchDiscordTokenWithRetry("https://discord.com/api/oauth2/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: params.toString(),
          });
          const json = (await tokenRes.json()) as { access_token?: string };
          if (!tokenRes.ok) {
            httpRes.statusCode = tokenRes.status;
            httpRes.setHeader("Content-Type", "application/json");
            httpRes.end(JSON.stringify(json));
            return;
          }
          httpRes.setHeader("Content-Type", "application/json");
          httpRes.end(JSON.stringify({ access_token: json.access_token }));
        } catch (e) {
          httpRes.statusCode = 500;
          httpRes.setHeader("Content-Type", "application/json");
          httpRes.end(JSON.stringify({ error: String(e) }));
        }
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  assetsInclude: ["**/*.glb"],
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
    /** Dev: forward REST + WebSocket to token-server (default 3001). */
    proxy: {
      "/api": {
        target: "http://127.0.0.1:3001",
        changeOrigin: true,
        ws: true,
      },
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    discordTokenPlugin(mode),
  ].filter(Boolean) as Plugin[],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
}));
