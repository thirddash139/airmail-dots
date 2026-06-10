// Airmail Dots — game state API (Vercel serverless function).
// Talks to a standard Redis database over its redis:// connection string,
// which is what the Vercel "Redis" (Redis Cloud) integration provides as
// the REDIS_URL environment variable. Connect the database in Vercel:
// Project → Storage. No manual variables needed.

import { createClient } from "redis";

const TTL_SECONDS = 60 * 60 * 24 * 90; // games kept 90 days after last move
const CODE_RE = /^[A-Z0-9]{4}$/;
const MAX_BYTES = 24_000;

// Find the redis:// connection string regardless of what it's named.
function redisUrl() {
  const env = process.env;
  const known = ["REDIS_URL", "KV_URL", "STORAGE_URL", "STORAGE_REDIS_URL", "DATABASE_URL"];
  let u = known.map((n) => env[n]).find(Boolean) || null;
  if (!u) {
    const k = Object.keys(env).find((key) => /^rediss?:\/\//.test(env[key] || ""));
    if (k) u = env[k];
  }
  return u || null;
}

// Reuse one client across warm invocations.
let client = null;
async function getClient() {
  const url = redisUrl();
  if (!url) return null;
  if (client && client.isOpen) return client;
  client = createClient({ url });
  client.on("error", () => {}); // don't crash the function on transient blips
  await client.connect();
  return client;
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  let redis;
  try {
    redis = await getClient();
  } catch (e) {
    redis = null;
  }
  if (!redis) {
    return res.status(503).json({
      error: "storage_not_configured",
      hint: "In Vercel: Project → Storage → connect a Redis database, then redeploy.",
    });
  }

  const key = (code) => `airmail:${code}`;

  try {
    if (req.method === "GET") {
      const code = String(req.query.code || "").toUpperCase();
      if (!CODE_RE.test(code)) return res.status(400).json({ error: "bad_code" });
      const val = await redis.get(key(code));
      return res.status(200).json({ state: val ? JSON.parse(val) : null });
    }

    if (req.method === "POST") {
      const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
      const code = String(body.code || "").toUpperCase();
      const state = body.state;
      if (!CODE_RE.test(code) || !state || typeof state !== "object") {
        return res.status(400).json({ error: "bad_request" });
      }
      const payload = JSON.stringify(state);
      if (payload.length > MAX_BYTES) return res.status(413).json({ error: "too_large" });
      await redis.set(key(code), payload, { EX: TTL_SECONDS });
      return res.status(200).json({ ok: true });
    }

    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "method_not_allowed" });
  } catch (e) {
    return res.status(500).json({ error: "server_error" });
  }
}
