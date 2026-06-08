---
phase: 11-macrohedgestrategist-hedge-decision-agent
plan: 01
subsystem: api
tags: [solidity, somnia, llm-inference, interface, abi, foundry]

# Dependency graph
requires:
  - phase: somnia-agent-consumer (master, pre-phase-11)
    provides: vendored ISomniaAgents.sol with IAgentRequester + IJsonApiAgent + Response/Request structs
provides:
  - "ILLMAgent interface (inferString + inferNumber) appended to the vendored contracts/src/interfaces/ISomniaAgents.sol"
  - "Referenceable selectors ILLMAgent.inferString.selector / ILLMAgent.inferNumber.selector for abi.encodeWithSelector"
affects: [11-02 MacroHedgeStrategist, macrohedgestrategist-hedge-decision-agent]

# Tech tracking
tech-stack:
  added: []
  patterns: ["Vendored agent ABI interface uses `calldata` for string/array params to match IJsonApiAgent convention (selector is data-location-invariant)"]

key-files:
  created: []
  modified: ["contracts/src/interfaces/ISomniaAgents.sol"]

key-decisions:
  - "ILLMAgent vendored with ONLY inferString + inferNumber; inferChat/inferToolsChat dropped (out of scope per 11-CONTEXT § Deferred)"
  - "calldata used for string/array params (matches existing IJsonApiAgent at :62-67); selector identical regardless of data location"

patterns-established:
  - "Agent ABI interfaces in ISomniaAgents.sol are minimal (only the methods the strategist encodes), not full upstream copies"

requirements-completed: []  # AGENT-01 is only PARTIALLY satisfied by this plan (interface surface). Full completion requires Plan 02 (MacroHedgeStrategist compiling against these selectors). Not marked complete here.

# Metrics
duration: ~5min
completed: 2026-06-02
---

# Phase 11 Plan 01: ILLMAgent Interface Surface Summary

**`ILLMAgent` interface (inferString constrained-enum + inferNumber bounded-int) appended to the vendored `ISomniaAgents.sol`, giving Plan 02's strategist the exact `abi.encodeWithSelector` signatures — `forge build` green.**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-06-02T12:09:00Z (approx)
- **Completed:** 2026-06-02T12:14:36Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Added `interface ILLMAgent` to `contracts/src/interfaces/ISomniaAgents.sol` with exactly the two load-bearing methods (`inferString`, `inferNumber`) copied verbatim from the agentathon examples repo.
- `inferString(string,string,bool,string[]) returns (string)` and `inferNumber(string,string,int256,int256,bool) returns (int256)` — `calldata` for string/array params to match the existing `IJsonApiAgent` convention.
- Verified `forge build` exits 0 and the new selectors are referenceable; existing `IJsonApiAgent` / `IAgentRequester` interfaces and the Response/Request structs untouched.

## Task Commits

Each task was committed atomically:

1. **Task 1: Append ILLMAgent interface to the vendored ISomniaAgents.sol** - `faffaec` (feat)

**Plan metadata:** (this SUMMARY.md + STATE/ROADMAP) — docs commit follows.

## Files Created/Modified
- `contracts/src/interfaces/ISomniaAgents.sol` - Appended `interface ILLMAgent { inferString; inferNumber; }` after `IJsonApiAgent` (lines 69-88), with NatSpec noting the on-chain Qwen3-30B consensus model and the testnet agent id `12847293847561029384`.

## Decisions Made
- **inferChat/inferToolsChat dropped** — out of scope per 11-CONTEXT § Deferred; only the two methods the strategist encodes are vendored, keeping the interface minimal.
- **`calldata` for string/array params** — matches the existing `IJsonApiAgent` convention; the 4-byte selector is identical regardless of data location, so this does not change what Plan 02 encodes.

## Deviations from Plan
None - plan executed exactly as written.

## Issues Encountered
None. (Note: `forge build` emits `named-struct-fields` lint *notes* from unrelated `src/MacroOracle.sol` — these are pre-existing, out-of-scope warnings, not errors; build exits 0.)

## Requirements Status
- **AGENT-01** — PARTIALLY satisfied. This plan delivers the `ILLMAgent` interface half. AGENT-01 also requires `MacroHedgeStrategist is SomniaAgentConsumer` to compile and call the LLM-Inference agent (Plan 02). AGENT-01 is intentionally NOT marked complete in REQUIREMENTS.md until Plan 02 lands the strategist contract against these selectors.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Plan 02 (`MacroHedgeStrategist.sol`) is unblocked: it can now `abi.encodeWithSelector(ILLMAgent.inferString.selector, ...)` and `ILLMAgent.inferNumber.selector` against the vendored interface.
- No blockers.

## Self-Check: PASSED

- FOUND: `contracts/src/interfaces/ISomniaAgents.sol`
- FOUND: `.planning/phases/11-macrohedgestrategist-hedge-decision-agent/11-01-SUMMARY.md`
- FOUND: commit `faffaec`

---
*Phase: 11-macrohedgestrategist-hedge-decision-agent*
*Completed: 2026-06-02*
