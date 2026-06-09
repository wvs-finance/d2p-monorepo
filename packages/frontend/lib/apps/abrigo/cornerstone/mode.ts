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

// Phase 11: 'buildbear' is the URL-opted-in live path against the shared BuildBear fork.
// Activation requires BOTH ?mode=buildbear (parsed here) AND DEMO_SIGNER_PK server-side
// (the buildbear-sign route returns 'not-configured' when the key is absent — no accidental
// live mode on a plain clone).
export type CornerstoneMode = 'live' | 'replay' | 'mock' | 'buildbear'

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
  if (raw === 'buildbear') return 'buildbear' // Phase 11: URL opt-in for the BuildBear live path
  return DEFAULT_MODE
}
