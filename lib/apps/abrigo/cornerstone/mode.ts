// lib/apps/abrigo/cornerstone/mode.ts
//
// Three operation modes for the cornerstone workflow.
//
// GOVERNANCE (v5 reframe, 2026-06-08):
//   - 'replay' is frozen FIRST as the GUARANTEED demo artifact (RPC- and TTL-independent).
//     The git tag 'cornerstone-replay-safe' marks the working replay-only build.
//   - 'live' is the full two-chain path (Somnia Agent-1 + BuildBear Agent-2 mint),
//     built and wired but gated ⊘ on the external Somnia validator-callback outage.
//   - 'mock' is the always-works degradation (fromMockEvent), shown under an explicit
//     "modo demostración (sin cadena)" label — never a silent substitution.

export type CornerstoneMode = 'live' | 'replay' | 'mock'

/**
 * The guaranteed default mode — replay (frozen first, RPC-independent).
 * Any deviation from this default must be explicit and intentional.
 */
export const DEFAULT_MODE: CornerstoneMode = 'replay'

/**
 * Parse a raw string into a CornerstoneMode.
 * Only 'live' and 'mock' are accepted as valid non-default values.
 * Everything else (including null/undefined/garbage) returns the DEFAULT_MODE ('replay').
 *
 * @param raw - the raw string to parse (e.g. from URL param or env var)
 * @returns a valid CornerstoneMode
 */
export function parseMode(raw: string | null | undefined): CornerstoneMode {
  if (raw === 'live') return 'live'
  if (raw === 'mock') return 'mock'
  return DEFAULT_MODE
}
