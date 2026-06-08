---
phase: 17-live-deploy-pre-flight-surface-verification
plan: 01
subsystem: somnia-live-deploy
tags: [somnia, live-deploy, strategist, school-leg-probe, livedep-01]
requires:
  - "Source-complete two-leg MacroHedgeStrategist (Phase 12, 19/19 offline-proven)"
  - "Live Somnia 50312 platform 0x037Bb9…6776 + MacroOracle 0xAcA751…983f + LLM agent 12847293847561029384"
provides:
  - "A NEW Somnia-50312 strategist at 0xf0570CcB1271FFaFf4caCA628F3632257f177b1D (≠ v1), immutables wired live"
  - "PROVEN volatile LLM_AGENT_ID + platform liveness via a real validator school callback (schoolSet==true)"
  - "Adapted two-leg StrategistDecided runner with a FREE pre-spend surface gate + scripted oracle-freshness gate"
affects:
  - "Phase 18 (decision-moves prove + publish) — re-uses this deployed address + the adapted runner"
tech-stack:
  added: []
  patterns:
    - "FREE read-only surface gate (chain-id + platform code + v1 reachable) ordered before the first STT spend"
    - "scripted oracle-freshness gate (4-member MacroDatum, deliveredAt != 0) before the LLM deposit"
    - "idempotent re-run via CONSUMER + MACRO_ORACLE reuse (no double-deploy, no second refresh)"
key-files:
  created: []
  modified:
    - "contracts/script/macro-hedge-strategist-e2e.sh"
decisions:
  - "school leg used as the cheap single-probe LLM_AGENT_ID liveness gate (notional + join deferred to Phase 18)"
  - "live MacroOracle reused (never redeployed); conservative json-fetch over-reserve kept in the balance budget"
metrics:
  duration: "~9 min"
  completed: "2026-06-08"
---

# Phase 17 Plan 01: Live Deploy + Pre-Flight Surface Verification Summary

Deployed the source-complete two-leg `MacroHedgeStrategist` (`StrategistDecided` API) LIVE to Somnia
testnet 50312 at a NEW address, re-confirmed the FREE testnet surface before any STT spend, and PROVED the
volatile `LLM_AGENT_ID` + platform are live via a single cheap `requestSchoolDecision` probe whose validator
callback landed (`schoolSet==true`, mapped school `"SHILLER_MACRO_RISK"`).

## Outcome: SUCCESS (not PARTIAL)

The school-leg validator callback landed on the FIRST run — no retry needed, no PARTIAL exit.

## Evidence (all cast-verifiable on Somnia 50312)

