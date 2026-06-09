# Plan 10-03 — Summary

**Plan:** 10-03 — Operator-manual live BuildBear spike (Wave 2, `autonomous: false`)
**Status:** Complete (operator-run, 2026-06-08)
**Commit:** `5a25cd0` — test(10): live BuildBear spike

## What was done

This plan is OPERATOR-MANUAL by design (not CI; never claimed on-rhythm — OPS-06). The live BuildBear-fork spike was executed against a real sandbox (creds rescued from `abrigo-somnia/contracts/.env`; sandbox `colossal-groot-e8ea55ce`, chainId 31337, alive) under explicit user authorization, and the transcripts are recorded in `10-SPIKE-EVIDENCE.md`.

### Proven on-chain
- **PROV-01** — `./provision-buildbear-demo.sh --no-mint` deployed a fresh executor `0xE1903A4cc5Ecc87EC212A1cAEC8cd11a2A4d5ac4` with `numberOfLegs == 0` (≠ poisoned `0xa95Ffdf…`).
- **PROV-02** — dedicated `DEMO_SIGNER_PK` (`0x6aBe11ED…`, distinct from deployer) funded inside the snapshot (`cast balance` = 1e24).
- **PROV-03** — `evm_snapshot` `0x1` captured; round-trip proven: `evm_revert(0x1)` restored `numberOfLegs 2→0` + signer gas, and a fresh `resolveFromMandate` succeeded after the revert.
- **PROV-04** — artifact written directly to the frontend path (`mintTxHash: null`, `snapshotId: 0x1`); `git diff` shows the poisoned committed artifact retired.
- **EXEC-01 §(d)** — on-fork, the dedicated signer's 1st `resolveFromMandate` succeeded; the 2nd reverted **exactly `"fork used"`** (the on-chain guard fires).

### Section status (see 10-SPIKE-EVIDENCE.md)
- §(b) round-trip, §(d) on-fork guard revert — **recorded ✓**
- §(a) pre-guard baseline — covered keyless by the 10-01/10-02 mutation test (the live executor is built WITH the guard; unguarded baseline not separately observable).
- §(c) viem dry-run — script is tsc-green (its acceptance); live standalone run blocked by the `@/` path alias; it is a Phase 11 dependency.

## Deviations / notes
- Ran the spike directly (authorized operator) rather than via a spawned executor — `autonomous: false` plan; evidence is the committed `10-SPIKE-EVIDENCE.md`, not a code change.
- The one-use snapshot `0x1` was consumed by the round-trip test; re-run `--no-mint` before an actual judge demo (OPS-03/04).
- The `.env` (deployer + demo signer keys) lives only in gitignored `packages/backend/contracts/.env` — never committed.

---
*Plan 10-03 complete: 2026-06-08*
