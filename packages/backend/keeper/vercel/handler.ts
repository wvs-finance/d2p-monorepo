/**
 * esbuild ENTRY for the Vercel function. `npm run vercel-build` bundles this into a
 * single self-contained `api/fetch.js` (all `.ts` imports inlined, only node: builtins
 * external) — so Vercel never has to resolve our `.ts`-extension imports at runtime
 * (which is what broke the direct deploy: ERR_MODULE_NOT_FOUND .../proxy.ts).
 *
 * Request:  GET /te/<proxyPath...>  (rewritten to /api/fetch?path=te/<...>)
 * Response: { value, unit, ts } — NO key. Key from Vercel env TRADING_ECONOMICS_API_KEY.
 * ⚠ Serverless is stateless: the in-memory spend-ceiling only protects a warm instance;
 * back makeProxy with Vercel KV for real B2 in production (see ../README.md).
 */
import { makeProxy, type ProxyOpts } from "../src/proxy.ts";
import type { Routes } from "../src/catalog.ts";
import routes from "../routes.json";

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
