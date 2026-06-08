/**
 * Catalog core for the keeper-proxy: route types, scalar extraction from TE
 * responses, and the SINGLE deterministic rounding authority that turns a native
 * TE value into the scaled integer the contract stores verbatim.
 *
 * Scaling is rounded **half-away-from-zero** (NOT JS Math.round, which is
 * sign-asymmetric on negatives); negative-into-`Uint` and out-of-range are typed
 * errors (no silent wrap/truncation). [gate M3]
 */
export type ValueKind = "Uint" | "Int";

export interface Route {
  teEndpoint: string;
  extract: { type: "array-filter"; field: string; match: string; value: string; tsField: string };
  unit: string;
  decimals: number;
  kind: ValueKind;
}
export type Routes = Record<string, Route>;

export class ExtractError extends Error {}
export class ScaleError extends Error {}

const INT256_MAX = (1n << 255n) - 1n;
const INT256_MIN = -(1n << 255n);
const UINT256_MAX = (1n << 256n) - 1n;

/** Extract the native numeric scalar + timestamp from a TE array response. */
export function extractScalar(route: Route, body: unknown): { value: number; ts: string } {
  if (!Array.isArray(body)) throw new ExtractError("expected an array response");
  const row = body.find((r) => r != null && typeof r === "object" && (r as Record<string, unknown>)[route.extract.field] === route.extract.match);
  if (row === undefined) throw new ExtractError(`no row where ${route.extract.field} == ${route.extract.match}`);
  const v = (row as Record<string, unknown>)[route.extract.value];
  if (typeof v !== "number" || !Number.isFinite(v)) throw new ExtractError(`non-numeric ${route.extract.value}`);
  const ts = (row as Record<string, unknown>)[route.extract.tsField];
  return { value: v, ts: ts == null ? "" : String(ts) };
}

/** Round half-away-from-zero to a bigint (symmetric for negatives). */
export function roundHalfAwayFromZero(x: number): bigint {
  if (!Number.isFinite(x)) throw new ScaleError("non-finite value");
  const r = Math.sign(x) * Math.round(Math.abs(x));
  return BigInt(r);
}

/** Scale a native value to the on-chain integer per a route's decimals + kind. */
export function scaleToInt(native: number, decimals: number, kind: ValueKind): bigint {
  if (kind === "Uint" && native < 0) throw new ScaleError("negative value into a Uint endpoint");
  const scaled = native * 10 ** decimals;
  if (!Number.isFinite(scaled) || Math.abs(scaled) > Number.MAX_SAFE_INTEGER) throw new ScaleError("value out of safe range");
  const result = roundHalfAwayFromZero(scaled);
  if (kind === "Uint" && (result < 0n || result > UINT256_MAX)) throw new ScaleError("uint256 out of range");
  if (kind === "Int" && (result < INT256_MIN || result > INT256_MAX)) throw new ScaleError("int256 out of range");
  return result;
}

/** Normalize a TE response for one route into the contract-facing shape. */
export function normalize(route: Route, body: unknown): { value: string; unit: string; ts: string } {
  const { value, ts } = extractScalar(route, body);
  return { value: scaleToInt(value, route.decimals, route.kind).toString(), unit: route.unit, ts };
}
