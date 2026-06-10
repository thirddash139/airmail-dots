// Airmail Dots — game state API (Vercel serverless function, zero dependencies)
// Storage: Upstash Redis via its REST API. Add it in Vercel: Project → Storage →
// Create Database → Upstash Redis (free). Env vars are injected automatically.

const TTL_SECONDS = 60 * 60 * 24 * 90; // games kept 90 days after last move
const CODE_RE = /^[A-Z0-9]{4}$/;
const MAX_BYTES = 24_000;

function redisCreds() {
  const url =
    process.env.KV_REST_API_URL ||
    process.env.UPSTASH_REDIS_REST_URL ||
    process.env.REDIS_REST_API_URL;
  const token =
    process.env.KV_REST_API_TOKEN ||
    process.env.UPSTASH_REDIS_REST_TOKEN ||
    process.env.REDIS_REST_API_TOKEN;
  return url && token ? { url: url.replace(/\/$/, ""), token } : null;
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  const creds = redisCreds();
  if (!creds) {
    return res.status(503).json({
      error: "storage_not_configured",
      hint: "In Vercel: Project → Storage → Create Database → Upstash Redis, then redeploy.",
    });
  }
  const auth = { Authorization: `Bearer ${creds.token}` };
  const key = (code) => `airmail:${code}`;

  try {
    if (req.method === "GET") {
      const code = String(req.query.code || "").toUpperCase();
      if (!CODE_RE.test(code)) return res.status(400).json({ error: "bad_code" });
      const r = await fetch(`${creds.url}/get/${key(code)}`, { headers: auth });
      const j = await r.json();
      return res.status(200).json({ state: j.result ? JSON.parse(j.result) : null });
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

      const r = await fetch(`${creds.url}/set/${key(code)}?EX=${TTL_SECONDS}`, {
        method: "POST",
        headers: auth,
        body: payload,
      });
      if (!r.ok) return res.status(502).json({ error: "storage_write_failed" });
      return res.status(200).json({ ok: true });
    }

    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "method_not_allowed" });
  } catch (e) {
    return res.status(500).json({ error: "server_error" });
  }
}
