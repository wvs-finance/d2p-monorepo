/**
 * Server-liveness: boot the real node:http proxy server, hit it over HTTP, and
 * assert it responds with a normalized scalar — and that the key never appears in
 * the live HTTP response (key-leakage guard at the server boundary). No key/network
 * needed (injected fetcher). Run: `node --test`.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { createProxyServer } from "../src/proxy.ts";
import type { Routes } from "../src/catalog.ts";

const routes: Routes = JSON.parse(readFileSync(new URL("../routes.json", import.meta.url), "utf8"));

const fetcher = (async (endpoint: string) =>
  endpoint === "country/colombia"
    ? { ok: true, value: [{ Category: "Inflation Rate", HistoricalDataSymbol: "COCPIYOY", LatestValue: 5.68, LatestValueDate: "2026-04-30", echo: "c=CID%3ASECRET" }] }
    : { ok: false, error: { kind: "network", message: "x" } }) as (e: string) => Promise<unknown>;

test("liveness: server boots, serves {value,unit,ts}, leaks no key, 404s unknown routes", async () => {
  const server = createProxyServer(routes, { fetcher } as never);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  try {
    const addr = server.address();
    const port = typeof addr === "object" && addr !== null ? addr.port : 0;
    assert.ok(port > 0, "server is listening");

    const ok = await fetch(`http://127.0.0.1:${port}/te/colombia/inflation`);
    assert.equal(ok.status, 200);
    const body = await ok.json();
    assert.deepEqual(body, { value: "568", unit: "percent", ts: "2026-04-30" });
    assert.ok(!JSON.stringify(body).includes("SECRET"), "no key in live response");

    const missing = await fetch(`http://127.0.0.1:${port}/te/nope`);
    assert.equal(missing.status, 404);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});
