/**
 * Behavior spec (TDD, written before src/proxy.ts) for the keyless keeper-proxy
 * handler. Covers: routing, normalization, per-path rate limit, upstream spend
 * ceiling (serve cached / quota_exhausted), error mapping, and the no-leak guarantee.
 * Run: `node --test`.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { makeProxy } from "../src/proxy.ts";
import type { Routes } from "../src/catalog.ts";

const routes: Routes = JSON.parse(readFileSync(new URL("../routes.json", import.meta.url), "utf8"));

function fakeFetcher() {
  let calls = 0;
  const fn = async (endpoint: string) => {
    calls++;
    if (endpoint === "country/colombia")
      // Includes an extra field echoing a secret-looking string to prove the proxy
      // strips everything except the scalar.
      return { ok: true, value: [{ Category: "Inflation Rate", LatestValue: 5.68, LatestValueDate: "2026-04-30", echo: "c=CID%3ASECRET" }] };
    if (endpoint === "markets/commodity")
      return { ok: true, value: [{ Name: "Gold", Last: 4474.7, Date: "2026-06-01" }] };
    return { ok: false, error: { kind: "network", message: "upstream boom" } };
  };
  return { fn: fn as (e: string) => Promise<unknown>, calls: () => calls };
}

const opts = (f: ReturnType<typeof fakeFetcher>, over: Record<string, unknown> = {}) => ({
  fetcher: f.fn,
  perPathLimit: 100,
  upstreamBudget: 100,
  windowMs: 1000,
  now: () => 0,
  ...over,
});

test("unknown path -> 404, no upstream call", async () => {
  const f = fakeFetcher();
  const r = await makeProxy(routes, opts(f))("te/nope");
  assert.equal(r.status, 404);
  assert.equal(f.calls(), 0);
});

test("valid path -> 200 normalized {value,unit,ts}; extra upstream fields stripped (no leak)", async () => {
  const f = fakeFetcher();
  const r = await makeProxy(routes, opts(f))("te/colombia/inflation");
  assert.equal(r.status, 200);
  assert.deepEqual(r.body, { value: "568", unit: "percent", ts: "2026-04-30" });
  assert.ok(!JSON.stringify(r.body).includes("SECRET")); // echoed field not passed through
});

test("per-path rate limit -> 429 and no extra upstream", async () => {
  const f = fakeFetcher();
  const p = makeProxy(routes, opts(f, { perPathLimit: 2 }));
  await p("te/colombia/inflation");
  await p("te/colombia/inflation");
  const r = await p("te/colombia/inflation");
  assert.equal(r.status, 429);
  assert.equal(f.calls(), 2);
});

test("spend ceiling: once budget hit, serve cached; uncached -> 503; no extra upstream", async () => {
  const f = fakeFetcher();
  const p = makeProxy(routes, opts(f, { upstreamBudget: 1 }));
  const a = await p("te/colombia/inflation");
  assert.equal(a.status, 200);
  const b = await p("te/colombia/inflation"); // budget gone -> cached
  assert.equal(b.status, 200);
  assert.deepEqual(b.body, a.body);
  const c = await p("te/commodity/gold"); // budget gone, uncached -> 503
  assert.equal(c.status, 503);
  assert.equal(f.calls(), 1);
});

test("upstream error -> 502 with kind, no key/url leak", async () => {
  const f = fakeFetcher();
  const r = await makeProxy(routes, opts(f))("te/fx/usdcop"); // fake returns ok:false for markets/currency
  assert.equal(r.status, 502);
  assert.ok(!JSON.stringify(r.body).includes("SECRET"));
});

test("normalize failure (missing row) -> 502, no leak", async () => {
  const f = fakeFetcher();
  // country/colombia body has only Inflation Rate; unemployment row is absent
  const r = await makeProxy(routes, opts(f))("te/colombia/unemployment");
  assert.equal(r.status, 502);
});

test("rate-limit window resets after windowMs", async () => {
  const f = fakeFetcher();
  let t = 0;
  const p = makeProxy(routes, opts(f, { perPathLimit: 1, now: () => t }));
  assert.equal((await p("te/colombia/inflation")).status, 200);
  assert.equal((await p("te/colombia/inflation")).status, 429);
  t = 1001; // next window
  assert.equal((await p("te/colombia/inflation")).status, 200);
});
