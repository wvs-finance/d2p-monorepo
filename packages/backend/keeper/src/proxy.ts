/**
 * Keyless keeper-proxy: the on-chain json-fetch agent calls a key-free URL here;
 * this process injects the TE key server-side (via teClient.fetchTE), normalizes
 * the response to {value,unit,ts}, and returns it. The key never appears in any
 * response or log.
 *
 * Controls (the public URL is obscurity, not access control — see README blockers):
 * - per-path rate limit (per-path, since IPs are trivially rotated)
 * - upstream spend ceiling: cap upstream TE calls per window; once exhausted serve
 *   the cached value, else `quota_exhausted` — so public abuse can't burn the quota.
 *
 * Zero runtime deps (Node built-ins). Demo-only; not production-hardened.
 */
import { createServer } from "node:http";
import { readFileSync } from "node:fs";

import { fetchTE, type Result } from "./teClient.ts";
import { normalize, type Routes } from "./catalog.ts";

export interface ProxyOpts {
  fetcher?: (teEndpoint: string) => Promise<Result<unknown>>;
  perPathLimit?: number;
  upstreamBudget?: number;
  windowMs?: number;
  now?: () => number;
}

export interface ProxyResponse {
  status: number;
  body: unknown;
}

export function makeProxy(routes: Routes, opts: ProxyOpts = {}) {
  const fetcher = opts.fetcher ?? ((endpoint: string) => fetchTE(endpoint));
  const perPathLimit = opts.perPathLimit ?? 30;
  const upstreamBudget = opts.upstreamBudget ?? 200;
  const windowMs = opts.windowMs ?? 60_000;
  const now = opts.now ?? (() => Date.now());

  let windowStart = now();
  let upstreamCount = 0;
  const pathCount = new Map<string, number>();
  const cache = new Map<string, { value: string; unit: string; ts: string }>();

  function rollWindow(): void {
    const t = now();
    if (t - windowStart >= windowMs) {
      windowStart = t;
      upstreamCount = 0;
      pathCount.clear();
    }
  }

  return async function handle(path: string): Promise<ProxyResponse> {
    const route = routes[path];
    if (!route) return { status: 404, body: { error: "unknown route" } };

    rollWindow();

    const count = (pathCount.get(path) ?? 0) + 1;
    pathCount.set(path, count);
    if (count > perPathLimit) return { status: 429, body: { error: "rate_limited" } };

    if (upstreamCount >= upstreamBudget) {
      const cached = cache.get(path);
      if (cached) return { status: 200, body: cached }; // serve stale, no upstream call
      return { status: 503, body: { error: "quota_exhausted" } };
    }

    upstreamCount++;
    const result = await fetcher(route.teEndpoint);
    if (!result.ok) return { status: 502, body: { error: { kind: result.error.kind } } }; // fetchTE already redacted
    try {
      const normalized = normalize(route, result.value);
      cache.set(path, normalized);
      return { status: 200, body: normalized };
    } catch {
      // Extract/Scale errors reference field names/units only — no key.
      return { status: 502, body: { error: "normalize_failed" } };
    }
  };
}

/** Thin node:http wrapper. Path = request path minus leading slash + query. No request logging. */
export function createProxyServer(routes: Routes, opts: ProxyOpts = {}) {
  const handle = makeProxy(routes, opts);
  return createServer(async (req, res) => {
    const path = (req.url ?? "/").replace(/^\/+/, "").split("?")[0];
    let result: ProxyResponse;
    try {
      result = await handle(path);
    } catch {
      result = { status: 500, body: { error: "internal" } };
    }
    res.writeHead(result.status, { "content-type": "application/json" });
    res.end(JSON.stringify(result.body));
  });
}

// CLI: `PORT=8787 node src/proxy.ts` — demo-only (see README blockers; not for public exposure as-is).
if ((import.meta as { main?: boolean }).main) {
  const routes: Routes = JSON.parse(readFileSync(new URL("../routes.json", import.meta.url), "utf8"));
  const port = Number(process.env.PORT ?? 8787);
  createProxyServer(routes).listen(port, () => console.log(`keeper-proxy on :${port} (demo-only)`));
}
