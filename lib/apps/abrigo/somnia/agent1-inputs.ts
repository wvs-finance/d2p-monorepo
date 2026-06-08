/**
 * lib/apps/abrigo/somnia/agent1-inputs.ts
 *
 * PINNED O-1 inputs for POST /api/abrigo/agent1.
 *
 * Source: live on-chain datum + v1 two-leg e2e trace
 *   - MacroOracle: 0xAcA75144f644220f1dEAD5F989C350D8e0Cc983f (Somnia 50312)
 *   - dataKey = keccak256("co/inflation-rate") — the Colombia CPI inflation-rate catalog key
 *     Confirmed in snapshot.json (macro.latest.dataKey) + scripts/macro-hedge-strategist-e2e.sh
 *     DATA_KEY="${DATA_KEY:-$(cast keccak "co/inflation-rate")}"
 *   - Decision 4083729 (requestId) — ADD_LONG_GAMMA/6800; consensus=500; scaledValue=568
 *   - Decision 4083997 (requestId) — REDUCE/568; consensus=900; scaledValue=568
 *   - The datum is already delivered (deliveredAt≠0) on the Somnia testnet.
 *     MacroOracle.latest(dataKey).deliveredAt != 0 — oracle freshness check will pass.
 *   - userIntent from macro-hedge-strategist-e2e.sh USER_INTENT default (Run 1, matching
 *     consensus=500 ADD_LONG_GAMMA trace):
 *       "Hedge COP depreciation from a rate-hike surprise"
 *
 * All values are CONCRETE and pinned — no placeholder comments permitted here.
 * (Plan 09-02 grep guard: the string "TODO" + "(O-1)" must not appear in any source file)
 */

export const AGENT1_INPUTS = {
  /**
   * bytes32 dataKey = keccak256("co/inflation-rate")
   * Colombia CPI inflation-rate. The sole wired catalog key on the Somnia MacroOracle.
   * Source: snapshot.json macro.latest.dataKey + macro-hedge-strategist-e2e.sh L71
   */
  dataKey:
    '0xb73053d3303a516ffee4ecf3fdcd9195da7e3192557a59fdecb0d83545c44841' as const,

  /**
   * int256 consensus = 500 (scaled, 2 decimals → 5.00% consensus threshold)
   * Matches decision 4083729 ADD_LONG_GAMMA trace (rate-hike-surprise intent branch).
   * Source: snapshot.json decisions[0].consensus + macro-hedge-strategist-e2e.sh L62
   */
  consensus: 500n,

  /**
   * string userIntent — free-text hedging intent that rides into the LLM school prompt.
   * Source: macro-hedge-strategist-e2e.sh USER_INTENT default (Run 1, L346)
   * Matches the ADD_LONG_GAMMA/consensus=500 live trace (decision 4083729).
   */
  userIntent: 'Hedge COP depreciation from a rate-hike surprise',
} as const
