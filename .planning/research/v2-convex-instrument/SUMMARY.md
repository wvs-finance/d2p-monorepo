# Research SUMMARY — v2.0 Convex Instrument (build, scoped)

*Synthesis of STACK/ARCHITECTURE/PITFALLS + the 2026-06-01 decisions: hackathon, testnet/demo only, **Panoptic V2 on a Base fork**.*

## Decisive pivot (supersedes the Stack research's Celo/V3/V1 target)

- **Hackathon, demo/testnet only, never production** → BUSL-1.1 is **not a blocker** (non-production fork use is permitted). Keep a NOTICE; revisit only if ever production.
- **Panoptic V2 (not V1).** V1 is EOL (vuln, trading disabled). V2 is open-sourced, a unified options+lending+AMM risk engine, **built on Uniswap V4**, audited Dec-2025 (Code4rena "Panoptic Next Core"), Ethereum-first beta.
- **Uniswap V4 is on Base (not Celo); Reactive is on Base (not Celo).** The only *real* cCOP pool is UniV3/Celo — incompatible with V2. **Resolution: fork Base, deploy our OWN cCOP/USDC UniV4 pool for the demo, borrow Panoptic V2 core.** Unifies instrument + x402 + Reactive on one chain. Trade-off accepted: own demo pool, not the real Celo one.

## Stack (Base fork)
- **Foundry Base-fork** (UniV4 `PoolManager` on Base + a stable). forge 1.5.1 ✓; **add bulloak** (repo uses `.tree` BTT but it's not installed). Multi-version solc (Panoptic pins vs repo `^0.8.24`) — do NOT bump borrowed libs.
- **Borrow Panoptic V2 core** (UniV4-based) behind a `IPanopticData` (V2) interface; exact V2 contract set + streamia/premium mechanics = **plan-phase source read** (V2 differs from V1's `SFPM`/`FeesCalc`/`VEGOID=2`).
- **Deploy our cCOP/USDC UniV4 pool** (mock cCOP, realistic params) on the fork.
- **x402** `@coinbase/x402` (keeper, Base); **Reactive** `reactive-lib` (Base) — both LAST/deferred.

## Architecture
- **Reuse:** `SomniaAgentConsumer`. **Modify (additive):** `MacroOracle` (+ EME consensus route + σ so `s_t` computable; today emits raw level) + keeper (consensus fetch). **New:** `LongGammaWrapper`, `PositionBuilder`, `PremiumSplitter`, `CapitalRemunerationVault` (ERC-4626), `DeltaHedgeKeeper`. **Borrowed:** Panoptic-V2-lite behind `IPanopticData`.
- **Oracle dual role (no new mechanism):** `te/fx/usdcop` = settlement mark; `te/colombia/inflation` (live-proven 568) = scheduled-surprise clock. Only plumbing add = consensus + σ.
- **Build order (evm-TDD, deps-respecting):** borrowed-Panoptic skeleton + fork harness → wrapper cash-flow → splitter + vault → oracle surprise route → PositionBuilder sizing → delta-hedge keeper → (deferred) x402/Reactive.
- **Future swap:** repoint `IPanopticData` to a canonical Panoptic V2 deployment; delete `panoptic-borrowed/`.

## Pitfalls (carry into phases)
- **Streamia is read from the contract, never re-derived** — any independent premium formula diverges from the actual debit. (V2 mechanics: confirm at plan-phase.)
- **No upfront premium → upfront *collateral*.** Residual MUST be computed from *surviving collateral at actual close*, never promised on `deposit` — `forceExercise`/`settleLongPremium`/liquidation debit it early/involuntarily. The `.tree` must enumerate involuntary-close branches.
- **Two distinct data costs — don't conflate:** φ_data (mutualized fixed $199 → ERC-4626 vault) vs per-position incremental hedge metering. Needs a conservation invariant (no double-count).
- **Cross-chain (deferred):** Reactive callbacks need BOTH `msg.sender==CallbackProxy` AND RVM-id, PLUS a replay nonce. x402 entry = Base (reconciled).
- **CPI→FX linkage is an unvalidated assumption** — config-flag `linkage_validated:false`; calibration is the parked M1 econometrics track's job.
- **evm-tdd:** `.tree`-before-impl per phase; license NOTICE for borrowed BUSL code.

## Open → plan-phase research
V2 core contract set + license terms at pinned commit; V2 streamia/premium mechanics; cCOP/USDC UniV4 pool deploy specifics on a Base fork; σ_CPI + `k` calibration (input from parked M1); Celo public fork-RPC archive depth (n/a now — Base fork).
