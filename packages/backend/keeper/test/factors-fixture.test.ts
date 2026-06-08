/**
 * Fixture-backed factor tests against REAL committed TE rows
 * (keeper/test/fixtures/colombia-snapshot.json, live-probed 2026-06-01).
 * Proves: (a) the new capacity-utilization factor normalizes correctly, and
 * (b) country indicators extract by the stable HistoricalDataSymbol anchor.
 * Run: `node --test`.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { normalize, type Routes } from "../src/catalog.ts";

const routes: Routes = JSON.parse(readFileSync(new URL("../routes.json", import.meta.url), "utf8"));
const fixture: unknown = JSON.parse(readFileSync(new URL("./fixtures/colombia-snapshot.json", import.meta.url), "utf8"));

test("capacity-utilization factor normalizes from the real snapshot (77.5 -> 775)", () => {
  const out = normalize(routes["te/colombia/capacity-utilization"], fixture);
  assert.equal(out.value, "775");
  assert.equal(out.unit, "percent");
  assert.ok(out.ts.length > 0);
});

test("country indicators are anchored on HistoricalDataSymbol, not Category", () => {
  // inflation (COCPIYOY=5.68, decimals 2) and balance-of-trade (COTRBALM=-0.84, Int) via symbol anchor
  assert.equal(normalize(routes["te/colombia/inflation"], fixture).value, "568");
  assert.equal(normalize(routes["te/colombia/balance-of-trade"], fixture).value, "-84");
  // the anchor field must be HistoricalDataSymbol (the stable id), not the volatile Category
  assert.equal(routes["te/colombia/inflation"].extract.field, "HistoricalDataSymbol");
  assert.equal(routes["te/colombia/inflation"].extract.match, "COCPIYOY");
});
