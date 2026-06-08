// The ONLY bigint→string boundary in the data layer. Used by aggregator.ts AND health.ts.
// viem returns bigint for blockNumber/balances/counts; JSON.stringify throws on bigint
// (Phase-2 burn class, RESEARCH Pitfall 2). Deep-walk converts every bigint to a string.
export function serializeBigints<T>(value: T): T {
  if (typeof value === 'bigint') return value.toString() as unknown as T
  if (Array.isArray(value)) return value.map(serializeBigints) as unknown as T
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, serializeBigints(v)]),
    ) as T
  }
  return value
}
