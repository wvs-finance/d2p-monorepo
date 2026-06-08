---
phase: 12-macrohedgestrategist-agent-1-prompt-instrument-specification
plan: 01
subsystem: contracts
tags: [solidity, hedge-mandate, imacrothesis, named-thesis-registry, agent-1, two-type-seam, polygon]

# Dependency graph
requires:
  - phase: 13-macrohedgeexecutor-agent-2-mint
    provides: "PolygonPools.POLYGON_WCOP_USDC_POOL_ID() anchor (the underlyingMarket the mandate references) + the empty IMacroThesis marker promoted here"
provides:
  - "src/types/HedgeMandate.sol — the Agent-1 output value type (five intent-only fields: economicTheory:IMacroThesis, underlyingMarket:PoolId, targetNotional:uint256, chainId:uint32, isLong:bool); NO geometry"
  - "src/interfaces/IMacroThesis.sol — promoted from empty marker to {empty IMacroThesis interface marker (kept) + library MacroThesisRegistry: schoolLabels()/thesisOf()/promptBias()}, handle-resolving (Fork B)"
  - "The honest two-type Agent-1/Agent-2 seam: the mandate carries hedge INTENT only; geometry (moneyness/strike/width/feasible-size) stays Agent-2's (Phase 14)"
affects: [12-02 (MacroHedgeStrategist re-semantic — imports both), 14 (resolveFromMandate — near pass-through of the four matching fields)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Handle-resolving named-thesis registry (Fork B over enum-indexed): a label resolves to an IMacroThesis handle that drops into HedgeMandate.economicTheory / HedgeLegParams.economicTheory with zero translation (Pitfall 5)"
    - "Two-type Agent-1/Agent-2 seam: intent-only HedgeMandate (Agent 1) distinct from geometry-bearing HedgeLegParams (Agent 2)"
    - "Non-deployable sentinel handles: deterministic non-zero addresses (0x5/0x6) satisfying only the != address(0) well-formedness check; never invoked"

key-files:
  created:
    - "contracts/src/types/HedgeMandate.sol"
  modified:
    - "contracts/src/interfaces/IMacroThesis.sol"

key-decisions:
  - "LOCKED HedgeMandate field set = the five intent-only fields; the four pass-through field TYPES mirror HedgeLegParams exactly (zero-translation Phase-14 hand-off)"
  - "targetNotional unit = WHOLE USD notional units (NOT bps, NOT the resolver's [1,127] optionRatio); the size bound lives in Plan-02/Phase-14"
  - "Fork B (handle-resolving registry) chosen over enum-indexed: no hidden enum->handle seam at the Phase-14 hand-off"
  - "Demo school handles are NON-DEPLOYABLE sentinels (0x5/0x6): satisfy only != address(0); never call/delegatecall/staticcall"
  - "No geometry fields in the mandate (no strike/size/payoffTerms declarations) — the whole point of the two-type seam"

patterns-established:
  - "Handle-resolving registry: schoolLabels() is the SINGLE source of truth for both the inferString allowedValues guardrail and the keccak _mapSchool compare; adding a school = one array entry + one branch in thesisOf/promptBias"
  - "keccak-compare resolver mirrors the v1 _mapAction(...,false) no-default-write contract: ok==false on no-match, caller must not store"

requirements-completed: [STRAT-01, STRAT-02]

# Metrics
duration: 4min
completed: 2026-06-06
---

# Phase 12 Plan 01: Wave-0 Substrate (HedgeMandate type + IMacroThesis registry) Summary

**Shipped the honest two-type Agent-1/Agent-2 seam: a five-field intent-only `HedgeMandate` value type and the promotion of `IMacroThesis` from an empty marker to a concrete handle-resolving `MacroThesisRegistry` (schoolLabels/thesisOf/promptBias) — `forge build` green, both ready for the Plan-02 strategist re-semantic to import.**

## Performance

- **Duration:** 4 min
- **Started:** 2026-06-06T21:56:21Z
- **Completed:** 2026-06-06T21:59:24Z
- **Tasks:** 2
- **Files modified:** 2 (1 created, 1 modified)

## Accomplishments
- `contracts/src/types/HedgeMandate.sol` (new): the Agent-1 output value type carrying hedge INTENT only — `economicTheory` (IMacroThesis handle), `underlyingMarket` (PoolId anchor), `targetNotional` (uint256, whole USD), `chainId` (uint32), `isLong` (bool). The four pass-through field TYPES mirror `HedgeLegParams` exactly, so a Phase-14 `HedgeLegParams` scratch-copy needs zero translation. DELIBERATELY no geometry-field declarations.
- `contracts/src/interfaces/IMacroThesis.sol` (promoted): the empty `interface IMacroThesis {}` marker is KEPT (so `HedgeLegParams.economicTheory` and `HedgeMandate.economicTheory` stay valid handle types) and a concrete `library MacroThesisRegistry` is added — `schoolLabels()` (the `allowedValues` source of truth), `thesisOf(label) -> (IMacroThesis handle, bool ok)` (handle-resolving, no-default-write on no-match), `promptBias(label)` (deterministic per-school framing).
- `forge build` green (exit 0) — the compile gate proving both Task-1 imports resolve and the registry compiles. No new errors beyond pre-existing benign notes.

## Task Commits

Each task was committed atomically:

1. **Task 1: Write HedgeMandate value type** - `59dcc0d` (feat)
2. **Task 2: Promote IMacroThesis to the handle-resolving named-thesis registry + compile** - `1d4387f` (feat)

**Plan metadata:** (this docs commit)

## Files Created/Modified
- `contracts/src/types/HedgeMandate.sol` (created) - The Agent-1 output value type: five intent-only fields; four field types mirror HedgeLegParams pass-throughs; no geometry.
- `contracts/src/interfaces/IMacroThesis.sol` (modified) - Empty marker KEPT + `library MacroThesisRegistry` (schoolLabels/thesisOf/promptBias), handle-resolving with non-zero non-deployable sentinels (0x5/0x6).

## Decisions Made

Both design forks RESOLVED for this phase per the plan's `<decisions>` block:

- **LOCKED HedgeMandate field set** = the five intent-only fields. The four pass-through TYPES (`economicTheory:IMacroThesis`, `underlyingMarket:PoolId`, `chainId:uint32`, `isLong:bool`) are byte-for-byte the same as the corresponding `HedgeLegParams` fields — verified by grep diff. The fifth field, `targetNotional:uint256`, is the hedge-intent scalar, NOT geometry.
- **`targetNotional` unit = WHOLE USD notional units** — documented in NatSpec; explicitly NOT bps and NOT the resolver's `[1,127]` optionRatio. The feasible-size bound lives in Plan-02 / Phase-14's representativeness derivation.
- **Fork B — handle-resolving registry (chosen over enum-indexed).** `thesisOf` returns an `IMacroThesis` handle that drops straight into `HedgeMandate.economicTheory` / `HedgeLegParams.economicTheory` with zero translation — no hidden enum->handle seam at the Phase-14 hand-off (Pitfall 5).
- **Demo school handles = NON-DEPLOYABLE sentinels** — `address(uint160(0x5))` (SHILLER_MACRO_RISK) and `address(uint160(0x6))` (POST_KEYNESIAN). These hold NO code; they satisfy ONLY the `!= address(0)` well-formedness check and MUST NEVER be call/delegatecall/staticcall'd. The UI renders the human label from the event string (the address is opaque).
- **No geometry fields** — no `strikeWAD`/`size`/`payoffTerms` member declarations in the mandate (verified by the type-prefixed grep, count==0). This is the whole point of the two-type seam: Agent 1 expresses WHAT to hedge and under which school; Agent 2 owns the moneyness/width/leg-sizing geometry.

## Deviations from Plan

None - plan executed exactly as written. Both tasks landed verbatim against the plan's prescribed struct and registry code; no auto-fixes (Rules 1-3) were triggered and no architectural decision (Rule 4) arose.

## Issues Encountered

One self-inflicted test-harness artifact during verification (NOT a code or plan issue): a `grep -cE ... && echo "count=$CNT"` chain reported a spurious "FAIL" for the no-geometry acceptance check because `grep -c` exits status 1 when it finds zero matches, which short-circuited the `&&` chain in my one-liner before the `test ... -eq 0`. Re-running the check with the plan's exact `test "$(grep -cE ...)" -eq 0` form (which captures the count via command substitution, decoupled from grep's exit code) confirmed the true count is **0** — the two-type seam holds. The source file was always correct; only my compound shell test mis-reported. No file change was needed.

