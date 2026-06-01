/**
 * Vercel serverless entry for the keeper-proxy.
 *
 * Request:  GET /te/<proxyPath...>  (rewritten to /api/fetch?path=te/<...>)
 * Response: { value, unit, ts }  — the scaled integer + metadata; NO key, ever.
 *
 * The TE key comes from the Vercel project env var TRADING_ECONOMICS_API_KEY (a
 * project secret); teClient reads it from process.env and never emits it.
 *
 * ⚠ Serverless is STATELESS: the in-memory spend-ceiling/rate-limit in makeProxy
 * only protect within a warm instance. For production B2 (gate), back makeProxy
 * with shared state (Vercel KV / Upstash). Demo-only as-is — see ../README.md.
 */
import { makeProxy, type ProxyOpts } from "../src/proxy.ts";
import type { Routes } from "../src/catalog.ts";
import routes from "../routes.json" with { type: "json" };

const handle = makeProxy(routes as unknown as Routes, {} as ProxyOpts);

export default async function handler(
  req: { query?: Record<string, string | string[] | undefined> },
  res: { status: (n: number) => { json: (b: unknown) => void } },
): Promise<void> {
  const raw = req.query?.path;
  const path = Array.isArray(raw) ? (raw[0] ?? "") : (raw ?? "");
  const result = await handle(path);
  res.status(result.status).json(result.body);
}
