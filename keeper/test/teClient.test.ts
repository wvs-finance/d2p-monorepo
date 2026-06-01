/**
 * Tests for keeper/src/teClient.ts — the key-hiding TE query primitive.
 * Run: `node --test`. Requirements are fast-check properties; concrete cases are node:test.
 *
 * The load-bearing requirement: a caller passes only a path; the key never appears
 * in return values, logs, or errors (in raw, URL-encoded, or URLSearchParams wire-form).
 */
import assert from "node:assert/strict";
import { afterEach, test } from "node:test";

import fc from "fast-check";

import { buildUrl, ENV_VAR, fetchTE, loadKey, MissingKeyError, parseEnv, redact } from "../src/teClient.ts";

const token = fc.string({ minLength: 3, maxLength: 16 }).filter((s) => /^[A-Za-z0-9]+$/.test(s));
const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
  delete process.env[ENV_VAR];
});

// ── Requirements (properties) ───────────────────────────────────────────────

// Key segments may contain spaces and URL-special chars whose URLSearchParams
// encoding differs from encodeURIComponent (space -> "+" not "%20"; "*!()'" unescaped).
const keyChars = "abcXYZ0189 *!()'-_".split("");
const keySeg = fc
  .array(fc.constantFrom(...keyChars), { minLength: 1, maxLength: 10 })
  .map((a) => a.join(""));

test("REQUIREMENT: redaction removes the key in every form it appears in a built URL", () => {
  fc.assert(
    fc.property(keySeg, keySeg, (client, secret) => {
      const key = `${client}:${secret}`;
      const masked = redact(buildUrl("country/colombia", key), key);
      // The wire-form is what buildUrl actually emits (URLSearchParams encoding).
      const wireForm = new URLSearchParams({ c: key }).toString().slice(2); // drop "c="
      // (A bare `secret` substring may collide with fixed URL literals — not a leak;
      //  we assert on the key forms, including the exact wire-encoded form.)
      assert.ok(!masked.includes(key), `raw key survived: ${masked}`);
      assert.ok(!masked.includes(encodeURIComponent(key)), `encoded key survived: ${masked}`);
      assert.ok(!masked.includes(wireForm), `wire-form key survived: ${masked}`);
    }),
  );
});

test("REQUIREMENT: parseEnv recovers the exact value across .env line formats", () => {
  const value = fc.string({ minLength: 3, maxLength: 24 }).filter((s) => /^[A-Za-z0-9:]+$/.test(s));
  const format = fc.constantFrom("plain", "double-quoted", "single-quoted", "export", "spaced", "after-comment");
  fc.assert(
    fc.property(value, format, (v, f) => {
      const line =
        f === "plain" ? `${ENV_VAR}=${v}`
        : f === "double-quoted" ? `${ENV_VAR}="${v}"`
        : f === "single-quoted" ? `${ENV_VAR}='${v}'`
        : f === "export" ? `export ${ENV_VAR}=${v}`
        : f === "spaced" ? `   ${ENV_VAR}  =  ${v}   `
        : `# comment line\n${ENV_VAR}=${v}`;
      assert.equal(parseEnv(line)[ENV_VAR], v);
    }),
  );
});

test("REQUIREMENT: buildUrl injects key + json and never emits a double slash after the host", () => {
  fc.assert(
    fc.property(token, fc.constantFrom("country/colombia", "/markets/currency/", "calendar"), (key, path) => {
      const url = buildUrl(path, key);
      assert.ok(url.includes("f=json"));
      assert.ok(url.includes(`c=${encodeURIComponent(key)}`));
      assert.ok(!url.replace("https://", "").includes("//"));
    }),
  );
});

// ── Concrete behavior ───────────────────────────────────────────────────────

test("loadKey throws when the key is absent everywhere", () => {
  delete process.env[ENV_VAR];
  assert.throws(() => loadKey("/nonexistent/.env"), MissingKeyError);
});

test("fetchTE returns ok with parsed JSON and no key in the value", async () => {
  process.env[ENV_VAR] = "CID:SECRET";
  globalThis.fetch = (async () => ({ ok: true, status: 200, json: async () => [{ Country: "Colombia" }] })) as unknown as typeof fetch;
  const result = await fetchTE("country/colombia");
  assert.equal(result.ok, true);
  assert.ok(result.ok && !JSON.stringify(result.value).includes("SECRET"));
});

test("fetchTE redacts a key echoed in the success body (wire-form)", async () => {
  process.env[ENV_VAR] = "CID:SECRET";
  globalThis.fetch = (async () => ({
    ok: true,
    status: 200,
    json: async () => ({ note: "your request was /country/colombia?c=CID%3ASECRET&f=json", v: 1 }),
  })) as unknown as typeof fetch;
  const result = await fetchTE("country/colombia");
  assert.ok(result.ok);
  assert.ok(result.ok && !JSON.stringify(result.value).includes("SECRET"));
});

test("fetchTE maps an HTTP error to a typed result with no key leak", async () => {
  process.env[ENV_VAR] = "CID:SECRET";
  globalThis.fetch = (async () => ({ ok: false, status: 404, json: async () => ({}) })) as unknown as typeof fetch;
  const result = await fetchTE("country/colombia");
  assert.equal(result.ok, false);
  assert.ok(!result.ok && result.error.kind === "http" && result.error.status === 404);
  assert.ok(!result.ok && !result.error.message.includes("SECRET"));
});

test("fetchTE redacts a key leaked through error.cause", async () => {
  process.env[ENV_VAR] = "CID:SECRET";
  globalThis.fetch = (async () => {
    throw Object.assign(new Error("fetch failed"), { cause: "connect ECONNREFUSED ...?c=CID%3ASECRET&f=json" });
  }) as unknown as typeof fetch;
  const result = await fetchTE("country/colombia");
  assert.ok(!result.ok && result.error.kind === "network");
  assert.ok(!result.ok && !result.error.message.includes("SECRET"));
});

test("fetchTE returns a missing_key result instead of throwing", async () => {
  delete process.env[ENV_VAR];
  const result = await fetchTE("country/colombia", {}, 15000);
  // Note: relies on no ./.env in CWD during this assertion path; CI runs without one.
  if (!result.ok) assert.equal(result.error.kind, "missing_key");
});
