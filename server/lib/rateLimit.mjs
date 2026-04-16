/**
 * Simple in-memory sliding-window rate limiter (per Node process).
 * Behind a reverse proxy, set X-Forwarded-For so getClientIp() is meaningful.
 */

const buckets = new Map();

function prune(key, windowMs) {
  const now = Date.now();
  const arr = buckets.get(key);
  if (!arr) return [];
  const cutoff = now - windowMs;
  const recent = arr.filter((t) => t > cutoff);
  if (recent.length === 0) buckets.delete(key);
  else buckets.set(key, recent);
  return recent;
}

/**
 * @param {string} key — e.g. `token:1.2.3.4` or `api:1.2.3.4`
 * @param {{ max: number; windowMs: number }} opts
 * @returns {{ ok: boolean; retryAfterSec?: number }}
 */
export function rateLimit(key, opts) {
  const { max, windowMs } = opts;
  const now = Date.now();
  const recent = prune(key, windowMs);
  if (recent.length >= max) {
    const oldest = recent[0];
    const retryAfterMs = Math.max(0, windowMs - (now - oldest));
    return { ok: false, retryAfterSec: Math.ceil(retryAfterMs / 1000) || 1 };
  }
  recent.push(now);
  buckets.set(key, recent);
  return { ok: true };
}

export function getClientIp(req) {
  const xf = req.headers["x-forwarded-for"];
  if (typeof xf === "string" && xf.length > 0) {
    return xf.split(",")[0].trim() || "unknown";
  }
  const rip = req.socket?.remoteAddress;
  return typeof rip === "string" ? rip : "unknown";
}
