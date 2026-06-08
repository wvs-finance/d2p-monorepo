/**
 * Minimal, function-driven Trading Economics query client that HIDES the API key.
 *
 * Contract:
 *   fetchTE(path[, params]) -> Promise<Result<unknown>>
 *
 * - The key is read from the `TRADING_ECONOMICS_API_KEY` env var (with a robust
 *   `.env` fallback), injected server-side into the request URL, and is **never
 *   returned, logged, or included in any error** (errors carry a redacted message).
 * - Callers pass only a TE *path* (e.g. "country/colombia") and get back an
 *   explicit `Result` discriminated union — no throwing on the request path, so a
 *   future proxy can branch on `error.kind` (http / network / timeout / parse).
 * - This is the off-chain primitive the keeper-proxy and all on-chain agent fetches
 *   build on (DRAFT.md blocker #2: the key must never reach the chain).
 *
 * Pure functions + explicit result unions; no FP framework. Runtime deps: zero
 * (Node built-in `fetch`/`node:fs`). Runs directly on Node >= 24 via type-stripping.
 */
import { existsSync, readFileSync } from "node:fs";

export const BASE_URL = "https://api.tradingeconomics.com";
export const ENV_VAR = "TRADING_ECONOMICS_API_KEY";

export class MissingKeyError extends Error {}

export type TEError =
  | { kind: "missing_key"; message: string }
  | { kind: "http"; status: number; message: string }
  | { kind: "network"; message: string }
  | { kind: "timeout"; message: string }
  | { kind: "parse"; message: string };

export type Result<T> = { ok: true; value: T } | { ok: false; error: TEError };

/** Strip leading/trailing slashes from a TE path. Single source of truth. */
const cleanPath = (path: string): string => path.replace(/^\/+|\/+$/g, "");

/**
 * Parse `.env` content into a key→value map. Pure. Handles: `KEY=value`,
 * `export KEY=value`, single/double-quoted values, `=` inside values, spaces
 * around `=`, `#` comment lines, blank lines, and CRLF endings.
 */
export function parseEnv(content: string): Record<string, string> {
  const env: Record<string, string> = {};
  for (const rawLine of content.split(/\r?\n/)) {
    let line = rawLine.trim();
    if (line === "" || line.startsWith("#")) continue;
    if (line.startsWith("export ")) line = line.slice("export ".length).trim();
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const name = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    const quoted = value.length >= 2 && (value[0] === '"' || value[0] === "'") && value.at(-1) === value[0];
    if (quoted) value = value.slice(1, -1);
    if (name) env[name] = value;
  }
  return env;
}

/** Return the key from the environment, falling back to a `.env` file. Throws if absent. */
export function loadKey(envPath = ".env"): string {
  let key = process.env[ENV_VAR];
  if (!key && existsSync(envPath)) key = parseEnv(readFileSync(envPath, "utf8"))[ENV_VAR];
  if (!key) throw new MissingKeyError(`${ENV_VAR} not set (export it or add it to .env)`);
  return key;
}

/** Build the TE request URL, injecting the key + JSON format server-side. */
export function buildUrl(path: string, key: string, params: Record<string, string> = {}): string {
  const query = new URLSearchParams({ ...params, c: key, f: "json" });
  return `${BASE_URL}/${cleanPath(path)}?${query.toString()}`;
}

/**
 * Mask the key in any string so it is safe to log. Redacts every form the key can
 * appear in: the raw key, the `encodeURIComponent` form, and — critically — the
 * **URLSearchParams wire-form** that `buildUrl` actually emits. (URLSearchParams and
 * encodeURIComponent disagree on some chars: space -> "+" vs "%20"; "!" -> "%21" vs
 * "!"; etc. Masking only the encodeURIComponent form leaked the wire-form.)
 */
export function redact(text: string, key: string): string {
  const wireForm = new URLSearchParams({ k: key }).toString().slice(2); // drop "k=" -> wire-encoded key
  let out = text;
  for (const form of [key, encodeURIComponent(key), wireForm]) {
    if (form.length > 0) out = out.split(form).join("***");
  }
  return out;
}

/**
 * Query a TE `path` and return parsed JSON as a `Result`. The key stays
 * server-side; on any failure the returned `error.message` is redacted.
 */
export async function fetchTE(
  path: string,
  params: Record<string, string> = {},
  timeoutMs = 15000,
): Promise<Result<unknown>> {
  let key: string;
  try {
    key = loadKey();
  } catch (error) {
    return { ok: false, error: { kind: "missing_key", message: error instanceof Error ? error.message : String(error) } };
  }

  const url = buildUrl(path, key, params);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { headers: { Accept: "application/json" }, signal: controller.signal });
    if (!response.ok) {
      return { ok: false, error: { kind: "http", status: response.status, message: `TE HTTP ${response.status} for /${cleanPath(path)}` } };
    }
    // Defense-in-depth: if the upstream body echoes the request query, redact the key
    // (in any form) from the returned value too — not just from errors. Re-parse keeps
    // the structure; "***" is JSON-safe so the round-trip stays valid.
    const parsed = await response.json();
    return { ok: true, value: JSON.parse(redact(JSON.stringify(parsed), key)) };
  } catch (error) {
    const raw = error instanceof Error ? `${error.message}${error.cause ? ` | cause: ${String(error.cause)}` : ""}` : String(error);
    const message = redact(raw, key); // never leak the key, even via cause/stack
    const kind: TEError["kind"] =
      error instanceof Error && error.name === "AbortError" ? "timeout" : error instanceof SyntaxError ? "parse" : "network";
    return { ok: false, error: { kind, message } };
  } finally {
    clearTimeout(timer);
  }
}

// CLI: `node keeper/src/teClient.ts country/colombia [k=v ...]` (run from repo root for .env)
if ((import.meta as { main?: boolean }).main) {
  const [path, ...rest] = process.argv.slice(2);
  if (!path) {
    console.error("usage: node keeper/src/teClient.ts <te-path> [k=v ...]");
    process.exit(2);
  }
  const params = Object.fromEntries(rest.filter((a) => a.includes("=")).map((a) => a.split("=", 2) as [string, string]));
  const result = await fetchTE(path, params);
  if (!result.ok) {
    console.error(`error (${result.error.kind}): ${result.error.message}`);
    process.exit(1);
  }
  // The value is already key-redacted inside fetchTE, so no second key read is needed.
  console.log(JSON.stringify(result.value, null, 2).slice(0, 2000));
}