## Verification Results

The full plan `<verification>` block, all PASS:
- `forge build` exits 0 (the whole `src/` tree compiles with the new type + registry). Only pre-existing benign notes remain: the `MacroOracle.sol` `named-struct-fields` notes (tolerated by the plan), `asm-keccak256` notes on the registry's `keccak256(bytes(label))` lines (the same idiom as the live v1 `_mapAction`, which the plan mandates mirroring — informational, not an error), and an `AST source not found` note on `HedgeMandate.sol` (identical to the pre-existing type-only files `Underlying.sol`/`OptionType.sol`/`OptionPosition.sol` — a struct-only file produces no bytecode artifact). No new errors or warnings reference faulty logic in the two changed files.
- No geometry-field declarations in `HedgeMandate` (`grep -cE 'uint256[[:space:]]+(strikeWAD|size)|PayoffTerms[[:space:]]+payoffTerms'` == 0).
- Handle-resolving registry (`grep -q "returns (IMacroThesis"` PASS — clean Phase-14 hand-off, Pitfall 5).
- `schoolLabels()` lists exactly the two demo schools (`new string[](2)` + 2 label assignments).
- Field-type alignment: the four `HedgeMandate` pass-through field types match `HedgeLegParams` byte-for-byte (grep diff confirmed).

## User Setup Required

None - no external service configuration required. (Somnia-native substrate; no fork, no secrets, no deployment this plan.)

## Next Phase Readiness
- Both Wave-0 substrate artifacts exist and compile — Plan 02 (`MacroHedgeStrategist` re-semantic, evm-TDD) can now write the failing test importing `HedgeMandate` and `MacroThesisRegistry` (the Iron-Law dependency this plan unblocks).
- `MacroThesisRegistry.schoolLabels()` is the single source of truth Plan 02 wires into the `inferString` `allowedValues` and the `_mapSchool` keccak compare.
- No blockers.

## Self-Check: PASSED

- FOUND: contracts/src/types/HedgeMandate.sol
- FOUND: contracts/src/interfaces/IMacroThesis.sol
- FOUND: .planning/phases/12-macrohedgestrategist-agent-1-prompt-instrument-specification/12-01-SUMMARY.md
- FOUND commit: 59dcc0d (Task 1)
- FOUND commit: 1d4387f (Task 2)

---
*Phase: 12-macrohedgestrategist-agent-1-prompt-instrument-specification*
*Completed: 2026-06-06*
