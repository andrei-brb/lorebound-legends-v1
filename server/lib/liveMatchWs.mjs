/**
 * Live PvP: WebSocket fan-out for `/api/pvp/live/:matchId/ws` (query: access_token).
 * Clients receive `{ type: "live_match", ok: true, match: { ... } }` when the match row changes.
 */
import { WebSocketServer } from "ws";
import { verifyDiscordToken } from "./auth.mjs";

const WS_OPEN = 1;

export function attachLiveMatchWebSocket(server, { prisma, toPublicPlayer }) {
  const wss = new WebSocketServer({ noServer: true });
  /** @type {Map<number, Set<import('ws').WebSocket>>} */
  const matchRooms = new Map();

  server.on("upgrade", (req, socket, head) => {
    let url;
    try {
      url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
    } catch {
      socket.destroy();
      return;
    }

    const m = url.pathname.match(/^\/api\/pvp\/live\/(\d+)\/ws$/);
    if (!m) {
      socket.destroy();
      return;
    }
    const matchId = Number(m[1]);
    const token = url.searchParams.get("access_token");

    void (async () => {
      try {
        if (!token) {
          socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
          socket.destroy();
          return;
        }
        const dUser = await verifyDiscordToken(token);
        if (!dUser) {
          socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
          socket.destroy();
          return;
        }
        const me = await prisma.player.findUnique({ where: { discordId: String(dUser.id) } });
        if (!me) {
          socket.write("HTTP/1.1 403 Forbidden\r\n\r\n");
          socket.destroy();
          return;
        }
        const match = await prisma.pvPMatch.findUnique({
          where: { id: matchId },
          include: { playerA: true, playerB: true },
        });
        if (!match || match.type !== "live" || (me.id !== match.playerAId && me.id !== match.playerBId)) {
          socket.write("HTTP/1.1 403 Forbidden\r\n\r\n");
          socket.destroy();
          return;
        }

        wss.handleUpgrade(req, socket, head, (ws) => {
          if (!matchRooms.has(matchId)) matchRooms.set(matchId, new Set());
          matchRooms.get(matchId).add(ws);
          ws.on("close", () => {
            const set = matchRooms.get(matchId);
            if (!set) return;
            set.delete(ws);
            if (set.size === 0) matchRooms.delete(matchId);
          });
        });
      } catch {
        socket.destroy();
      }
    })();
  });

  async function broadcastLiveMatchRefresh(id) {
    const match = await prisma.pvPMatch.findUnique({
      where: { id },
      include: { playerA: true, playerB: true },
    });
    if (!match) return;
    const payload = JSON.stringify({
      type: "live_match",
      ok: true,
      match: {
        id: match.id,
        status: match.status,
        createdAt: match.createdAt.getTime(),
        playerA: toPublicPlayer(match.playerA),
        playerB: toPublicPlayer(match.playerB),
        turnPlayerId: match.turnPlayerId,
        seed: match.seed,
        actionLog: match.actionLog || [],
        state: match.state || null,
        result: match.result || null,
      },
    });
    const set = matchRooms.get(id);
    if (!set) return;
    for (const ws of set) {
      if (ws.readyState === WS_OPEN) ws.send(payload);
    }
  }

  return { broadcastLiveMatchRefresh };
}