| Item | Value |
| --- | --- |
| Deploy network chain-id | `50312` (Somnia testnet — distinct from the contract's POLYGON_CHAIN_ID=137 join constant) |
| NEW strategist address | `0xf0570CcB1271FFaFf4caCA628F3632257f177b1D` (bytecode len 19439, ≠ v1) |
| Immutable `PLATFORM()` | `0x037Bb9C718F3f7fe5eCBDB0b600D607b52706776` ✓ |
| Immutable `ORACLE()` | `0xAcA75144f644220f1dEAD5F989C350D8e0Cc983f` ✓ |
| Constant `LLM_AGENT_ID()` | `12847293847561029384` ✓ |
| decisionId | `0x000000000000000000000000000000000000000000000000000000000055a0b8` |
| `decisionState(decisionId)` | `(true, false, 0, "SHILLER_MACRO_RISK")` — schoolSet==true, mapped label |
| mandate.economicTheory | `0x0000000000000000000000000000000000000005` (SHILLER sentinel — registry-mapped) |
| v1 strategist (kept reachable) | `0xfA428171E1F5B56f92C67C002De1d8e90B053EE1` still holds bytecode (len 15199) ✓ |

### Real transaction hashes (Somnia 50312 explorer-verifiable)

| Tx | Hash | Block |
| --- | --- | --- |
| Oracle refresh (json-fetch, conditional over-reserve fired) | `0x5180a8421494f6c99015d4cd12a92ee3153b34cf339fa6027ed2a353dbf9530d` | 403802471 |
| Strategist deploy (contract creation) | `0x6e19500c4520313ff273cd41142e4746f67548b1d59412bc4beefac9d875032f` | 403802527 |
| `requestSchoolDecision` (the liveness probe, status 1) | `0xdbc1e636f440c6ee1a54438db14fd1297399560a798761be63222d9fee1d165b` | 403802588 |

## What changed (Task 1 — runner adaptation, commit f173e15)

Adapted `contracts/script/macro-hedge-strategist-e2e.sh` from the v1 action/size API to the two-leg
`StrategistDecided` API:

- **Step 0c FREE surface gate** (new): asserts deploy chain-id == 50312 (explicit equality + `exit 1`),
  platform has code, v1 reachable — ordered BEFORE the first STT spend (§4 ordering guarantee).
- **Step 2b oracle-freshness gate** (new): reads the 4-member `latest(bytes32)((bytes32,int256,uint64,uint64))`
  tuple and asserts the 4th member (`deliveredAt`) != 0 before spending the LLM deposit.
- **Step 3**: deploy with constructor-args order `platform` then `oracle`, guard the deploy mined
  (`cast code` len > 2), then read back all three immutables and assert the NEW address != v1.
- **Step 4**: re-pointed to `requestSchoolDecision(string,bytes32,int256)`; polls
  `decisionState(...)` member-1 (`schoolSet`) only (position-explicit, not a blind `grep true`);
  distinguishes the two `DecisionFailed` causes (unmapped-school = agent-LIVE vs no-callback = wrong constant).
- Deleted the v1 action/size legs + the join asserts (Phase 18); re-sized the balance check to the
  single-probe `NEED_PER_RUN = JSON_DEPOSIT + LLM_DEPOSIT` and deleted the 2-run `NEED_DEMO` budget.
- Live MacroOracle reused by default; idempotent re-run path via `CONSUMER` + `MACRO_ORACLE`.

## Task 2 — live execution

Ran the adapted runner against live Somnia 50312 (`RUNNER_EXIT=0`). Spent real STT: one json-fetch oracle
refresh (~0.09 STT — the conditional over-reserve fired even though the datum was prior-fresh, harmless) and
one `requestSchoolDecision` LLM deposit (~0.21 STT). The validator school callback landed within the poll
window → `schoolSet==true`.

## Deviations from Plan

None — plan executed exactly as written. The school callback landed on the first run, so the
single-allowed retry and the documented PARTIAL exit were not exercised.

## Spend-honesty note

The conservative `JSON_DEPOSIT` over-reserve fired a json-fetch refresh at Step 2 despite the datum being
prior-fresh; this is the documented over-reserve behavior (it only leaves headroom, never strands funds).
The deposit-at-risk wording (rebate unconfirmed on Somnia) is reflected in the runner's failure messages.

## Secret discipline

The PK was referenced only as `$SOMNIA_TESTNET_PK`/`$PK` sourced from gitignored `contracts/.env`; never
echoed, never committed, never written on-chain. The contract's `POLYGON_CHAIN_ID = 137` join constant was
untouched (the asserted deploy chain-id 50312 is the distinct network id). No `somnia-strategist-deployment.json`
written (Phase 18).

## Self-Check: PASSED

- FOUND: .planning/phases/17-live-deploy-pre-flight-surface-verification/17-01-SUMMARY.md
- FOUND: contracts/script/macro-hedge-strategist-e2e.sh
- FOUND: commit f173e15 (Task 1 runner adaptation)
- VERIFIED on-chain: NEW strategist 0xf0570CcB1271FFaFf4caCA628F3632257f177b1D code len 19439, immutables + schoolSet==true, v1 reachable, chain-id 50312
