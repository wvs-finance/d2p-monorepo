/**
 * Layer-1 (contracts/src/MacroOracle.sol `TECatalog`) ↔ Layer-2 (routes.json)
 * consistency. The EXPECTED table below mirrors the Solidity `TECatalog.seed()`
 * entries (proxyPath, decimals, kind) and MUST be kept in lockstep with it.
 * Run: `node --test`.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import type { Routes } from "../src/catalog.ts";

const routes: Routes = JSON.parse(readFileSync(new URL("../routes.json", import.meta.url), "utf8"));

// Mirror of TECatalog.seed() in contracts/src/MacroOracle.sol — keep in sync.
const EXPECTED: Record<string, { decimals: number; kind: "Uint" | "Int" }> = {
  "te/colombia/inflation": { decimals: 2, kind: "Uint" },
  "te/colombia/interest-rate": { decimals: 2, kind: "Uint" },
  "te/colombia/gdp-growth": { decimals: 1, kind: "Int" },
  "te/colombia/unemployment": { decimals: 1, kind: "Uint" },
  "te/colombia/bond-10y": { decimals: 1, kind: "Uint" },
  "te/colombia/balance-of-trade": { decimals: 2, kind: "Int" },
  "te/fx/usdcop": { decimals: 2, kind: "Uint" },
  "te/commodity/crude-oil": { decimals: 3, kind: "Uint" },
  "te/commodity/natural-gas": { decimals: 4, kind: "Uint" },
  "te/commodity/gold": { decimals: 2, kind: "Uint" },
};

test("routes.json covers exactly the catalog's 10 proxyPaths", () => {
  assert.deepEqual(Object.keys(routes).sort(), Object.keys(EXPECTED).sort());
});

test("each route's decimals + kind match the Solidity catalog", () => {
  for (const [path, exp] of Object.entries(EXPECTED)) {
    assert.equal(routes[path].decimals, exp.decimals, `${path} decimals`);
    assert.equal(routes[path].kind, exp.kind, `${path} kind`);
  }
});

test("every route has a well-formed array-filter extractor", () => {
  for (const [path, r] of Object.entries(routes)) {
    assert.equal(r.extract.type, "array-filter", `${path} extract.type`);
    assert.ok(r.teEndpoint.length > 0 && r.unit.length > 0, `${path} teEndpoint/unit`);
    assert.ok(r.extract.field && r.extract.match && r.extract.value && r.extract.tsField, `${path} extract fields`);
  }
});
