/**
 * Tests for keeper/src/catalog.ts — deterministic scaling + extraction.
 * Run: `node --test`. Properties via fast-check; concrete cases via node:test.
 */
import assert from "node:assert/strict";
import { test } from "node:test";

import fc from "fast-check";

import { extractScalar, normalize, roundHalfAwayFromZero, scaleToInt, ScaleError, ExtractError } from "../src/catalog.ts";

// ── rounding: half-away-from-zero (NOT Math.round's sign-asymmetry) ──────────
test("roundHalfAwayFromZero: exact half cases round away from zero", () => {
  assert.equal(roundHalfAwayFromZero(0.5), 1n);
  assert.equal(roundHalfAwayFromZero(-0.5), -1n); // Math.round(-0.5) === 0 (wrong)
  assert.equal(roundHalfAwayFromZero(2.5), 3n);
  assert.equal(roundHalfAwayFromZero(-2.5), -3n);
  assert.equal(roundHalfAwayFromZero(1.4), 1n);
  assert.equal(roundHalfAwayFromZero(-1.6), -2n);
});

test("REQUIREMENT: rounding is sign-symmetric (round(-x) == -round(x))", () => {
  fc.assert(
    fc.property(fc.double({ min: -1e9, max: 1e9, noNaN: true, noDefaultInfinity: true }), (x) => {
      assert.equal(roundHalfAwayFromZero(-x), -roundHalfAwayFromZero(x));
    }),
  );
});

// ── scaleToInt: probe values, kind guards, range ─────────────────────────────
test("scaleToInt: probe-log values scale exactly", () => {
  assert.equal(scaleToInt(5.68, 2, "Uint"), 568n);
  assert.equal(scaleToInt(11.25, 2, "Uint"), 1125n);
  assert.equal(scaleToInt(2.2, 1, "Int"), 22n);
  assert.equal(scaleToInt(-0.84, 2, "Int"), -84n);
  assert.equal(scaleToInt(93.5676, 3, "Uint"), 93568n);
  assert.equal(scaleToInt(3568.74, 2, "Uint"), 356874n);
});

test("scaleToInt: negative value into a Uint endpoint is a typed error", () => {
  assert.throws(() => scaleToInt(-0.84, 2, "Uint"), ScaleError);
});

test("scaleToInt: out-of-safe-range is a typed error (no silent wrap)", () => {
  assert.throws(() => scaleToInt(1e308, 2, "Int"), ScaleError);
});

test("REQUIREMENT: for non-negative natives, Int and Uint scale identically", () => {
  fc.assert(
    fc.property(fc.double({ min: 0, max: 1e6, noNaN: true, noDefaultInfinity: true }), fc.integer({ min: 0, max: 6 }), (native, d) => {
      assert.equal(scaleToInt(native, d, "Int"), scaleToInt(native, d, "Uint"));
    }),
  );
});

// ── extraction ───────────────────────────────────────────────────────────────
const inflationRoute = {
  teEndpoint: "country/colombia",
  extract: { type: "array-filter" as const, field: "Category", match: "Inflation Rate", value: "LatestValue", tsField: "LatestValueDate" },
  unit: "percent",
  decimals: 2,
  kind: "Uint" as const,
};

test("extractScalar: selects the matching row's value + ts", () => {
  const body = [
    { Category: "Balance of Trade", LatestValue: -0.84, LatestValueDate: "2026-03-31" },
    { Category: "Inflation Rate", LatestValue: 5.68, LatestValueDate: "2026-04-30" },
  ];
  assert.deepEqual(extractScalar(inflationRoute, body), { value: 5.68, ts: "2026-04-30" });
});

test("extractScalar: non-array / missing row / non-numeric are typed errors", () => {
  assert.throws(() => extractScalar(inflationRoute, { not: "array" }), ExtractError);
  assert.throws(() => extractScalar(inflationRoute, [{ Category: "Other", LatestValue: 1 }]), ExtractError);
  assert.throws(() => extractScalar(inflationRoute, [{ Category: "Inflation Rate", LatestValue: "5.68" }]), ExtractError);
});

test("normalize: full pipeline → contract-facing shape", () => {
  const body = [{ Category: "Inflation Rate", LatestValue: 5.68, LatestValueDate: "2026-04-30" }];
  assert.deepEqual(normalize(inflationRoute, body), { value: "568", unit: "percent", ts: "2026-04-30" });
});
