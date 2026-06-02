// prompt-trace.ts — Deterministic decision-pipeline trace reconstruction.
// Source of truth: MacroHedgeStrategist.sol L53-54 (SYSTEM_PROMPT) + L266-273 (_buildPrompt).
// This is a DETERMINISTIC reconstruction — NOT fabricated chain-of-thought.
// The on-chain _buildPrompt is a pure function: same (actual, consensus) always yields the same string.
// LLM output is enum/clamped-int (no free-text rationale stored on-chain); the trace shows
// the deterministic decision pipeline (system prompt + built prompt + action/size), never invented prose.
//
// ROUTE-CORRECT: consensus is a parameter (500 for decision 4083729, 900 for decision 4083997).
// Tests MUST assert the route-correct consensus, not 500 for both.

/**
 * The verbatim on-chain SYSTEM_PROMPT constant from MacroHedgeStrategist.sol L53-54.
 * Temperature-0 Qwen3-30B (LLM_AGENT_ID = 12847293847561029384).
 * Do NOT paraphrase — this must be byte-identical to the compiled constant.
 */
export const SYSTEM_PROMPT =
  'You are a macro hedging strategist. Given the actual macro print and the consensus expectation, choose a hedge action and size for a long-gamma cCOP-USD position. Be deterministic.'

/**
 * Deterministic reconstruction of the on-chain _buildPrompt(int256 actual, int256 consensus).
 * Source: MacroHedgeStrategist.sol L266-273.
 *
 * On-chain (Solidity):
 *   string.concat(
 *     "Actual macro print (scaled int): ", actual.toStringSigned(),
 *     ". Consensus expectation (scaled int): ", consensus.toStringSigned(),
 *     ". Choose hedge action and size for a long-gamma cCOP-USD position."
 *   )
 *
 * BigInt args are converted to signed decimal strings (bigint.toString() = toStringSigned for positive values).
 * ROUTE-CORRECT: pass the decision's consensus, not a hardcoded constant.
 *
 * Verified expected outputs:
 *   buildPromptTrace(568n, 500n) = "Actual macro print (scaled int): 568. Consensus expectation (scaled int): 500. Choose hedge action and size for a long-gamma cCOP-USD position."
 *   buildPromptTrace(568n, 900n) = "Actual macro print (scaled int): 568. Consensus expectation (scaled int): 900. Choose hedge action and size for a long-gamma cCOP-USD position."
 */
export function buildPromptTrace(actual: bigint, consensus: bigint): string {
  return `Actual macro print (scaled int): ${actual.toString()}. Consensus expectation (scaled int): ${consensus.toString()}. Choose hedge action and size for a long-gamma cCOP-USD position.`
}
