---
status: complete
phase: 15-cornerstone-e2e-ci
source: [15-01-SUMMARY.md, 15-02-SUMMARY.md, 15-03-SUMMARY.md]
started: 2026-06-07T00:00:00Z
updated: 2026-06-07T00:00:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Cold-start smoke — re-provision the BuildBear demo + mint
expected: `bash script/provision-buildbear-demo.sh` stands up the hosted Polygon-fork demo from scratch (fund → deploy → deposit-on-behalf → mint) and prints ONCHAIN SUCCESS + MINT_TX_HASH + MINTED_STRIKE=360360 + the deployments artifact.
result: pass
evidence: fresh EXECUTOR 0xa95Ffd…, new POOL, new MINT_TX_HASH 0xfce415a6…, MINTED_STRIKE=360360, NUMBER_OF_LEGS=2, artifact written, "ONCHAIN EXECUTION COMPLETE & SUCCESSFUL" — reproducible cold-start (different addresses from the prior run).

### 2. Real onchain mint visible in the explorer
expected: explorer shows the mint with status success at the executor; executor owns the position (numberOfLegs > 0).
result: pass
evidence: cast receipt 0xfce415a6… → status 1 (success); executor 0xa95Ffd… has code; NUMBER_OF_LEGS=2.

### 3. Agent-2 decision honesty surfaced (ExecutorDecided)
expected: ExecutorDecided decodes to the TEMPLATE rationale with nonErgodicDisclosed == true (the Davidson honesty split on the real mint, not faked as executed/realized).
result: pass
evidence: decoded from the new mint tx logs — "TEMPLATE: placeholder beta1/Z_t (post-Keynesian regime-conditional passthrough); not deployment-ready. Parametric share hedged; non-ergodic tail disclosed, NOT covered."

### 4. Basic live read — quoteMargin after mint
expected: forge test test_quoteMargin_basicReadAfterMint passes — post-mint quoteMargin returns a BalanceDelta without reverting; executor still owns the leg.
result: pass
evidence: 1 tests passed, 0 failed.

### 5. CI gate — polygon fork job + keyless gate green
expected: contracts-ci.yml has the polygon job (ALCHEMY_API_KEY-gated, cache key, retries, no --shard); keyless gate green.
result: pass
evidence: polygon job present; ALCHEMY_API_KEY/cache-key refs ×9; forge build exit 0; 128 fork-free tests passed.

### 6. Handoff doc reflects reality
expected: no "34-line STUB"; shipped 8-param ExecutorDecided; section-6 BuildBear swap-to-real (chainId 31337) + verbatim no-bridge label; Agent-1 = recorded v1 live on Somnia.
result: pass
evidence: "34-line STUB" count 0; nonErgodicDisclosed/buildbear/no-cross-chain-bridge refs ×8.

## Summary

total: 6
passed: 6
issues: 0
pending: 0
skipped: 0

## Gaps

[none — all tests passed]
